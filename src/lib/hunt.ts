import type { Action, StreamEvent } from "@/lib/types";
import type { PersonaKey } from "@/lib/agent/persona";
import { runHunt } from "@/lib/agent/loop";
import { createPlaywrightDriver, closeBrowser } from "@/lib/browser";
import { detectSoft } from "@/lib/agent/detect";
import { screenFindings } from "@/lib/agent/skeptic";
import { think } from "@/lib/llm";
import { publish } from "@/lib/bus";
import { addStep, addFinding, setJobStatus } from "@/lib/db";
import { uploadShot } from "@/lib/storage";

// Orchestrates one hunt: run the loop, persist each event, and stream it live.
// Fire-and-forget from the POST handler.
export async function startHunt(input: {
  jobId: string;
  url: string;
  persona: PersonaKey;
}): Promise<void> {
  const { jobId, url, persona } = input;

  const emit = async (event: StreamEvent) => {
    try {
      if (event.type === "step") {
        await addStep({
          jobId,
          n: event.n,
          action: event.action,
          thought: event.thought,
          screenshotPath: event.shot,
          url: event.url,
        });
      } else if (event.type === "finding") {
        await addFinding(jobId, event.finding);
      } else if (event.type === "status" && (event.status === "done" || event.status === "error")) {
        await setJobStatus(jobId, event.status);
      }
    } catch {
      // persistence is best-effort; the live stream still works
    }
    publish(jobId, event);
  };

  try {
    const driver = await createPlaywrightDriver(url);
    await runHunt({
      url,
      persona,
      driver,
      emit,
      think: (a) => think<Action>({ prompt: a.prompt, imageB64: a.imageB64 }),
      saveShot: (n, b64) => uploadShot(jobId, n, b64),
      inspect: async (a) =>
        screenFindings(
          await detectSoft({ imageB64: a.imageB64, url: a.url, actions: a.actions }),
        ),
    });
  } catch (err) {
    await setJobStatus(jobId, "error", {
      error: err instanceof Error ? err.message : "hunt failed",
    });
    publish(jobId, { type: "status", status: "error", note: "hunt failed" });
  } finally {
    // Chromium leaks over long sessions — recycle it between hunts.
    await closeBrowser();
  }
}
