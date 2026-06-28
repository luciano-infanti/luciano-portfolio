// Standalone media watcher — fully optional, safe to delete anytime.
//
// Why this exists:
//   The image lists are read from disk ONCE, when lib/playground.ts and
//   lib/work.ts are first evaluated (readdirSync). Next.js only re-runs that
//   when those *source* files change — dropping a file into public/ does
//   nothing on its own. This watcher "touches" the matching data file so the
//   dev server recompiles and re-reads the folder. Result: add/rename/remove
//   an image and the page updates live, no manual restart or rebuild.
//
// Usage:
//   Run it in a second terminal alongside `npm run dev`:
//     node scripts/watch-media.mjs
//   Stop it with Ctrl+C. Removing it entirely = delete this file. It imports
//   nothing from the app and changes no other behaviour.

import { utimesSync, watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Which public/ subfolder maps to which data file to "touch".
const watchMap = [
  { dir: path.join(root, "public", "playground"), file: path.join(root, "lib", "playground.ts") },
  { dir: path.join(root, "public", "works"), file: path.join(root, "lib", "work.ts") },
];

function touch(file) {
  const now = new Date();
  try {
    utimesSync(file, now, now);
  } catch (error) {
    console.error(`[watch-media] could not touch ${path.relative(root, file)}:`, error.message);
  }
}

const debounce = new Map();

for (const { dir, file } of watchMap) {
  try {
    watch(dir, { recursive: true }, (_event, filename) => {
      // Ignore editor temp files / dotfiles.
      if (filename && (filename.startsWith(".") || filename.endsWith("~"))) return;

      clearTimeout(debounce.get(file));
      debounce.set(
        file,
        setTimeout(() => {
          console.log(`[watch-media] change in ${path.relative(root, dir)} → reloading`);
          touch(file);
        }, 200),
      );
    });
    console.log(`[watch-media] watching ${path.relative(root, dir)}`);
  } catch (error) {
    console.error(`[watch-media] cannot watch ${path.relative(root, dir)}:`, error.message);
  }
}

console.log("[watch-media] running — Ctrl+C to stop.");
