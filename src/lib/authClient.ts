// Client-side account + session. The PIN is the only secret: register/login send email+PIN,
// the server returns a session token we keep locally and attach to every API call.

import { db } from "../data/db";
import type { AccountState } from "../data/types";
import { setSessionToken, ApiError } from "./api";

const DEFAULT: AccountState = {
  id: "account",
  accountId: null,
  email: null,
  name: null,
  role: null,
  sessionToken: null,
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
    pullCursor: 0,
    pushHigh: 0,
  });
}

export async function login(input: { email: string; pin: string }): Promise<AccountState> {
  const prev = await getAccount();
  const r = await postAuth("/api/auth/login", input);
  // If a different account previously used this device, clear its local workspace first.
  if (prev.accountId && prev.accountId !== r.accountId) {
    await wipeWorkspace();
    return saveAccount({
      accountId: r.accountId, email: r.email, name: r.name, role: r.role,
      sessionToken: r.sessionToken, pullCursor: 0, pushHigh: 0,
    });
  }
  return saveAccount({
    accountId: r.accountId, email: r.email, name: r.name, role: r.role, sessionToken: r.sessionToken,
  });
}

export async function logout(): Promise<void> {
  const a = await getAccount();
  if (a.sessionToken) {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { authorization: `Bearer ${a.sessionToken}` },
    }).catch(() => undefined);
  }
  // Keep local data on the device; just drop the session. Next login re-pulls.
  await saveAccount({ sessionToken: null });
}
