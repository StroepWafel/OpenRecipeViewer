import "./load-env.mjs";

/**
 * Downloads library-list.json and all recipe JSON from GitHub (raw URLs),
 * writes public/library-data/bundle.json for static runtime + build scripts.
 *
 * Optional: GITHUB_TOKEN or GH_TOKEN — sent as Authorization for raw fetches
 * (helps private repos). Does not change public REST API quota for unauthenticated
 * calls; use GitHub API in a future script if you need 5k/hr REST limits.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

const owner = process.env.VITE_LIBRARY_OWNER ?? "stroepwafel";
const repo = process.env.VITE_LIBRARY_REPO ?? "OpenRecipeLibrary";
const ref = process.env.VITE_LIBRARY_REF ?? "library";

const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}`;

const token =
  process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? process.env.GITHUB_PAT;

function authHeaders() {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
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
  const res = await fetch(url, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function runPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  const n = Math.min(concurrency, Math.max(1, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

async function main() {
  const outDir = path.join(repoRoot, "public", "library-data");
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`sync-library: fetching index from ${rawBase}/library-list.json`);
  const index = await fetchJson(`${rawBase}/library-list.json`);
  const paths = collectRecipePaths(index);
  if (paths.length === 0) {
    console.warn("sync-library: no recipe paths in index.");
  }

  const recipes = {};
  const concurrency = 8;
  await runPool(paths, concurrency, async (rel) => {
    const relClean = rel.replace(/^\/+/, "");
    const url = `${rawBase}/${relClean}`;
    const res = await fetch(url, { headers: { ...authHeaders() } });
    if (!res.ok) {
      throw new Error(`Failed to fetch recipe ${rel}: HTTP ${res.status}`);
    }
    recipes[rel] = await res.json();
  });

  const bundle = {
    version: 1,
    index,
    recipes,
  };

  const outFile = path.join(outDir, "bundle.json");
  fs.writeFileSync(outFile, JSON.stringify(bundle), "utf8");
  console.log(
    `sync-library: wrote ${outFile} (${paths.length} recipe(s), index ${index.generated_at}).`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
