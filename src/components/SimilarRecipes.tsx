import { Link } from "react-router-dom";
import { encodeRecipePath } from "@/lib/path-encoding";

export function SimilarRecipes({
  items,
}: {
  items: { path: string; name: string }[];
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
