import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { DifficultySortBar } from "@/components/DifficultySortBar";
import {
  RecipeListCardMeta,
  RecipeListCardViewAction,
} from "@/components/RecipeListCardMeta";
import { LIBRARY_FROM_STATE } from "@/lib/library-nav";
import { encodeRecipePath } from "@/lib/path-encoding";
import {
  searchRecipes,
  splitTagsPreview,
  type SearchHit,
} from "@/lib/recipe-search";

const DEBOUNCE_MS = 250;

function parseDifficultySort(params: URLSearchParams): "asc" | "desc" | null {
  const d = params.get("diff");
  if (d === "asc" || d === "desc") return d;
  return null;
}

function SearchInputIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function SearchPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const qParam = searchParams.get("q") ?? "";

  const [draft, setDraft] = useState(qParam);
  const [debouncedQ, setDebouncedQ] = useState(qParam.trim());
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const difficultySort = useMemo(
    () => parseDifficultySort(searchParams),
    [searchParams]
  );

  useEffect(() => {
    setDraft(qParam);
    setDebouncedQ(qParam.trim());
  }, [qParam]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQ(draft.trim());
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [draft]);

  useEffect(() => {
    const q = debouncedQ.trim();

    if (q) {
      const curQ = (searchParams.get("q") ?? "").trim();
      if (curQ !== q) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set("q", q);
            return next;
          },
          { replace: true }
        );
      }
    } else if (searchParams.toString()) {
      setSearchParams({}, { replace: true });
    }

    if (!q) {
      setHits([]);
      setLoading(false);
      setError(null);
      return;
    }

    const diffRaw = searchParams.get("diff");
    const difficultySortRun =
      diffRaw === "asc" || diffRaw === "desc" ? diffRaw : null;

    setLoading(true);
    setError(null);
    searchRecipes(q, {
      difficultySort: difficultySortRun,
    })
      .then(setHits)
      .catch((e) => {
        setHits([]);
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setLoading(false));
  }, [debouncedQ, searchParams, setSearchParams]);

  const backTarget = `${location.pathname}${location.search}`;
  const hasQuery = draft.trim().length > 0;

  function clearDifficultySort() {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("diff");
        return next;
      },
      { replace: true }
    );
  }

  function setDifficultyEnabled(on: boolean) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!on) next.delete("diff");
        else if (!next.get("diff")) next.set("diff", "asc");
        return next;
      },
      { replace: true }
    );
  }

  function flipDifficultyDir() {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const d = next.get("diff");
        if (d === "desc") next.set("diff", "asc");
        else next.set("diff", "desc");
        return next;
      },
      { replace: true }
    );
  }

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
          Search the catalog, then optionally sort results by difficulty.
        </p>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] shadow-sm overflow-hidden">
          <div className="border-b border-[var(--color-border)] p-4 sm:p-5">
            <label
              htmlFor="search-query"
              className="mb-2 block text-sm font-medium text-[var(--color-ink)]"
            >
              Query
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">
                <SearchInputIcon className="opacity-80" />
              </span>
              <input
                id="search-query"
                type="search"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Title, ingredients, tags, notes…"
                autoComplete="off"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] py-3 pl-11 pr-4 text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40"
              />
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Result order
            </p>
            <DifficultySortBar
              difficultySort={difficultySort}
              onToggleEnabled={setDifficultyEnabled}
              onFlipDirection={flipDifficultyDir}
              onClear={clearDifficultySort}
            />
          </div>
        </div>

        <section className="mt-8" aria-live="polite">
          {loading && (
            <p className="text-[var(--color-muted)]" role="status">
              Searching…
            </p>
          )}
          {error && (
            <p
              className="rounded-lg border border-red-100 bg-red-50 p-4 text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}
          {!loading && !error && hasQuery && (
            <p className="mb-3 text-sm text-[var(--color-muted)]">
              {hits.length === 0
                ? "No matching recipes."
                : `${hits.length} recipe${hits.length === 1 ? "" : "s"} found`}
            </p>
          )}
          {!loading &&
            !error &&
            hasQuery &&
            hits.length === 0 &&
            difficultySort !== null && (
              <p className="mb-4 text-sm text-[var(--color-muted)]">
                Try turning off difficulty sort to use relevance order again.
              </p>
            )}
          {!loading && !error && hits.length > 0 && (
            <ul className="list-none space-y-3 p-0">
              {hits.map((h) => (
                <li
                  key={h.path}
                  className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-paper)] shadow-sm transition-colors hover:border-[var(--color-accent)]/40"
                >
                  <Link
                    to={`/r/${encodeRecipePath(h.path)}`}
                    state={{ [LIBRARY_FROM_STATE]: backTarget }}
                    className="group block px-4 py-3 font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]"
                  >
                    {h.title}
                    <span className="mt-1 block truncate text-xs font-normal text-[var(--color-muted)]">
                      {h.path}
                    </span>
                    <RecipeListCardMeta
                      corDisplay={h.corDisplay}
                      recipeTags={splitTagsPreview(h.tagsPreview)}
                      allergensDisplay={h.allergensDisplay}
                      dietaryDisplay={h.dietaryDisplay}
                    />
                    <RecipeListCardViewAction />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
