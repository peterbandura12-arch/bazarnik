"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/** Rozklikávací text – dlhý popis je zbalený, tlačidlom sa celý zobrazí. */
export function ExpandableText({
  text,
  collapsedHeight = 160,
  emptyLabel,
}: {
  text: string | null | undefined;
  collapsedHeight?: number;
  emptyLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!text || !text.trim()) {
    return <p className="text-sm text-ink-500">{emptyLabel ?? "Popis nie je dostupný."}</p>;
  }

  const isLong = text.length > 400 || text.split("\n").length > 8;

  return (
    <div>
      <div
        className={`relative overflow-hidden whitespace-pre-line text-sm leading-relaxed text-ink-700 transition-[max-height] duration-300 ease-out ${
          expanded || !isLong ? "max-h-[10000px]" : ""
        }`}
        style={expanded || !isLong ? undefined : { maxHeight: collapsedHeight }}
      >
        {text}
        {!expanded && isLong && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent"
          />
        )}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          {expanded ? (
            <>
              Zbaliť popis <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Zobraziť celý popis <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
