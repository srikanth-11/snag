import { env } from "@/lib/env";

// A provider turns (prompt, optional screenshot) into raw model text (expected JSON).
export interface Provider {
  name: string;
  run(prompt: string, imageB64?: string): Promise<string>;
}

class LlmError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

// --- Google Gemini (REST, JSON mode) ---
function gemini(model: string, key: string): Provider {
  return {
    name: `gemini:${model}`,
    async run(prompt, imageB64) {
      const parts: unknown[] = [{ text: prompt }];
      if (imageB64) parts.push({ inline_data: { mime_type: "image/jpeg", data: imageB64 } });
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.5 },
          }),
        },
      );
      if (!res.ok) throw new LlmError(`gemini ${res.status}`, res.status);
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== "string") throw new LlmError("gemini: empty response");
      return text;
    },
  };
}

// --- OpenAI-compatible (NVIDIA NIM, Groq) ---
function openaiCompat(name: string, baseUrl: string, model: string, key: string): Provider {
  return {
    name,
    async run(prompt, imageB64) {
      const content: unknown[] = [{ type: "text", text: prompt }];
      if (imageB64)
        content.push({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${imageB64}` },
        });
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content }],
          response_format: { type: "json_object" },
          temperature: 0.5,
        }),
      });
      if (!res.ok) throw new LlmError(`${name} ${res.status}`, res.status);
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (typeof text !== "string") throw new LlmError(`${name}: empty response`);
      return text;
    },
  };
}

// Ordered chain: primary Gemini, then same-key cheaper Gemini, then other vendors.
export function defaultProviders(): Provider[] {
  const chain: Provider[] = [];
  if (env.geminiKey) {
    // 2.5 models are blocked for new API keys; these are the current free ones.
    chain.push(gemini("gemini-3-flash-preview", env.geminiKey));
    chain.push(gemini("gemini-flash-lite-latest", env.geminiKey));
  }
  if (env.nvidiaKey)
    chain.push(
      openaiCompat(
        "nvidia",
        "https://integrate.api.nvidia.com/v1",
        "meta/llama-3.2-90b-vision-instruct",
        env.nvidiaKey,
      ),
    );
  if (env.groqKey)
    chain.push(
      openaiCompat("groq", "https://api.groq.com/openai/v1", "qwen/qwen3.6-27b", env.groqKey),
    );
  return chain;
}
