import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { NameForm, DeleteAccount } from "@/components/AccountForms";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { remainingQuota } from "@/lib/quota";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-edge bg-ash/40 p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  if (!hasSupabase) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings");

  const quota = await remainingQuota(user.id);
  const name = ((user.user_metadata?.name as string | undefined) ?? "").trim();
  const pct = Math.min(100, Math.round((quota.used / quota.limit) * 100));

  return (
    <AppShell email={user.email ?? ""}>
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-display text-3xl font-bold">Settings</h1>

        <div className="mt-8 space-y-6">
          <Card title="Profile">
            <p className="mb-4 text-sm text-smoke">
              Signed in as <span className="text-bone">{user.email}</span>
            </p>
            <NameForm initialName={name} />
          </Card>

          <Card title="Usage">
            <div className="flex items-center justify-between text-sm">
              <span className="text-smoke">Hunts today</span>
              <span className="font-mono text-bone">
                {quota.used} / {quota.limit}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-bone/10">
              <div
                className="h-full rounded-full bg-ember transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-smoke">Free plan · resets daily (UTC).</p>
          </Card>

          <Card title="Danger zone">
            <p className="mb-4 text-sm text-smoke">
              Permanently delete your account and every hunt and report tied to it.
            </p>
            <DeleteAccount />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
