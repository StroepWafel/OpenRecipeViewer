type RecipeListCardMetaProps = {
  corDisplay: string;
  recipeTags: string[];
  allergensDisplay: string;
  dietaryDisplay: string;
};

/**
 * COR, tags, allergens, and dietary on list cards (Open Recipe Standard fields).
 */
export function RecipeListCardMeta({
  corDisplay,
  recipeTags,
  allergensDisplay,
  dietaryDisplay,
}: RecipeListCardMetaProps) {
  if (
    !corDisplay &&
    recipeTags.length === 0 &&
    !allergensDisplay &&
    !dietaryDisplay
  ) {
    return null;
  }
  return (
    <div className="mt-2 space-y-1 text-xs text-[var(--color-muted)]">
      {corDisplay ? (
        <p>
          <span className="font-medium text-[var(--color-ink)]/85">
            COR (country of recipe):
          </span>{" "}
          <span>{corDisplay}</span>
        </p>
      ) : null}
      {recipeTags.length > 0 ? (
        <p>
          <span className="font-medium text-[var(--color-ink)]/85">Tags:</span>{" "}
          {recipeTags.join(", ")}
        </p>
      ) : null}
      {allergensDisplay ? (
        <p>
          <span className="font-medium text-[var(--color-ink)]/85">
            Allergens:
          </span>{" "}
          <span>{allergensDisplay}</span>
        </p>
      ) : null}
      {dietaryDisplay ? (
        <p>
          <span className="font-medium text-[var(--color-ink)]/85">Dietary:</span>{" "}
          <span>{dietaryDisplay}</span>
        </p>
      ) : null}
    </div>
  );
}

/** Inline affordance inside the card link (span, not a nested button). */
export function RecipeListCardViewAction() {
  return (
    <span className="mt-3 inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-1.5 text-sm font-medium text-[var(--color-accent)] shadow-sm transition-colors group-hover:border-[var(--color-accent)]/50 group-hover:bg-[var(--color-accent)]/5">
      View recipe
    </span>
  );
}
