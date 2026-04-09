/**
 * Writes dist/sitemap.xml with home and each /r/<key> from library-list.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeSiteUrl } from "./load-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "..", "dist");
const repoRoot = path.join(__dirname, "..");

let siteUrl =
  normalizeSiteUrl(process.env.VITE_SITE_URL ?? "") || "https://example.com";

const libraryBundlePath = path.join(
  repoRoot,
  "public",
  "library-data",
  "bundle.json"
);

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

async function main() {
  const urls = [`${siteUrl}/`];

  if (!fs.existsSync(libraryBundlePath)) {
    console.error(
      "sitemap: public/library-data/bundle.json missing; run `npm run sync` first."
    );
    process.exit(1);
  }
  const bundle = JSON.parse(fs.readFileSync(libraryBundlePath, "utf8"));
  const index = bundle.index;
  for (const p of collectRecipePaths(index)) {
    const key = encodeRecipePath(p);
    urls.push(`${siteUrl}/r/${key}`);
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
