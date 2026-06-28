// Phase 3 — visually-lossless source re-encoding.
//
// Re-encodes PNG/JPG source images to WebP at quality 90 with NO resize, so
// full resolution and visual quality are preserved while file size drops
// dramatically (a 23 MB photographic PNG typically becomes ~2-4 MB). The
// original is replaced only when the WebP is actually smaller.
//
// Source files are content the CDN re-optimizes anyway, so smaller sources
// mean faster builds, faster first-time optimization, and a lighter repo.
//
// Usage:
//   node scripts/optimize-images.mjs          # report only (dry run)
//   node scripts/optimize-images.mjs --apply   # actually re-encode + replace

import { existsSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const apply = process.argv.includes("--apply");
const root = process.cwd();
const scanDirs = [
  path.join(root, "public", "works"),
  path.join(root, "public", "playground"),
];

// Only re-encode lossy/lossless raster photos. Skip webp/avif (already optimized,
// re-encoding loses quality), gif (may be animated), and videos.
const convertExtensions = new Set([".png", ".jpg", ".jpeg"]);

function collect(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, files);
    else if (convertExtensions.has(path.extname(entry).toLowerCase())) files.push(full);
  }
  return files;
}

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2) + " MB";

const files = scanDirs.flatMap((dir) => collect(dir));
let beforeTotal = 0;
let afterTotal = 0;
let replaced = 0;

for (const filePath of files) {
  const before = statSync(filePath).size;
  const target = filePath.replace(/\.(png|jpe?g)$/i, ".webp");

  const buffer = await sharp(filePath)
    .webp({ quality: 90, smartSubsample: true, effort: 5 })
    .toBuffer();

  const after = buffer.length;
  beforeTotal += before;

  const rel = path.relative(root, filePath);

  if (after < before) {
    afterTotal += after;
    replaced += 1;
    const pct = (((before - after) / before) * 100).toFixed(0);
    console.log(`${apply ? "✓" : "•"} ${rel}  ${mb(before)} → ${mb(after)}  (-${pct}%)`);
    if (apply) {
      writeFileSync(target, buffer);
      if (target !== filePath) unlinkSync(filePath); // remove the larger original
    }
  } else {
    afterTotal += before;
    console.log(`– ${rel}  kept (webp not smaller)`);
  }
}

console.log("\n----------------------------------------");
console.log(`Images:   ${files.length}`);
console.log(`Replaced: ${replaced}`);
console.log(`Before:   ${mb(beforeTotal)}`);
console.log(`After:    ${mb(afterTotal)}  (-${(((beforeTotal - afterTotal) / beforeTotal) * 100).toFixed(0)}%)`);
if (!apply) console.log("\nDry run. Re-run with --apply to replace files, then `npm run blur`.");
