import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { HEADSHOT_STYLES } from "@/lib/constants";
import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

export async function POST(request: Request) {
  try {
    const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
    const supabase = await createClient();

    let userId: string;
    if (skipAuth) {
      userId = "47cafe71-e389-4aee-903f-b4af6e92aad5";
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = user.id;
    }

    const body = await request.json();
    const selfie_url = body?.selfie_url as string | undefined;
    const style_slug = body?.style_slug as string | undefined;

    if (!selfie_url || !style_slug) {
      return NextResponse.json(
        { error: "Missing selfie_url or style_slug" },
        { status: 400 }
      );
    }

    const validSlug = HEADSHOT_STYLES.some((s) => s.slug === style_slug);
    if (!validSlug) {
      return NextResponse.json({ error: "Invalid style_slug" }, { status: 400 });
    }

    // Use authed DB client so RLS sees auth.uid()
    const { data: generation, error: insertError } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        selfie_url,
        style_slug,
        status: "processing",
      })
      .select("id")
      .single();

    if (insertError || !generation) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to create generation" },
        { status: 500 }
      );
    }

    // Get a signed URL for the selfie path so fal.ai can read it
    const selfiePath = selfie_url.startsWith("selfies/")
      ? selfie_url
      : selfie_url.replace(/^.*selfies\//, "selfies/");
    const admin = createAdminClient();
    const selfieSigned = await admin.storage
      .from("selfies")
      .createSignedUrl(selfiePath, 60 * 30);
    const selfieSignedUrl = selfieSigned.data?.signedUrl;

    if (!selfieSignedUrl) {
      await supabase
        .from("generations")
        .update({
          status: "failed",
          error_message: "Could not create signed URL for selfie",
        })
        .eq("id", generation.id);
      return NextResponse.json(
        { error: "Could not create signed URL for selfie" },
        { status: 500 }
      );
    }

    // Call fal.ai Headshot Generator
    if (!process.env.FAL_KEY) {
      await supabase
        .from("generations")
        .update({
          status: "failed",
          error_message: "FAL_KEY is not configured",
        })
        .eq("id", generation.id);
      return NextResponse.json(
        { error: "FAL_KEY is not configured" },
        { status: 500 }
      );
    }

    fal.config({ credentials: process.env.FAL_KEY });

    const falResult = await fal.subscribe(
      "fal-ai/image-apps-v2/headshot-photo",
      {
        input: {
          image_url: selfieSignedUrl,
          background_style:
            style_slug === "creative"
              ? "gradient"
              : style_slug === "casual"
                ? "clean"
                : "professional",
        },
      }
    );

    const outputUrl = falResult.data?.images?.[0]?.url as string | undefined;
    if (!outputUrl) {
      await supabase
        .from("generations")
        .update({
          status: "failed",
          error_message: "fal.ai did not return an image",
        })
        .eq("id", generation.id);
      return NextResponse.json(
        { error: "fal.ai did not return an image" },
        { status: 500 }
      );
    }

    // Download the generated image and upload to Supabase Storage
    const path = `headshots/${userId}/${generation.id}.jpg`;
    const imageRes = await fetch(outputUrl);
    if (!imageRes.ok) {
      await supabase
        .from("generations")
        .update({ status: "failed", error_message: "Failed to fetch fal.ai image" })
        .eq("id", generation.id);
      return NextResponse.json(
        { error: "Failed to fetch fal.ai image" },
        { status: 500 }
      );
    }
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from("headshots")
      .upload(path, imageBuffer, { contentType: "image/jpeg", upsert: true });

    if (uploadError) {
      await supabase
        .from("generations")
        .update({
          status: "failed",
          error_message: uploadError.message,
        })
        .eq("id", generation.id);
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabase
      .from("generations")
      .update({
        status: "completed",
        result_url: path,
        updated_at: new Date().toISOString(),
      })
      .eq("id", generation.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    const { data: signed } = await admin.storage
      .from("headshots")
      .createSignedUrl(path, 3600);

    return NextResponse.json({
      generation_id: generation.id,
      status: "completed",
      result_signed_url: signed?.signedUrl ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation failed" },
      { status: 500 }
    );
  }
}
