// App PIN — a soft, peace-of-mind lock. NOT encryption: the data is plain in IndexedDB
// regardless. We store only a hash of the PIN so the literal digits aren't sitting in the DB,
// and a forgotten PIN is always resettable without touching any data.

const SALT = "mqx:v1:";

/** SHA-256 hash of the PIN with a fixed app salt. Hex string. */
export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(SALT + pin);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPin(pin: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  return (await hashPin(pin)) === hash;
}

/** A valid PIN is 4–8 digits. */
export function isValidPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}
