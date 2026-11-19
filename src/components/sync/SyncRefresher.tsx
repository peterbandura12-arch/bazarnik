"use client";

import { useEffect } from "react";

const KEY = "bazarnik:last-sync-kick";
const INTERVAL_MS = 10 * 60 * 1000; // maximalne raz za 10 minut z prehliadaca

/**
 * Pri navstive stranky30 poticho "poklepe" na synchronizaciu.
 * Server sam rozhodne, ci je treba synchronizovat (stary je > 10 min).
 * Klient sa tlmí cez localStorage, aby to nespustal pri kazdom kliknuti.
 */
export function SyncRefresher() {
  useEffect(() => {
    try {
      const last = Number(localStorage.getItem(KEY) ?? "0");
      if (Date.now() - last < INTERVAL_MS) return;
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      // localStorage nedostupny (private mode) – ideme dalej, server sa aj tak obmedzi
    }
    fetch("/api/sync/refresh", { method: "POST" }).catch(() => {});
  }, []);

  return null;
}
