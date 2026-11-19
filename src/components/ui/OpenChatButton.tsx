"use client";

import { Sparkles } from "lucide-react";

/** Tlacitko, ktore otvori plavajuci AI chat (ChatWidget pocuva udalost "bazarnik:open-chat"). */
export function OpenChatButton({ className }: { className?: string }) {
  function openChat() {
    const direct = (
      window as unknown as { __bazarnikOpenChat?: () => void }
    ).__bazarnikOpenChat;
    if (direct) {
      direct();
      return;
    }
    window.dispatchEvent(new Event("bazarnik:open-chat"));
  }

  return (
    <button
      type="button"
      onClick={openChat}
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
