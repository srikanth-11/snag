import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";

export default async function Nav() {
  let email: string | null = null;
  if (hasSupabase) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
  }

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 print:hidden">
      <Link href="/" aria-label="Snag home">
        <Wordmark />
      </Link>
      <nav className="flex items-center gap-2 text-sm">
        {email ? (
          <>
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-1.5 text-smoke transition-colors hover:text-bone"
            >
              Dashboard
            </Link>
            <form action="/auth/signout" method="post">
              <button className="rounded-md px-3 py-1.5 text-smoke transition-colors hover:text-bone">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-smoke transition-colors hover:text-bone"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-ember px-3.5 py-1.5 font-medium text-void transition-opacity hover:opacity-90"
            >
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
