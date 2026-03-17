import { createAdminClient } from "@/lib/supabase/admin";
import { HEADSHOT_STYLES } from "@/lib/constants";
import { NextResponse } from "next/server";

const MOCK_DELAY_MS = 3000;
const PLACEHOLDER_IMAGE_URL =
  "https://placehold.co/512x512/6366f1/white?text=AI+Headshot";

export async function POST(request: Request) {
  try {
    const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
    const userId = skipAuth
      ? "00000000-0000-0000-0000-000000000001"
      : undefined;

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

    const db = createAdminClient();
    const { data: generation, error: insertError } = await db
      .from("generations")
      .insert({
        user_id: userId ?? "00000000-0000-0000-0000-000000000001",
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

    // Mock: simulate delay then set result
    await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));

    const path = `headshots/${userId ?? "00000000-0000-0000-0000-000000000001"}/${generation.id}.jpg`;
    const admin = createAdminClient();

    const imageRes = await fetch(PLACEHOLDER_IMAGE_URL);
    if (!imageRes.ok) {
      await db
        .from("generations")
        .update({ status: "failed", error_message: "Placeholder fetch failed" })
        .eq("id", generation.id);
      return NextResponse.json(
        { error: "Mock generation failed" },
        { status: 500 }
      );
    }
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from("headshots")
      .upload(path, imageBuffer, { contentType: "image/jpeg", upsert: true });

    if (uploadError) {
      await db
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

    const { error: updateError } = await db
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
