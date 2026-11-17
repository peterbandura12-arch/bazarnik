export type SortOption = "najnovsie" | "najstarsie" | "cena_vzostupne" | "cena_zostupne" | "relevantne";

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "najnovsie", label: "Najnovšie" },
  { value: "najstarsie", label: "Najstaršie" },
  { value: "cena_vzostupne", label: "Najnižšia cena" },
  { value: "cena_zostupne", label: "Najvyššia cena" },
  { value: "relevantne", label: "Najrelevantnejšie" },
];
