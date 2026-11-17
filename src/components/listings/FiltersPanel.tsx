"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { CATEGORY_TREE } from "@/lib/categories";
import { CONDITION_LABELS } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";

export function FiltersPanel({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  function apply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const next = new URLSearchParams();
    const q = params.get("q");
    if (q) next.set("q", q);

    for (const [key, value] of formData.entries()) {
      const v = String(value).trim();
      if (v) next.set(key, v);
    }
    router.push(`/inzeraty?${next.toString()}`);
    if (compact) setOpen(false);
  }

  function reset() {
    const q = params.get("q");
    router.push(q ? `/inzeraty?q=${encodeURIComponent(q)}` : "/inzeraty");
    if (compact) setOpen(false);
  }

  const body = (
    <form onSubmit={apply} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
          Kategória
        </label>
        <Select name="category" defaultValue={params.get("category") ?? ""}>
          <option value="">Všetky kategórie</option>
          {CATEGORY_TREE.map((parent) => (
            <optgroup key={parent.slug} label={parent.name}>
              <option value={parent.slug}>{parent.name} – všetko</option>
              {parent.children.map((child) => (
                <option key={child.slug} value={child.slug}>
                  {child.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
          Cena (€)
        </legend>
        <div className="flex items-center gap-2">
          <Input type="number" name="minPrice" min={0} placeholder="Od" defaultValue={params.get("minPrice") ?? ""} />
          <span className="text-ink-400">–</span>
          <Input type="number" name="maxPrice" min={0} placeholder="Do" defaultValue={params.get("maxPrice") ?? ""} />
        </div>
      </fieldset>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
          Lokalita
        </label>
        <Input name="location" placeholder="Mesto alebo kraj" defaultValue={params.get("location") ?? ""} />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
          Stav produktu
        </label>
        <Select name="condition" defaultValue={params.get("condition") ?? ""}>
          <option value="">Akýkoľvek stav</option>
          {Object.entries(CONDITION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
          Zdroj inzerátu
        </label>
        <Select name="source" defaultValue={params.get("source") ?? ""}>
          <option value="">Všetky zdroje</option>
          <option value="own">Bazárnik</option>
          <option value="external">Externé portály</option>
        </Select>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1">
          Použiť filtre
        </Button>
        <Button type="button" variant="outline" onClick={reset}>
          Zrušiť
        </Button>
      </div>
    </form>
  );

  if (compact) {
    return (
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white text-sm font-medium text-ink-800"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtre
          {open && <X className="ml-auto h-4 w-4 text-ink-400" />}
        </button>
        {open && (
          <div className="mt-3 rounded-xl border border-ink-200 bg-white p-4">{body}</div>
        )}
      </div>
    );
  }

  return (
    <aside className="hidden rounded-xl border border-ink-200 bg-white p-4 lg:block">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink-900">
        <SlidersHorizontal className="h-4 w-4" /> Filtre
      </h2>
      {body}
    </aside>
  );
}
