import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
export const SERVER_DIR = resolve(here, "..");
export const PYTHON_DIR = resolve(SERVER_DIR, "python");
export const ASSETS_DIR = resolve(PYTHON_DIR, "assets");

export const PYTHON = process.env.PYTHON_BIN ?? "python3";
export const PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 8787);
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

// ---- Phase 3: multi-user, sync, encryption ----
export const IS_PROD = process.env.NODE_ENV === "production";

/** SQLite file holding accounts, invites, sessions, and per-user encrypted sync records. */
export const DB_PATH = process.env.MQX_DB_PATH ?? resolve(SERVER_DIR, "..", "mqx-data.sqlite");

/** 32-byte hex master key wrapping every per-user data key. Required in production. */
export const MASTER_KEY_HEX = process.env.MQX_MASTER_KEY ?? "";

export const SESSION_TTL_MS = Number(process.env.MQX_SESSION_TTL ?? 30 * 24 * 60 * 60 * 1000); // 30 days
export const INVITE_TTL_MS = Number(process.env.MQX_INVITE_TTL ?? 7 * 24 * 60 * 60 * 1000); // 7 days
export const LOGIN_MAX_ATTEMPTS = Number(process.env.MQX_LOGIN_MAX_ATTEMPTS ?? 5);
export const LOGIN_LOCK_MS = Number(process.env.MQX_LOGIN_LOCK_MS ?? 5 * 60 * 1000); // 5 min

/** The one manager account, seeded on first boot. Not creatable through the app. */
export const MANAGER_EMAIL = process.env.MQX_MANAGER_EMAIL ?? "";
export const MANAGER_NAME = process.env.MQX_MANAGER_NAME ?? "Manager";
export const MANAGER_PIN = process.env.MQX_MANAGER_PIN ?? "";

export const ACCEPTED_IMAGE = new Set([
  "image/jpeg", "image/png", "image/gif", "image/bmp", "image/tiff", "image/webp", "image/heic", "image/heif",
]);
export const ACCEPTED_PDF = "application/pdf";

export function isAcceptedType(mime: string, filename: string): boolean {
  if (mime === ACCEPTED_PDF || ACCEPTED_IMAGE.has(mime)) return true;
  // some browsers send empty/octet-stream for HEIC — fall back to extension
  return /\.(jpe?g|png|gif|bmp|tiff?|webp|heic|heif|pdf)$/i.test(filename);
}
