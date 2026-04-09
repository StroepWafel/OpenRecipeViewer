/**
 * Loads `.env` / `.env.local` from the repo root so `node scripts/*.mjs` sees the
 * same variables as Vite (Vite auto-loads these; plain Node does not).
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local"), override: true });

/** Canonical origin: no trailing slash; adds https:// if the scheme is missing. */
export function normalizeSiteUrl(raw) {
  let u = (raw ?? "").trim().replace(/\/+$/, "");
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}
