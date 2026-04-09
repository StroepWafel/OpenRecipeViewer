import { collectRecipePaths, type LibraryList } from "./library-api";

export type LibraryBundle = {
  version: number;
  index: LibraryList;
  recipes: Record<string, Record<string, unknown>>;
};

let cached: LibraryBundle | null = null;
let loadPromise: Promise<LibraryBundle> | null = null;

function bundleUrl(): string {
  const base = import.meta.env.BASE_URL || "/";
  const normalized = base.endsWith("/") ? base : `${base}/`;
  return `${normalized}library-data/bundle.json`;
}

/**
 * Loads the build-time library bundle once (same-origin static JSON).
 */
export function loadLibraryBundle(): Promise<LibraryBundle> {
  if (cached) return Promise.resolve(cached);
  if (!loadPromise) {
    loadPromise = (async () => {
      const res = await fetch(bundleUrl());
      if (!res.ok) {
        throw new Error(
          `Failed to load library bundle (${res.status}). Run "npm run sync" then reload.`
        );
      }
      const data = (await res.json()) as LibraryBundle;
      cached = data;
      return data;
    })();
  }
  return loadPromise;
}

export function catalogPathsSet(index: LibraryList): Set<string> {
  return new Set(collectRecipePaths(index));
}
