/**
 * Builds MiniSearch JSON index from public/library-data/bundle.json.
 * Keep field/storeField/searchOptions in sync with src/lib/recipe-search.ts.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MiniSearch from "minisearch";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const bundlePath = path.join(repoRoot, "public", "library-data", "bundle.json");
const outPath = path.join(repoRoot, "public", "library-data", "search-index.json");

/** @param {string} pathKey @param {Record<string, unknown>} recipe */
function recipeToDoc(pathKey, recipe) {
  const title =
    typeof recipe.recipe_name === "string" ? recipe.recipe_name.trim() : "";

  const ingParts = [];
  if (Array.isArray(recipe.ingredients)) {
    for (const ing of recipe.ingredients) {
      if (ing && typeof ing === "object" && typeof ing.name === "string") {
        ingParts.push(ing.name);
      }
    }
  }
  const ingredients = ingParts.join(" ");

  const tagParts = [];
  for (const key of [
    "tags",
    "categories",
    "cuisine",
    "cor",
    "dietary",
    "allergens",
    "meal_type",
    "equipment",
    "skill_level",
  ]) {
    const v = recipe[key];
    if (Array.isArray(v)) {
      for (const x of v) {
        if (typeof x === "string" && x.trim()) tagParts.push(x.trim());
      }
    } else if (typeof v === "string" && v.trim()) {
      tagParts.push(v.trim());
    }
  }
  const tags = tagParts.join(" ");

  const corParts = [];
  if (Array.isArray(recipe.cor)) {
    for (const x of recipe.cor) {
      if (typeof x === "string" && x.trim()) corParts.push(x.trim());
    }
  }
  const corDisplay = corParts.join(", ");

  const tagsPreviewArr = [];
  if (Array.isArray(recipe.tags)) {
    for (const x of recipe.tags) {
      if (typeof x === "string" && x.trim()) {
        tagsPreviewArr.push(x.trim());
        if (tagsPreviewArr.length >= 5) break;
      }
    }
  }
  const tagsPreview = tagsPreviewArr.join("\u0001");

  const allergenParts = [];
  if (Array.isArray(recipe.allergens)) {
    for (const x of recipe.allergens) {
      if (typeof x === "string" && x.trim()) allergenParts.push(x.trim());
    }
  }
  const allergensDisplay = allergenParts.join(", ");

  const dietaryParts = [];
  if (Array.isArray(recipe.dietary)) {
    for (const x of recipe.dietary) {
      if (typeof x === "string" && x.trim()) dietaryParts.push(x.trim());
    }
  }
  const dietaryDisplay = dietaryParts.join(", ");

  const skillRaw =
    typeof recipe.skill_level === "string" ? recipe.skill_level.trim() : "";
  const sl = skillRaw.toLowerCase();
  let skillRank = 0;
  if (sl === "beginner") skillRank = 1;
  else if (sl === "intermediate") skillRank = 2;
  else if (sl === "advanced") skillRank = 3;

  const noteTexts = [];
  if (Array.isArray(recipe.notes)) {
    for (const n of recipe.notes) {
      if (typeof n === "string") noteTexts.push(n);
    }
  }
  const stepTexts = [];
  if (Array.isArray(recipe.steps)) {
    for (const s of recipe.steps) {
      if (s && typeof s === "object" && typeof s.step === "string") {
        stepTexts.push(s.step);
      }
    }
  }
  const authorBits = [];
  for (const key of ["recipe_authors", "source_authors"]) {
    const v = recipe[key];
    if (Array.isArray(v)) {
      for (const a of v) {
        if (typeof a === "string" && a.trim()) authorBits.push(a.trim());
      }
    }
  }
  const text = [
    noteTexts.join(" "),
    stepTexts.join(" "),
    authorBits.join(" "),
  ]
    .join(" ")
    .slice(0, 50000);

  return {
    id: pathKey,
    title,
    ingredients,
    tags,
    corDisplay,
    tagsPreview,
    allergensDisplay,
    dietaryDisplay,
    skillRank,
    text,
    path: pathKey,
  };
}

function main() {
  if (!fs.existsSync(bundlePath)) {
    console.error(
      "build-search-index: bundle missing; run `npm run sync` first."
    );
    process.exit(1);
  }

  const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
  const recipes = bundle.recipes;
  if (!recipes || typeof recipes !== "object") {
    console.error("build-search-index: invalid bundle (no recipes).");
    process.exit(1);
  }

  const docs = [];
  for (const pathKey of Object.keys(recipes)) {
    docs.push(recipeToDoc(pathKey, recipes[pathKey]));
  }

  const miniSearch = new MiniSearch({
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
  });
  miniSearch.addAll(docs);

  const json = JSON.stringify(miniSearch.toJSON());
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, json, "utf8");
  console.log(
    `build-search-index: wrote ${outPath} (${docs.length} document(s)).`
  );
}

main();
