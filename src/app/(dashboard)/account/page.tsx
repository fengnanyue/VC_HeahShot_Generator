import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BuyCreditsButton } from "@/components/BuyCreditsButton";

type AccountPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams;
  const creditsSuccess = params?.credits === "success";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, email, created_at, credits_balance")
    .eq("id", user.id)
    .maybeSingle();

  const username = profile?.username ?? "—";
  const email = profile?.email ?? user.email ?? "—";
  const fullName = profile?.full_name ?? "—";
  const joined =
    profile?.created_at &&
    new Date(profile.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  // 最近一条 selfie（不管生成是否成功）
  const { data: latestGen } = await supabase
    .from("generations")
    .select("selfie_url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let latestSelfieSignedUrl: string | null = null;
  if (latestGen?.selfie_url) {
    const admin = createAdminClient();
    const selfiePath = latestGen.selfie_url.startsWith("selfies/")
      ? latestGen.selfie_url
      : latestGen.selfie_url.replace(/^.*selfies\//, "selfies/");
    const { data } = await admin.storage
      .from("selfies")
      .createSignedUrl(selfiePath, 60 * 15);
    latestSelfieSignedUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Account</h1>

      {creditsSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Payment successful. Your credits have been added.
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-semibold text-white">
            {(profile?.username || profile?.full_name || email)
              ?.trim()
              ?.slice(0, 2)
              .toUpperCase() ?? "U"}
          </div>
          <div>
            <p className="text-sm text-gray-500">Signed in as</p>
            <p className="text-base font-semibold text-gray-900">
              {username !== "—" ? `@${username}` : email}
            </p>
            {joined && (
              <p className="text-xs text-gray-500">Member since {joined}</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Profile details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-gray-500">Username</dt>
              <dd className="font-medium text-gray-900">
                {username !== "—" ? `@${username}` : "Not set"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-gray-500">Full name</dt>
              <dd className="font-medium text-gray-900">{fullName}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">{email}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Latest selfie</h2>
          {latestSelfieSignedUrl ? (
            <div className="space-y-3">
              <div className="flex h-48 w-full items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                <img
                  src={latestSelfieSignedUrl}
                  alt="Latest uploaded selfie"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              {latestGen?.created_at && (
                <p className="text-xs text-gray-500">
                  Uploaded{" "}
                  {new Date(latestGen.created_at).toLocaleString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              You haven&apos;t uploaded a selfie yet. Generate a headshot from the dashboard to see
              it here.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-gray-900">Credits & Billing</h2>
        <div className="mb-4 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {profile?.credits_balance ?? 0}
          </span>
          <span className="text-sm text-gray-500">credits</span>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          1 credit = 1 headshot. $1 = 5 credits.
        </p>
        <BuyCreditsButton />
      </section>
    </div>
  );
}


