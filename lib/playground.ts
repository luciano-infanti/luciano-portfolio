import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  formatFilename,
  getBlurDataURL,
  getImageDimensions,
  imageExtensions,
  isSupportedMedia,
} from "./media-utils";
import type { WorkMedia } from "./work";

const playgroundDirectory = path.join(process.cwd(), "public", "playground");

export const playgroundIntro = "A continuous showcase of work and creative exploration.";

export const playgroundItems = getPlaygroundItems();

function getPlaygroundItems(): WorkMedia[] {
  if (!existsSync(playgroundDirectory)) {
    return [];
  }

  return readdirSync(playgroundDirectory)
    .filter(isSupportedMedia)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((filename) => {
      const extension = path.extname(filename).toLowerCase();
      const filePath = path.join(playgroundDirectory, filename);
      const dimensions = imageExtensions.has(extension) ? getImageDimensions(filePath) : null;
      const src = `/playground/${filename}`;

      return {
        kind: imageExtensions.has(extension) ? "image" : "video",
        src,
        filename,
        width: dimensions?.width ?? 16,
        height: dimensions?.height ?? 9,
        alt: `Playground ${formatFilename(filename)}`,
        blurDataURL: getBlurDataURL(src),
      };
    });
}
