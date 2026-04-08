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

export function rawBase(): string {
  const { owner, repo, ref } = libraryEnv();
  return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}`;
}

export function libraryListUrl(): string {
  return `${rawBase()}/library-list.json`;
}

export function recipeRawUrl(relativePath: string): string {
  const base = rawBase();
  const p = relativePath.replace(/^\/+/, "");
  return `${base}/${p}`;
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

export async function fetchLibraryIndex(): Promise<LibraryList> {
  const res = await fetch(libraryListUrl(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load library index (${res.status})`);
  }
  return (await res.json()) as LibraryList;
}

export async function fetchRecipeJson(
  relativePath: string
): Promise<Record<string, unknown>> {
  const res = await fetch(recipeRawUrl(relativePath), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load recipe (${res.status})`);
  }
  return (await res.json()) as Record<string, unknown>;
}

/** Run async tasks with limited concurrency. */
export async function runPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function worker(): Promise<void> {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]!, idx);
    }
  }
  const n = Math.min(concurrency, Math.max(1, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

export type FetchRecipeResult =
  | { ok: true; path: string; recipe: Record<string, unknown> }
  | { ok: false; path: string; error: string };

export async function fetchRecipesBatched(
  paths: string[],
  concurrency = 8
): Promise<FetchRecipeResult[]> {
  return runPool(paths, concurrency, async (path) => {
    try {
      const recipe = await fetchRecipeJson(path);
      return { ok: true, path, recipe };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, path, error: msg };
    }
  });
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
