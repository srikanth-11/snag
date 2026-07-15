import { defaultProviders, type Provider } from "@/lib/llm/providers";

// Extract a JSON object from model text that may be fenced or padded with prose.
export function repairJson<T = unknown>(text: string): T {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // fall through to brace extraction
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  }
  throw new Error(`unparseable model output: ${text.slice(0, 200)}`);
}

export interface ThinkOptions {
  prompt: string;
  imageB64?: string;
  /** Injectable for tests; defaults to the env-configured chain. */
  providers?: Provider[];
}

// Try providers in order; on any error (429, network, bad JSON) fall to the next.
// Returns the first provider's validly-parsed object. Throws only if all fail.
export async function think<T = unknown>({
  prompt,
  imageB64,
  providers = defaultProviders(),
}: ThinkOptions): Promise<T> {
  if (providers.length === 0) throw new Error("no LLM providers configured (set GEMINI_API_KEY)");
  let lastError: unknown;
  for (const provider of providers) {
    try {
      const text = await provider.run(prompt, imageB64);
      return repairJson<T>(text);
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `all LLM providers failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}
