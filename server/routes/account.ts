import { Router } from "express";
import { db } from "../db/sqlite.ts";
import { type AuthedRequest } from "../lib/auth.ts";

export const accountRouter = Router();

/** Wipe all of this account's synced records on the server. The account itself remains.
 *  The client wipes its local IndexedDB in the same flow. */
accountRouter.delete("/account/data", (req, res) => {
  const account = (req as AuthedRequest).account;
  db.prepare("DELETE FROM sync_records WHERE account_id = ?").run(account.id);
  res.json({ ok: true });
});
