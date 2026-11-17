"use client";

import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import type { NotificationRow } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { formatRelativeDate } from "@/lib/utils";

export function NotificationsClient({ notifications }: { notifications: NotificationRow[] }) {
  const router = useRouter();

  async function markAllRead() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">{notifications.filter((n) => !n.read_at).length} neprečítaných</p>
        <Button size="sm" variant="outline" onClick={markAllRead}>
          <CheckCheck className="h-4 w-4" /> Označiť všetky ako prečítané
        </Button>
      </div>

      {notifications.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
          Nemáte žiadne notifikácie.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border p-4 ${
                n.read_at ? "border-ink-200 bg-white" : "border-brand-200 bg-brand-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-ink-600">{n.body}</p>}
                  <p className="mt-1 text-xs text-ink-400">{formatRelativeDate(n.created_at)}</p>
                </div>
                {n.link && (
                  <a href={n.link} className="shrink-0 text-xs font-medium text-brand-600 hover:underline">
                    Otvoriť
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
