import Link from "next/link";
import { Store } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Bazárnik – domovská stránka">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
        <Store className="h-5 w-5" />
      </span>
      {!compact && (
        <span className="text-xl font-bold tracking-tight text-ink-900">
          Bazár<span className="text-brand-600">nik</span>
        </span>
      )}
    </Link>
  );
}
