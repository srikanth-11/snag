import { EventEmitter } from "node:events";
import type { StreamEvent } from "@/lib/types";

// In-process pub/sub bridging the running hunt to SSE subscribers. Works because
// the worker and the API run in the same container/process on Hugging Face.
const emitters = new Map<string, EventEmitter>();

function emitterFor(jobId: string): EventEmitter {
  let e = emitters.get(jobId);
  if (!e) {
    e = new EventEmitter();
    e.setMaxListeners(100);
    emitters.set(jobId, e);
  }
  return e;
}

export function publish(jobId: string, event: StreamEvent): void {
  emitterFor(jobId).emit("event", event);
  if (event.type === "status" && (event.status === "done" || event.status === "error")) {
    // Let late subscribers still receive the terminal event, then clean up.
    setTimeout(() => emitters.delete(jobId), 60_000);
  }
}

export function subscribe(jobId: string, cb: (e: StreamEvent) => void): () => void {
  const e = emitterFor(jobId);
  e.on("event", cb);
  return () => e.off("event", cb);
}
