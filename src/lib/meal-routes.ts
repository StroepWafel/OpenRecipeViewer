import { collectRecipePaths, type LibraryList } from "@/lib/library-api";
import { decodeRecipePath, encodeRecipePath } from "@/lib/path-encoding";

/**
 * Preferred display order for known meal types (aligns with Open Recipe Standard
 * `MealType` enum and library primary-meal ordering).
 */
const MEAL_TYPE_ORDER = [
  "breakfast",
  "brunch",
  "lunch",
  "dinner",
  "supper",
  "snack",
  "dessert",
  "tea",
  "appetizer",
  "side",
] as const;

/** URL path segment for a meal-type index key (normalized label from library-list). */
export function mealToSlug(key: string): string {
  const s = key
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  if (s.length > 0) return s;
  return encodeRecipePath(key);
}

/** Paths that appear in no `by_meal_type` bucket (still in the catalog via other facets). */
export function pathsWithoutMealType(index: LibraryList): string[] {
  const tagged = new Set<string>();
  for (const paths of Object.values(index.by_meal_type)) {
    for (const p of paths) tagged.add(p);
  }
  const all = collectRecipePaths(index);
  return all.filter((p) => !tagged.has(p)).sort();
}

/** Recipe paths for a resolved meal key (matches `library-list.json` `by_meal_type`). */
export function pathsForMealKey(index: LibraryList, mealKey: string): string[] {
  if (mealKey === "uncategorized") {
    return pathsWithoutMealType(index);
  }
  const list = index.by_meal_type[mealKey];
  if (!list) return [];
  return [...list].sort();
}

/**
 * Resolve `:mealSlug` from the URL to an index `by_meal_type` key, or `uncategorized`.
 */
export function resolveMealSlug(index: LibraryList, slug: string): string | null {
  if (!slug) return null;
  if (slug === "uncategorized") return "uncategorized";

  const keys = Object.keys(index.by_meal_type);
  const byPretty = keys.find((k) => mealToSlug(k) === slug);
  if (byPretty) return byPretty;

  const decoded = decodeRecipePath(slug);
  if (decoded && (decoded === "uncategorized" || keys.includes(decoded))) {
    return decoded;
  }

  return null;
}

export function formatMealLabel(key: string): string {
  if (key === "uncategorized") return "Uncategorized";
  return key.replace(/_/g, " ");
}

function mealOrderRank(key: string): number {
  const i = MEAL_TYPE_ORDER.indexOf(
    key as (typeof MEAL_TYPE_ORDER)[number]
  );
  return i === -1 ? 999 : i;
}

/** Sorted meal-type entries for the library home (label + slug + count). */
export function mealIndexEntries(index: LibraryList): {
  key: string;
  slug: string;
  label: string;
  count: number;
}[] {
  const entries = Object.entries(index.by_meal_type).map(([key, paths]) => ({
    key,
    slug: mealToSlug(key),
    label: formatMealLabel(key),
    count: paths.length,
  }));
  entries.sort((a, b) => {
    const ra = mealOrderRank(a.key);
    const rb = mealOrderRank(b.key);
    if (ra !== rb) return ra - rb;
    return a.key.localeCompare(b.key);
  });

  const unc = pathsWithoutMealType(index);
  if (unc.length > 0) {
    entries.push({
      key: "uncategorized",
      slug: "uncategorized",
      label: "Uncategorized",
      count: unc.length,
    });
  }
  return entries;
}
