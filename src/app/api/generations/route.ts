import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
    let userId: string | null = null;

    if (skipAuth) {
      userId = "47cafe71-e389-4aee-903f-b4af6e92aad5";
    } else {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = user.id;
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
    const offset = Number(searchParams.get("offset")) || 0;

    // Use authed DB client for RLS
    const supabase = await createClient();
    const { data: rows, error } = await supabase
      .from("generations")
      .select("id, selfie_url, style_slug, status, result_url, error_message, created_at")
      .eq("user_id", userId!)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const admin = createAdminClient();
    const generations = await Promise.all(
      (rows ?? []).map(async (row) => {
        let resultSignedUrl: string | null = null;
        if (row.result_url) {
          const { data } = await admin.storage
            .from("headshots")
            .createSignedUrl(row.result_url, 3600);
          resultSignedUrl = data?.signedUrl ?? null;
        }
        return {
          ...row,
          result_signed_url: resultSignedUrl,
        };
      })
    );

    return NextResponse.json({ generations });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list generations" },
      { status: 500 }
    );
  }
}
