/** Key on `location.state` for where to return from a recipe (pathname only). */
export const LIBRARY_FROM_STATE = "libraryFrom" as const;

export type LibraryLocationState = {
  [LIBRARY_FROM_STATE]?: string;
};

/**
 * Safe path for the recipe page “back” link from React Router `location.state`.
 * Falls back to `/` when missing or invalid (direct loads, bookmarks, tampered state).
 */
export function libraryBackFromState(state: unknown): string {
  if (!state || typeof state !== "object") return "/";
  const raw = (state as LibraryLocationState)[LIBRARY_FROM_STATE];
  if (typeof raw !== "string") return "/";
  const from = raw.trim();
  if (!from.startsWith("/") || from.startsWith("//")) return "/";
  if (from.includes("?") || from.includes("#")) return "/";
  return from;
}
