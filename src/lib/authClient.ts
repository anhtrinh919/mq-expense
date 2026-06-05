// Client-side account + session. The PIN is the only secret: register/login send email+PIN,
// the server returns a session token we keep locally and attach to every API call.

import { db } from "../data/db";
import type { AccountState } from "../data/types";
import { setSessionToken, ApiError } from "./api";
import { hashPin, verifyPin } from "./pin";

const DEFAULT: AccountState = {
  id: "account",
  accountId: null,
  email: null,
  name: null,
  role: null,
  sessionToken: null,
  pinHashLocal: null,
  pullCursor: 0,
  pushHigh: 0,
  updatedAt: 0,
};

export async function getAccount(): Promise<AccountState> {
  const a = await db.account.get("account");
  return a ?? DEFAULT;
}

export async function saveAccount(patch: Partial<AccountState>): Promise<AccountState> {
  const current = await getAccount();
  const next: AccountState = { ...current, ...patch, id: "account", updatedAt: Date.now() };
  await db.account.put(next);
  setSessionToken(next.sessionToken);
  return next;
}

export function isAuthenticated(a: AccountState): boolean {
  return !!a.sessionToken && !!a.accountId;
}

/** Restore the session token into the API client on boot. */
export async function restoreSession(): Promise<AccountState> {
  const a = await getAccount();
  setSessionToken(a.sessionToken);
  return a;
}

/** Wipe every synced store + sync cursors. Used on account switch and "clear all my data". */
export async function wipeWorkspace(): Promise<void> {
  await db.transaction(
    "rw",
    [db.profile, db.countryCodes, db.expenses, db.images, db.reports, db.tombstones],
    async () => {
      await Promise.all([
        db.profile.clear(),
        db.countryCodes.clear(),
        db.expenses.clear(),
        db.images.clear(),
        db.reports.clear(),
        db.tombstones.clear(),
      ]);
    },
  );
}

interface AuthResponse {
  sessionToken: string;
  accountId: string;
  role: "manager" | "peer";
  name: string;
  email: string;
}

async function postAuth(path: string, body: unknown): Promise<AuthResponse> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data?.error || `request failed (${res.status})`);
  return data as AuthResponse;
}

export async function register(input: {
  inviteToken: string;
  name: string;
  email: string;
  pin: string;
}): Promise<AccountState> {
  const r = await postAuth("/api/auth/register", input);
  // A brand-new account starts with empty cursors; any local data is migrated separately.
  return saveAccount({
    accountId: r.accountId,
    email: r.email,
    name: r.name,
    role: r.role,
    sessionToken: r.sessionToken,
    pinHashLocal: await hashPin(input.pin),
    pullCursor: 0,
    pushHigh: 0,
  });
}

export async function login(input: { email: string; pin: string }): Promise<AccountState> {
  const prev = await getAccount();
  const r = await postAuth("/api/auth/login", input);
  const pinHashLocal = await hashPin(input.pin);
  // If a different account previously used this device, clear its local workspace first.
  if (prev.accountId && prev.accountId !== r.accountId) {
    await wipeWorkspace();
    return saveAccount({
      accountId: r.accountId, email: r.email, name: r.name, role: r.role,
      sessionToken: r.sessionToken, pinHashLocal, pullCursor: 0, pushHigh: 0,
    });
  }
  return saveAccount({
    accountId: r.accountId, email: r.email, name: r.name, role: r.role,
    sessionToken: r.sessionToken, pinHashLocal,
  });
}

/** Local, offline quick-unlock check against the PIN hash stored at login. */
export async function verifyLocalPin(pin: string): Promise<boolean> {
  const a = await getAccount();
  return verifyPin(pin, a.pinHashLocal);
}

// ---- quick-unlock grace period (device-local; never synced) ----
// After a successful login/unlock we don't re-prompt for the PIN on every refresh —
// only once the grace window has elapsed. Stored in localStorage so it survives reloads
// but stays per-device (each device locks on its own schedule).
const UNLOCK_GRACE_MS = 60 * 60 * 1000; // 1 hour
const UNLOCK_KEY = "mqx:lastUnlock";

export function markUnlocked(): void {
  try { localStorage.setItem(UNLOCK_KEY, String(Date.now())); } catch { /* storage blocked */ }
}
export function isWithinUnlockGrace(): boolean {
  try {
    const t = Number(localStorage.getItem(UNLOCK_KEY) || 0);
    return t > 0 && Date.now() - t < UNLOCK_GRACE_MS;
  } catch { return false; }
}
export function clearUnlock(): void {
  try { localStorage.removeItem(UNLOCK_KEY); } catch { /* storage blocked */ }
}

export async function logout(): Promise<void> {
  const a = await getAccount();
  if (a.sessionToken) {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { authorization: `Bearer ${a.sessionToken}` },
    }).catch(() => undefined);
  }
  // Keep local data on the device; drop the session + quick-unlock hash. Next login re-pulls.
  await saveAccount({ sessionToken: null, pinHashLocal: null });
}
