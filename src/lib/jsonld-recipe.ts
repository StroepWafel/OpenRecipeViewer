import type { RecordStr } from "./recipe-types";
import {
  asIngredientArray,
  asStepArray,
  authorNamesForSchema,
  recipeName,
} from "./recipe-types";
import { siteOrigin } from "./library-api";
import { ogImageAbsoluteUrl, recipeOgFileName } from "./og";
import { encodeRecipePath } from "./path-encoding";

export function recipeJsonLd(
  recipe: RecordStr,
  relativePath: string
): string {
  const name = recipeName(recipe);
  const ingredients = asIngredientArray(recipe.ingredients).map((ing) => {
    const n = typeof ing.name === "string" ? ing.name : "";
    return n;
  });
  const steps = asStepArray(recipe.steps)
    .map((s) => (typeof s.step === "string" ? s.step : ""))
    .filter(Boolean);

  const authors = authorNamesForSchema(recipe);
  const yieldText = yieldString(recipe);

  const key = encodeRecipePath(relativePath);
  const origin = siteOrigin();
  const path = `/r/${key}`;
  const url = origin ? `${origin}${path}` : path;

  const obj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name,
    url,
  };
  if (origin) {
    obj.image = ogImageAbsoluteUrl(origin, recipeOgFileName(key));
  }
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

function yieldString(recipe: RecordStr): string {
  const by = recipe.base_yield;
  if (!by || typeof by !== "object" || Array.isArray(by)) return "";
  const m = by as RecordStr;
  const amount = m.amount;
  const unit = typeof m.unit === "string" ? m.unit : "";
  let n: number;
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

export function recipeMetaDescription(recipe: RecordStr): string {
  const name = recipeName(recipe);
  const ing = asIngredientArray(recipe.ingredients)
    .slice(0, 4)
    .map((i) => (typeof i.name === "string" ? i.name : ""))
    .filter(Boolean);
  const tail = ing.length ? ` Ingredients include ${ing.join(", ")}.` : "";
  const base = `${name}. Open Recipe Standard recipe from the Open Recipe Library.`;
  return (base + tail).slice(0, 300);
}
