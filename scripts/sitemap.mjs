/**
 * Writes dist/sitemap.xml with home and each /r/<key> from library-list.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "..", "dist");

const owner = process.env.VITE_LIBRARY_OWNER ?? "stroepwafel";
const repo = process.env.VITE_LIBRARY_REPO ?? "OpenRecipeLibrary";
const ref = process.env.VITE_LIBRARY_REF ?? "library";
let siteUrl = process.env.VITE_SITE_URL ?? "https://example.com";
siteUrl = siteUrl.replace(/\/+$/, "");

const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}`;

function encodeRecipePath(relativePath) {
  return Buffer.from(relativePath, "utf8").toString("base64url");
}

function collectRecipePaths(index) {
  const set = new Set();
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

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const urls = [`${siteUrl}/`];

  try {
    const index = await fetchJson(`${rawBase}/library-list.json`);
    for (const p of collectRecipePaths(index)) {
      const key = encodeRecipePath(p);
      urls.push(`${siteUrl}/r/${key}`);
    }
  } catch (e) {
    console.warn("sitemap: index fetch failed, home only:", e);
  }

  const lastmod = new Date().toISOString().slice(0, 10);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (loc) => `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`
  )
  .join("\n")}
</urlset>
`;

  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(path.join(dist, "sitemap.xml"), body, "utf8");
  console.log(`sitemap: wrote ${urls.length} URL(s) to dist/sitemap.xml`);
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
