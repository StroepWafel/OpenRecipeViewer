import MiniSearch, { type Options } from "minisearch";
import { compareSkillRank } from "@/lib/recipe-tags";

/**
 * Must match scripts/build-search-index.mjs (MiniSearch constructor + loadJSON options).
 */
const MINI_SEARCH_OPTIONS: Options = {
  idField: "id",
  fields: ["title", "ingredients", "tags", "text"],
  storeFields: [
    "title",
    "path",
    "skillRank",
    "corDisplay",
    "tagsPreview",
    "allergensDisplay",
    "dietaryDisplay",
  ],
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
  skillRank: number;
  corDisplay: string;
  /** First five `tags` entries, joined with \\u0001 in the index. */
  tagsPreview: string;
  allergensDisplay: string;
  dietaryDisplay: string;
};

export type SearchRecipeOptions = {
  /** When set, sort by difficulty; otherwise preserve relevance order. */
  difficultySort: "asc" | "desc" | null;
};

/** Split `tagsPreview` stored in the search index (joined with \\u0001). */
export function splitTagsPreview(raw: string): string[] {
  if (!raw) return [];
  return raw.split("\u0001").filter(Boolean);
}

function parseSkillRank(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(3, Math.floor(n));
}

export async function searchRecipes(
  query: string,
  options: SearchRecipeOptions = { difficultySort: null }
): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q) return [];
  const ms = await loadSearchIndex();
  const results = ms.search(q);
  const { difficultySort } = options;

  const base: SearchHit[] = results.map((r) => {
    const rec = r as Record<string, unknown>;
    return {
      id: String(r.id),
      title: typeof r.title === "string" ? r.title : String(r.id),
      path: typeof r.path === "string" ? r.path : String(r.id),
      score: r.score,
      skillRank: parseSkillRank(rec.skillRank),
      corDisplay:
        typeof rec.corDisplay === "string" ? rec.corDisplay : "",
      tagsPreview:
        typeof rec.tagsPreview === "string" ? rec.tagsPreview : "",
      allergensDisplay:
        typeof rec.allergensDisplay === "string" ? rec.allergensDisplay : "",
      dietaryDisplay:
        typeof rec.dietaryDisplay === "string" ? rec.dietaryDisplay : "",
    };
  });

  if (!difficultySort) return base;

  const cmpTitle = (a: SearchHit, b: SearchHit) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" });

  return [...base].sort((a, b) => {
    const c = compareSkillRank(a.skillRank, b.skillRank, difficultySort);
    if (c !== 0) return c;
    return cmpTitle(a, b);
  });
}
