// At-rest encryption for the Phase 3 sync store. Server-managed (not zero-knowledge):
// each account has a random data key (DEK) that encrypts its sync records; the DEK is
// itself encrypted ("wrapped") under a single server master key. This protects the DB
// file at rest and in transit, while keeping PIN reset possible (the DEK is independent
// of the PIN). See mission.md Privacy & Data Posture.

import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { MASTER_KEY_HEX, IS_PROD } from "./env.ts";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

let cachedMasterKey: Buffer | null = null;

/** The server master key. 32 bytes from MQX_MASTER_KEY (hex). In dev a stable key is
 *  derived from a fixed string so local data survives restarts; in prod the env var is required. */
export function masterKey(): Buffer {
  if (cachedMasterKey) return cachedMasterKey;
  if (MASTER_KEY_HEX) {
    const k = Buffer.from(MASTER_KEY_HEX, "hex");
    if (k.length !== KEY_LEN) throw new Error("MQX_MASTER_KEY must be 32 bytes (64 hex chars)");
    cachedMasterKey = k;
  } else if (IS_PROD) {
    throw new Error("MQX_MASTER_KEY is required in production");
  } else {
    // Dev fallback: deterministic key so a restart can still read local data. Never used in prod.
    cachedMasterKey = createHash("sha256").update("mqx-dev-master-key-do-not-use-in-prod").digest();
  }
  return cachedMasterKey;
}

/** AES-256-GCM. Returns iv||tag||ciphertext as one Buffer. */
function seal(plaintext: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]);
}

function open(sealed: Buffer, key: Buffer): Buffer {
  const iv = sealed.subarray(0, IV_LEN);
  const tag = sealed.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = sealed.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

/** A fresh random per-user data-encryption key. */
export function generateDek(): Buffer {
  return randomBytes(KEY_LEN);
}

/** Encrypt a DEK under the master key for storage in the accounts table. */
export function wrapDek(dek: Buffer): Buffer {
  return seal(dek, masterKey());
}

export function unwrapDek(wrapped: Buffer): Buffer {
  return open(wrapped, masterKey());
}

/** Encrypt a record's JSON under the account's DEK. Returns the combined sealed buffer. */
export function encryptRecord(plaintext: string, dek: Buffer): Buffer {
  return seal(Buffer.from(plaintext, "utf8"), dek);
}

export function decryptRecord(sealed: Buffer, dek: Buffer): string {
  return open(sealed, dek).toString("utf8");
}

// ---- PIN hashing (scrypt, per-user salt) ----

const SCRYPT_KEYLEN = 32;

/** Hash a PIN with a fresh random salt. Returns hex hash + hex salt. */
export function hashPin(pin: string): { hash: string; salt: string } {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, SCRYPT_KEYLEN);
  return { hash: hash.toString("hex"), salt: salt.toString("hex") };
}

/** Constant-time PIN verification. */
export function verifyPin(pin: string, hashHex: string, saltHex: string): boolean {
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(pin, salt, SCRYPT_KEYLEN);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Opaque random token (base64url) for sessions, invites, ids. */
export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}
