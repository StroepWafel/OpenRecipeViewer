import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  collectRecipePaths,
  fetchLibraryIndex,
  fetchRecipesBatched,
  type LibraryList,
  type FetchRecipeResult,
} from "@/lib/library-api";
import { encodeRecipePath } from "@/lib/path-encoding";
import { recipeName } from "@/lib/recipe-types";
import type { RecordStr } from "@/lib/recipe-types";

export function HomePage() {
  const [index, setIndex] = useState<LibraryList | null>(null);
  const [byPath, setByPath] = useState<Map<string, RecordStr>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failures, setFailures] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const idx = await fetchLibraryIndex();
        if (cancelled) return;
        setIndex(idx);
        const paths = collectRecipePaths(idx);
        if (paths.length === 0) {
          setLoading(false);
          return;
        }
        const results = await fetchRecipesBatched(paths, 8);
        if (cancelled) return;
        const m = new Map<string, RecordStr>();
        const bad: string[] = [];
        for (const r of results as FetchRecipeResult[]) {
          if (r.ok) m.set(r.path, r.recipe);
          else bad.push(`${r.path}: ${r.error}`);
        }
        setByPath(m);
        setFailures(bad);
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

  return (
    <>
      <Helmet>
        <title>Open Recipe Library</title>
        <meta
          name="description"
          content="Browse Open Recipe Standard recipes from the public library on GitHub."
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
            Loading recipes…
          </p>
        )}
        {error && (
          <p className="text-red-700 bg-red-50 border border-red-100 rounded-lg p-4" role="alert">
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
        {!loading && paths.length > 0 && (
          <ul className="space-y-3 list-none p-0">
            {paths.map((p) => {
              const r = byPath.get(p);
              const title = r ? recipeName(r) : p;
              return (
                <li
                  key={p}
                  className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-paper)] shadow-sm hover:border-[var(--color-accent)]/40 transition-colors"
                >
                  <Link
                    to={`/r/${encodeRecipePath(p)}`}
                    className="block px-4 py-3 text-[var(--color-ink)] font-medium hover:text-[var(--color-accent)]"
                  >
                    {title}
                    <span className="block text-xs font-normal text-[var(--color-muted)] mt-1 truncate">
                      {p}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {failures.length > 0 && (
          <details className="mt-6 text-sm text-[var(--color-muted)]">
            <summary>Some recipes failed to load ({failures.length})</summary>
            <ul className="mt-2 list-disc pl-5">
              {failures.slice(0, 10).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </>
  );
}
