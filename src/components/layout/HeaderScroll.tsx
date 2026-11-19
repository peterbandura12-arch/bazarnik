"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Obal hlavicky, ktory pri scrollovani:
 *  - prida triedu `hdr-scrolled` (farebny prechod pozadia + tienenie cez globals.css),
 *  - ukazuje tenky farebny progress bar (ako daleko uz si na stranke).
 */
export function HeaderScroll({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 8);
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, y / max) : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className={cn("sticky top-0 z-40", scrolled && "hdr-scrolled")}>
      <div aria-hidden className="absolute inset-x-0 top-0 z-10 h-[3px] overflow-hidden">
        <div
          className="h-full origin-left bg-gradient-to-r from-brand-500 via-violet-500 to-accent-500"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
      {children}
    </div>
  );
}
