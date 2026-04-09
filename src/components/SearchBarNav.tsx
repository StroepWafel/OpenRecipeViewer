import { type FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
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

type SearchBarNavProps = {
  variant: "header" | "hero";
  /** When true, mirror `?q=` from the URL on `/search` and clear when leaving search. */
  urlSync?: boolean;
  className?: string;
};

export function SearchBarNav({
  variant,
  urlSync = false,
  className = "",
}: SearchBarNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!urlSync) return;
    if (location.pathname === "/search") {
      setQ(searchParams.get("q") ?? "");
    } else {
      setQ("");
    }
  }, [urlSync, location.pathname, searchParams]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const t = q.trim();
    navigate(t ? `/search?q=${encodeURIComponent(t)}` : "/search");
  }

  const isHeader = variant === "header";
  const inputClass = isHeader
    ? "w-full min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] pl-9 pr-2 py-1.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40"
    : "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] pl-11 pr-3 py-3 text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40";

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className={`${className}`}
    >
      <div className="relative">
        <span
          className={`pointer-events-none absolute text-[var(--color-muted)] ${
            isHeader ? "left-2.5 top-1/2 -translate-y-1/2" : "left-3.5 top-1/2 -translate-y-1/2"
          }`}
        >
          <SearchIcon className={isHeader ? "opacity-70" : "opacity-80"} />
        </span>
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search recipes…"
          autoComplete="off"
          aria-label="Search recipes"
          className={inputClass}
        />
      </div>
    </form>
  );
}
