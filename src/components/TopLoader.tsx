"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// A thin top progress bar that appears the instant an internal link is clicked
// and clears when the new route settles — so a click never feels like nothing
// happened (matters most on a cold-started free host). No dependencies.
export function TopLoader() {
  const [active, setActive] = useState(false);
  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState(pathname);

  // Route changed → navigation finished. Adjust state during render (React's
  // sanctioned pattern), tracking the previous path in state rather than a ref.
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    if (active) setActive(false);
  }

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as HTMLElement)?.closest?.("a");
      const href = a?.getAttribute("href");
      if (!a || !href) return;
      if (href.startsWith("#") || a.target === "_blank" || /^https?:\/\//.test(href)) return;
      setActive(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: 2,
        zIndex: 100,
        background: "var(--ember)",
        width: active ? "92%" : "0%",
        opacity: active ? 1 : 0,
        transition: active ? "width 8s cubic-bezier(0.1,0.7,0.1,1)" : "width .2s, opacity .3s",
        pointerEvents: "none",
      }}
    />
  );
}
