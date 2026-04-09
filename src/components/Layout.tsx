import { Link, Outlet } from "react-router-dom";
import { libraryEnv } from "../lib/library-api";
import { SearchBarNav } from "./SearchBarNav";

export function Layout() {
  const { owner, repo } = libraryEnv();
  const repoWeb = `https://github.com/${owner}/${repo}`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-paper)]/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Link
            to="/"
            className="text-lg font-semibold text-[var(--color-ink)] hover:text-[var(--color-accent)] transition-colors"
          >
            Open Recipe Library
          </Link>
          <div className="flex items-center gap-3 ml-auto min-w-0 shrink">
            <div className="min-w-0 w-[min(100%,14rem)] sm:w-56">
              <SearchBarNav variant="header" urlSync />
            </div>
            <a
              href={repoWeb}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)] shrink-0"
            >
              Source
            </a>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-[var(--color-border)] py-6 text-center text-sm text-[var(--color-muted)]">
        <div>Recipes from the community library · Open Recipe Standard</div>
        <div className="mt-3 max-w-xl mx-auto px-4 space-y-2 leading-relaxed text-left sm:text-center">
          <p>
            <span className="text-[var(--color-ink)] font-medium">
              Dedicated editor:
            </span>{" "}
            <a
              href="https://edit.food-for-eating.com"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-accent)] font-semibold hover:underline"
            >
              Open Recipe Editor
            </a>{" "}
            — create and validate Open Recipe Standard JSON in your browser
            before you submit.
          </p>
          <p>
            To publish, add one JSON file per recipe under{" "}
            <span className="font-mono text-[0.9em]">recipes/</span> in{" "}
            <a
              href={`${repoWeb}#contributing`}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-accent)] hover:underline"
            >
              the library on GitHub
            </a>{" "}
            and open a pull request.{" "}
            <a
              href="https://github.com/OpenRecipeStandard"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-accent)] hover:underline"
            >
              Open Recipe Standard
            </a>{" "}
            (schema).
          </p>
        </div>
      </footer>
    </div>
  );
}
