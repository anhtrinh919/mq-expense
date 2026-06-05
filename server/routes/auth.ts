import { Router } from "express";
import { db } from "../db/sqlite.ts";
import {
  authenticate,
  createSession,
  destroySession,
  requireAuth,
  type AuthedRequest,
  LoginFailed,
  AccountDisabled,
  AccountLocked,
} from "../lib/auth.ts";
import { createAccount, findByEmail, findById, setPin } from "../lib/accounts.ts";
import { verifyPin } from "../lib/crypto.ts";
import { redeemInvite, InviteUnusable } from "../lib/invites.ts";

const PIN_RE = /^\d{4,8}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const authRouter = Router();

/** Register a peer via an invite. Managers are seeded, never registered here. */
authRouter.post("/auth/register", (req, res) => {
  const { inviteToken, name, email, pin } = (req.body ?? {}) as Record<string, unknown>;
  if (typeof inviteToken !== "string" || !inviteToken) {
    return res.status(400).json({ error: "an invite is required to create an account" });
  }
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "a valid email is required" });
  }
  if (typeof pin !== "string" || !PIN_RE.test(pin)) {
    return res.status(400).json({ error: "PIN must be 4 to 8 digits" });
  }
  if (findByEmail(email)) {
    return res.status(409).json({ error: "that email already has an account" });
  }

  let accountId: string;
  let role: string;
  let resolvedName: string;
  let resolvedEmail: string;
  try {
    const tx = db.transaction(() => {
      const account = createAccount({ email, name, role: "peer", pin, invitedBy: null });
      redeemInvite(inviteToken, account.id);
      // record who invited them now that the invite is resolved
      db.prepare("UPDATE accounts SET invited_by = (SELECT created_by FROM invites WHERE token = ?) WHERE id = ?").run(
        inviteToken,
        account.id,
      );
      return account;
    });
    const account = tx();
    accountId = account.id;
    role = account.role;
    resolvedName = account.name;
    resolvedEmail = account.email;
  } catch (e) {
    if (e instanceof InviteUnusable) {
      return res.status(403).json({ error: "this invite link isn't valid anymore" });
    }
    throw e;
  }

  const sessionToken = createSession(accountId);
  res.status(201).json({ sessionToken, accountId, role, name: resolvedName, email: resolvedEmail });
});

authRouter.post("/auth/login", (req, res) => {
  const { email, pin } = (req.body ?? {}) as Record<string, unknown>;
  if (typeof email !== "string" || typeof pin !== "string") {
    return res.status(400).json({ error: "email and PIN are required" });
  }
  try {
    const account = authenticate(email, pin);
    const sessionToken = createSession(account.id);
    res.json({
      sessionToken,
      accountId: account.id,
      role: account.role,
      name: account.name,
      email: account.email,
    });
  } catch (e) {
    if (e instanceof AccountLocked) {
      return res.status(423).json({ error: "too many tries, locked for a few minutes", lockedUntil: e.lockedUntil });
    }
    if (e instanceof AccountDisabled) {
      return res.status(403).json({ error: "access has been turned off" });
    }
    if (e instanceof LoginFailed) {
      return res.status(401).json({ error: "wrong email or PIN" });
    }
    throw e;
  }
});

/** Change your own PIN. Requires the current PIN; no email, no reset link. */
authRouter.post("/auth/change-pin", requireAuth, (req, res) => {
  const account = (req as AuthedRequest).account;
  const { currentPin, newPin } = (req.body ?? {}) as Record<string, unknown>;
  if (typeof currentPin !== "string" || typeof newPin !== "string") {
    return res.status(400).json({ error: "current and new PIN are required" });
  }
  if (!PIN_RE.test(newPin)) {
    return res.status(400).json({ error: "PIN must be 4 to 8 digits" });
  }
  const row = findById(account.id);
  if (!row || !verifyPin(currentPin, row.pin_hash, row.pin_salt)) {
    return res.status(401).json({ error: "current PIN didn't match" });
  }
  setPin(account.id, newPin);
  res.json({ ok: true });
});

authRouter.post("/auth/logout", requireAuth, (req, res) => {
  const h = req.header("authorization") ?? "";
  const token = /^Bearer\s+(.+)$/i.exec(h)?.[1];
  if (token) destroySession(token);
  void (req as AuthedRequest).account;
  res.json({ ok: true });
});
