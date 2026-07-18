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

export function Mark({ className = "" }: { className?: string }) {
  // The monogram: an S drawn from the brand's two accents, ember (a problem) flowing
  // into proof (verified). Matches the favicon.
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none">
      <path
        d="M46 22C46 14 22 14 22 24 22 29 33 30 32 32"
        stroke="#FF5C38"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 32C42 34 46 34 46 41 46 50 22 50 22 41"
        stroke="#4ED6C4"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-1.5 font-display text-xl font-bold tracking-tight">
      <Mark className="h-5 w-5" />
      snag
    </span>
  );
}
