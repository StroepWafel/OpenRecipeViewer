import type { RecordStr } from "@/lib/recipe-types";

/**
 * Fields folded into facet/search “tags” (must stay aligned with
 * `scripts/build-search-index.mjs` `recipeToDoc` tag extraction).
 */
const RECIPE_TAG_FIELDS = [
  "tags",
  "categories",
  "cuisine",
  "cor",
  "dietary",
  "allergens",
  "meal_type",
  "equipment",
  "skill_level",
] as const;

function collectRecipeTagStrings(recipe: RecordStr): string[] {
  const parts: string[] = [];
  for (const key of RECIPE_TAG_FIELDS) {
    const v = recipe[key];
    if (Array.isArray(v)) {
      for (const x of v) {
        if (typeof x === "string" && x.trim()) parts.push(x.trim());
      }
    } else if (typeof v === "string" && v.trim()) {
      parts.push(v.trim());
    }
  }
  return parts;
}

function normalizeTagToken(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Lowercase unique tokens from a recipe’s facet fields. */
export function recipeNormalizedTagTokens(recipe: RecordStr): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of collectRecipeTagStrings(recipe)) {
    const k = normalizeTagToken(t);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

/** Open Recipe Standard `skill_level` enum + unknown. */
export function skillRankFromRecipe(recipe: RecordStr): number {
  const v = recipe.skill_level;
  if (typeof v !== "string" || !v.trim()) return 0;
  const s = v.trim().toLowerCase();
  if (s === "beginner") return 1;
  if (s === "intermediate") return 2;
  if (s === "advanced") return 3;
  return 0;
}

export function compareSkillRank(
  a: number,
  b: number,
  dir: "asc" | "desc"
): number {
  const unkA = a === 0;
  const unkB = b === 0;
  if (unkA && unkB) return 0;
  if (unkA) return 1;
  if (unkB) return -1;
  const diff = a - b;
  return dir === "desc" ? -diff : diff;
}
