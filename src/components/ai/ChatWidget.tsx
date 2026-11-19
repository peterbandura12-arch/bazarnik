"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Heart, Loader2, Plus, Send, Sparkles, X } from "lucide-react";
import { buildListingUrl, cn, formatPrice } from "@/lib/utils";
import { computePriceStats, getPriceVerdict } from "@/lib/price-analysis";
import { useChat } from "@/components/ai/ChatProvider";
import type { UnifiedListing } from "@/types/database";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  items?: UnifiedListing[];
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
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded object-cover"
                    style={{
                      objectPosition:
                        item.focal_x != null && item.focal_y != null
                          ? `${(item.focal_x * 100).toFixed(0)}% ${(item.focal_y * 100).toFixed(0)}%`
                          : "50% 50%",
                    }}
                  />
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

export function ChatWidget({ enabled }: { enabled: boolean }) {
  const { chatOpen: open, setChatOpen: setOpen } = useChat();
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  if (!enabled) return null;

  async function send() {
    const content = input.trim();
    if (!content || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

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
      const data = await res.json();
      if (data.ok) {
        setMessages([
          ...nextMessages,
          {
            role: "assistant",
            content: data.reply?.text ?? "",
            items: Array.isArray(data.items) ? data.items : [],
          },
        ]);
      } else {
        setMessages([
          ...nextMessages,
          { role: "assistant", content: data.error ?? "Prepáčte, odpoveď sa nepodarila." },
        ]);
      }
    } catch {
      setMessages([
        ...nextMessages,
        { role: "assistant", content: "Spojenie sa prerušilo, skúste to znova." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
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
                  <p className="max-w-[85%] rounded-2xl rounded-bl-sm bg-ink-100 px-3 py-2 text-sm text-ink-800">
                    {m.content}
                  </p>
                  {m.items && m.items.length > 0 && (
                    <ChatResults items={m.items} onClose={() => setOpen(false)} />
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
              onClick={send}
              disabled={loading || !input.trim()}
              aria-label="Odoslať správu"
              className="shrink-0 rounded-full bg-brand-600 p-2.5 text-white transition hover:bg-brand-700 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col items-end gap-2">
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
      </div>

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
  );
}
