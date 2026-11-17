import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function AdminSourcesPage() {
  const supabase = await createClient();
  const { data: sources } = await supabase
    .from("external_sources")
    .select("*")
    .order("created_at", { ascending: false });

  const items = sources ?? [];

  return (
    <div>
      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Externé zdroje sa pripájajú výhradne cez oficiálne API alebo partnerské feedy cez
        adaptéry v priečinku <code>src/adapters/</code>. Zdroje bez legálneho prístupu sa
        nepripájajú. Zobrazený stav je vždy skutočný stav synchronizácie.
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Žiadne externé zdroje"
          description="Zatiaľ nie je pripojený žiadny externý portál. Architektúra adaptérov je pripravená – nový zdroj doplníte samostatným adaptérom."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="px-4 py-3">Zdroj</th>
                <th className="px-4 py-3">Adaptér</th>
                <th className="px-4 py-3">Stav</th>
                <th className="px-4 py-3">Posledná synchronizácia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {items.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{s.name}</p>
                    <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline">
                      {s.website_url}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{s.adapter}</td>
                  <td className="px-4 py-3">
                    <Badge tone={s.is_active ? "success" : "neutral"}>
                      {s.is_active ? "Aktívny" : "Nepripojený"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    {s.last_synced_at ? formatRelativeDate(s.last_synced_at) : "nikdy"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
