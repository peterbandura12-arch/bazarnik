"use client";

import { useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";

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

  async function generate() {
    if (text.trim().length < 10 || loading) return;
    setLoading(true);
    setError(null);
    setDraft(null);

    try {
      const res = await fetch("/api/ai/listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setDraft(data.data as AiListingDraft);
      } else {
        setError(data.error ?? "Generovanie sa nepodarilo, skúste to znova.");
      }
    } catch {
      setError("Spojenie zlyhalo, skúste to ešte raz.");
    } finally {
      setLoading(false);
    }
  }

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
          onClick={generate}
          disabled={text.trim().length < 10 || loading}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />generujem…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />vygenerovať AI návrh
            </>
          )}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
      {draft && (
        <div className="mt-3 rounded-lg border border-brand-200 bg-white p-3 text-sm">
          <p className="font-semibold text-ink-900">{draft.title}</p>
          <p className="mt-1 text-ink-600">{draft.description}</p>
          <p className="mt-1 text-ink-500">
            Cena: <strong>{draft.price === 0 ? "darujem" : `${draft.price} €`}</strong> · kategória:
            {" "}
            <strong>{draft.categorySlug}</strong>
          </p>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="mt-2 flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <Sparkles className="h-3.5 w-3.5" />
            použiť údaje
          </button>
        </div>
      )}
    </div>
  );
}
