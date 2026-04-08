export type RecordStr = Record<string, unknown>;

export function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x : String(x)));
}

export function recipeName(recipe: RecordStr): string {
  const n = recipe.recipe_name;
  return typeof n === "string" && n.trim() ? n.trim() : "Untitled recipe";
}

/** Culinary author(s) credited with creating or writing the recipe (`recipe_authors`). */
export function recipeAuthorNames(recipe: RecordStr): string[] {
  const v = recipe.recipe_authors;
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((s) => s.trim());
}

/** Authors as credited on an external source (`source_authors`). */
export function sourceAuthorNames(recipe: RecordStr): string[] {
  return asStringArray(recipe.source_authors).filter((s) => s.trim().length > 0);
}

/**
 * Names for schema.org `author`: prefer `recipe_authors`, else fall back to `source_authors`.
 */
export function authorNamesForSchema(recipe: RecordStr): string[] {
  const ra = recipeAuthorNames(recipe);
  if (ra.length > 0) return ra;
  return sourceAuthorNames(recipe);
}

export function asMeasurement(v: unknown): RecordStr | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  return v as RecordStr;
}

export function asIngredientArray(v: unknown): RecordStr[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x && typeof x === "object" && !Array.isArray(x)) as RecordStr[];
}

export function asStepArray(v: unknown): RecordStr[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x && typeof x === "object" && !Array.isArray(x)) as RecordStr[];
}
