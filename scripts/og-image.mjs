/**
 * Build-time OG image generation (Satori → SVG → PNG via Resvg).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

const OG_W = 1200;
const OG_H = 630;

const COLORS = {
  canvas: "#f0f4f8",
  canvas2: "#e2e8f0",
  ink: "#0f172a",
  muted: "#64748b",
  accent: "#0d9488",
  accentSoft: "#ccfbf1",
};

let _fontsPromise;

function fontPath(name) {
  return path.join(
    repoRoot,
    "node_modules",
    "@fontsource",
    "source-sans-3",
    "files",
    name
  );
}

async function loadFonts() {
  if (_fontsPromise) return _fontsPromise;
  _fontsPromise = (async () => {
    // WOFF (not WOFF2): Satori uses opentype.js, which does not parse WOFF2.
    const w600 = fs.readFileSync(
      fontPath("source-sans-3-latin-600-normal.woff")
    );
    const w400 = fs.readFileSync(
      fontPath("source-sans-3-latin-400-normal.woff")
    );
    return [
      { name: "Source Sans 3", data: w600, weight: 600, style: "normal" },
      { name: "Source Sans 3", data: w400, weight: 400, style: "normal" },
    ];
  })();
  return _fontsPromise;
}

function titleFontSize(title) {
  const n = title.length;
  if (n <= 40) return 64;
  if (n <= 70) return 52;
  if (n <= 100) return 44;
  return 36;
}

function recipeLayout(title, siteName) {
  const fsTitle = titleFontSize(title);
  return createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: OG_W,
        height: OG_H,
        background: `linear-gradient(145deg, ${COLORS.canvas} 0%, ${COLORS.canvas2} 45%, ${COLORS.accentSoft} 100%)`,
        position: "relative",
      },
    },
    createElement("div", {
      style: {
        position: "absolute",
        left: 0,
        bottom: 0,
        width: "100%",
        height: 8,
        background: COLORS.accent,
      },
    }),
    createElement(
      "div",
      {
        style: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "56px 64px 24px",
        },
      },
      createElement(
        "div",
        {
          style: {
            width: OG_W - 128,
            fontSize: fsTitle,
            fontWeight: 600,
            lineHeight: 1.12,
            color: COLORS.ink,
            fontFamily: "Source Sans 3",
            maxHeight: 380,
            overflow: "hidden",
          },
        },
        title
      )
    ),
    createElement(
      "div",
      {
        style: {
          padding: "0 64px 48px",
          fontSize: 24,
          fontWeight: 600,
          color: COLORS.muted,
          fontFamily: "Source Sans 3",
        },
      },
      siteName
    )
  );
}

function homeLayout(title, tagline) {
  return createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: OG_W,
        height: OG_H,
        background: `linear-gradient(145deg, ${COLORS.canvas} 0%, ${COLORS.canvas2} 45%, ${COLORS.accentSoft} 100%)`,
        position: "relative",
      },
    },
    createElement("div", {
      style: {
        position: "absolute",
        left: 0,
        bottom: 0,
        width: "100%",
        height: 8,
        background: COLORS.accent,
      },
    }),
    createElement(
      "div",
      {
        style: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "56px 64px 24px",
        },
      },
      createElement(
        "div",
        {
          style: {
            fontSize: 56,
            fontWeight: 600,
            lineHeight: 1.12,
            color: COLORS.ink,
            fontFamily: "Source Sans 3",
            marginBottom: 20,
          },
        },
        title
      ),
      createElement(
        "div",
        {
          style: {
            width: OG_W - 128,
            fontSize: 28,
            fontWeight: 400,
            lineHeight: 1.35,
            color: COLORS.muted,
            fontFamily: "Source Sans 3",
          },
        },
        tagline
      )
    )
  );
}

async function toPng(element) {
  const fonts = await loadFonts();
  const svg = await satori(element, {
    width: OG_W,
    height: OG_H,
    fonts,
  });
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: OG_W,
    },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

export async function renderRecipeOgPng(title, siteName = "Open Recipe Library") {
  const safeTitle =
    typeof title === "string" && title.trim().length > 0
      ? title.trim()
      : "Recipe";
  const el = recipeLayout(safeTitle, siteName);
  return toPng(el);
}

export async function renderHomeOgPng() {
  const el = homeLayout(
    "Open Recipe Library",
    "Browse Open Recipe Standard recipes from the public library on GitHub."
  );
  return toPng(el);
}

export async function renderRecipeOgPngBuffer(title, siteName) {
  const buf = await renderRecipeOgPng(title, siteName);
  return Buffer.from(buf);
}

export async function renderHomeOgPngBuffer() {
  const buf = await renderHomeOgPng();
  return Buffer.from(buf);
}
