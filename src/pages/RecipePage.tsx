import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link,
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { RecipeBody } from "@/components/RecipeBody";
import { SimilarRecipes } from "@/components/SimilarRecipes";
import {
  fetchLibraryIndex,
  fetchRecipeJson,
  siteOrigin,
  type LibraryList,
} from "@/lib/library-api";
import { decodeRecipePath, encodeRecipePath } from "@/lib/path-encoding";
import { recipeJsonLd, recipeMetaDescription } from "@/lib/jsonld-recipe";
import { similarRecipePaths } from "@/lib/similar-recipes";
import { recipeName } from "@/lib/recipe-types";
import type { RecordStr } from "@/lib/recipe-types";
import { parseBaseYieldAmount } from "@/lib/scale-yield";

export function RecipePage() {
  const { recipeKey = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const relativePath = useMemo(
    () => decodeRecipePath(recipeKey),
    [recipeKey]
  );

  const [index, setIndex] = useState<LibraryList | null>(null);
  const [recipe, setRecipe] = useState<RecordStr | null>(null);
  const [similar, setSimilar] = useState<{ path: string; name: string }[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cook = searchParams.get("cook") === "1";

  const servingsQ =
    searchParams.get("servings") ?? searchParams.get("yield") ?? "";

  const [targetAmount, setTargetAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!relativePath) {
      setError("Invalid recipe link.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [idx, rec] = await Promise.all([
          fetchLibraryIndex(),
          fetchRecipeJson(relativePath),
        ]);
        if (cancelled) return;
        setIndex(idx);
        setRecipe(rec);

        const simPaths = similarRecipePaths(idx, relativePath, 5);
        const names: { path: string; name: string }[] = [];
        await Promise.all(
          simPaths.map(async (p) => {
            try {
              const r = await fetchRecipeJson(p);
              names.push({ path: p, name: recipeName(r) });
            } catch {
              names.push({ path: p, name: p });
            }
          })
        );
        if (!cancelled) setSimilar(names);
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
  }, [relativePath]);

  useEffect(() => {
    if (!recipe) return;
    const base = parseBaseYieldAmount(
      recipe.base_yield as RecordStr | undefined
    );
    const fromUrl = parseFloat(servingsQ);
    const initial =
      Number.isFinite(fromUrl) && fromUrl > 0 ? fromUrl : base;
    setTargetAmount(initial);
  }, [recipe, servingsQ]);

  const syncServingsUrl = useCallback(
    (n: number) => {
      const next = new URLSearchParams(searchParams);
      if (recipe) {
        const base = parseBaseYieldAmount(
          recipe.base_yield as RecordStr | undefined
        );
        if (Math.abs(n - base) < 1e-9) {
          next.delete("servings");
          next.delete("yield");
        } else {
          next.set("servings", String(n));
        }
      }
      if (cook) next.set("cook", "1");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams, recipe, cook]
  );

  const onTargetChange = (v: number) => {
    setTargetAmount(v);
    syncServingsUrl(v);
  };

  useEffect(() => {
    if (!cook) return;
    let lock: WakeLockSentinel | null = null;
    const req = async () => {
      try {
        if ("wakeLock" in navigator) {
          lock = await navigator.wakeLock.request("screen");
        }
      } catch {
        /* optional */
      }
    };
    void req();
    return () => {
      lock?.release().catch(() => {});
    };
  }, [cook]);

  if (!relativePath) {
    return (
      <p className="text-red-700" role="alert">
        Invalid recipe link.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-[var(--color-muted)]" role="status">
        Loading recipe…
      </p>
    );
  }

  if (error || !recipe) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-red-800">
        {error ?? "Recipe not found."}
        <div className="mt-4">
          <Link to="/" className="text-[var(--color-accent)] font-medium">
            ← Back to library
          </Link>
        </div>
      </div>
    );
  }

  const name = recipeName(recipe);
  const desc = recipeMetaDescription(recipe);
  const jsonLd = recipeJsonLd(recipe, relativePath);
  const origin = siteOrigin();
  const canonicalPath = `/r/${encodeRecipePath(relativePath)}`;
  const canonical = origin ? `${origin}${canonicalPath}` : canonicalPath;
  const target =
    targetAmount ??
    parseBaseYieldAmount(recipe.base_yield as RecordStr | undefined);

  const shareUrl = () => {
    const u = new URL(window.location.href);
    return u.toString();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
    } catch {
      /* ignore */
    }
  };

  const toggleCook = () => {
    const next = new URLSearchParams(searchParams);
    if (cook) next.delete("cook");
    else next.set("cook", "1");
    navigate(
      { pathname: `/r/${recipeKey}`, search: next.toString() },
      { replace: true }
    );
  };

  return (
    <>
      <Helmet>
        <title>{name} · Open Recipe Library</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={name} />
        <meta property="og:description" content={desc} />
        <meta property="og:type" content="article" />
        {origin ? <meta property="og:url" content={canonical} /> : null}
        <script type="application/ld+json">{jsonLd}</script>
      </Helmet>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Link
          to="/"
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)]"
        >
          ← Library
        </Link>
        <button
          type="button"
          onClick={copyLink}
          className="text-sm px-3 py-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-paper)] hover:border-[var(--color-accent)]"
        >
          Copy link
        </button>
        <button
          type="button"
          onClick={toggleCook}
          className={`text-sm px-3 py-1.5 rounded-md border ${
            cook
              ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
              : "border-[var(--color-border)] bg-[var(--color-paper)] hover:border-[var(--color-accent)]"
          }`}
        >
          Cooking mode
        </button>
      </div>

      {!cook && (
        <div className="mb-8 flex flex-wrap items-end gap-4 p-4 rounded-[var(--radius-card)] bg-[var(--color-paper)] border border-[var(--color-border)]">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-muted)]">Target yield</span>
            <span className="flex items-center gap-2">
              <input
                type="number"
                min={0.01}
                step="any"
                className="w-32 px-2 py-1.5 rounded-md border border-[var(--color-border)] bg-white"
                value={Number.isFinite(target) ? target : ""}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (Number.isFinite(v) && v > 0) onTargetChange(v);
                }}
              />
              <span className="text-[var(--color-muted)]">
                {typeof (recipe.base_yield as RecordStr | undefined)?.unit ===
                "string"
                  ? String((recipe.base_yield as RecordStr).unit)
                  : "units"}
              </span>
            </span>
          </label>
          <p className="text-xs text-[var(--color-muted)] max-w-sm">
            Ingredient amounts scale from the recipe&apos;s base yield. Share
            this page with the &quot;servings&quot; query to preserve the scale.
          </p>
        </div>
      )}

      <RecipeBody recipe={recipe} cooking={cook} targetYieldAmount={target} />

      {!cook && index ? <SimilarRecipes items={similar} /> : null}
    </>
  );
}
