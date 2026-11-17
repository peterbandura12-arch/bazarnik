"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { STATUS_LABELS } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export function MyListingActions({
  listingId,
  status,
}: {
  listingId: string;
  status: string;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function updateStatus(next: "sold" | "active" | "archived") {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("listings").update({ status: next }).eq("id", listingId);
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Naozaj chcete natrvalo odstrániť tento inzerát?")) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("listings").delete().eq("id", listingId);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "active" && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => updateStatus("sold")}>
          <Check className="h-3.5 w-3.5 text-green-600" /> Označiť ako predaný
        </Button>
      )}
      {status !== "active" && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => updateStatus("active")}>
          Znovu zverejniť
        </Button>
      )}
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => updateStatus("archived")}>
        <Archive className="h-3.5 w-3.5" />
        {status === "archived" ? STATUS_LABELS.archived : "Archivovať"}
      </Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={remove} className="text-red-600 hover:bg-red-50">
        <Trash2 className="h-3.5 w-3.5" /> Odstrániť
      </Button>
    </div>
  );
}
