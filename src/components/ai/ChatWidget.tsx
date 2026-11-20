"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bot, Heart, Loader2, LockKeyhole, Plus, Send, Sparkles, X } from "lucide-react";
import { buildListingUrl, cn, formatPrice } from "@/lib/utils";
import { computePriceStats, getPriceVerdict } from "@/lib/price-analysis";
import { useChat } from "@/components/ai/ChatProvider";
import type { ExternalResult } from "@/lib/meta-search";
import type { UnifiedListing } from "@/types/database";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  items?: UnifiedListing[];
  externalItems?: ExternalResult[];
  suggestions?: string[];
}

/** Navrhované možnosti (chips) pod správou bota – klik pošle správu za teba. */
function SuggestionChips({
  suggestions,
  onPick,
}: {
  suggestions: string[];
  onPick: (text: string) => void;
}) {
  if (suggestions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          className="rounded-full border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:border-brand-500 hover:bg-brand-100 active:scale-95"
        >
          {s}
        </button>
      ))}
    </div>
  );
}

/** Zoznam vysledkov z ostatnych portalov v chate (klik -> povodny portal). */
function ExternalChatResults({ items }: { items: ExternalResult[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="px-0.5 text-[11px] font-bold uppercase tracking-wider text-ink-400">
        Nájdené aj na iných portáloch
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.link}>
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center gap-2 rounded-lg border border-brand-200/60 bg-brand-50/40 p-2 text-sm transition hover:border-brand-400 hover:bg-brand-50"
            >
              {item.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnail}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded object-cover"
                />
              ) : (
                <span className="h-10 w-10 shrink-0 rounded bg-brand-100" />
              )}
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block font-medium text-ink-900">{item.title}</span>
                <span className="text-xs text-brand-600">
                  {item.displayLink.replace(/^www\./, "")}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Dobrý deň! Som AI asistent Bazárnik. Napíšte mi, čo hľadáte (napr. horský bicykel do 200 € v Žiline) a nájdem relevantné inzeráty. Poradím vám aj s cenami, predajom alebo čímkoľvek iným – pýtajte sa na všetko.",
};

function ChatResults({ items, onClose }: { items: UnifiedListing[]; onClose: () => void }) {
  const priced = items
    .map((item) => (typeof item.price === "number" ? item.price : null))
    .filter((p): p is number => p !== null && p > 0);
  const stats = computePriceStats(priced);
  const showStats = stats.median != null && priced.length >= 3;

  return (
    <>
      {showStats && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-2 text-[11px] leading-relaxed text-ink-700">
          <p className="font-bold text-brand-700">Analýza cien ({stats.count} inzerátov)</p>
          <p>
            Priemer <b>{formatPrice(Math.round(stats.average ?? 0), "EUR")}</b> · Medián{" "}
            <b>{formatPrice(Math.round(stats.median ?? 0), "EUR")}</b>
          </p>
          <p>
            Rozpätie {formatPrice(Math.round(stats.min ?? 0), "EUR")} –{" "}
            {formatPrice(Math.round(stats.max ?? 0), "EUR")}
          </p>
        </div>
      )}
      <ul className="space-y-1.5">
        {items.map((item) => {
          const verdict = showStats ? getPriceVerdict(item.price, stats.median) : null;
          return (
            <li key={item.id}>
              <Link
                href={buildListingUrl(item)}
                onClick={onClose}
                className="flex items-center gap-2 rounded-lg border border-ink-200 bg-white p-2 text-sm transition hover:border-brand-300 hover:bg-brand-50"
              >
                {item.image_url ? (
                  <span className="relative h-10 w-10 shrink-0">
                    <Image
                      src={item.image_url}
                      alt=""
                      fill
                      sizes="40px"
                      className="rounded object-cover"
                      style={{
                        objectPosition:
                          item.focal_x != null && item.focal_y != null
                            ? `${(item.focal_x * 100).toFixed(0)}% ${(item.focal_y * 100).toFixed(0)}%`
                            : "50% 50%",
                      }}
                    />
                  </span>
                ) : (
                  <span className="h-10 w-10 shrink-0 rounded bg-ink-100" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink-900">
                    {item.title}
                  </span>
                  <span className="text-xs text-ink-500">
                    {item.location ?? "Slovensko"}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-bold text-brand-700">
                    {formatPrice(item.price, item.currency)}
                  </span>
                  {verdict && verdict.level !== "fair" && (
                    <span
                      className={cn(
                        "block text-[10px] font-semibold",
                        verdict.diffPct <= -10 ? "text-emerald-600" : "text-amber-600"
                      )}
                    >
                      {verdict.label}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function ChatWidget({ enabled, isLoggedIn = false }: { enabled: boolean; isLoggedIn?: boolean }) {
  const { chatOpen: open, setChatOpen: setOpen } = useChat();
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  if (!enabled) return null;

  /** Aktualizuje poslednú (práve sa pťiacu) asistentovu správu. */
  function patchAssistant(patch: Partial<ChatMessage>) {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.role !== "assistant") return prev;
      copy[copy.length - 1] = { ...last, ...patch };
      return copy;
    });
  }

  async function send(presetContent?: string) {
    const content = (presetContent ?? input).trim();
    if (!content || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);
    let acc = "";

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        patchAssistant({ content: data?.error ?? "Prepáčte, odpoveď sa nepodarila." });
        return;
      }

      // Stream: po riadkoch NavLink JSON udalosti {type: delta|results|message|suggest|done}.
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
          if (!line.trim()) continue;
          let ev: {
            type: string;
            text?: string;
            suggest?: string[];
            items?: UnifiedListing[];
            externalItems?: ExternalResult[];
          };
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.type === "start" || ev.type === "done") continue;

          if (ev.type === "status") {
            acc = "";
            patchAssistant({ content: "" });
          } else if (ev.type === "delta") {
            acc += ev.text ?? "";
            patchAssistant({ content: acc });
          } else if (ev.type === "message") {
            acc = ev.text ?? "";
            patchAssistant({ content: acc, suggestions: ev.suggest ?? [] });
          } else if (ev.type === "results") {
            acc = ev.text ?? "";
            patchAssistant({
              content: acc,
              items: Array.isArray(ev.items) ? ev.items : [],
              externalItems: Array.isArray(ev.externalItems) ? ev.externalItems : [],
            });
          }
        }
      }
    } catch {
      patchAssistant({
        content: acc || "Spojenie sa prerušilo, skúste to znova.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && !isLoggedIn && (
        <div className="flex w-[min(92vw,340px)] flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl animate-fade-up">
          <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-brand-600 to-brand-800 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="text-sm font-bold">AI asistent Bazárnik</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Zavrieť chat"
              className="rounded-full p-1 hover:bg-white/15"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col items-center p-6 text-center">
            <span
              aria-hidden
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-lg"
            >
              <LockKeyhole className="h-7 w-7" />
            </span>
            <h3 className="mt-3 text-base font-bold text-ink-900">AI asistent je len pre prihlásených</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Prihláste sa alebo si zdarma vytvorte účet – a AI vám hneď pomôže nájsť inzeráty,
              poradiť s cenami a odpovie na všetko.
            </p>
            <div className="mt-5 flex w-full flex-col gap-2.5">
              <Link
                href="/prihlasenie"
                className="flex h-11 w-full items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Prihlásiť sa
              </Link>
              <Link
                href="/registracia"
                className="flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-r from-brand-600 to-violet-600 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition-all hover:from-brand-500 hover:to-violet-500"
              >
                Zaregistrovať sa
              </Link>
            </div>
            <p className="mt-3 text-xs text-ink-400">Registrácia je zdarma · trvá minútu</p>
          </div>
        </div>
      )}

      {open && isLoggedIn && (
        <div className="flex h-[480px] max-h-[72vh] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl animate-fade-up">
          <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-brand-600 to-brand-800 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="text-sm font-bold">AI asistent Bazárnik</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Zavrieť chat"
              className="rounded-full p-1 hover:bg-white/15"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-3 py-2 text-sm text-white">
                    {m.content}
                  </p>
                </div>
              ) : (
                <div key={i} className="space-y-2">
                  {m.content && (
                    <p className="max-w-[85%] rounded-2xl rounded-bl-sm bg-ink-100 px-3 py-2 text-sm text-ink-800">
                      {m.content}
                    </p>
                  )}
                  {m.suggestions && m.suggestions.length > 0 && (
                    <SuggestionChips suggestions={m.suggestions} onPick={(text) => send(text)} />
                  )}
                  {m.items && m.items.length > 0 && (
                    <ChatResults items={m.items} onClose={() => setOpen(false)} />
                  )}
                  {m.externalItems && m.externalItems.length > 0 && (
                    <ExternalChatResults items={m.externalItems} />
                  )}
                </div>
              )
            )}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-ink-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Práve hľadám…
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-ink-200 p-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Čo hľadáte alebo sa chcete spýtať?"
              className="min-w-0 flex-1 rounded-full border border-ink-200 bg-ink-50 px-4 py-2 text-sm outline-none focus:border-brand-500"
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={loading || !input.trim()}
              aria-label="Odoslať správu"
              className="shrink-0 rounded-full bg-brand-600 p-2.5 text-white transition hover:bg-brand-700 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Link
          href="/pridat-inzerat"
          title="Pridať inzerát"
          aria-label="Pridať inzerát"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-600 text-white shadow-lg transition-transform duration-300 hover:scale-110 active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </Link>
        <Link
          href="/profil/oblubene"
          title="Obľúbené položky"
          aria-label="Obľúbené položky"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-ink-200 bg-white text-rose-500 shadow-lg transition-transform duration-300 hover:scale-110 hover:text-rose-600 active:scale-95"
        >
          <Heart className="h-5 w-5" />
        </Link>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label="Otvoriť AI asistenta"
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-xl transition-transform hover:scale-105"
        >
          {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
          {!open && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-accent-500" />
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
