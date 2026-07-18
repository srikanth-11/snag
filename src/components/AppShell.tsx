"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Hook } from "@/components/brand";

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden>
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV = [
  { href: "/dashboard", label: "Dashboard", d: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" },
  { href: "/#try", label: "New hunt", d: "M12 5v14M5 12h14" },
  { href: "/settings", label: "Settings", d: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l1.5 1-1.5 3-2-.5-2 1.5-.5 2h-3l-.5-2-2-1.5-2 .5L2 13l1.5-1L2 11l1.5-3 2 .5 2-1.5.5-2h3l.5 2 2 1.5 2-.5L20 11z" },
];

export default function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) =>
    href.startsWith("/#") ? false : pathname === href || pathname.startsWith(href + "/");

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
            active(n.href)
              ? "bg-ember/15 text-ember"
              : "text-smoke hover:bg-bone/5 hover:text-bone"
          }`}
        >
          <Icon d={n.d} />
          {n.label}
        </Link>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-edge pt-4">
      <p className="truncate px-3 text-xs text-smoke" title={email}>
        {email}
      </p>
      <form action="/auth/signout" method="post">
        <button className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-smoke transition-colors hover:bg-bone/5 hover:text-bone">
          Sign out
        </button>
      </form>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between border-r border-edge bg-ash/30 p-5 md:flex">
        <div>
          <Link href="/" className="mb-8 inline-flex items-center gap-1.5 font-display text-xl font-bold">
            <Hook className="h-5 w-5 text-ember" />
            snag
          </Link>
          {nav}
        </div>
        {account}
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-20 flex items-center justify-between border-b border-edge bg-void/95 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/" className="inline-flex items-center gap-1.5 font-display text-lg font-bold">
          <Hook className="h-5 w-5 text-ember" />
          snag
        </Link>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          className="rounded-md p-1.5 text-bone hover:bg-bone/10"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="absolute inset-0 bg-void/70" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col justify-between border-r border-edge bg-ash p-5">
            <div>
              <div className="mb-8 inline-flex items-center gap-1.5 font-display text-xl font-bold">
                <Hook className="h-5 w-5 text-ember" />
                snag
              </div>
              {nav}
            </div>
            {account}
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1 pt-14 md:pt-0">{children}</main>
    </div>
  );
}
