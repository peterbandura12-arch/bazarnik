"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Action = "block_user" | "unblock_user" | "delete_listing" | "resolve_report";

export function AdminActionButton({
  action,
  id,
  label,
  icon,
  danger,
}: {
  action: Action;
  id: string;
  label: string;
  icon: "ban" | "unban" | "delete" | "resolve";
  danger?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function run() {
    if (action === "delete_listing" && !confirm("Naozaj odstrániť tento inzerát?")) return;
    if (danger && !confirm("Potvrdiť akciu?")) return;
    setBusy(true);
    await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id }),
    });
    setBusy(false);
    router.refresh();
  }

  const icons = {
    ban: <Ban className="h-3.5 w-3.5" />,
    unban: <RotateCcw className="h-3.5 w-3.5" />,
    delete: <Trash2 className="h-3.5 w-3.5" />,
    resolve: <CheckCircle className="h-3.5 w-3.5" />,
  };

  return (
    <Button size="sm" variant={danger ? "danger" : "outline"} disabled={busy} onClick={run}>
      {icons[icon]} {busy ? "…" : label}
    </Button>
  );
}
