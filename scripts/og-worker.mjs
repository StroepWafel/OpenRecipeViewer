/**
 * Worker entry for parallel OG PNG generation (Satori + Resvg are CPU-heavy).
 */
import { parentPort } from "node:worker_threads";
import { renderRecipeOgPngBuffer } from "./og-image.mjs";

parentPort.on("message", async (msg) => {
  const { title, siteName } = msg;
  try {
    const buf = await renderRecipeOgPngBuffer(
      title,
      siteName ?? "Open Recipe Library"
    );
    parentPort.postMessage({ ok: true, buf });
  } catch (e) {
    parentPort.postMessage({ ok: false, error: String(e) });
  }
});
