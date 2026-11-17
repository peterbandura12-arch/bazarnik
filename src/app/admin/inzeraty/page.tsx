import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminActionButton } from "@/components/admin/AdminActions";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, formatRelativeDate, STATUS_LABELS } from "@/lib/utils";

export default async function AdminListingsPage() {
  const supabase = await createClient();
  const { data: listings } = await supabase
    .from("listings")
    .select("id, slug, title, price, currency, status, location, created_at, profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(100);

  type Row = {
    id: string; slug: string; title: string; price: number; currency: string; status: string;
    location: string; created_at: string;
    profiles: { full_name: string | null; email: string } | null;
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-ink-200 bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-500">
            <th className="px-4 py-3">Inzerát</th>
            <th className="px-4 py-3">Cena</th>
            <th className="px-4 py-3">Stav</th>
            <th className="px-4 py-3">Predávajúci</th>
            <th className="px-4 py-3">Akcie</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {((listings ?? []) as unknown as Row[]).map((l) => (
            <tr key={l.id}>
              <td className="px-4 py-3">
                <Link href={`/inzerat/${l.slug}`} className="font-medium text-ink-900 hover:text-brand-700">
                  {l.title}
                </Link>
                <p className="text-xs text-ink-500">
                  {l.location} · {formatRelativeDate(l.created_at)}
                </p>
              </td>
              <td className="px-4 py-3">{formatPrice(l.price, l.currency)}</td>
              <td className="px-4 py-3">
                <Badge tone={l.status === "active" ? "success" : "neutral"}>
                  {STATUS_LABELS[l.status]}
                </Badge>
              </td>
              <td className="px-4 py-3 text-ink-600">
                {l.profiles?.full_name ?? l.profiles?.email ?? "–"}
              </td>
              <td className="px-4 py-3">
                <AdminActionButton action="delete_listing" id={l.id} label="Odstrániť" icon="delete" danger />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
