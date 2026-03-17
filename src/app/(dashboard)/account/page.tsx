import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Account</h1>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-gray-900">Profile</h2>
        <dl className="space-y-2">
          <div>
            <dt className="text-sm text-gray-500">Email</dt>
            <dd className="font-medium text-gray-900">{user?.email ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-gray-900">Billing</h2>
        <p className="text-sm text-gray-500">
          Subscription and billing will be available after Stripe integration. For the MVP you have
          unlimited mock generations.
        </p>
      </section>
    </div>
  );
}
