import { Router } from "express";
import { readerStatus } from "../lib/claude.ts";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  const reader = await readerStatus();
  res.json({ status: "ok", reader });
});
