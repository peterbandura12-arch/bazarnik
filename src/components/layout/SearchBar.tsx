"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, Clock, TrendingUp } from "lucide-react";
import { CATEGORY_TREE } from "@/lib/categories";

const HISTORY_KEY = "bazarnik:search-history";
const POPULAR = ["mobil", "notebook", "bicykel", "pneumatiky", "kočík", "gitara"];

interface Suggestion {
  label: string;
  href: string;
}

function loadHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveHistory(q: string) {
  const history = loadHistory().filter((h) => h !== q);
  history.unshift(q);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 8)));
}

export function SearchBar({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const trimmed = query.trim().toLowerCase();
  const categorySuggestions: Suggestion[] = trimmed
    ? CATEGORY_TREE.flatMap((p) => [
        { label: p.name, href: `/inzeraty?category=${p.slug}` },
        ...p.children.map((c) => ({ label: c.name, href: `/inzeraty?category=${c.slug}` })),
      ])
        .filter((s) => s.label.toLowerCase().includes(trimmed))
        .slice(0, 5)
    : [];

  const querySuggestions: Suggestion[] = trimmed
    ? [
        { label: `Hľadať „${query.trim()}“`, href: `/inzeraty?q=${encodeURIComponent(query.trim())}` },
      ]
    : [];

  function submit(q: string) {
    const value = q.trim();
    if (!value) return;
    saveHistory(value);
    setOpen(false);
    router.push(`/inzeraty?q=${encodeURIComponent(value)}`);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
        className="flex w-full items-center"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Hľadajte produkt, značku alebo kategóriu…"
            aria-label="Vyhľadávanie inzerátov"
            className="h-11 w-full rounded-l-lg border border-r-0 border-ink-200 bg-white pl-9 pr-9 text-sm placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Vymazať vyhľadávanie"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="h-11 rounded-r-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 sm:px-6"
        >
          Hľadať
        </button>
      </form>

      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg">
          {querySuggestions.length > 0 && (
            <ul className="py-1">
              {querySuggestions.map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    onClick={() => saveHistory(query.trim())}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-ink-50"
                  >
                    <Search className="h-4 w-4 text-ink-400" />
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {categorySuggestions.length > 0 && (
            <div className="border-t border-ink-100 py-1">
              <p className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
                Kategórie
              </p>
              <ul>
                {categorySuggestions.map((s) => (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-ink-50"
                    >
                      <TrendingUp className="h-4 w-4 text-brand-500" />
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!trimmed && history.length > 0 && (
            <div className="border-t border-ink-100 py-1">
              <p className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
                Nedávne vyhľadávanie
              </p>
              <ul>
                {history.map((h) => (
                  <li key={h}>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(h);
                        submit(h);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-ink-50"
                    >
                      <Clock className="h-4 w-4 text-ink-400" />
                      {h}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(HISTORY_KEY);
                  setHistory([]);
                }}
                className="w-full px-4 py-2 text-left text-xs text-ink-500 hover:text-ink-700"
              >
                Vymazať históriu
              </button>
            </div>
          )}

          {!trimmed && history.length === 0 && (
            <div className="border-t border-ink-100 py-1">
              <p className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
                Obľúbené výrazy
              </p>
              <div className="flex flex-wrap gap-2 px-4 pb-3 pt-1">
                {POPULAR.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setQuery(p);
                      submit(p);
                    }}
                    className="rounded-full border border-ink-200 px-3 py-1 text-xs text-ink-700 hover:border-brand-400 hover:text-brand-700"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
