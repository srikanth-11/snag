import Link from "next/link";
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
import { Wordmark } from "@/components/brand";

export default function SignupPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" aria-label="Snag home" className="inline-block">
          <Wordmark />
        </Link>
        <h1 className="mt-8 font-display text-2xl font-bold">Start snagging bugs</h1>
        <p className="mt-1 text-sm text-smoke">Free to start. No card.</p>
        <div className="mt-6">
          <Suspense>
            <AuthForm mode="signup" />
          </Suspense>
        </div>
        <p className="mt-6 text-sm text-smoke">
          Already have an account?{" "}
          <Link href="/login" className="text-proof underline underline-offset-2">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
