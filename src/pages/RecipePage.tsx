import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  Link,
  useLocation,
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
import { libraryBackFromState } from "@/lib/library-nav";
import { decodeRecipePath, encodeRecipePath } from "@/lib/path-encoding";
import { recipeJsonLd, recipeMetaDescription } from "@/lib/jsonld-recipe";
import { similarRecipePaths } from "@/lib/similar-recipes";
import { recipeName } from "@/lib/recipe-types";
import type { RecordStr } from "@/lib/recipe-types";
import { parseBaseYieldAmount } from "@/lib/scale-yield";

/** Scale relative to recipe base yield (same idea as common “servings” multipliers). */
const YIELD_MULTIPLIERS = [
  { label: "¼×", factor: 0.25 },
  { label: "½×", factor: 0.5 },
  { label: "1×", factor: 1 },
  { label: "2×", factor: 2 },
  { label: "3×", factor: 3 },
  { label: "4×", factor: 4 },
  { label: "8×", factor: 8 },
] as const;

function formatYieldForDisplay(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  const t = n.toFixed(4).replace(/\.?0+$/, "");
  return t;
}

export function RecipePage() {
  const { recipeKey = "" } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const libraryBack = useMemo(
    () => libraryBackFromState(location.state),
    [location.state]
  );

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
  const cookRef = useRef(cook);
  cookRef.current = cook;

  const servingsQ =
    searchParams.get("servings") ?? searchParams.get("yield") ?? "";

  const [targetAmount, setTargetAmount] = useState<number | null>(null);
  const [yieldFocused, setYieldFocused] = useState(false);
  const [yieldDraft, setYieldDraft] = useState("");
  const [linkCopyFeedback, setLinkCopyFeedback] = useState<
    "idle" | "copied" | "failed"
  >("idle");
  /** Increments on each successful copy so the flash animation can restart. */
  const [copyBurst, setCopyBurst] = useState(0);
  const linkCopyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (linkCopyResetRef.current) clearTimeout(linkCopyResetRef.current);
    };
  }, []);

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

  const commitTarget = useCallback(
    (n: number) => {
      setTargetAmount(n);
      syncServingsUrl(n);
    },
    [syncServingsUrl]
  );

  /**
   * Screen Wake Lock — keeps the display on while following the recipe (same idea as
   * “cook mode” / prevent sleep in recipe plugins; see e.g.
   * https://bootstrapped.ventures/cook-mode/ ). Re-acquire after tab becomes visible again.
   */
  useEffect(() => {
    if (!cook) return;

    let lock: WakeLockSentinel | null = null;

    const release = async () => {
      if (lock) {
        try {
          await lock.release();
        } catch {
          /* already released */
        }
        lock = null;
      }
    };

    const acquire = async () => {
      await release();
      if (!cookRef.current) return;
      try {
        if ("wakeLock" in navigator) {
          lock = await navigator.wakeLock.request("screen");
        }
      } catch {
        /* denied or unsupported */
      }
    };

    void acquire();

    const onVisibility = () => {
      if (document.visibilityState === "visible" && cookRef.current) {
        void acquire();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      void release();
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
  const baseYieldAmount = parseBaseYieldAmount(
    recipe.base_yield as RecordStr | undefined
  );
  const target =
    targetAmount !== null && Number.isFinite(targetAmount) && targetAmount > 0
      ? targetAmount
      : baseYieldAmount;

  const shareUrl = () => {
    const u = new URL(window.location.href);
    return u.toString();
  };

  const copyLink = async () => {
    if (linkCopyResetRef.current) {
      clearTimeout(linkCopyResetRef.current);
      linkCopyResetRef.current = null;
    }
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopyBurst((n) => n + 1);
      setLinkCopyFeedback("copied");
      linkCopyResetRef.current = setTimeout(() => {
        setLinkCopyFeedback("idle");
        linkCopyResetRef.current = null;
      }, 2500);
    } catch {
      setLinkCopyFeedback("failed");
      linkCopyResetRef.current = setTimeout(() => {
        setLinkCopyFeedback("idle");
        linkCopyResetRef.current = null;
      }, 4000);
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

  const yieldInputValue = yieldFocused
    ? yieldDraft
    : formatYieldForDisplay(target);

  const applyMultiplier = (factor: number) => {
    setYieldFocused(false);
    const next = baseYieldAmount * factor;
    commitTarget(next);
  };

  const onYieldFocus = () => {
    setYieldFocused(true);
    setYieldDraft(formatYieldForDisplay(target));
  };

  const onYieldBlur = () => {
    setYieldFocused(false);
    const raw = yieldDraft.trim().replace(",", ".");
    if (
      raw === "" ||
      raw === "-" ||
      raw === "." ||
      raw === "-." ||
      raw === "-0"
    ) {
      commitTarget(baseYieldAmount);
      return;
    }
    const v = parseFloat(raw);
    if (!Number.isFinite(v) || v <= 0) {
      commitTarget(baseYieldAmount);
    } else {
      commitTarget(v);
    }
  };

  const onYieldChange = (e: ChangeEvent<HTMLInputElement>) => {
    setYieldDraft(e.target.value);
  };

  const baseYieldUnit =
    typeof (recipe.base_yield as RecordStr | undefined)?.unit === "string"
      ? String((recipe.base_yield as RecordStr).unit)
      : "units";

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
          to={libraryBack}
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)]"
        >
          {libraryBack === "/" ? "← Library" : "← Back"}
        </Link>
        <button
          key={
            linkCopyFeedback === "copied"
              ? `recipe-copy-${copyBurst}`
              : "recipe-copy-idle"
          }
          type="button"
          onClick={copyLink}
          title={
            linkCopyFeedback === "failed"
              ? "Tap to try again"
              : undefined
          }
          aria-label={
            linkCopyFeedback === "copied"
              ? "Link copied to clipboard"
              : linkCopyFeedback === "failed"
                ? "Copy failed — try again"
                : "Copy recipe link to clipboard"
          }
          className={`inline-flex items-center justify-center text-sm leading-tight px-2 py-1 rounded-md border ${
            linkCopyFeedback === "copied"
              ? "recipe-copy-btn-flash border-[var(--color-border)] bg-[var(--color-paper)] text-[var(--color-ink)]"
              : linkCopyFeedback === "failed"
                ? "border-red-300 bg-red-50 text-red-900 transition-[color,background-color,border-color] duration-300 ease-out motion-reduce:duration-0"
                : "border-[var(--color-border)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:border-[var(--color-accent)] transition-[color,background-color,border-color] duration-300 ease-out motion-reduce:duration-0"
          }`}
        >
          <span className="inline-grid grid-cols-1 grid-rows-1 justify-items-center">
            <span
              className={`col-start-1 row-start-1 whitespace-nowrap text-center transition-opacity duration-300 ease-out motion-reduce:transition-none ${
                linkCopyFeedback === "idle"
                  ? "opacity-100"
                  : "pointer-events-none opacity-0"
              }`}
              aria-hidden={linkCopyFeedback !== "idle"}
            >
              Copy link
            </span>
            <span
              className={`col-start-1 row-start-1 whitespace-nowrap text-center transition-opacity duration-300 ease-out motion-reduce:transition-none ${
                linkCopyFeedback === "copied"
                  ? "opacity-100"
                  : "pointer-events-none opacity-0"
              }`}
              aria-hidden={linkCopyFeedback !== "copied"}
            >
              Copied!
            </span>
            <span
              className={`col-start-1 row-start-1 whitespace-nowrap text-center transition-opacity duration-300 ease-out motion-reduce:transition-none ${
                linkCopyFeedback === "failed"
                  ? "opacity-100"
                  : "pointer-events-none opacity-0"
              }`}
              aria-hidden={linkCopyFeedback !== "failed"}
            >
              Copy failed
            </span>
          </span>
        </button>
        <button
          type="button"
          aria-pressed={cook}
          title={
            cook
              ? "Screen stay-awake is on (Wake Lock). Tap to allow the screen to sleep."
              : "Keep the screen on while you cook (uses the Wake Lock API where supported; requires a secure context)."
          }
          onClick={toggleCook}
          className={`inline-flex items-center justify-center text-sm leading-tight px-2 py-1 rounded-md border ${
            cook
              ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
              : "border-[var(--color-border)] bg-[var(--color-paper)] hover:border-[var(--color-accent)]"
          }`}
        >
          <span className="inline-grid grid-cols-1 grid-rows-1 justify-items-center">
            <span
              className={`col-start-1 row-start-1 whitespace-nowrap text-center transition-opacity duration-200 ease-out motion-reduce:transition-none ${
                cook
                  ? "pointer-events-none opacity-0"
                  : "opacity-100"
              }`}
              aria-hidden={cook}
            >
              Keep screen on
            </span>
            <span
              className={`col-start-1 row-start-1 whitespace-nowrap text-center transition-opacity duration-200 ease-out motion-reduce:transition-none ${
                cook
                  ? "opacity-100"
                  : "pointer-events-none opacity-0"
              }`}
              aria-hidden={!cook}
            >
              Screen on
            </span>
          </span>
        </button>
      </div>

      <div className="mb-8 flex flex-col gap-4 p-4 rounded-[var(--radius-card)] bg-[var(--color-paper)] border border-[var(--color-border)]">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm min-w-0">
            <span className="text-[var(--color-muted)]">Target yield</span>
            <span className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                aria-label="Target yield amount"
                className="w-36 px-2 py-1.5 rounded-md border border-[var(--color-border)] bg-white font-mono tabular-nums"
                value={yieldInputValue}
                onFocus={onYieldFocus}
                onBlur={onYieldBlur}
                onChange={onYieldChange}
              />
              <span className="text-[var(--color-muted)]">{baseYieldUnit}</span>
            </span>
          </label>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Yield scale shortcuts">
          {YIELD_MULTIPLIERS.map(({ label, factor }) => (
            <button
              key={factor}
              type="button"
              onClick={() => applyMultiplier(factor)}
              className="text-sm px-2.5 py-1.5 rounded-md border border-[var(--color-border)] bg-white hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--color-muted)] max-w-xl">
          Amounts scale from the recipe&apos;s base yield ({baseYieldAmount}{" "}
          {baseYieldUnit}). Shortcuts multiply that base. Share this page with a
          &quot;servings&quot; query to keep your scale.
        </p>
      </div>

      <RecipeBody
        key={relativePath}
        recipe={recipe}
        targetYieldAmount={target}
      />

      {index ? (
        <SimilarRecipes items={similar} libraryFrom={libraryBack} />
      ) : null}
    </>
  );
}
