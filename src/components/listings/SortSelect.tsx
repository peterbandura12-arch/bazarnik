"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import { SORT_OPTIONS } from "@/lib/sort";

export function SortSelect() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("sort") ?? "najnovsie";

  function onChange(value: string) {
    const next = new URLSearchParams(params.toString());
    next.set("sort", value);
    next.delete("page");
    router.push(`/inzeraty?${next.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-ink-600">
      <ArrowUpDown className="h-4 w-4 shrink-0 text-ink-400" />
      <span className="hidden sm:inline">Zoradiť:</span>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Zoradiť výsledky"
        className="h-9 rounded-lg border border-ink-200 bg-white px-2 text-sm focus:border-brand-500 focus:outline-none"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
