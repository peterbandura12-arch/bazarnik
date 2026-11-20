export function isAiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export interface GenerateResult {
  ok: boolean;
  text: string | null;
  status?: number;
  detail?: string;
}

const PRIMARY_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
const MODEL_FALLBACKS = [
  PRIMARY_MODEL,
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash-lite",
].filter((m, i, arr) => arr.indexOf(m) === i);

// Kratší timeout na pokus = rýchlejšie prejdenie na záložný model, keď je
// jeden pretlačený – používateľá menej čaká.
const ATTEMPT_TIMEOUT_MS = 15_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Zavola Google Gemini a vrati vygenerovany text.
 * Skusa viacero flash modelov – ak je jeden pretazeny alebo nedostupny,
 * automaticky prejde na dalsi v poradi.
 */
export async function generateText({
  system,
  prompt,
  json = false,
  maxTokens = 1024,
}: {
  system: string;
  prompt: string;
  json?: boolean;
  maxTokens?: number;
}): Promise<GenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, text: null, detail: "missing-key" };

  let last: GenerateResult = { ok: false, text: null, detail: "no-attempt" };

  for (let m = 0; m < MODEL_FALLBACKS.length; m++) {
    const model = MODEL_FALLBACKS[m];
    if (m > 0) await sleep(250);

    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await sleep(450);

      const result = await callGemini(model, apiKey, { system, prompt, json, maxTokens });
      if (result.ok) return result;

      last = result;
      if (result.status !== undefined && result.status !== 503 && result.status !== 429) break;
    }
  }
  return last;
}

async function callGemini(
  model: string,
  apiKey: string,
  {
    system,
    prompt,
    json,
    maxTokens,
  }: { system: string; prompt: string; json: boolean; maxTokens: number }
): Promise<GenerateResult> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: maxTokens,
            thinkingConfig: { thinkingLevel: "low" },
            ...(json ? { responseMimeType: "application/json" } : {}),
          },
        }),
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      }
    );

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const errText = await res.text();
        try {
          const parsed = JSON.parse(errText) as { error?: { message?: string } };
          detail = `${res.status}: ${parsed.error?.message ?? errText.slice(0, 200)}`;
        } catch {
          detail = `${res.status}: ${errText.slice(0, 200)}`;
        }
      } catch {
        /* keep default */
      }
      return { ok: false, text: null, status: res.status, detail };
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string } | null) => p?.text ?? "")
        .join("") ?? "";
    if (!text.trim()) {
      const reason = data?.candidates?.[0]?.finishReason ?? data?.promptFeedback?.blockReason;
      return {
        ok: false,
        text: null,
        status: res.status,
        detail: `prazdna odpoved${reason ? ` (${String(reason)})` : ""}`,
      };
    }
    return { ok: true, text: text.trim() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch-failed";
    const isTimeout = msg.includes("timeout") || msg.includes("abort");
    return {
      ok: false,
      text: null,
      status: isTimeout ? 504 : undefined,
      detail: `fetch: ${msg}`,
    };
  }
}
