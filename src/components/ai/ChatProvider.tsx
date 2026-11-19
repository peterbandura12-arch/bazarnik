"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface ChatContextValue {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
}

const ChatContext = createContext<ChatContextValue>({
  chatOpen: false,
  setChatOpen: () => {},
});

export function useChat() {
  return useContext(ChatContext);
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const value = useMemo(() => ({ chatOpen, setChatOpen }), [chatOpen]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
