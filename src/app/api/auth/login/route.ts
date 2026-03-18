import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { identifier, password } = (await request.json()) as {
      identifier?: string;
      password?: string;
    };

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Identifier and password are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    let email = identifier.trim();

    // If identifier doesn't look like an email, treat it as username
    if (!email.includes("@")) {
      const { data, error } = await supabase
        .from("profiles")
        .select("email")
        .ilike("username", identifier.trim().toLowerCase())
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      if (!data?.email) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      email = data.email;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: signInError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to sign in" },
      { status: 500 }
    );
  }
}

