import {
  ArrowDownWideNarrowIcon,
  ArrowUpNarrowWideIcon,
} from "@/components/DifficultySortIcons";

type DifficultySortBarProps = {
  difficultySort: "asc" | "desc" | null;
  onToggleEnabled: (enabled: boolean) => void;
  onFlipDirection: () => void;
  onClear: () => void;
};

/**
 * Single grouped control for difficulty sort (checkbox, direction, clear).
 */
export function DifficultySortBar({
  difficultySort,
  onToggleEnabled,
  onFlipDirection,
  onClear,
}: DifficultySortBarProps) {
  const active = difficultySort !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className={`inline-flex max-w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3 py-2.5 shadow-sm transition-colors ${
          active
            ? "border-[var(--color-accent)]/40 bg-[var(--color-paper)] ring-1 ring-[var(--color-accent)]/20"
            : "border-[var(--color-border)] bg-[var(--color-paper)]"
        }`}
      >
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--color-ink)]">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => onToggleEnabled(e.target.checked)}
            className="h-4 w-4 shrink-0 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/35"
          />
          <span className="font-medium leading-none">Sort by difficulty</span>
        </label>

        {active && (
          <>
            <span
              className="hidden h-5 w-px shrink-0 bg-[var(--color-border)] sm:block"
              aria-hidden
            />
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--color-muted)]">
                {difficultySort === "asc"
                  ? "Easier → harder"
                  : "Harder → easier"}
              </span>
              <button
                type="button"
                onClick={onFlipDirection}
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-1.5 text-[var(--color-ink)] shadow-sm transition-colors hover:border-[var(--color-accent)]/45 hover:bg-[var(--color-paper)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/35"
                title={
                  difficultySort === "asc"
                    ? "Easier to harder — click to reverse"
                    : "Harder to easier — click to reverse"
                }
                aria-label={
                  difficultySort === "asc"
                    ? "Reverse order: show harder to easier"
                    : "Reverse order: show easier to harder"
                }
              >
                {difficultySort === "asc" ? (
                  <ArrowUpNarrowWideIcon className="h-5 w-5" />
                ) : (
                  <ArrowDownWideNarrowIcon className="h-5 w-5" />
                )}
              </button>
              <button
                type="button"
                onClick={onClear}
                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-border)]/40 hover:text-[var(--color-ink)]"
              >
                Clear
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
