const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";

export function isAiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export interface GenerateResult {
  ok: boolean;
  text: string | null;
  status?: number;
  detail?: string;
}

/**
 * Zavola Google Gemini (gemini-2.0-flash) a vrati vygenerovany text.
 * Pri chybe vrati ok:false + detail (HTTP kod alebo popis) na debugovanie.
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
            ...(json ? { responseMimeType: "application/json" } : {}),
          },
        }),
        signal: AbortSignal.timeout(20000),
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
      return { ok: false, text: null, status: res.status, detail: `prazdna odpoved${reason ? ` (${String(reason)})` : ""}` };
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
