import { useCallback, useState } from "react";
import { formatMeasurement } from "@/lib/format-measurement";
import type { RecordStr } from "@/lib/recipe-types";
import {
  asIngredientArray,
  asMeasurement,
  asStepArray,
  asString,
  asStringArray,
  recipeAuthorNames,
  recipeName,
  sourceAuthorNames,
} from "@/lib/recipe-types";
import { scaleFactorFromBaseYield, formatScaledIngredientLine } from "@/lib/scale-yield";

export function RecipeBody({
  recipe,
  targetYieldAmount,
}: {
  recipe: RecordStr;
  targetYieldAmount: number;
}) {
  const name = recipeName(recipe);
  const culinaryAuthors = recipeAuthorNames(recipe);
  const publicationAuthors = sourceAuthorNames(recipe);
  const baseYield = recipe.base_yield as RecordStr | undefined;
  const factor = scaleFactorFromBaseYield(baseYield, targetYieldAmount);

  const categories = asStringArray(recipe.categories);
  const cuisine = asStringArray(recipe.cuisine);
  const tags = asStringArray(recipe.tags);
  const dietary = asStringArray(recipe.dietary);
  const mealType = asStringArray(recipe.meal_type);
  const skill =
    typeof recipe.skill_level === "string" ? recipe.skill_level : "";

  const prep = asMeasurement(recipe.prep_time);
  const cookT = asMeasurement(recipe.cook_time);
  const total = asMeasurement(recipe.total_time);

  const notes = asStringArray(recipe.notes);
  const ingredients = asIngredientArray(recipe.ingredients);
  const steps = asStepArray(recipe.steps);

  const [ingredientChecked, setIngredientChecked] = useState<Set<number>>(
    () => new Set()
  );

  const toggleIngredient = useCallback((index: number) => {
    setIngredientChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const chips = [
    ...categories.map((c) => ({ label: c, key: `c-${c}` })),
    ...cuisine.map((c) => ({ label: c, key: `cu-${c}` })),
    ...mealType.map((c) => ({ label: c, key: `m-${c}` })),
    ...dietary.map((c) => ({ label: c, key: `d-${c}` })),
    ...tags.slice(0, 8).map((c) => ({ label: c, key: `t-${c}` })),
  ];

  return (
    <article className="recipe-prose text-[var(--color-ink)]">
      <h1 className="mb-2">{name}</h1>
      {culinaryAuthors.length > 0 ? (
        <p className="text-[var(--color-muted)] text-sm mb-2">
          <span className="font-medium text-[var(--color-ink)]">By </span>
          {culinaryAuthors.join(", ")}
        </p>
      ) : null}
      {publicationAuthors.length > 0 ? (
        <p className="text-[var(--color-muted)] text-sm mb-3">
          <span className="font-medium text-[var(--color-ink)]">
            Credited in source:{" "}
          </span>
          {publicationAuthors.join(", ")}
        </p>
      ) : null}
      {skill ? (
        <p className="text-[var(--color-muted)] text-sm mb-4">Skill: {skill}</p>
      ) : null}

      {chips.length > 0 ? (
        <ul className="flex flex-wrap gap-2 mb-6 list-none p-0">
          {chips.map(({ label, key }) => (
            <li
              key={key}
              className="text-xs px-2 py-1 rounded-md bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-teal-200/50"
            >
              {label}
            </li>
          ))}
        </ul>
      ) : null}

      <section className="mb-8 grid gap-2 text-[var(--color-muted)] text-sm" aria-label="Timing and yield">
        {(prep || cookT || total) && (
          <p>
            {prep ? <>Prep {formatMeasurement(prep)} </> : null}
            {cookT ? <>· Cook {formatMeasurement(cookT)} </> : null}
            {total ? <>· Total {formatMeasurement(total)}</> : null}
          </p>
        )}
        {baseYield && (
          <p>
            <span className="font-medium text-[var(--color-ink)]">Yield: </span>
            {typeof baseYield.amount === "number" || typeof baseYield.amount === "string"
              ? String(baseYield.amount)
              : ""}{" "}
            {asString(baseYield.unit)}
            {factor !== 1 ? (
              <span className="text-[var(--color-accent)]">
                {" "}
                (scaled ×{factor.toFixed(3).replace(/\.?0+$/, "")})
              </span>
            ) : null}
          </p>
        )}
      </section>

      {notes.length > 0 ? (
        <section className="mb-8 p-4 rounded-[var(--radius-card)] bg-amber-50/80 border border-amber-100 text-[var(--color-ink)]">
          <h2 className="text-base font-semibold mb-2">Notes</h2>
          <ul className="list-disc pl-5 space-y-1">
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {ingredients.length > 0 ? (
        <section className="mb-10" aria-label="Ingredients">
          <h2 className="text-xl font-semibold mb-3">Ingredients</h2>
          <ul className="space-y-2.5 list-none p-0">
            {ingredients.map((ing, i) => {
              const line = formatScaledIngredientLine(ing, factor);
              const proc = asStringArray(ing.processing);
              const sub = proc.length ? ` (${proc.join(", ")})` : "";
              const id = `ingredient-${i}`;
              const done = ingredientChecked.has(i);
              const ingLabel =
                typeof ing.name === "string" && ing.name.trim()
                  ? ing.name.trim()
                  : `Ingredient ${i + 1}`;
              return (
                <li
                  key={i}
                  className="flex gap-3 items-start border-l-2 border-[var(--color-accent)]/30 pl-3 -ml-px"
                >
                  <input
                    id={id}
                    type="checkbox"
                    checked={done}
                    onChange={() => toggleIngredient(i)}
                    className="mt-1.5 h-4 w-4 shrink-0 rounded border-[var(--color-border)] accent-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                    aria-label={`Mark ${ingLabel} as gathered`}
                  />
                  <label
                    htmlFor={id}
                    className="flex-1 min-w-0 cursor-pointer select-none"
                  >
                    <span
                      className={
                        done
                          ? "text-[var(--color-muted)] line-through decoration-[var(--color-muted)]"
                          : "text-[var(--color-ink)]"
                      }
                    >
                      {line.primary}
                      {sub}
                    </span>
                    {line.note ? (
                      <span
                        className={`block text-sm mt-0.5 ${
                          done
                            ? "text-[var(--color-muted)]/80 line-through"
                            : "text-[var(--color-muted)]"
                        }`}
                      >
                        {line.note}
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {steps.length > 0 ? (
        <section className="steps mb-8" aria-label="Steps">
          <h2 className="text-xl font-semibold mb-3">Steps</h2>
          <ol className="list-decimal pl-6 space-y-3 marker:text-[var(--color-accent)] marker:font-semibold">
            {steps.map((s, i) => {
              const text = typeof s.step === "string" ? s.step : "";
              return (
                <li key={i}>
                  {text}
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </article>
  );
}
