import express from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { SERVER_DIR, PORT } from "./lib/env.ts";
import { healthRouter } from "./routes/health.ts";
import { fxRouter } from "./routes/fx.ts";
import { processReceiptRouter } from "./routes/processReceipt.ts";
import { generateReportRouter } from "./routes/generateReport.ts";

const app = express();

// generate-report carries base64 receipt scans — allow a generous JSON body.
app.use(express.json({ limit: "200mb" }));

// Stateless API. No request logging of bodies, no persistence.
app.use("/api", healthRouter);
app.use("/api", fxRouter);
app.use("/api", processReceiptRouter);
app.use("/api", generateReportRouter);

// In production, serve the built SPA from dist/ on the same port (single homepc-1 process).
const distDir = resolve(SERVER_DIR, "..", "dist");
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(resolve(distDir, "index.html")));
}

app.listen(PORT, () => {
  console.log(`[mq-expense] API + app listening on http://0.0.0.0:${PORT}`);
});
