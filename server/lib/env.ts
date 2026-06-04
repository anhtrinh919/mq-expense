import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
export const SERVER_DIR = resolve(here, "..");
export const PYTHON_DIR = resolve(SERVER_DIR, "python");
export const ASSETS_DIR = resolve(PYTHON_DIR, "assets");

export const PYTHON = process.env.PYTHON_BIN ?? "python3";
export const PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 8787);
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

export const ACCEPTED_IMAGE = new Set([
  "image/jpeg", "image/png", "image/gif", "image/bmp", "image/tiff", "image/webp", "image/heic", "image/heif",
]);
export const ACCEPTED_PDF = "application/pdf";

export function isAcceptedType(mime: string, filename: string): boolean {
  if (mime === ACCEPTED_PDF || ACCEPTED_IMAGE.has(mime)) return true;
  // some browsers send empty/octet-stream for HEIC — fall back to extension
  return /\.(jpe?g|png|gif|bmp|tiff?|webp|heic|heif|pdf)$/i.test(filename);
}
