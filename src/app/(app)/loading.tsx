export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="h-9 w-48 animate-pulse rounded bg-bone/10" />
      <div className="mt-6 grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-edge bg-ash/40" />
        ))}
      </div>
      <div className="mt-8 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl border border-edge bg-ash/30" />
        ))}
      </div>
    </div>
  );
}
