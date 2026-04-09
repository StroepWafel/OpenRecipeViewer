import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import type { LibraryList } from "@/lib/library-api";
import { loadLibraryBundle } from "@/lib/library-static";
import {
  formatMealLabel,
  pathsForMealKey,
  resolveMealSlug,
} from "@/lib/meal-routes";
import { LIBRARY_FROM_STATE } from "@/lib/library-nav";
import { encodeRecipePath } from "@/lib/path-encoding";
import { recipeName } from "@/lib/recipe-types";
import type { RecordStr } from "@/lib/recipe-types";

export function MealPage() {
  const { mealSlug = "" } = useParams();
  const { pathname } = useLocation();

  const [index, setIndex] = useState<LibraryList | null>(null);
  const [byPath, setByPath] = useState<Map<string, RecordStr>>(new Map());
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bundle = await loadLibraryBundle();
        if (cancelled) return;
        const idx = bundle.index;
        setIndex(idx);
        const key = resolveMealSlug(idx, mealSlug);
        if (!key) {
          setResolvedKey(null);
          setLoading(false);
          return;
        }
        setResolvedKey(key);
        const paths = pathsForMealKey(idx, key);
        if (paths.length === 0) {
          setByPath(new Map());
          setLoading(false);
          return;
        }
        const m = new Map<string, RecordStr>();
        for (const p of paths) {
          const rec = bundle.recipes[p];
          if (rec) m.set(p, rec as RecordStr);
        }
        setByPath(m);
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
  }, [mealSlug]);

  const label =
    resolvedKey !== null ? formatMealLabel(resolvedKey) : "Meal type";

  const items = useMemo(() => {
    if (!index || resolvedKey === null) return [];
    const paths = pathsForMealKey(index, resolvedKey);
    const rows = paths.map((p) => {
      const r = byPath.get(p);
      return { path: p, title: r ? recipeName(r) : p };
    });
    rows.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
    );
    return rows;
  }, [index, resolvedKey, byPath]);

  const count =
    index && resolvedKey !== null
      ? pathsForMealKey(index, resolvedKey).length
      : 0;

  return (
    <>
      <Helmet>
        <title>{label} · Open Recipe Library</title>
        <meta
          name="description"
          content={`Recipes for “${label}” from the Open Recipe Library.`}
        />
      </Helmet>

      <div className="max-w-2xl">
        <nav className="text-sm text-[var(--color-muted)] mb-4">
          <Link to="/" className="hover:text-[var(--color-accent)]">
            Library
          </Link>
          <span className="mx-2" aria-hidden>
            /
          </span>
          <span className="text-[var(--color-ink)]">{label}</span>
        </nav>

        <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-ink)] mb-2">
          {label}
        </h1>
        <p className="text-[var(--color-muted)] mb-8">
          {index && resolvedKey !== null
            ? `${count} recipe(s) · Index ${index.generated_at}`
            : null}
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
        {!loading && !error && resolvedKey === null && (
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 text-amber-950">
            <p>Unknown meal type.</p>
            <Link
              to="/"
              className="text-[var(--color-accent)] font-medium mt-2 inline-block"
            >
              ← Back to library
            </Link>
          </div>
        )}
        {!loading && resolvedKey !== null && items.length === 0 && (
          <p className="text-[var(--color-muted)]">
            No recipes for this meal type.
          </p>
        )}
        {!loading && resolvedKey !== null && items.length > 0 && (
          <ul className="space-y-3 list-none p-0">
            {items.map(({ path: p, title }) => (
              <li
                key={p}
                className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-paper)] shadow-sm hover:border-[var(--color-accent)]/40 transition-colors"
              >
                <Link
                  to={`/r/${encodeRecipePath(p)}`}
                  state={{ [LIBRARY_FROM_STATE]: pathname }}
                  className="block px-4 py-3 text-[var(--color-ink)] font-medium hover:text-[var(--color-accent)]"
                >
                  {title}
                  <span className="block text-xs font-normal text-[var(--color-muted)] mt-1 truncate">
                    {p}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
