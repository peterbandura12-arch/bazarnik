"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { ConversationRow, MessageRow } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface ConversationSummary {
  id: string;
  listingTitle: string;
  listingSlug: string;
  otherName: string;
  lastMessageAt: string;
}

export function MessagesClient({
  conversations,
  currentUserId,
  initialConversationId,
}: {
  conversations: ConversationSummary[];
  currentUserId: string;
  initialConversationId?: string;
}) {
  const [selected, setSelected] = useState<string | null>(initialConversationId ?? null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<string | null>(selected);
  selectedRef.current = selected;

  const loadMessages = useCallback(async (conversationId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at");
    setMessages((data ?? []) as MessageRow[]);

    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", currentUserId)
      .is("read_at", null);
  }, [currentUserId]);

  useEffect(() => {
    if (selected) {
      loadMessages(selected);
    }
  }, [selected, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selected) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`conversation-${selected}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selected}`,
        },
        (payload) => {
          if (selectedRef.current === selected) {
            setMessages((prev) =>
              prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new as MessageRow]
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selected]);

  async function send() {
    if (!selected || !newMessage.trim()) return;
    setSending(true);
    const supabase = createClient();
    await supabase.from("messages").insert({
      conversation_id: selected,
      sender_id: currentUserId,
      body: newMessage.trim(),
    });
    setNewMessage("");
    setSending(false);
    loadMessages(selected);
  }

  const activeConversation = conversations.find((c) => c.id === selected);

  return (
    <div className="grid min-h-[32rem] grid-cols-1 gap-4 md:grid-cols-3">
      <div className="overflow-hidden rounded-xl border border-ink-200 bg-white md:col-span-1">
        <h2 className="border-b border-ink-100 px-4 py-3 text-sm font-bold">Konverzácie</h2>
        {conversations.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-500">
            Zatiaľ nemáte žiadne konverzácie. Napíšte predávajúcemu z detailu inzerátu.
          </p>
        ) : (
          <ul className="max-h-[28rem] overflow-y-auto">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelected(c.id)}
                  className={`w-full px-4 py-3 text-left ${
                    selected === c.id ? "bg-brand-50" : "hover:bg-ink-50"
                  }`}
                >
                  <p className="truncate text-sm font-semibold text-ink-900">{c.listingTitle}</p>
                  <p className="truncate text-xs text-ink-500">
                    {c.otherName} · {formatRelativeDate(c.lastMessageAt)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex min-h-80 flex-col overflow-hidden rounded-xl border border-ink-200 bg-white md:col-span-2">
        {activeConversation ? (
          <>
            <div className="border-b border-ink-100 px-4 py-3">
              <p className="text-sm font-bold text-ink-900">{activeConversation.listingTitle}</p>
              <p className="text-xs text-ink-500">Konverzácia s: {activeConversation.otherName}</p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m) => {
                const isMine = m.sender_id === currentUserId;
                return (
                  <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                        isMine ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-900"
                      }`}
                    >
                      <p className="whitespace-pre-line break-words">{m.body}</p>
                      <p className={`mt-1 text-[10px] ${isMine ? "text-brand-200" : "text-ink-400"}`}>
                        {formatRelativeDate(m.created_at)}
                        {isMine && (m.read_at ? " · prečítané" : " · odoslané")}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex gap-2 border-t border-ink-100 p-3"
            >
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Napíšte správu…"
                aria-label="Nová správa"
                maxLength={5000}
              />
              <Button type="submit" disabled={sending || !newMessage.trim()}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Odoslať</span>
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-ink-500">
            Vyberte konverzáciu zo zoznamu.
          </div>
        )}
      </div>
    </div>
  );
}
