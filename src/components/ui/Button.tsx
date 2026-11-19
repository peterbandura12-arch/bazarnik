import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "accent" | "outline" | "ghost" | "danger" | "glass";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800",
  accent: "bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 shadow-sm",
  outline: "border border-ink-200 bg-white text-ink-800 hover:border-brand-400 hover:text-brand-700",
  ghost: "text-ink-700 hover:bg-ink-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
  glass: "border border-white/30 bg-transparent text-white hover:bg-white/10",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

const base =
  "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

interface ButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button className={cn(base, variantClasses[variant], sizeClasses[size], className)} {...props} />
  );
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(base, variantClasses[variant], sizeClasses[size], className)} {...props} />
  );
}
