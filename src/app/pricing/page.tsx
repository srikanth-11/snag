import Link from "next/link";
import Nav from "@/components/Nav";
import { Hook } from "@/components/brand";

const FREE = [
  "10 hunts per day",
  "Live agent theater",
  "Verified bug reports",
  "GitHub-issue export",
];
const PRO = [
  "Unlimited hunts",
  "Scheduled re-runs",
  "PR-comment bot",
  "Auto-filed GitHub issues",
  "Priority queue",
];

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-14">
        <h1 className="font-display text-4xl font-bold">Simple pricing</h1>
        <p className="mt-2 text-smoke">Start free. No card.</p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-edge bg-ash/40 p-6">
            <h2 className="font-display text-xl font-bold">Free</h2>
            <p className="mt-1 text-3xl font-bold">₹0</p>
            <ul className="mt-5 space-y-2 text-sm text-bone">
              {FREE.map((x) => (
                <li key={x} className="flex gap-2">
                  <Hook className="mt-1 h-3.5 w-3.5 shrink-0 text-proof" /> {x}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="mt-6 block rounded-lg bg-ember px-4 py-2.5 text-center font-medium text-void transition-opacity hover:opacity-90"
            >
              Get started
            </Link>
          </div>

          <div className="rounded-2xl border border-ember/40 bg-ash/40 p-6">
            <h2 className="font-display text-xl font-bold">Pro</h2>
            <p className="mt-1 text-3xl font-bold">Coming soon</p>
            <ul className="mt-5 space-y-2 text-sm text-bone">
              {PRO.map((x) => (
                <li key={x} className="flex gap-2">
                  <Hook className="mt-1 h-3.5 w-3.5 shrink-0 text-ember" /> {x}
                </li>
              ))}
            </ul>
            <button
              disabled
              className="mt-6 w-full cursor-not-allowed rounded-lg border border-edge px-4 py-2.5 text-center text-smoke"
            >
              Early access soon
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
