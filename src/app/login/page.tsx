import Link from "next/link";
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
import { Wordmark } from "@/components/brand";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" aria-label="Snag home" className="inline-block">
          <Wordmark />
        </Link>
        <h1 className="mt-8 font-display text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-smoke">Log in to run hunts and keep your reports.</p>
        <div className="mt-6">
          <Suspense>
            <AuthForm mode="login" />
          </Suspense>
        </div>
        <p className="mt-6 text-sm text-smoke">
          New here?{" "}
          <Link href="/signup" className="text-proof underline underline-offset-2">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
