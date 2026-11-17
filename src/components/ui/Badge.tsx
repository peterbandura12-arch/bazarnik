import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "brand" | "accent" | "neutral" | "success" | "warning" | "info";

const tones: Record<Tone, string> = {
  brand: "bg-brand-100 text-brand-800",
  accent: "bg-accent-100 text-accent-800",
  neutral: "bg-ink-100 text-ink-700",
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  info: "bg-blue-100 text-blue-800",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
