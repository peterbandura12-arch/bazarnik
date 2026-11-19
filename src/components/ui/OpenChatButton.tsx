"use client";

import { Sparkles } from "lucide-react";
import { useChat } from "@/components/ai/ChatProvider";

/** Tlacitko, ktore priamo otvori plavajuci AI chat (zdielany stav cez ChatProvider). */
export function OpenChatButton({ className }: { className?: string }) {
  const { setChatOpen } = useChat();

  return (
    <button
      type="button"
      onClick={() => setChatOpen(true)}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-brand-800 shadow-lg transition-transform hover:scale-105"
      }
    >
      <Sparkles className="h-4 w-4 text-brand-600" />
      Spustiť AI asistenta
    </button>
  );
}
