import { readFileSync } from "node:fs";
import path from "node:path";

export const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"]);
export const videoExtensions = new Set([".mp4", ".webm", ".mov"]);

export function isSupportedMedia(filename: string) {
  if (filename.startsWith(".") || filename === "project.json") {
    return false;
  }

  const extension = path.extname(filename).toLowerCase();
  return imageExtensions.has(extension) || videoExtensions.has(extension);
}

export function formatFilename(filename: string) {
  const name = path.basename(filename, path.extname(filename));
  const cleaned = name
    .replace(/^\d+[-_\s]*/, "")
    .replace(/[-_]+/g, " ")
    .trim();

  return cleaned || name;
}

export function getImageDimensions(filePath: string) {
  const buffer = readFileSync(filePath);
  const extension = path.extname(filePath).toLowerCase();

  try {
    if (extension === ".png") return getPngDimensions(buffer);
    if (extension === ".gif") return getGifDimensions(buffer);
    if (extension === ".jpg" || extension === ".jpeg") return getJpegDimensions(buffer);
    if (extension === ".webp") return getWebpDimensions(buffer);
  } catch (error) {
    console.warn(`[media] Could not read dimensions for "${filePath}"`, error);
  }

  return { width: 16, height: 9 };
}

function getPngDimensions(buffer: Buffer) {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") {
    throw new Error("Invalid PNG");
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function getGifDimensions(buffer: Buffer) {
  if (buffer.length < 10 || !buffer.toString("ascii", 0, 3).startsWith("GIF")) {
    throw new Error("Invalid GIF");
  }

  return {
    width: buffer.readUInt16LE(6),
    height: buffer.readUInt16LE(8),
  };
}

function getJpegDimensions(buffer: Buffer) {
  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    const isStartOfFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker);

    if (isStartOfFrame) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + length;
  }

  throw new Error("Invalid JPEG");
}

function getWebpDimensions(buffer: Buffer) {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error("Invalid WebP");
  }

  const chunk = buffer.toString("ascii", 12, 16);

  if (chunk === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }

  if (chunk === "VP8 ") {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  if (chunk === "VP8L") {
    const b1 = buffer[21];
    const b2 = buffer[22];
    const b3 = buffer[23];
    const b4 = buffer[24];

    return {
      width: 1 + (((b2 & 0x3f) << 8) | b1),
      height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)),
    };
  }

  throw new Error("Invalid WebP");
}
