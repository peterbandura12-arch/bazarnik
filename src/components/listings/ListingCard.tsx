import Link from "next/link";
import { ImageOff, MapPin, ExternalLink } from "lucide-react";
import type { UnifiedListing } from "@/types/database";
import { cn, formatPrice, formatRelativeDate, CONDITION_LABELS, buildListingUrl } from "@/lib/utils";
import { getCategoryLabel } from "@/lib/categories";
import type { PriceVerdict } from "@/lib/price-analysis";
import { Badge } from "@/components/ui/Badge";
import { FavoriteButton } from "@/components/listings/FavoriteButton";

const VERDICT_STYLES: Record<string, string> = {
  very_good: "bg-emerald-500 text-white ring-1 ring-white/30",
  good: "bg-green-600 text-white ring-1 ring-white/30",
  fair: "bg-ink-800/85 text-ink-50 ring-1 ring-white/20",
  high: "bg-amber-500 text-white ring-1 ring-white/30",
  very_high: "bg-red-500 text-white ring-1 ring-white/30",
};

export function ListingCard({
  listing,
  isLoggedIn,
  isFavorite = false,
  priceVerdict,
}: {
  listing: UnifiedListing;
  isLoggedIn: boolean;
  isFavorite?: boolean;
  priceVerdict?: PriceVerdict | null;
}) {
  const href = buildListingUrl(listing);
  const isExternal = listing.source_type === "external";
  const categoryLabel = listing.category_slug
    ? getCategoryLabel(listing.category_slug)
    : undefined;
  const objectPosition =
    listing.focal_x != null && listing.focal_y != null
      ? `${(listing.focal_x * 100).toFixed(1)}% ${(listing.focal_y * 100).toFixed(1)}%`
      : "50% 50%";
  const isFree = listing.price === 0;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-brand-300/60 bg-white shadow-md shadow-brand-200/30 ring-1 ring-brand-200/50 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-brand-500 hover:ring-brand-300 hover:shadow-xl hover:shadow-brand-300/40">
      {/* Farebný prechodový pásik na hornej strane karty – objaví sa pri hoveri */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1 bg-gradient-to-r from-brand-500 via-violet-400 to-accent-400 opacity-80 transition-opacity duration-300 group-hover:opacity-100" />

      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-ink-100">
        {listing.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.image_url}
            alt={listing.title}
            loading="lazy"
            style={{ objectPosition }}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 to-accent-50 text-ink-300">
            <ImageOff className="h-10 w-10" aria-hidden />
          </div>
        )}

        {/* Gradient overlay na spodku fotky pre vyššiu čitateľnosť ceny */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />

        {/* Zdroj označený na fotke */}
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1">
          {listing.demo && <Badge tone="warning">Demo</Badge>}
          {isExternal ? (
            <Badge tone="info">
              <ExternalLink className="h-3 w-3" />
              {listing.source_name ?? "Externý zdroj"}
            </Badge>
          ) : (
            <Badge tone="brand">Bazárnik</Badge>
          )}
        </div>

        {/* Cena ako plávajúca štítok na fotke + verdikt ceny hneď vedľa */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-sm font-extrabold tabular-nums shadow-lg ring-1 ring-black/5 backdrop-blur transition-transform duration-300 group-hover:scale-105",
              isFree
                ? "bg-emerald-500/95 text-white"
                : "bg-white/95 text-brand-700"
            )}
          >
            {formatPrice(listing.price, listing.currency)}
          </span>
          {priceVerdict && priceVerdict.level !== "fair" && (
            <span
              className={cn(
                "rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide shadow-md backdrop-blur",
                VERDICT_STYLES[priceVerdict.level]
              )}
              title={`${priceVerdict.diffPct > 0 ? "+" : ""}${priceVerdict.diffPct} % oproti mediánu vyhľadávania`}
            >
              {priceVerdict.label}
            </span>
          )}
        </div>
      </Link>

      <div className="absolute right-2.5 top-2.5 z-10 transition-transform duration-300 group-hover:scale-110">
        <FavoriteButton
          listingId={isExternal ? undefined : listing.id}
          externalListingId={isExternal ? listing.id : undefined}
          initialActive={isFavorite}
          isLoggedIn={isLoggedIn}
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        {categoryLabel && (
          <span className="flex w-fit items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-700 ring-1 ring-brand-100">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" aria-hidden />
            {categoryLabel}
          </span>
        )}
        <h3 className="line-clamp-2-fallback text-sm font-semibold leading-snug text-ink-900 transition-colors duration-200 group-hover:text-brand-700">
          <Link href={href}>{listing.title}</Link>
        </h3>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink-100 pt-2.5 text-xs text-ink-500">
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0 text-brand-500" />
            <span className="truncate">{listing.location ?? "Neuvedené"}</span>
          </span>
          <span className="shrink-0">{formatRelativeDate(listing.published_at)}</span>
        </div>
        {listing.condition && (
          <span className="w-fit text-[11px] font-medium text-ink-400">
            {CONDITION_LABELS[listing.condition]}
          </span>
        )}
      </div>
    </article>
  );
}
