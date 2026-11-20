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

// Najrýchlejší model – pre krátke JSON úlohy (router zámeru).
const FAST_MODEL = process.env.GEMINI_FAST_MODEL ?? "gemini-3.5-flash-lite";
const FAST_FALLBACKS = [FAST_MODEL, "gemini-flash-latest", PRIMARY_MODEL].filter(
  (m, i, arr) => arr.indexOf(m) === i
);

// Kratší timeout na pokus = rýchlejšie prejdenie na záložný model, keď je
// jeden pretlačený – používateľá menej čaká.
const ATTEMPT_TIMEOUT_MS = 15_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Rýchle JSON volanie pre jednoduché úlohy (rozpoznanie zámeru, extrakcia
 * parametrov). Používa najrýchlejší model, aby bot začal reagovať okamžite –
 * dlhá generatívna odpoveď ide až cez streamText.
 */
export async function generateFastJson({
  system,
  prompt,
  maxTokens = 400,
}: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<GenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, text: null, detail: "missing-key" };

  let last: GenerateResult = { ok: false, text: null, detail: "no-attempt" };
  for (let m = 0; m < FAST_FALLBACKS.length; m++) {
    if (m > 0) await sleep(250);
    const result = await callGemini(FAST_FALLBACKS[m], apiKey, {
      system,
      prompt,
      json: true,
      maxTokens,
    });
    if (result.ok) return result;
    last = result;
  }
  return last;
}

/**
 * Streamovaná generácia (SSE od Google) – tokeny odovzdáva hneď, ako prídu,
 * takže chat začína odpovedať už po ~1 s namiesto čakania na celú odpoveď.
 * Vracia async generátor kúskov textu; ak model zlyhá skôr než prvé tokeny,
 * skúsi ďalší model v rade.
 */
export async function* streamText({
  system,
  prompt,
  maxTokens = 900,
}: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): AsyncGenerator<string, void, void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return;

  for (const model of MODEL_FALLBACKS) {
    let produced = false;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`,
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
            },
          }),
          signal: AbortSignal.timeout(60_000),
        }
      );

      if (!res.ok || !res.body) continue;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload) as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string } | null> } }>;
            };
            const chunk =
              parsed?.candidates?.[0]?.content?.parts?.map((p) => p?.text ?? "").join("") ?? "";
            if (chunk) {
              produced = true;
              yield chunk;
            }
          } catch {
            // neúplný kus SSE – preskočíme
          }
        }
      }
      if (produced) return;
    } catch {
      if (produced) return;
      continue;
    }
  }
}

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

/**
 * Rychle JSON volanie s FOTKAMI (multimodalne) – celkom ako generateFastJson,
 * ale do requestu prida inline obrazky (base64). Sluzi na AI klasifikaciu
 * kategorii podla fotky inzeratu, nie len podla nazvu.
 */
export async function generateFastJsonVision({
  system,
  prompt,
  images = [],
  maxTokens = 400,
}: {
  system: string;
  prompt: string;
  images?: Array<{ mime_type: string; data: string }>;
  maxTokens?: number;
}): Promise<GenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, text: null, detail: "missing-key" };

  let last: GenerateResult = { ok: false, text: null, detail: "no-attempt" };
  for (let m = 0; m < FAST_FALLBACKS.length; m++) {
    if (m > 0) await sleep(250);
    const result = await callGemini(FAST_FALLBACKS[m], apiKey, {
      system,
      prompt,
      json: true,
      maxTokens,
      images,
    });
    if (result.ok) return result;
    last = result;
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
    images = [],
  }: {
    system: string;
    prompt: string;
    json: boolean;
    maxTokens: number;
    images?: Array<{ mime_type: string; data: string }>;
  }
): Promise<GenerateResult> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [
            {
              role: "user",
              parts: (
                images.length > 0
                  ? [{ text: prompt }, ...images.map((im) => ({ inline_data: im }))]
                  : [{ text: prompt }]
              ),
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: maxTokens,
            thinkingConfig: { thinkingLevel: "low" },
            ...(json ? { responseMimeType: "application/json" } : {}),
          },
        }),
        signal: AbortSignal.timeout(images.length > 0 ? ATTEMPT_TIMEOUT_MS * 2 : ATTEMPT_TIMEOUT_MS),
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
