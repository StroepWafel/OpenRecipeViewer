import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  collectRecipePaths,
  fetchLibraryIndex,
  type LibraryList,
} from "@/lib/library-api";
import { mealIndexEntries } from "@/lib/meal-routes";

export function HomePage() {
  const [index, setIndex] = useState<LibraryList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const idx = await fetchLibraryIndex();
        if (cancelled) return;
        setIndex(idx);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const paths = index ? collectRecipePaths(index) : [];
  const meals = index ? mealIndexEntries(index) : [];

  return (
    <>
      <Helmet>
        <title>Open Recipe Library</title>
        <meta
          name="description"
          content="Browse Open Recipe Standard recipes by meal type from the public library on GitHub."
        />
      </Helmet>

      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-ink)] mb-2">
          Library
        </h1>
        <p className="text-[var(--color-muted)] mb-8">
          {index
            ? `Index generated ${index.generated_at} · ${index.recipe_count} recipe(s) in catalog.`
            : "Loading index…"}
        </p>

        {loading && (
          <p className="text-[var(--color-muted)]" role="status">
            Loading…
          </p>
        )}
        {error && (
          <p
            className="text-red-700 bg-red-50 border border-red-100 rounded-lg p-4"
            role="alert"
          >
            {error}
          </p>
        )}
        {!loading && !error && paths.length === 0 && (
          <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-paper)] p-8 text-center">
            <p className="text-[var(--color-muted)] mb-4">
              No recipes are published on the library branch yet.
            </p>
            <a
              className="text-[var(--color-accent)] font-medium hover:underline"
              href="https://github.com/stroepwafel/OpenRecipeLibrary"
            >
              Contribute on GitHub
            </a>
          </div>
        )}
        {!loading && !error && paths.length > 0 && (
          <section aria-labelledby="meals-heading">
            <h2
              id="meals-heading"
              className="text-lg font-semibold text-[var(--color-ink)] mb-4"
            >
              Meal types
            </h2>
            <p className="text-sm text-[var(--color-muted)] mb-4">
              A recipe can appear under more than one meal type when it lists
              several in its metadata.
            </p>
            <ul className="space-y-3 list-none p-0">
              {meals.map(({ key, slug, label, count }) => (
                <li
                  key={key}
                  className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-paper)] shadow-sm hover:border-[var(--color-accent)]/40 transition-colors"
                >
                  <Link
                    to={`/m/${slug}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 text-[var(--color-ink)] font-medium hover:text-[var(--color-accent)]"
                  >
                    <span className="capitalize">{label}</span>
                    <span className="text-sm font-normal text-[var(--color-muted)] tabular-nums shrink-0">
                      {count} recipe{count === 1 ? "" : "s"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
