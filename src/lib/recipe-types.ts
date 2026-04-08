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
