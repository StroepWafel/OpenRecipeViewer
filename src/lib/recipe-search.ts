import MiniSearch, { type Options } from "minisearch";

/**
 * Must match scripts/build-search-index.mjs (MiniSearch constructor + loadJSON options).
 */
const MINI_SEARCH_OPTIONS: Options = {
  idField: "id",
  fields: ["title", "ingredients", "tags", "text"],
  storeFields: ["title", "path"],
  searchOptions: {
    boost: { title: 3, ingredients: 2, tags: 1.5, text: 1 },
    fuzzy: 0.2,
    prefix: true,
  },
};

function searchIndexUrl(): string {
  const base = import.meta.env.BASE_URL || "/";
  const normalized = base.endsWith("/") ? base : `${base}/`;
  return `${normalized}library-data/search-index.json`;
}

let cached: MiniSearch | null = null;
let loadPromise: Promise<MiniSearch> | null = null;

export async function loadSearchIndex(): Promise<MiniSearch> {
  if (cached) return cached;
  if (!loadPromise) {
    loadPromise = (async () => {
      const res = await fetch(searchIndexUrl());
      if (!res.ok) {
        throw new Error(
          `Failed to load search index (${res.status}). Run "npm run build-search-index" after sync, then reload.`
        );
      }
      const json = await res.text();
      const ms = MiniSearch.loadJSON(json, MINI_SEARCH_OPTIONS);
      cached = ms;
      return ms;
    })();
  }
  return loadPromise;
}

export type SearchHit = {
  id: string;
  title: string;
  path: string;
  score: number;
};

export async function searchRecipes(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q) return [];
  const ms = await loadSearchIndex();
  const results = ms.search(q);
  return results.map((r) => ({
    id: String(r.id),
    title: typeof r.title === "string" ? r.title : String(r.id),
    path: typeof r.path === "string" ? r.path : String(r.id),
    score: r.score,
  }));
}
