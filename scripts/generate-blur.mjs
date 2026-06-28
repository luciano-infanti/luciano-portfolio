// Phase 1 — build-time LQIP (blur-up) generator.
//
// For every image under public/works and public/playground, produce a tiny
// blurred WebP preview, base64-encode it, and write the map to lib/media-blur.json.
// next/image renders this as placeholder="blur" so visitors see a real blurred
// version of THE image while the full-quality file streams in. No quality loss —
// the full image still loads on top.
//
// Incremental: entries are keyed by mtime, so unchanged images are skipped.
// Runs automatically via prebuild/predev; run manually with:
//   node scripts/generate-blur.mjs

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const publicDir = path.join(root, "public");
const scanDirs = [path.join(publicDir, "works"), path.join(publicDir, "playground")];
const outFile = path.join(root, "lib", "media-blur.json");

const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"]);

function isImage(filename) {
  if (filename.startsWith(".") || filename === "project.json") return false;
  if (/^no[-_]/i.test(filename)) return false; // hidden images — skip
  return imageExtensions.has(path.extname(filename).toLowerCase());
}

function collect(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      collect(full, files);
    } else if (isImage(entry)) {
      files.push(full);
    }
  }
  return files;
}

function toSrc(filePath) {
  return "/" + path.relative(publicDir, filePath).split(path.sep).join("/");
}

const previous = existsSync(outFile)
  ? JSON.parse(readFileSync(outFile, "utf8"))
  : {};

const next = {};
let generated = 0;
let reused = 0;

const files = scanDirs.flatMap((dir) => collect(dir));

await Promise.all(
  files.map(async (filePath) => {
    const src = toSrc(filePath);
    const mtimeMs = statSync(filePath).mtimeMs;
    const cached = previous[src];

    if (cached && cached.m === mtimeMs) {
      next[src] = cached;
      reused += 1;
      return;
    }

    try {
      const buffer = await sharp(filePath)
        .resize(24, 24, { fit: "inside" })
        .blur()
        .webp({ quality: 45 })
        .toBuffer();
      next[src] = { m: mtimeMs, b: `data:image/webp;base64,${buffer.toString("base64")}` };
      generated += 1;
    } catch (error) {
      console.warn(`[blur] could not process ${src}:`, error.message);
    }
  }),
);

// Stable key order so the file diffs cleanly.
const sorted = Object.fromEntries(Object.keys(next).sort().map((k) => [k, next[k]]));
writeFileSync(outFile, JSON.stringify(sorted, null, 2) + "\n");

console.log(`[blur] ${files.length} images — ${generated} generated, ${reused} cached → lib/media-blur.json`);
