import express from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { SERVER_DIR, PORT } from "./lib/env.ts";
import { healthRouter } from "./routes/health.ts";
import { fxRouter } from "./routes/fx.ts";
import { processReceiptRouter } from "./routes/processReceipt.ts";
import { generateReportRouter } from "./routes/generateReport.ts";
import { authRouter } from "./routes/auth.ts";
import { invitePublicRouter, inviteManagerRouter, teamRouter } from "./routes/team.ts";
import { syncRouter } from "./routes/sync.ts";
import { accountRouter } from "./routes/account.ts";
import { eventsRouter } from "./routes/events.ts";
import { requireAuth } from "./lib/auth.ts";
import { seedManager } from "./lib/auth.ts";

const app = express();

// generate-report carries base64 receipt scans — allow a generous JSON body.
app.use(express.json({ limit: "200mb" }));

// Seed the single manager account from env on boot (idempotent).
seedManager();

// ---- Public routes (no session needed) ----
app.use("/api", healthRouter);
app.use("/api", authRouter); // register / login (logout self-gates)
app.use("/api", invitePublicRouter); // GET /invites/:token — validate a link before joining
app.use("/api", eventsRouter); // GET /events?token= — live-sync nudge stream (self-authenticating)

// ---- Everything below requires a valid session ----
app.use("/api", requireAuth);
app.use("/api", fxRouter);
app.use("/api", processReceiptRouter);
app.use("/api", generateReportRouter);
app.use("/api", inviteManagerRouter); // POST /invites (manager)
app.use("/api", teamRouter); // roster + disable (manager)
app.use("/api", syncRouter); // pull/push encrypted records
app.use("/api", accountRouter); // clear my data

// In production, serve the built SPA from dist/ on the same port (single homepc-1 process).
const distDir = resolve(SERVER_DIR, "..", "dist");
if (existsSync(distDir)) {
  // Content-hashed bundles never change for a given name — cache them hard.
  app.use("/assets", express.static(resolve(distDir, "assets"), { immutable: true, maxAge: "1y" }));
  // Everything else: serve normally, but index.html must always revalidate so a new
  // deploy's asset hashes are picked up immediately instead of from a stale cached shell.
  app.use(
    express.static(distDir, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html")) res.setHeader("Cache-Control", "no-cache");
      },
    }),
  );
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(resolve(distDir, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`[mq-expense] API + app listening on http://0.0.0.0:${PORT}`);
});
