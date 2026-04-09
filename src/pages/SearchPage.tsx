import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { LIBRARY_FROM_STATE } from "@/lib/library-nav";
import { encodeRecipePath } from "@/lib/path-encoding";
import { searchRecipes, type SearchHit } from "@/lib/recipe-search";

const DEBOUNCE_MS = 250;

export function SearchPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const qParam = searchParams.get("q") ?? "";

  const [draft, setDraft] = useState(qParam);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(qParam);
  }, [qParam]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const q = draft.trim();
      setSearchParams(q ? { q } : {}, { replace: true });

      if (!q) {
        setHits([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      searchRecipes(q)
        .then(setHits)
        .catch((e) => {
          setHits([]);
          setError(e instanceof Error ? e.message : String(e));
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [draft, setSearchParams]);

  const backTarget = `${location.pathname}${location.search}`;

  return (
    <>
      <Helmet>
        <title>Search · Open Recipe Library</title>
        <meta
          name="description"
          content="Search recipes in the Open Recipe Library by name, ingredients, and tags."
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
          <span className="text-[var(--color-ink)]">Search</span>
        </nav>

        <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-ink)] mb-2">
          Search
        </h1>
        <p className="text-[var(--color-muted)] mb-6">
          Find recipes by title, ingredients, tags, and text in the catalog.
        </p>

        <label className="block mb-6">
          <span className="sr-only">Search query</span>
          <input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search recipes…"
            autoComplete="off"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3 text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40"
          />
        </label>

        {loading && (
          <p className="text-[var(--color-muted)]" role="status">
            Searching…
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
        {!loading && !error && draft.trim() && hits.length === 0 && (
          <p className="text-[var(--color-muted)]">No matching recipes.</p>
        )}
        {!loading && !error && hits.length > 0 && (
          <ul className="space-y-3 list-none p-0">
            {hits.map((h) => (
              <li
                key={h.path}
                className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-paper)] shadow-sm hover:border-[var(--color-accent)]/40 transition-colors"
              >
                <Link
                  to={`/r/${encodeRecipePath(h.path)}`}
                  state={{ [LIBRARY_FROM_STATE]: backTarget }}
                  className="block px-4 py-3 text-[var(--color-ink)] font-medium hover:text-[var(--color-accent)]"
                >
                  {h.title}
                  <span className="block text-xs font-normal text-[var(--color-muted)] mt-1 truncate">
                    {h.path}
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
