import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import Nav from "@/components/Nav";
import { Theater } from "@/components/Theater";
import { createClient } from "@/lib/supabase/server";
import { getJob } from "@/lib/db";

export default async function HuntPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const job = await getJob(supabase, id);
  if (!job) notFound();

  const content = (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
      <h1 className="font-display text-2xl font-bold">
        Hunting <span className="break-all font-mono text-base text-smoke">{job.url}</span>
      </h1>
      <div className="mt-6">
        <Theater jobId={id} initialStatus={job.status} />
      </div>
    </main>
  );

  return user ? (
    <AppShell email={user.email ?? ""}>{content}</AppShell>
  ) : (
    <>
      <Nav />
      {content}
    </>
  );
}
