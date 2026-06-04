// Invite lifecycle. The manager mints single-use, time-limited invite tokens; a peer
// consumes one when they register. Everything is server-side state in the invites table.

import { db } from "../db/sqlite.ts";
import { randomToken } from "./crypto.ts";
import { INVITE_TTL_MS } from "./env.ts";

export type InviteStatus = "pending" | "redeemed" | "revoked" | "expired";

export interface InviteRow {
  token: string;
  created_by: string;
  email: string | null;
  status: InviteStatus;
  redeemed_by: string | null;
  expires_at: number;
  created_at: number;
}

export function createInvite(createdBy: string, email?: string): InviteRow {
  const token = randomToken(18);
  const now = Date.now();
  db.prepare(
    `INSERT INTO invites (token, created_by, email, status, redeemed_by, expires_at, created_at)
     VALUES (?, ?, ?, 'pending', NULL, ?, ?)`,
  ).run(token, createdBy, email?.trim().toLowerCase() ?? null, now + INVITE_TTL_MS, now);
  return getInvite(token)!;
}

export function getInvite(token: string): InviteRow | undefined {
  return db.prepare("SELECT * FROM invites WHERE token = ?").get(token) as InviteRow | undefined;
}

/** Effective status, treating an expired pending invite as expired. */
export function effectiveStatus(inv: InviteRow): InviteStatus {
  if (inv.status === "pending" && Date.now() > inv.expires_at) return "expired";
  return inv.status;
}

export class InviteUnusable extends Error {}

/** Mark an invite redeemed by an account. Throws InviteUnusable if not currently usable.
 *  Call inside the same transaction as account creation. */
export function redeemInvite(token: string, accountId: string): void {
  const inv = getInvite(token);
  if (!inv || effectiveStatus(inv) !== "pending") throw new InviteUnusable(token);
  db.prepare("UPDATE invites SET status = 'redeemed', redeemed_by = ? WHERE token = ?").run(
    accountId,
    token,
  );
}

export function revokeInvitesFor(_accountId: string): void {
  // reserved for future cleanup; peer disable handles access revocation
}
