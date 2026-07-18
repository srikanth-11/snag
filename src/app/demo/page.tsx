import Link from "next/link";
import Nav from "@/components/Nav";
import { Theater } from "@/components/Theater";
import { createClient } from "@/lib/supabase/server";
import { getJob } from "@/lib/db";
import { DEMO_JOB_ID } from "@/lib/demos";

export const metadata = { title: "Live demo · Snag" };

export default async function DemoPage() {
  const supabase = await createClient();
  const job = await getJob(supabase, DEMO_JOB_ID);

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-smoke">Live demo · replay</p>
        <h1 className="mt-2 font-display text-3xl font-bold">Watch Snag hunt a real app</h1>
        <p className="mt-2 max-w-xl text-smoke">
          A real recorded run, replayed step by step. No signup.{" "}
          <Link href="/#try" className="text-proof hover:underline">
            Run Snag on your own URL
          </Link>
          .
        </p>

        <div className="mt-8">
          {job ? (
            <Theater jobId={DEMO_JOB_ID} initialStatus="running" replay />
          ) : (
            <div className="rounded-xl border border-edge bg-ash/40 p-10 text-center text-smoke">
              The demo run isn&apos;t available here yet.{" "}
              <Link href="/#try" className="text-proof hover:underline">
                Try a live hunt instead
              </Link>
              .
            </div>
          )}
        </div>
      </main>
    </>
  );
}
