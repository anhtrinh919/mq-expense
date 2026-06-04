// Account row helpers. An account = identity (email) + secret (PIN, hashed) + a wrapped
// per-user data key. The manager row is seeded; peers are created via invite.

import { db } from "../db/sqlite.ts";
import { generateDek, wrapDek, hashPin, randomToken } from "./crypto.ts";

export type Role = "manager" | "peer";

export interface AccountRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  pin_hash: string;
  pin_salt: string;
  enc_dek: Buffer;
  invited_by: string | null;
  disabled: number;
  failed_attempts: number;
  locked_until: number | null;
  created_at: number;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function findByEmail(email: string): AccountRow | undefined {
  return db.prepare("SELECT * FROM accounts WHERE email = ?").get(normalizeEmail(email)) as
    | AccountRow
    | undefined;
}

export function findById(id: string): AccountRow | undefined {
  return db.prepare("SELECT * FROM accounts WHERE id = ?").get(id) as AccountRow | undefined;
}

export interface NewAccount {
  email: string;
  name: string;
  role: Role;
  pin: string;
  invitedBy?: string | null;
}

/** Create and persist an account. Caller must have already validated email/pin and uniqueness. */
export function createAccount(a: NewAccount): AccountRow {
  const id = randomToken(12);
  const { hash, salt } = hashPin(a.pin);
  const encDek = wrapDek(generateDek());
  const now = Date.now();
  db.prepare(
    `INSERT INTO accounts (id, email, name, role, pin_hash, pin_salt, enc_dek, invited_by, disabled, failed_attempts, locked_until, created_at)
     VALUES (@id, @email, @name, @role, @pin_hash, @pin_salt, @enc_dek, @invited_by, 0, 0, NULL, @created_at)`,
  ).run({
    id,
    email: normalizeEmail(a.email),
    name: a.name.trim(),
    role: a.role,
    pin_hash: hash,
    pin_salt: salt,
    enc_dek: encDek,
    invited_by: a.invitedBy ?? null,
    created_at: now,
  });
  return findById(id)!;
}

export function setPin(accountId: string, pin: string): void {
  const { hash, salt } = hashPin(pin);
  db.prepare(
    "UPDATE accounts SET pin_hash = ?, pin_salt = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?",
  ).run(hash, salt, accountId);
}

export function setDisabled(accountId: string, disabled: boolean): void {
  db.prepare("UPDATE accounts SET disabled = ? WHERE id = ?").run(disabled ? 1 : 0, accountId);
}
