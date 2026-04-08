/**
 * After `vite build`, generates `dist/r/<key>/index.html` for each recipe in library-list.json
 * with head tags, JSON-LD, and a noscript article for crawlers without JS.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "..", "dist");

const owner = process.env.VITE_LIBRARY_OWNER ?? "stroepwafel";
const repo = process.env.VITE_LIBRARY_REPO ?? "OpenRecipeLibrary";
const ref = process.env.VITE_LIBRARY_REF ?? "library";
const siteUrl = (process.env.VITE_SITE_URL ?? "").replace(/\/+$/, "");

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

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function recipeAuthorNames(recipe) {
  const v = recipe.recipe_authors;
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string" && x.trim().length > 0)
    .map((s) => s.trim());
}

function sourceAuthorNames(recipe) {
  const v = recipe.source_authors;
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string" && x.trim().length > 0)
    .map((s) => s.trim());
}

function authorNamesForSchema(recipe) {
  const ra = recipeAuthorNames(recipe);
  if (ra.length) return ra;
  return sourceAuthorNames(recipe);
}

function yieldString(recipe) {
  const by = recipe.base_yield;
  if (!by || typeof by !== "object" || Array.isArray(by)) return "";
  const amount = by.amount;
  const unit = typeof by.unit === "string" ? by.unit : "";
  let n;
  if (typeof amount === "number" && Number.isFinite(amount)) {
    n = amount;
  } else if (typeof amount === "string") {
    const p = parseFloat(amount);
    n = Number.isFinite(p) ? p : NaN;
  } else {
    n = NaN;
  }
  if (!Number.isFinite(n)) return "";
  const rounded =
    Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : String(n);
  return unit ? `${rounded} ${unit}` : rounded;
}

function recipeMetaDescription(recipe) {
  const name =
    typeof recipe.recipe_name === "string" ? recipe.recipe_name : "Recipe";
  const ings = Array.isArray(recipe.ingredients)
    ? recipe.ingredients
        .slice(0, 4)
        .map((i) => (i && typeof i.name === "string" ? i.name : ""))
        .filter(Boolean)
    : [];
  const tail = ings.length
    ? ` Ingredients include ${ings.join(", ")}.`
    : "";
  return (name +
    ". Open Recipe Standard recipe from the Open Recipe Library." +
    tail).slice(0, 300);
}

function jsonLdRecipe(recipe, relativePath, canonicalUrl) {
  const name =
    typeof recipe.recipe_name === "string" ? recipe.recipe_name : "Recipe";
  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients
        .map((i) => (i && typeof i.name === "string" ? i.name : ""))
        .filter(Boolean)
    : [];
  const steps = Array.isArray(recipe.steps)
    ? recipe.steps
        .map((s) => (s && typeof s.step === "string" ? s.step : ""))
        .filter(Boolean)
    : [];
  const authors = authorNamesForSchema(recipe);
  const yieldText = yieldString(recipe);
  const obj = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name,
    url: canonicalUrl,
  };
  if (ingredients.length) obj.recipeIngredient = ingredients;
  if (steps.length) {
    obj.recipeInstructions = steps.map((text) => ({
      "@type": "HowToStep",
      text,
    }));
  }
  if (authors.length) {
    obj.author = authors.map((a) => ({ "@type": "Person", name: a }));
  }
  if (yieldText) obj.recipeYield = yieldText;
  return JSON.stringify(obj);
}

function noscriptArticle(recipe) {
  const name =
    typeof recipe.recipe_name === "string" ? recipe.recipe_name : "Recipe";
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  let html = `<article><h1>${escapeHtml(name)}</h1>`;
  const cul = recipeAuthorNames(recipe);
  const pub = sourceAuthorNames(recipe);
  if (cul.length) {
    html += `<p><strong>By</strong> ${escapeHtml(cul.join(", "))}</p>`;
  }
  if (pub.length) {
    html += `<p><strong>Credited in source:</strong> ${escapeHtml(pub.join(", "))}</p>`;
  }
  if (ingredients.length) {
    html += "<h2>Ingredients</h2><ul>";
    for (const ing of ingredients) {
      const n = ing && typeof ing.name === "string" ? ing.name : "";
      if (n) html += `<li>${escapeHtml(n)}</li>`;
    }
    html += "</ul>";
  }
  if (steps.length) {
    html += "<h2>Steps</h2><ol>";
    for (const s of steps) {
      const t = s && typeof s.step === "string" ? s.step : "";
      if (t) html += `<li>${escapeHtml(t)}</li>`;
    }
    html += "</ol>";
  }
  html += "</article>";
  return `<noscript>${html}</noscript>`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function main() {
  const indexPath = path.join(dist, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.warn("prerender: dist/index.html missing; skip.");
    process.exit(0);
  }
  const shell = fs.readFileSync(indexPath, "utf8");

  let index;
  try {
    index = await fetchJson(`${rawBase}/library-list.json`);
  } catch (e) {
    console.warn("prerender: could not fetch library index:", e);
    process.exit(0);
  }

  const paths = collectRecipePaths(index);
  if (paths.length === 0) {
    console.log("prerender: no recipe paths in index.");
    process.exit(0);
  }

  let n = 0;
  for (const rel of paths) {
    const key = encodeRecipePath(rel);
    let recipe;
    try {
      recipe = await fetchJson(`${rawBase}/${rel.replace(/^\/+/, "")}`);
    } catch {
      continue;
    }
    const title =
      typeof recipe.recipe_name === "string"
        ? recipe.recipe_name
        : "Recipe";
    const desc = escapeHtml(recipeMetaDescription(recipe));
    const pathSeg = `/r/${key}`;
    const canonicalUrl = siteUrl ? `${siteUrl}${pathSeg}` : pathSeg;
    const jsonLd = jsonLdRecipe(recipe, rel, canonicalUrl);
    const headBlock = `
    <title>${escapeHtml(title)} · Open Recipe Library</title>
    <meta name="description" content="${desc}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:type" content="article" />
    <script type="application/ld+json">${jsonLd}</script>
    `;

    let html = shell;
    if (html.includes("</head>")) {
      html = html.replace("</head>", `${headBlock}</head>`);
    } else {
      html = headBlock + html;
    }
    const ns = noscriptArticle(recipe);
    if (html.includes('<div id="root"></div>')) {
      html = html.replace('<div id="root"></div>', `${ns}<div id="root"></div>`);
    } else if (html.includes("<body")) {
      html = html.replace("<body>", `<body>${ns}`);
    }

    const outDir = path.join(dist, "r", key);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
    n += 1;
  }
  console.log(`prerender: wrote ${n} recipe HTML file(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
