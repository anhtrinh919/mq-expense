// Live-sync nudge channel (Server-Sent Events). When one device pushes new data,
// the account's *other* connected devices get a "changed" event and immediately pull.
// The socket carries no data itself — all records still flow over the encrypted
// /sync endpoints. This just collapses the up-to-30s poll wait down to ~instant.
//
// EventSource can't send an Authorization header, so the session token arrives as a
// query param and is verified here. Mounted on the PUBLIC side (before requireAuth).

import { Router, type Response } from "express";
import { resolveSession } from "../lib/auth.ts";

const HEARTBEAT_MS = 25_000;

// accountId -> open response streams for that account's devices.
const channels = new Map<string, Set<Response>>();

/** Nudge every connected device for this account to pull now. */
export function notifyAccount(accountId: string): void {
  const conns = channels.get(accountId);
  if (!conns) return;
  for (const res of conns) {
    res.write("event: changed\n");
    res.write("data: 1\n\n");
  }
}

export const eventsRouter = Router();

eventsRouter.get("/events", (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  const account = token ? resolveSession(token) : undefined;
  if (!account || account.disabled) {
    res.status(401).end();
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // disable proxy buffering so events flush immediately
  });
  res.write("retry: 3000\n\n"); // client reconnect backoff
  res.write(": connected\n\n");

  let set = channels.get(account.id);
  if (!set) {
    set = new Set();
    channels.set(account.id, set);
  }
  set.add(res);

  const beat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);

  req.on("close", () => {
    clearInterval(beat);
    const conns = channels.get(account.id);
    if (conns) {
      conns.delete(res);
      if (conns.size === 0) channels.delete(account.id);
    }
  });
});
