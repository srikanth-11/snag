export function Hook({ className = "" }: { className?: string }) {
  // The brand glyph: a caught thread / hook notch.
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <path
        d="M6 3v9a6 6 0 0 0 12 0"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-1.5 font-display text-xl font-bold tracking-tight">
      <Hook className="h-5 w-5 text-ember" />
      snag
    </span>
  );
}
