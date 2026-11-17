import Link from "next/link";

export function Pagination({
  page,
  total,
  perPage,
  params,
}: {
  page: number;
  total: number;
  perPage: number;
  params: Record<string, string>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return null;

  function pageHref(p: number): string {
    const search = new URLSearchParams(params);
    if (p > 1) search.set("page", String(p));
    else search.delete("page");
    const qs = search.toString();
    return qs ? `/inzeraty?${qs}` : "/inzeraty";
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Stránkovanie">
      {page > 1 && (
        <Link href={pageHref(page - 1)} className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:border-brand-400">
          Predchádzajúca
        </Link>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-ink-400">…</span>}
          <Link
            href={pageHref(p)}
            aria-current={p === page ? "page" : undefined}
            className={`rounded-lg border px-3.5 py-2 text-sm ${
              p === page
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-ink-200 bg-white hover:border-brand-400"
            }`}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < totalPages && (
        <Link href={pageHref(page + 1)} className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:border-brand-400">
          Ďalšia
        </Link>
      )}
    </nav>
  );
}
