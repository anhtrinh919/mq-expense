import { Router } from "express";
import { readerStatus } from "../lib/claude.ts";
import { db } from "../db/sqlite.ts";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  const reader = await readerStatus();
  let store: "ok" | "unavailable" = "unavailable";
  try {
    db.prepare("SELECT 1").get();
    store = "ok";
  } catch {
    store = "unavailable";
  }
  res.json({ status: "ok", reader, store });
});
