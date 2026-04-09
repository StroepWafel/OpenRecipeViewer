# Open Recipe Viewer

A read-only web app for browsing recipes from the public [OpenRecipeLibrary](https://github.com/stroepwafel/OpenRecipeLibrary) catalog (Open Recipe Standard JSON). At **build time** the app downloads the published `library` branch index and every recipe file from GitHub and writes `public/library-data/bundle.json` (gitignored). The browser only loads that same-origin JSON bundle—there is no runtime fetch to GitHub. The site includes shareable recipe URLs, optional yield scaling, cooking mode (screen wake lock), print-to-PDF via the browser, and SEO-oriented prerendered recipe HTML and JSON-LD at build time.

## Requirements

- [Node.js](https://nodejs.org/) 20+ recommended  
- npm (comes with Node)

## Quick start

```bash
npm install
npm run sync
npm run build-search-index
npm run dev
```

`npm run sync` downloads the library into `public/library-data/bundle.json`. `npm run build-search-index` builds the MiniSearch index at `public/library-data/search-index.json` (required for **Search** in the header). For local dev you can run `npm run build` once instead, or rely on `npm run build` in CI (sync + search index + bundle). Open the URL shown in the terminal (usually `http://localhost:5173`).

## Scripts

| Command        | Description |
|----------------|-------------|
| `npm run sync` | Download `library-list.json` and all recipes into `public/library-data/bundle.json` |
| `npm run build-search-index` | Build `public/library-data/search-index.json` from the bundle (MiniSearch; run after `sync`) |
| `npm run dev`  | Start Vite dev server with hot reload (run `sync` and `build-search-index` first for search) |
| `npm run build`| Sync, search index, typecheck, production bundle, prerender recipe HTML, generate `sitemap.xml` |
| `npm run preview` | Serve the `dist/` output locally |
| `npm run lint` | Run ESLint |

## How data is loaded

`npm run sync` (also the first step of `npm run build`) reads from raw GitHub:

`https://raw.githubusercontent.com/<owner>/<repo>/<ref>/`

It writes **`public/library-data/bundle.json`**, containing the full `library-list.json` index and every recipe JSON keyed by library-relative path. The next step, **`npm run build-search-index`** (included in `npm run build`), reads that bundle and writes **`public/library-data/search-index.json`**, a serialized [MiniSearch](https://github.com/lucaong/minisearch) index for typo-tolerant full-text search over titles, ingredients, tags, and text. Both files are **gitignored** under `public/library-data/` and copied into `dist/`. The SPA loads them from the same origin; unknown recipe URLs show an error—there is no fallback fetch to GitHub.

Point at another fork or branch with the `VITE_LIBRARY_*` variables below (used by the sync script and by client-side links such as the footer).

### Build authentication (optional)

For **private** repositories, or if your host passes an auth header through to `raw.githubusercontent.com`, set **`GITHUB_TOKEN`**, **`GH_TOKEN`**, or **`GITHUB_PAT`** in the **build** environment (for example Cloudflare Pages → Settings → Environment variables → **Build**). The sync script sends it as `Authorization: Bearer …` on download requests.

Unauthenticated requests to **`api.github.com`** are limited to **60/hour**; a personal access token with read access to the repo raises the **REST API** limit to **5,000/hour**. This project’s sync uses **raw** URLs by default (not the REST API), so that quota usually does not apply; the token still matters for private repos on raw fetches.

## Environment variables

All client-side variables use the `VITE_` prefix so they are embedded at build time.

| Variable | Purpose |
|----------|---------|
| `VITE_LIBRARY_OWNER` | GitHub org or user (default: `stroepwafel`) |
| `VITE_LIBRARY_REPO` | Repository name (default: `OpenRecipeLibrary`) |
| `VITE_LIBRARY_REF` | Branch or tag (default: `library`) |
| `VITE_SITE_URL` | Canonical site origin, no trailing slash (e.g. `https://food-for-eating.com` or `food-for-eating.com` — `https://` is added automatically in Node build scripts if missing). Used for JSON-LD, canonical URLs, prerender, and `sitemap.xml`. Falls back to `window.location.origin` in the browser when unset. |
| `VITE_BASE_PATH` | Subpath when not hosted at domain root (e.g. `/viewer/`). Must match how the app is deployed. |

Create a `.env` or `.env.local` in the project root for local development. Set the same `VITE_*` values in your hosting provider’s build environment for production. Add **`GITHUB_TOKEN`** (or **`GH_TOKEN`**) to the build environment if you need authenticated downloads; do **not** prefix it with `VITE_` (it must not be exposed to the browser).

**Note:** Vite loads `.env` files for `vite build`, but **`node scripts/sync-library.mjs`**, **`prerender.mjs`**, and **`sitemap.mjs`** run outside Vite. They load the same files via **`dotenv`** in [`scripts/load-env.mjs`](scripts/load-env.mjs), so `VITE_SITE_URL` applies to the sitemap and prerender when you run `npm run build` locally.

## Routes

| Path | Description |
|------|-------------|
| `/` | Library home — meal-type sections |
| `/search` | Full-text search (`?q=` query optional) |
| `/m/:mealSlug` | Recipes for one meal type (slug derived from the index) |
| `/r/:recipeKey` | Single recipe (`recipeKey` is a base64url-encoded library-relative path) |
| `/c/:slug` | Legacy redirect to `/m/:slug` |

Opening a recipe from a meal list preserves a “back” target via router state so **Back** returns to that list instead of always going home.

## Hosted schema

The Open Recipe Standard JSON schema used by the project is served as a static file, for example:

`public/schema/open-recipe.schema.json`

Set the document `$id` / hosting URL to match where you deploy that file.

## Production build

`npm run build` writes to `dist/` and:

- Runs **`sync`** (network) to refresh `public/library-data/bundle.json`, then **`build-search-index`** to write `search-index.json`, then prerender and sitemap read **only** those local files—no network in `prerender.mjs` / `sitemap.mjs`.
- Emits prerendered HTML under `dist/r/<key>/index.html` for each recipe in the bundle.
- Writes `dist/sitemap.xml` and `dist/robots.txt` as generated by the scripts in `scripts/`.

Serve `dist/` as a static site. Client routes such as `/m/:mealSlug` must fall back to `index.html` when there is no matching file.

### Deploying with Git (e.g. Cloudflare Pages)

Typical flow: push to your Git host, then let the platform build from the repo.

1. **Connect the repository** in your host (e.g. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git).
2. **Build settings**
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (repo root), unless this app lives in a monorepo subfolder.
3. **Environment variables** — add the same `VITE_*` values you use locally (Production, and Preview if you want previews to match). Add **`GITHUB_TOKEN`** (or **`GH_TOKEN`**) under **Build** variables if the sync step needs authenticated access to the library repo.
4. **SPA routing** — on [Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering), if there is **no** top-level `404.html` in the build output, Pages treats the site as an SPA and serves the app shell for unknown paths (so you usually do **not** need `_redirects` or `wrangler.toml` for Git deploys). Avoid adding a root `404.html` unless you intentionally want classic 404 behavior instead.

`wrangler.toml` in this repo is optional for Git-based Pages deploys; it matters if you deploy with **`wrangler deploy`** (Workers + assets) from CI or your machine.

### Cloudflare Workers (`wrangler deploy`)

If you deploy with Wrangler instead of Pages Git builds, this repo includes [`wrangler.toml`](wrangler.toml) with [`assets.not_found_handling = "single-page-application"`](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/) so you do **not** need a `_redirects` file. (A rule like `/* /index.html 200` is rejected by the Workers API as error **10021** — infinite loop.)

Set `name` in `wrangler.toml` to your Worker name if it differs from `openrecipeviewer`.

## Daily deploy hook (optional)

The workflow `.github/workflows/daily-pages-deploy.yml` can POST to a Cloudflare Pages **Deploy hook** on a schedule so production rebuilds pick up new library commits. Add a repository secret `CLOUDFLARE_PAGES_DEPLOY_HOOK` with the hook URL from Cloudflare Pages → Settings → Builds & deployments → Deploy hooks. If the secret is missing, the workflow exits successfully without doing anything.

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [React Router](https://reactrouter.com/) for routing
- [Tailwind CSS](https://tailwindcss.com/) v4
- [react-helmet-async](https://github.com/staylor/react-helmet-async) for document head management
