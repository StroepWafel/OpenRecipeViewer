import ogMeta from "../og-image-version.json";

export const OG_IMAGE_VERSION = ogMeta.version;

/** Vite `base` without trailing slash, or "" when deployed at domain root. */
export function viteBasePrefix(): string {
  const bp = import.meta.env.VITE_BASE_PATH ?? "/";
  if (bp === "/" || bp === "") return "";
  return bp.replace(/\/+$/, "");
}

/**
 * Absolute URL for a static OG PNG under `/og/` (respects `VITE_BASE_PATH`).
 */
export function ogImageAbsoluteUrl(
  siteOrigin: string,
  fileName: string
): string {
  const origin = siteOrigin.replace(/\/+$/, "");
  const base = viteBasePrefix();
  const pathPrefix = base ? `${base}` : "";
  return `${origin}${pathPrefix}/og/${fileName}?v=${OG_IMAGE_VERSION}`;
}

export function recipeOgFileName(recipeKey: string): string {
  return `${recipeKey}.png`;
}
