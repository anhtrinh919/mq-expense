// Sessions + auth middleware + login lockout + manager seeding.

import type { Request, Response, NextFunction } from "express";
import { db } from "../db/sqlite.ts";
import { randomToken, verifyPin } from "./crypto.ts";
import {
  type AccountRow,
  findByEmail,
  findById,
  createAccount,
} from "./accounts.ts";
import {
  SESSION_TTL_MS,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_LOCK_MS,
  MANAGER_EMAIL,
  MANAGER_NAME,
  MANAGER_PIN,
} from "./env.ts";

// ---- sessions ----

export function createSession(accountId: string): string {
  const token = randomToken(24);
  const now = Date.now();
  db.prepare(
    "INSERT INTO sessions (token, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  ).run(token, accountId, now, now + SESSION_TTL_MS);
  return token;
}

export function destroySession(token: string): void {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function destroySessionsFor(accountId: string): void {
  db.prepare("DELETE FROM sessions WHERE account_id = ?").run(accountId);
}

interface SessionRow {
  token: string;
  account_id: string;
  expires_at: number;
}

function resolveSession(token: string): AccountRow | undefined {
  const s = db.prepare("SELECT * FROM sessions WHERE token = ?").get(token) as
    | SessionRow
    | undefined;
  if (!s) return undefined;
  if (Date.now() > s.expires_at) {
    destroySession(token);
    return undefined;
  }
  return findById(s.account_id);
}

// ---- request augmentation ----

export interface AuthedRequest extends Request {
  account: AccountRow;
}

function bearer(req: Request): string | null {
  const h = req.header("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : null;
}

/** Gate: require a valid session for a non-disabled account. Attaches req.account. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = bearer(req);
  if (!token) {
    res.status(401).json({ error: "not signed in" });
    return;
  }
  const account = resolveSession(token);
  if (!account) {
    res.status(401).json({ error: "session expired" });
    return;
  }
  if (account.disabled) {
    res.status(403).json({ error: "access revoked" });
    return;
  }
  (req as AuthedRequest).account = account;
  next();
}

/** Gate: require the authenticated account to be the manager. Runs after requireAuth. */
export function requireManager(req: Request, res: Response, next: NextFunction): void {
  const account = (req as AuthedRequest).account;
  if (!account || account.role !== "manager") {
    res.status(403).json({ error: "managers only" });
    return;
  }
  next();
}

// ---- login + lockout ----

export class LoginFailed extends Error {}
export class AccountDisabled extends Error {}
export class AccountLocked extends Error {
  constructor(public lockedUntil: number) {
    super("locked");
  }
}

/** Verify email + PIN, applying failed-attempt lockout. Returns the account on success. */
export function authenticate(email: string, pin: string): AccountRow {
  const account = findByEmail(email);
  // Run a verify even when the account is missing, to avoid leaking which emails exist via timing.
  if (!account) {
    verifyPin(pin, "0".repeat(64), "00");
    throw new LoginFailed();
  }
  if (account.disabled) throw new AccountDisabled();
  if (account.locked_until && Date.now() < account.locked_until) {
    throw new AccountLocked(account.locked_until);
  }
  const ok = verifyPin(pin, account.pin_hash, account.pin_salt);
  if (!ok) {
    const attempts = account.failed_attempts + 1;
    if (attempts >= LOGIN_MAX_ATTEMPTS) {
      const until = Date.now() + LOGIN_LOCK_MS;
      db.prepare("UPDATE accounts SET failed_attempts = 0, locked_until = ? WHERE id = ?").run(
        until,
        account.id,
      );
      throw new AccountLocked(until);
    }
    db.prepare("UPDATE accounts SET failed_attempts = ? WHERE id = ?").run(attempts, account.id);
    throw new LoginFailed();
  }
  if (account.failed_attempts || account.locked_until) {
    db.prepare("UPDATE accounts SET failed_attempts = 0, locked_until = NULL WHERE id = ?").run(
      account.id,
    );
  }
  return account;
}

// ---- manager seed (idempotent, on boot) ----

export function seedManager(): void {
  if (!MANAGER_EMAIL || !MANAGER_PIN) return; // nothing to seed (dev without manager env)
  const existingManager = db.prepare("SELECT id FROM accounts WHERE role = 'manager'").get();
  if (existingManager) return;
  if (findByEmail(MANAGER_EMAIL)) return; // email already taken by a peer somehow; don't clobber
  createAccount({
    email: MANAGER_EMAIL,
    name: MANAGER_NAME,
    role: "manager",
    pin: MANAGER_PIN,
  });
  console.log(`[mq-expense] seeded manager account ${MANAGER_EMAIL}`);
}
