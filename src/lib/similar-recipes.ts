import { collectRecipePaths, type LibraryList } from "./library-api";

export type PathLabels = {
  tags: Set<string>;
  categories: Set<string>;
  cuisine: Set<string>;
};

/** Invert index buckets so each path has its facet labels (normalized keys from the index). */
export function buildPathToLabels(index: LibraryList): Map<string, PathLabels> {
  const m = new Map<string, PathLabels>();
  for (const p of collectRecipePaths(index)) {
    m.set(p, {
      tags: new Set(),
      categories: new Set(),
      cuisine: new Set(),
    });
  }

  function ensure(p: string): PathLabels {
    let x = m.get(p);
    if (!x) {
      x = {
        tags: new Set(),
        categories: new Set(),
        cuisine: new Set(),
      };
      m.set(p, x);
    }
    return x;
  }

  function ingest(
    bucket: Record<string, string[]>,
    field: "tags" | "categories" | "cuisine"
  ): void {
    for (const [label, paths] of Object.entries(bucket)) {
      for (const p of paths) {
        if (!p) continue;
        ensure(p)[field].add(label);
      }
    }
  }

  ingest(index.by_tag, "tags");
  ingest(index.by_category, "categories");
  ingest(index.by_cuisine, "cuisine");

  return m;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

function scoreOverlap(a: PathLabels, b: PathLabels): number {
  const wTags = 3;
  const wCat = 2;
  const wCui = 1;
  return (
    wTags * jaccard(a.tags, b.tags) +
    wCat * jaccard(a.categories, b.categories) +
    wCui * jaccard(a.cuisine, b.cuisine)
  );
}

export function similarRecipePaths(
  index: LibraryList,
  currentPath: string,
  limit = 5
): string[] {
  const map = buildPathToLabels(index);
  const self = map.get(currentPath);
  if (!self) return [];

  const scores: { path: string; score: number }[] = [];
  for (const [path, labels] of map) {
    if (path === currentPath) continue;
    const s = scoreOverlap(self, labels);
    if (s > 0) scores.push({ path, score: s });
  }
  scores.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return scores.slice(0, limit).map((x) => x.path);
}
