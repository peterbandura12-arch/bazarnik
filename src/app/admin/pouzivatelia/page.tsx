import { createClient } from "@/lib/supabase/server";
import { AdminActionButton } from "@/components/admin/AdminActions";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_blocked, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="overflow-x-auto rounded-xl border border-ink-200 bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-500">
            <th className="px-4 py-3">Používateľ</th>
            <th className="px-4 py-3">Rola</th>
            <th className="px-4 py-3">Registrácia</th>
            <th className="px-4 py-3">Akcie</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {(users ?? []).map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-3">
                <p className="font-medium text-ink-900">{u.full_name ?? "–"}</p>
                <p className="text-xs text-ink-500">{u.email}</p>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <Badge tone={u.role === "admin" ? "brand" : "neutral"}>
                    {u.role === "admin" ? "Administrátor" : "Používateľ"}
                  </Badge>
                  {u.is_blocked && <Badge tone="warning">Blokovaný</Badge>}
                </div>
              </td>
              <td className="px-4 py-3 text-ink-600">{formatDate(u.created_at)}</td>
              <td className="px-4 py-3">
                {u.is_blocked ? (
                  <AdminActionButton action="unblock_user" id={u.id} label="Odblokovať" icon="unban" />
                ) : (
                  <AdminActionButton action="block_user" id={u.id} label="Blokovať" icon="ban" danger />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
