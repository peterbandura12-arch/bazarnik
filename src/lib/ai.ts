export function isAiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

interface GenerateTextOptions {
  system: string;
  prompt: string;
  json?: boolean;
  maxTokens?: number;
}

/**
 * Zavola Google Gemini (gemini-2.0-flash) a vrati vygenerovany text.
 * Pri chybe alebo chybajucej konfiguracii vrati null.
 */
export async function generateText({
  system,
  prompt,
  json = false,
  maxTokens = 1024,
}: GenerateTextOptions): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
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

    if (!res.ok) return null;

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string } | null) => p?.text ?? "")
        .join("") ?? "";
    return text.trim() || null;
  } catch {
    return null;
  }
}
