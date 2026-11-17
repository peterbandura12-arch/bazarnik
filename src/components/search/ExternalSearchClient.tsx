"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Search } from "lucide-react";

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

export function ExternalSearchClient({ enabled }: { enabled: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) {
    return (
      <div className="mt-8 rounded-xl border border-ink-200 bg-ink-50 p-6 text-sm text-ink-600">
        Vyhľadávanie na externých portáloch zatiaľ nie je aktivované. Aktivuje sa automaticky po
        nastavení kľúčov Google Programmable Search (<code>GOOGLE_CSE_API_KEY</code>,{" "}
        <code>GOOGLE_CSE_CX</code>).
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (value.length < 2) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/external-search?q=${encodeURIComponent(value)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Vyhľadávanie zlyhalo.");
        setResults(null);
      } else {
        setResults(data.items ?? []);
      }
    } catch {
      setError("Vyhľadávanie zlyhalo. Skúste to znova.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8">
      <form role="search" onSubmit={handleSubmit} className="flex w-full items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hľadajte na Bazoši, Aukre, Vinted…"
            aria-label="Vyhľadávanie na externých portáloch"
            className="h-11 w-full rounded-l-lg border border-r-0 border-ink-200 bg-white pl-9 pr-4 text-sm placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="h-11 rounded-r-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 sm:px-6"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hľadať"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {results && (
        <div className="mt-6">
          <p className="mb-3 text-sm text-ink-500">
            {results.length === 0
              ? "Nič sa nenašlo. Skúste iný výraz."
              : `Nájdených ${results.length} výsledkov – kliknutím prejdete na pôvodný portál.`}
          </p>
          <ul className="space-y-3">
            {results.map((item) => (
              <li key={item.link}>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="block rounded-xl border border-ink-100 bg-white p-4 transition-colors hover:border-brand-300"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-medium text-brand-700">{item.title}</span>
                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                  </span>
                  {item.snippet && <span className="mt-1 block text-sm text-ink-600">{item.snippet}</span>}
                  {item.displayLink && (
                    <span className="mt-1 block text-xs text-ink-400">{item.displayLink}</span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
