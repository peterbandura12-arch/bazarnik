"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Plus, Trash2 } from "lucide-react";
import type { SavedSearchRow } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDate } from "@/lib/utils";

export function SavedSearchesClient({
  searches,
  currentQuery,
  canSaveCurrent,
}: {
  searches: SavedSearchRow[];
  currentQuery: Record<string, string>;
  canSaveCurrent: boolean;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("saved_searches").insert({
        user_id: user.id,
        name: name.trim(),
        query: currentQuery,
        notify: true,
      });
    }
    setName("");
    setSaving(false);
    router.refresh();
  }

  async function toggleNotify(search: SavedSearchRow) {
    const supabase = createClient();
    await supabase.from("saved_searches").update({ notify: !search.notify }).eq("id", search.id);
    router.refresh();
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("saved_searches").delete().eq("id", id);
    router.refresh();
  }

  function queryToUrl(query: Record<string, string>): string {
    const params = new URLSearchParams(query);
    const qs = params.toString();
    return qs ? `/inzeraty?${qs}` : "/inzeraty";
  }

  return (
    <div className="space-y-6">
      {canSaveCurrent && (
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <h2 className="text-sm font-bold text-ink-900">Uložiť aktuálne vyhľadávanie</h2>
          <p className="mt-1 text-xs text-ink-500">
            Uložené filtre: {Object.entries(currentQuery).map(([k, v]) => `${k}=${v}`).join(", ")}
          </p>
          <div className="mt-3 flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Názov, napr. „Notebooky do 600 €“"
              aria-label="Názov uloženého vyhľadávania"
            />
            <Button onClick={save} disabled={saving || !name.trim()}>
              <Plus className="h-4 w-4" /> Uložiť
            </Button>
          </div>
        </div>
      )}

      {searches.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
          Nemáte žiadne uložené vyhľadávania. Nastavte filtre v katalógu a uložte si ich tu.
        </p>
      ) : (
        <ul className="space-y-3">
          {searches.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 rounded-xl border border-ink-200 bg-white p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{s.name}</p>
                <p className="text-xs text-ink-500">Uložené {formatDate(s.created_at)}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleNotify(s)}>
                  {s.notify ? <Bell className="h-3.5 w-3.5 text-green-600" /> : <BellOff className="h-3.5 w-3.5" />}
                  {s.notify ? "Upozornenia zapnuté" : "Upozornenia vypnuté"}
                </Button>
                <a
                  href={queryToUrl(s.query)}
                  className="inline-flex h-8 items-center rounded-lg border border-ink-200 px-3 text-xs font-medium text-ink-800 hover:border-brand-400"
                >
                  Spustiť
                </a>
                <Button size="sm" variant="ghost" onClick={() => remove(s.id)} className="text-red-600 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Odstrániť</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
