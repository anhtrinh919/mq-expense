import { Router } from "express";
import { db } from "../db/sqlite.ts";
import { requireManager, destroySessionsFor, type AuthedRequest } from "../lib/auth.ts";
import { setDisabled, type AccountRow } from "../lib/accounts.ts";
import { createInvite, getInvite, effectiveStatus } from "../lib/invites.ts";

// Public: validate an invite link before the Join screen shows the form.
export const invitePublicRouter = Router();
invitePublicRouter.get("/invites/:token", (req, res) => {
  const inv = getInvite(req.params.token);
  if (!inv) return res.status(404).json({ error: "unknown invite" });
  res.json({ status: effectiveStatus(inv), email: inv.email ?? undefined });
});

// Manager: create an invite link. (Mounted after the auth gate.)
export const inviteManagerRouter = Router();
inviteManagerRouter.post("/invites", requireManager, (req, res) => {
  const account = (req as AuthedRequest).account;
  const email = typeof req.body?.email === "string" ? req.body.email : undefined;
  const inv = createInvite(account.id, email);
  const base = `${req.protocol}://${req.get("host")}`;
  res.status(201).json({
    token: inv.token,
    link: `${base}/join?invite=${inv.token}`,
    expiresAt: inv.expires_at,
  });
});

// Manager: roster + revoke. (Mounted after the auth gate.)
export const teamRouter = Router();

teamRouter.get("/team/roster", requireManager, (_req, res) => {
  const rows = db
    .prepare(
      "SELECT id, name, email, disabled, created_at FROM accounts WHERE role = 'peer' ORDER BY created_at DESC",
    )
    .all() as Pick<AccountRow, "id" | "name" | "email" | "disabled" | "created_at">[];
  res.json({
    members: rows.map((r) => ({
      accountId: r.id,
      name: r.name,
      email: r.email,
      status: r.disabled ? "disabled" : "active",
      joinedAt: r.created_at,
    })),
  });
});

teamRouter.post("/team/:accountId/disable", requireManager, (req, res) => {
  const me = (req as AuthedRequest).account;
  const targetId = String(req.params.accountId);
  if (targetId === me.id) return res.status(403).json({ error: "you can't disable yourself" });
  const target = db.prepare("SELECT id, role FROM accounts WHERE id = ?").get(targetId) as
    | { id: string; role: string }
    | undefined;
  if (!target) return res.status(404).json({ error: "unknown account" });
  if (target.role === "manager") return res.status(403).json({ error: "can't disable a manager" });
  setDisabled(targetId, true);
  destroySessionsFor(targetId); // kick any live sessions immediately
  res.json({ ok: true });
});
