import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function getInitials(nameOrEmail: string | null | undefined) {
  if (!nameOrEmail) return "U";
  const trimmed = nameOrEmail.trim();
  if (!trimmed) return "U";
  if (trimmed.includes(" ")) {
    const [first, second] = trimmed.split(" ");
    return `${first[0] ?? ""}${second?.[0] ?? ""}`.toUpperCase() || "U";
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  let displayName: string | null = null;
  let email: string | null = null;

  if (!skipAuth) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    email = user.email ?? null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, full_name")
      .eq("id", user.id)
      .maybeSingle();

    await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? undefined,
          full_name: user.user_metadata?.full_name ?? profile?.full_name ?? undefined,
          // keep existing username if present; do not overwrite
          username: profile?.username ?? undefined,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    displayName =
      profile?.username ??
      profile?.full_name ??
      user.email ??
      null;
  }

  const initials = getInitials(displayName || email);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="text-lg font-semibold text-gray-900">
            Headshot Generator
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Dashboard
            </Link>
            <Link
              href="/history"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              History
            </Link>
            <Link
              href="/account"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Account
            </Link>
            {!skipAuth && (
              <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                  {initials}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">
                    Signed in as
                  </p>
                  <p className="max-w-[140px] truncate text-xs font-medium text-gray-900">
                    {displayName || email || "User"}
                  </p>
                </div>
                <form action="/api/auth/signout" method="post">
                  <button
                    type="submit"
                    className="text-xs font-medium text-gray-500 hover:text-gray-700"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
