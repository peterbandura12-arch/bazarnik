/**
 * Analýza cien vyhľadávania – priemer, medián, rozpätie, histogram
 * a hodnotenie jednotlivých inzerátov oproti mediánu.
 */

export type PriceLevel = "very_good" | "good" | "fair" | "high" | "very_high";

export interface PriceStats {
  count: number;
  min: number | null;
  max: number | null;
  average: number | null;
  median: number | null;
  percentiles: { p25: number | null; p75: number | null };
  buckets: { from: number; to: number; count: number }[];
}

export interface PriceVerdict {
  level: PriceLevel;
  label: string;
  diffPct: number;
}

/** Vypočíta štatistiky z cien (ignoruje null, nulové a záporné hodnoty pre medián ô). */
export function computePriceStats(prices: (number | null | undefined)[]): PriceStats {
  const valid = prices
    .filter((p): p is number => typeof p === "number" && Number.isFinite(p) && p > 0)
    .sort((a, b) => a - b);

  if (valid.length === 0) {
    return {
      count: 0,
      min: null,
      max: null,
      average: null,
      median: null,
      percentiles: { p25: null, p75: null },
      buckets: [],
    };
  }

  const sum = valid.reduce((acc, p) => acc + p, 0);
  const pick = (arr: number[], pos: number) => {
    if (arr.length === 0) return null;
    const idx = Math.min(arr.length - 1, Math.max(0, Math.round(pos * (arr.length - 1))));
    return arr[idx];
  };

  const min = valid[0];
  const max = valid[valid.length - 1];
  const span = max - min;
  const BUCKET_COUNT = 8;
  const buckets: { from: number; to: number; count: number }[] = [];
  if (span === 0) {
    buckets.push({ from: min, to: max, count: valid.length });
  } else {
    for (let i = 0; i < BUCKET_COUNT; i++) {
      buckets.push({
        from: min + (span * i) / BUCKET_COUNT,
        to: min + (span * (i + 1)) / BUCKET_COUNT,
        count: 0,
      });
    }
    let b = 0;
    for (const p of valid) {
      while (b < BUCKET_COUNT - 1 && p > buckets[b].to) b++;
      buckets[b].count++;
    }
  }

  const median =
    valid.length % 2 === 1
      ? pick(valid, 0.5)
      : Math.round(((valid[valid.length / 2 - 1] + valid[valid.length / 2]) / 2) * 100) / 100;

  return {
    count: valid.length,
    min,
    max,
    average: sum / valid.length,
    median,
    percentiles: {
      p25: pick(valid, 0.25),
      p75: pick(valid, 0.75),
    },
    buckets,
  };
}

/** Ohodnotí cenu oproti mediánu podobných inzerátov. */
export function getPriceVerdict(price: number | null | undefined, median: number | null | undefined): PriceVerdict | null {
  if (!price || price <= 0 || !median || median <= 0) return null;
  const ratio = price / median;
  const diffPct = Math.round((ratio - 1) * 100);
  if (ratio <= 0.75) return { level: "very_good", label: "Veľmi výhodná cena", diffPct };
  if (ratio <= 0.92) return { level: "good", label: "Výhodná cena", diffPct };
  if (ratio <= 1.1) return { level: "fair", label: "Priemerná cena", diffPct };
  if (ratio <= 1.3) return { level: "high", label: "Nadpriemerná cena", diffPct };
  return { level: "very_high", label: "Vysoká cena", diffPct };
}
