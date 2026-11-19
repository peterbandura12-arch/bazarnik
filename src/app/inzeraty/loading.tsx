export default function Loading() {
  return (
    <div className="container-page py-10">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-ink-100" />
      <div className="mt-3 h-4 w-72 animate-pulse rounded bg-ink-100" />
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm"
          >
            <div className="aspect-[4/3] animate-pulse bg-gradient-to-br from-brand-50 to-ink-100" />
            <div className="space-y-2.5 p-3.5">
              <div className="h-3 w-24 animate-pulse rounded-full bg-brand-50" />
              <div className="h-4 w-full animate-pulse rounded bg-ink-100" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-ink-100" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-ink-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
