import { createClient } from "@/lib/supabase/server";
import { AdminActionButton } from "@/components/admin/AdminActions";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  nevhodny_obsah: "Nevhodný obsah",
  podvod: "Podozrenie z podvodu",
  duplicitny: "Duplicitný inzerát",
  iny: "Iný dôvod",
};

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const { data: reports } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const items = reports ?? [];

  return (
    <div>
      {items.length === 0 ? (
        <EmptyState title="Žiadne nahlásenia" description="Zatiaľ neboli nahlásené žiadne inzeráty." />
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="rounded-xl border border-ink-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={r.status === "new" ? "warning" : r.status === "reviewed" ? "info" : "success"}>
                  {r.status === "new" ? "Nové" : r.status === "reviewed" ? "V prehliadaní" : "Vyriešené"}
                </Badge>
                <Badge tone="neutral">{REASON_LABELS[r.reason] ?? r.reason}</Badge>
                <span className="text-xs text-ink-400">{formatRelativeDate(r.created_at)}</span>
              </div>
              {r.details && <p className="mt-2 text-sm text-ink-700">{r.details}</p>}
              <div className="mt-3">
                <AdminActionButton action="resolve_report" id={r.id} label="Označiť ako vyriešené" icon="resolve" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
