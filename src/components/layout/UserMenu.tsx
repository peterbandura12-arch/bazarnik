"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings, Store, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function UserMenu({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-9 items-center gap-2 rounded-full bg-brand-100 pl-1 pr-3 text-sm font-medium text-brand-800 hover:bg-brand-200"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
          {initials || <UserRound className="h-4 w-4" />}
        </span>
        <span className="hidden max-w-24 truncate md:inline">{name}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-lg">
          <Link href="/profil" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-ink-50">
            <UserRound className="h-4 w-4 text-ink-400" /> Môj profil
          </Link>
          <Link href="/profil/inzeraty" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-ink-50">
            <Store className="h-4 w-4 text-ink-400" /> Moje inzeráty
          </Link>
          <Link href="/profil/nastavenia" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-ink-50">
            <Settings className="h-4 w-4 text-ink-400" /> Nastavenia
          </Link>
          {isAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-ink-50">
              Administrácia
            </Link>
          )}
          <div className="my-1 border-t border-ink-100" />
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" /> Odhlásiť sa
          </button>
        </div>
      )}
    </div>
  );
}
