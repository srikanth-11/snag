import Nav from "@/components/Nav";
import UrlLauncher from "@/components/UrlLauncher";
import { Hook, Wordmark } from "@/components/brand";

function Note({
  tone,
  children,
}: {
  tone: "smoke" | "ember" | "proof";
  children: React.ReactNode;
}) {
  const color =
    tone === "ember" ? "text-ember" : tone === "proof" ? "text-proof" : "text-smoke";
  return <div className={`font-mono text-[13px] leading-relaxed ${color}`}>{children}</div>;
}

function Stage() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      {/* Specimen viewer */}
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-edge bg-ash">
        <span className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l-2 border-t-2 border-proof/70" />
        <span className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r-2 border-t-2 border-proof/70" />
        <span className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 border-b-2 border-l-2 border-proof/70" />
        <span className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 border-b-2 border-r-2 border-proof/70" />
        <span className="pointer-events-none absolute left-1/2 top-1/2 h-px w-10 -translate-x-1/2 -translate-y-1/2 bg-proof/40" />
        <span className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-px -translate-x-1/2 -translate-y-1/2 bg-proof/40" />

        <div className="flex h-full flex-col gap-3 p-6">
          <div className="h-3 w-24 rounded bg-bone/15" />
          <div className="h-8 w-2/3 rounded bg-bone/10" />
          <div className="mt-2 h-3 w-full rounded bg-bone/10" />
          <div className="h-3 w-5/6 rounded bg-bone/10" />
          <div className="mt-auto flex items-center gap-3">
            <div className="h-9 w-40 rounded bg-bone/10 ring-1 ring-ember/60" />
            <div className="h-9 w-24 rounded bg-ember/80" />
          </div>
        </div>

        <div className="absolute left-6 top-1/2 rounded-md bg-void/80 px-2 py-1 font-mono text-[11px] text-ember ring-1 ring-ember/40">
          ⚑ attack
        </div>
        <div className="absolute bottom-16 right-6 rounded-md bg-void/80 px-2 py-1 font-mono text-[11px] text-proof ring-1 ring-proof/40">
          ● evidence
        </div>
      </div>

      {/* Field notes */}
      <div className="flex flex-col justify-center gap-2 rounded-xl border border-edge bg-ash/50 p-5">
        <Note tone="smoke">› open /checkout</Note>
        <Note tone="ember">⚑ type 10,000 chars into “Coupon”</Note>
        <Note tone="ember">⚑ click “Apply” twice</Note>
        <Note tone="proof">● console.error: cannot read “total” of undefined</Note>
        <Note tone="proof">● POST /api/cart → 500</Note>
        <div className="mt-2 inline-flex w-fit -rotate-1 items-center gap-2 rounded border border-proof/50 bg-proof/10 px-2.5 py-1 font-mono text-[12px] font-semibold text-proof">
          <Hook className="h-3.5 w-3.5" />
          SNAGGED — checkout crashes on long coupon
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      k: "Attacks",
      d: "A persona-driven agent pokes, types garbage, and wanders your app in a real browser.",
    },
    {
      k: "Verifies",
      d: "Console errors and 5xx are objective truth; a skeptic pass throws out false alarms.",
    },
    {
      k: "Reports",
      d: "Every real bug comes with severity, repro steps, and a screenshot — copy it straight to GitHub.",
    },
  ];
  return (
    <section className="mx-auto mt-24 grid w-full max-w-5xl gap-6 px-6 sm:grid-cols-3">
      {steps.map((s, i) => (
        <div key={s.k} className="rounded-xl border border-edge bg-ash/40 p-5">
          <div className="font-mono text-xs text-smoke">0{i + 1}</div>
          <div className="mt-1 font-display text-lg font-semibold text-bone">{s.k}</div>
          <p className="mt-2 text-sm leading-relaxed text-smoke">{s.d}</p>
        </div>
      ))}
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-6 pt-10 sm:pt-16">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-smoke">
            Autonomous QA agent
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Find the <span className="text-ember">snags</span> before your users do.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-smoke">
            Paste a URL. Snag attacks your live app like a hostile QA engineer,
            catches the bugs your users would hit, and hands you a report you can
            ship.
          </p>

          <div className="mt-12">
            <Stage />
          </div>
          <UrlLauncher />
        </section>

        <HowItWorks />
      </main>

      <footer className="mx-auto mt-24 w-full max-w-6xl px-6 py-10 text-sm text-smoke">
        <div className="flex items-center justify-between border-t border-edge pt-6">
          <Wordmark />
          <span>Built free. Runs anywhere.</span>
        </div>
      </footer>
    </>
  );
}
