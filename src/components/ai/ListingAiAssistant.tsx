"use client";

import { useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";

export interface AiListingDraft {
  title: string;
  description: string;
  price: number;
  condition: "nove" | "ako_nove" | "pouzite" | "na_diely";
  categorySlug: string;
  brand: string;
  model: string;
  location: string;
}

export function ListingAiAssistant({
  onApply,
}: {
  onApply: (draft: AiListingDraft) => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AiListingDraft | null>(null);

  async function generate(): Promise<void> {
    const clean = text.trim();
    if (loading) return;
    if (clean.length < 10) {
      setError("Napíšte prosím aspoň jednu vetu o veci, ktorú predávate (najmenej 10 znakov).");
      return;
    }

    setLoading(true);
    setError(null);
    setDraft(null);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch("/api/ai/listing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: clean }),
          signal: AbortSignal.timeout(90_000),
        });
        const data = (await res.json().catch(() => null)) as
          | { ok: boolean; data?: AiListingDraft; error?: string }
          | null;

        if (data?.ok && data.data) {
          setDraft(data.data as AiListingDraft);
          setError(null);
          setLoading(false);
          return;
        }

        // Prechodové zlyhanie AI (502/503/504) – automaticky skúsime ešte raz.
        if (res.status >= 500 && attempt === 0) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }

        setError(data?.error ?? `Generovanie sa nepodarilo (stav ${res.status}). Skúste to znova.`);
        setLoading(false);
        return;
      } catch (err) {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        const msg = err instanceof Error && err.name === "TimeoutError"
          ? "Odpoveď trvala príliš dlho. Skúste to znova o chvíľu."
          : "Spojenie so serverom zlyhalo. Skontrolujte internet a skúste to znova.";
        setError(msg);
        setLoading(false);
        return;
      }
    }
    setLoading(false);
  }

  const hasDraft = Boolean(draft);

  return (
    <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-violet-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-white">
          <Wand2 className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-bold text-ink-900">AI pomocník pri inzeráte</h3>
        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-700">
          Beta
        </span>
      </div>
      <p className="mb-3 text-xs text-ink-500">
        Napíšte jednoducho, čo predávate (napr. „predám iPhone 13 128 GB modrý, rok a pol
        používaný, spravený v Bratislave za 350 eur") a AI vyplní návrh inzerátu za vás.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Predám…"
        className="w-full rounded-lg border border-ink-200 bg-white p-3 text-sm outline-none focus:border-brand-500"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void generate()}
          disabled={loading || hasDraft}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-40"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              pracujem na návrhu… (cca 5–10 s)
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              vygenerovať AI návrh
            </>
          )}
        </button>
        {hasDraft && !loading && (
          <button
            type="button"
            onClick={() => void generate()}
            className="flex items-center gap-1.5 rounded-full border border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            vygenerovať iný návrh
          </button>
        )}
      </div>
      {error && (
        <p className="mt-2 flex items-start gap-1.5 text-sm text-red-600" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {error}{" "}
            <button
              type="button"
              onClick={() => void generate()}
              className="font-semibold underline hover:text-red-700"
            >
              Skúsiť znova
            </button>
          </span>
        </p>
      )}
      {draft && !loading && (
        <div className="mt-3 rounded-lg border border-brand-200 bg-white p-3 text-sm">
          <p className="font-semibold text-ink-900">{draft.title}</p>
          <p className="mt-1 whitespace-pre-line text-ink-600">{draft.description}</p>
          <p className="mt-1 text-ink-500">
            Cena: <strong>{draft.price === 0 ? "darujem" : `${draft.price} €`}</strong> · stav:{" "}
            <strong>{draft.condition}</strong> · kategória:{" "}
            <strong>{draft.categorySlug}</strong>
          </p>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="mt-2 flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            použiť údaje
          </button>
        </div>
      )}
    </div>
  );
}
