import type { ListingCondition } from "@/types/database";

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

const priceFormatter = new Intl.NumberFormat("sk-SK", {
  style: "decimal",
  maximumFractionDigits: 0,
});

export function formatPrice(price: number | null, currency = "EUR"): string {
  if (price === null || price === undefined) return "Cena dohodou";
  return `${priceFormatter.format(price)} €`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("sk-SK", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatRelativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "práve teraz";
  if (minutes < 60) return `pred ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `pred ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "včera";
  if (days < 30) return `pred ${days} dňami`;
  return formatDate(iso);
}

export const CONDITION_LABELS: Record<ListingCondition, string> = {
  nove: "Nové",
  ako_nove: "Ako nové",
  pouzite: "Použité",
  na_diely: "Na diely",
};

export const STATUS_LABELS: Record<string, string> = {
  active: "Aktívny",
  sold: "Predaný",
  archived: "Archivovaný",
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

export function buildListingUrl(listing: { source_type: string; slug: string }): string {
  return listing.source_type === "external"
    ? `/externy/${listing.slug}`
    : `/inzerat/${listing.slug}`;
}

export function buildQueryUrl(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `/inzeraty?${qs}` : "/inzeraty";
}
