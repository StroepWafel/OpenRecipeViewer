import { Link, Outlet, useLocation, useSearchParams } from "react-router-dom";

export function Layout() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const cooking =
    pathname.startsWith("/r/") && searchParams.get("cook") === "1";
  const minimal = cooking;

  return (
    <div className="min-h-screen flex flex-col">
      {!minimal && (
        <header className="border-b border-[var(--color-border)] bg-[var(--color-paper)]/90 backdrop-blur-sm sticky top-0 z-10">
          <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between gap-4">
            <Link
              to="/"
              className="text-lg font-semibold text-[var(--color-ink)] hover:text-[var(--color-accent)] transition-colors"
            >
              Open Recipe Library
            </Link>
            <a
              href="https://github.com/stroepwafel/OpenRecipeLibrary"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)]"
            >
              Source
            </a>
          </div>
        </header>
      )}
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8">
        <Outlet />
      </main>
      {!minimal && (
        <footer className="border-t border-[var(--color-border)] py-6 text-center text-sm text-[var(--color-muted)]">
          Recipes from the community library · Open Recipe Standard
        </footer>
      )}
    </div>
  );
}
