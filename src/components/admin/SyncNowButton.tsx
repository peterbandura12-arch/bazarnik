"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

type SyncSourceSummary = {
  source: string;
  imported: number;
  updated: number;
  errors: string[];
};

export function SyncNowButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Synchronizácia zlyhala.");
      } else {
        const summary = (data.summary ?? []) as SyncSourceSummary[];
        const lines = summary.map(
          (s) =>
            `${s.source}: +${s.imported} nových, ${s.updated} aktualizovaných${
              s.errors.length > 0 ? ` (${s.errors.length} chýb)` : ""
            }`,
        );
        setMessage(lines.length > 0 ? lines.join(" • ") : "Žiadne aktívne zdroje na synchronizáciu.");
        router.refresh();
      }
    } catch {
      setMessage("Chyba siete – skúste to znova.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSync}
        disabled={running}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {running ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        {running ? "Synchronizujem…" : "Synchronizovať teraz"}
      </button>
      {message && <p className="mt-2 text-sm text-ink-600">{message}</p>}
    </div>
  );
}
