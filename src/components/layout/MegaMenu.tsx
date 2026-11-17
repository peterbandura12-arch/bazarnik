"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { CATEGORY_TREE } from "@/lib/categories";
import { CategoryIcon } from "@/components/CategoryIcon";

export function MegaMenu() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(CATEGORY_TREE[0]?.slug ?? "");

  const activeCategory = CATEGORY_TREE.find((c) => c.slug === active) ?? CATEGORY_TREE[0];

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink-800 hover:bg-ink-100"
      >
        <LayoutGrid className="h-4 w-4" />
        Všetky kategórie
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && activeCategory && (
        <div className="absolute left-0 top-full z-50 mt-1 flex w-[720px] overflow-hidden rounded-xl border border-ink-200 bg-white shadow-xl">
          <ul className="w-60 shrink-0 border-r border-ink-100 bg-ink-50 py-2">
            {CATEGORY_TREE.map((cat) => (
              <li key={cat.slug}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(cat.slug)}
                  onFocus={() => setActive(cat.slug)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${
                    active === cat.slug
                      ? "bg-white font-semibold text-brand-700"
                      : "text-ink-800 hover:bg-white/70"
                  }`}
                >
                  <CategoryIcon slug={cat.slug} className="h-5 w-5 text-brand-600" />
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>

          <div className="flex-1 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-900">{activeCategory.name}</h3>
              <Link
                href={`/inzeraty?category=${activeCategory.slug}`}
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                Zobraziť všetko
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-x-4">
              {activeCategory.children.map((child) => (
                <li key={child.slug}>
                  <Link
                    href={`/inzeraty?category=${child.slug}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-2 py-2 text-sm text-ink-700 hover:bg-ink-50 hover:text-brand-700"
                  >
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
