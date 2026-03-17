import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  if (!skipAuth) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? undefined,
          full_name: user.user_metadata?.full_name ?? undefined,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
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
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
