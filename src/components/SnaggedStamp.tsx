import { Hook } from "@/components/brand";

export function SnaggedStamp() {
  return (
    <span className="inline-flex -rotate-3 items-center gap-1 rounded border border-proof/50 bg-proof/10 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-proof">
      <Hook className="h-3 w-3" />
      snagged
    </span>
  );
}
