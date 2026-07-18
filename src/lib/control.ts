// In-process cancellation for running hunts. Works because the worker and the
// API share one container (same reason the SSE bus is in-process).
const cancelled = new Set<string>();

export function requestCancel(jobId: string): void {
  cancelled.add(jobId);
}

export function isCancelled(jobId: string): boolean {
  return cancelled.has(jobId);
}

export function clearCancel(jobId: string): void {
  cancelled.delete(jobId);
}
