import { Link } from "react-router-dom";
import { LIBRARY_FROM_STATE } from "@/lib/library-nav";
import { encodeRecipePath } from "@/lib/path-encoding";

export function SimilarRecipes({
  items,
  libraryFrom,
}: {
  items: { path: string; name: string }[];
  /** Same “back” target as the recipe header (meal list, home, etc.). */
  libraryFrom: string;
}) {
  if (items.length === 0) return null;
  return (
    <section
      className="mt-12 pt-8 border-t border-[var(--color-border)]"
      aria-labelledby="similar-heading"
    >
      <h2 id="similar-heading" className="text-lg font-semibold mb-4">
        More like this
      </h2>
      <ul className="space-y-2 list-none p-0">
        {items.map(({ path, name }) => (
          <li key={path}>
            <Link
              to={`/r/${encodeRecipePath(path)}`}
              state={{ [LIBRARY_FROM_STATE]: libraryFrom }}
              className="text-[var(--color-accent)] hover:underline font-medium"
            >
              {name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
