export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="h-4 w-24 animate-pulse rounded bg-bone/10" />
      <div className="mt-3 h-8 w-1/2 animate-pulse rounded bg-bone/10" />
      <div className="mt-8 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="aspect-[16/10] animate-pulse rounded-xl border border-edge bg-ash" />
        <div className="h-[360px] animate-pulse rounded-xl border border-edge bg-ash/50" />
      </div>
    </main>
  );
}
