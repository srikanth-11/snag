export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <div className="h-4 w-16 animate-pulse rounded bg-bone/10" />
      <div className="mt-3 h-9 w-2/3 animate-pulse rounded bg-bone/10" />
      <div className="mt-6 h-40 animate-pulse rounded-xl border border-edge bg-ash/40" />
      <div className="mt-6 flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-7 w-24 animate-pulse rounded-full bg-bone/10" />
        ))}
      </div>
      <div className="mt-8 space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl border border-edge bg-ash/40" />
        ))}
      </div>
    </main>
  );
}
