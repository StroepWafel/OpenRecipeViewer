/**
 * Pool of worker threads for recipe OG PNG renders (one in-flight task per worker).
 */
import { Worker } from "node:worker_threads";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.join(__dirname, "og-worker.mjs");

export function recipeOgPoolSize() {
  return Math.max(1, (os.cpus()?.length ?? 4) - 1);
}

export function createRecipeOgPool(size = recipeOgPoolSize()) {
  const workers = [];
  const queue = [];

  for (let i = 0; i < size; i++) {
    const w = new Worker(workerPath);
    w.busy = false;
    w.on("message", (msg) => {
      const cb = w._cb;
      w._cb = null;
      w.busy = false;
      if (msg.ok) cb.resolve(Buffer.from(msg.buf));
      else cb.reject(new Error(msg.error));
      pump();
    });
    w.on("error", (err) => {
      if (w._cb) w._cb.reject(err);
      w._cb = null;
      w.busy = false;
    });
    workers.push(w);
  }

  function pump() {
    while (queue.length) {
      const w = workers.find((x) => !x.busy);
      if (!w) return;
      const job = queue.shift();
      w.busy = true;
      w._cb = { resolve: job.resolve, reject: job.reject };
      w.postMessage({ title: job.title, siteName: job.siteName });
    }
  }

  function run(title, siteName) {
    return new Promise((resolve, reject) => {
      queue.push({ title, siteName, resolve, reject });
      pump();
    });
  }

  function destroy() {
    for (const w of workers) w.terminate();
  }

  return { run, destroy, size };
}
