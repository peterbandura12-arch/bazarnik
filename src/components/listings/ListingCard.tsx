import Link from "next/link";
import { ImageOff, MapPin, ExternalLink } from "lucide-react";
import type { UnifiedListing } from "@/types/database";
import { cn, formatPrice, formatRelativeDate, CONDITION_LABELS, buildListingUrl } from "@/lib/utils";
import { getCategoryLabel } from "@/lib/categories";
import { Badge } from "@/components/ui/Badge";
import { FavoriteButton } from "@/components/listings/FavoriteButton";

export function ListingCard({
  listing,
  isLoggedIn,
  isFavorite = false,
}: {
  listing: UnifiedListing;
  isLoggedIn: boolean;
  isFavorite?: boolean;
}) {
  const href = buildListingUrl(listing);
  const isExternal = listing.source_type === "external";
  const categoryLabel = listing.category_id ? getCategoryLabel(listing.category_id) : undefined;
  const objectPosition =
    listing.focal_x != null && listing.focal_y != null
      ? `${(listing.focal_x * 100).toFixed(1)}% ${(listing.focal_y * 100).toFixed(1)}%`
      : "50% 50%";

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-ink-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-ink-100">
        {listing.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.image_url}
            alt={listing.title}
            loading="lazy"
            style={{ objectPosition }}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-300">
            <ImageOff className="h-10 w-10" aria-hidden />
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
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
      </Link>

      <div className="absolute right-2 top-2">
        <FavoriteButton
          listingId={isExternal ? undefined : listing.id}
          externalListingId={isExternal ? listing.id : undefined}
          initialActive={isFavorite}
          isLoggedIn={isLoggedIn}
        />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        {categoryLabel && (
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-400">
            {categoryLabel}
          </span>
        )}
        <h3 className="line-clamp-2-fallback text-sm font-semibold text-ink-900">
          <Link href={href} className="hover:text-brand-700">
            {listing.title}
          </Link>
        </h3>
        <p
          className={cn(
            "mt-auto pt-1 text-lg font-bold",
            listing.price === 0 ? "text-green-600" : "text-ink-900"
          )}
        >
          {formatPrice(listing.price, listing.currency)}
        </p>
        <div className="flex items-center justify-between text-xs text-ink-500">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {listing.location ?? "Neuvedené"}
          </span>
          <span>{formatRelativeDate(listing.published_at)}</span>
        </div>
        {listing.condition && (
          <span className="text-xs text-ink-500">{CONDITION_LABELS[listing.condition]}</span>
        )}
      </div>
    </article>
  );
}
