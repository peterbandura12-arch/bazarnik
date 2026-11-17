"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Heart, LayoutGrid, MessageCircle, Menu, Plus, X, Bell } from "lucide-react";
import { CATEGORY_TREE } from "@/lib/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ButtonLink } from "@/components/ui/Button";

export function MobileNav({
  isLoggedIn,
  isAdmin,
}: {
  isLoggedIn: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Otvoriť menu"
        className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-800 hover:bg-ink-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <nav className="absolute left-0 top-0 flex h-full w-80 max-w-[85vw] flex-col overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-ink-100 p-4">
              <span className="flex items-center gap-2 text-base font-bold">
                <LayoutGrid className="h-5 w-5 text-brand-600" /> Kategórie
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Zavrieť menu"
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-ink-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1 p-3">
              {CATEGORY_TREE.map((cat) => (
                <div key={cat.slug} className="rounded-lg border border-ink-100">
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === cat.slug ? null : cat.slug)}
                    aria-expanded={expanded === cat.slug}
                    className="flex w-full items-center justify-between px-3 py-3 text-left text-sm font-medium"
                  >
                    <span className="flex items-center gap-3">
                      <CategoryIcon slug={cat.slug} className="h-5 w-5 text-brand-600" />
                      {cat.name}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-ink-400 transition-transform ${
                        expanded === cat.slug ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expanded === cat.slug && (
                    <ul className="border-t border-ink-100 px-3 py-2">
                      <li>
                        <Link
                          href={`/inzeraty?category=${cat.slug}`}
                          onClick={() => setOpen(false)}
                          className="block rounded-lg px-2 py-2.5 text-sm font-medium text-brand-700"
                        >
                          Zobraziť všetko
                        </Link>
                      </li>
                      {cat.children.map((child) => (
                        <li key={child.slug}>
                          <Link
                            href={`/inzeraty?category=${child.slug}`}
                            onClick={() => setOpen(false)}
                            className="block rounded-lg px-2 py-2.5 text-sm text-ink-700"
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-auto space-y-2 border-t border-ink-100 p-4">
              <ButtonLink href="/pridat-inzerat" variant="accent" className="w-full">
                <Plus className="h-4 w-4" /> Pridať inzerát
              </ButtonLink>
              {!isLoggedIn && (
                <div className="grid grid-cols-2 gap-2">
                  <ButtonLink href="/prihlasenie" variant="outline">
                    Prihlásenie
                  </ButtonLink>
                  <ButtonLink href="/registracia">Registrácia</ButtonLink>
                </div>
              )}
              {isLoggedIn && (
                <div className="grid grid-cols-3 gap-2">
                  <Link href="/profil/oblubene" className="flex flex-col items-center gap-1 rounded-lg bg-ink-50 py-3 text-xs text-ink-700">
                    <Heart className="h-5 w-5" /> Obľúbené
                  </Link>
                  <Link href="/profil/spravy" className="flex flex-col items-center gap-1 rounded-lg bg-ink-50 py-3 text-xs text-ink-700">
                    <MessageCircle className="h-5 w-5" /> Správy
                  </Link>
                  <Link href="/profil/notifikacie" className="flex flex-col items-center gap-1 rounded-lg bg-ink-50 py-3 text-xs text-ink-700">
                    <Bell className="h-5 w-5" /> Notifikácie
                  </Link>
                </div>
              )}
              {isAdmin && (
                <Link href="/admin" className="block rounded-lg bg-brand-50 py-2 text-center text-sm font-medium text-brand-700">
                  Administrácia
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
