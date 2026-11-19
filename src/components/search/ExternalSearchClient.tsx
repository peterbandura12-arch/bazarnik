"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  thumbnail: string | null;
}

const PORTALS = [
  { name: "Bazoš SK", domain: "bazos.sk" },
  { name: "Bazoš CZ", domain: "bazos.cz" },
  { name: "Aukro", domain: "aukro.cz" },
  { name: "Vinted SK", domain: "vinted.sk" },
  { name: "Autobazar.eu", domain: "autobazar.eu" },
  { name: "Bazar.sk", domain: "bazar.sk" },
];

function portalSearchUrl(domain: string, query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${query} site:${domain}`)}`;
}

export function ExternalSearchClient({ enabled }: { enabled: boolean }) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [apiResults, setApiResults] = useState<SearchResult[] | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (value.length < 2) return;

    setSubmitted(value);
    setApiResults(null);
    setApiError(null);

    if (!enabled) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/external-search?q=${encodeURIComponent(value)}`);
      const data = await res.json();
      if (res.ok && data.items) {
        setApiResults(data.items);
      } else if (enabled) {
        setApiError(data.reason ?? data.error ?? null);
      }
    } catch {
      if (enabled) setApiError("Vyhľadávanie zlyhalo.");
    } finally {
      setLoading(false);
    }
  }

  function openAll() {
    for (const portal of PORTALS) {
      window.open(portalSearchUrl(portal.domain, submitted), "_blank", "noopener");
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

      {submitted && (
        <div className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink-900">
              „{submitted}“ na portáloch
            </h2>
            <button
              type="button"
              onClick={openAll}
              className="hidden rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:border-brand-400 hover:text-brand-700 sm:block"
            >
              Otvoriť všetky
            </button>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            Kliknutím otvoríte vyhľadávanie priamo na danom portáli.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PORTALS.map((portal) => (
              <a
                key={portal.domain}
                href={portalSearchUrl(portal.domain, submitted)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-ink-100 bg-white p-4 text-center transition-colors hover:border-brand-300 hover:bg-brand-50"
              >
                <span className="block text-sm font-medium text-ink-900">{portal.name}</span>
                <span className="mt-0.5 block text-xs text-ink-400">{portal.domain}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {apiError && enabled && (
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Rozšírené výsledky sa nepodarilo načítať ({apiError}) – použite kartu portálu vyššie.
        </p>
      )}

      {apiResults && apiResults.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-ink-900">Rozšírené výsledky</h2>
          <ul className="mt-3 space-y-3">
            {apiResults.map((item) => (
              <li key={item.link}>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex gap-3 rounded-xl border border-ink-100 bg-white p-3 transition-colors hover:border-brand-300 sm:p-4"
                >
                  {item.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnail}
                      alt=""
                      loading="lazy"
                      className="h-20 w-20 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-ink-50">
                      <Search className="h-6 w-6 text-ink-200" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block font-medium text-brand-700">{item.title}</span>
                    {item.snippet && <span className="mt-1 block line-clamp-2 text-sm text-ink-600">{item.snippet}</span>}
                    {item.displayLink && (
                      <span className="mt-1 block text-xs text-ink-400">{item.displayLink}</span>
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
