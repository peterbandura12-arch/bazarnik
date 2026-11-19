export function isAiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export interface GenerateResult {
  ok: boolean;
  text: string | null;
  status?: number;
  detail?: string;
}

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Zavola Google Gemini a vrati vygenerovany text.
 * Pri chybe vrati ok:false + detail (HTTP kod alebo popis) na debugovanie.
 * Pri pretazeni (503/429) automaticky opakuje az 3-krat.
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

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(1500 * attempt);

    const result = await callGemini(apiKey, { system, prompt, json, maxTokens });
    if (result.ok || (result.status !== 503 && result.status !== 429)) {
      return result;
    }
  }
  return { ok: false, text: null, detail: "503: preťažené – skúste to o chvíľu" };
}

async function callGemini(
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
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`,
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
        signal: AbortSignal.timeout(30000),
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
    return {
      ok: false,
      text: null,
      detail: err instanceof Error ? `fetch: ${err.message}` : "fetch-failed",
    };
  }
}
