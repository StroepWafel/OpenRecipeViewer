export type LibraryList = {
  version: number;
  generated_at: string;
  recipe_count: number;
  normalization: string;
  by_category: Record<string, string[]>;
  by_cor: Record<string, string[]>;
  by_cuisine: Record<string, string[]>;
  by_tag: Record<string, string[]>;
  by_dietary: Record<string, string[]>;
  by_allergen: Record<string, string[]>;
  by_meal_type: Record<string, string[]>;
  by_skill_level: Record<string, string[]>;
};

export function libraryEnv(): { owner: string; repo: string; ref: string } {
  return {
    owner: import.meta.env.VITE_LIBRARY_OWNER ?? "stroepwafel",
    repo: import.meta.env.VITE_LIBRARY_REPO ?? "OpenRecipeLibrary",
    ref: import.meta.env.VITE_LIBRARY_REF ?? "library",
  };
}

export function collectRecipePaths(index: LibraryList): string[] {
  const set = new Set<string>();
  const buckets = [
    index.by_category,
    index.by_cor,
    index.by_cuisine,
    index.by_tag,
    index.by_dietary,
    index.by_allergen,
    index.by_meal_type,
    index.by_skill_level,
  ];
  for (const b of buckets) {
    for (const paths of Object.values(b)) {
      for (const p of paths) {
        if (p) set.add(p);
      }
    }
  }
  return Array.from(set).sort();
}

export function siteOrigin(): string {
  const u = import.meta.env.VITE_SITE_URL;
  if (u && typeof u === "string" && u.length > 0) {
    return u.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}
