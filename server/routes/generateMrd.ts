import { Router } from "express";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../lib/run.ts";
import { PYTHON, PYTHON_DIR } from "../lib/env.ts";

export const generateMrdRouter = Router();

interface MrdBody {
  date?: string;
  description?: string;
  vendor?: string;
  amount?: string | number;
  currency?: string;
  country?: string;
  accountCode?: string;
  businessReason?: string;
  userName?: string;
}

generateMrdRouter.post("/generate-mrd", async (req, res) => {
  const body = req.body as MrdBody;
  if (!body.date) return res.status(400).json({ error: "missing field: date" });
  if (!body.amount) return res.status(400).json({ error: "missing field: amount" });

  const now = new Date();
  const generatedDate = now.toISOString().slice(0, 10);
  const generatedTime = now.toUTCString().match(/\d{2}:\d{2}:\d{2}/)?.[0] ?? "";

  const dir = await mkdtemp(join(tmpdir(), "mqx-mrd-"));
  try {
    const job = {
      date: body.date,
      description: body.description ?? "",
      vendor: body.vendor ?? body.description ?? "",
      amount: String(body.amount ?? ""),
      currency: body.currency ?? "",
      country: body.country ?? "",
      accountCode: body.accountCode ?? "",
      businessReason: body.businessReason ?? body.description ?? "",
      userName: body.userName ?? "",
      generatedDate,
      generatedTime,
      outDir: dir,
    };
    const jobPath = join(dir, "job.json");
    await writeFile(jobPath, JSON.stringify(job));

    const r = await run(PYTHON, [join(PYTHON_DIR, "generate_mrd.py"), jobPath], { timeoutMs: 30_000 });
    if (r.code !== 0) {
      return res.status(500).json({ error: "MRD generation failed", detail: r.stderr.slice(-400) });
    }
    const out = JSON.parse(r.stdout.trim().split("\n").pop()!) as { mrdPdf: string };
    const pdf = await readFile(out.mrdPdf);
    res.status(200).json({
      mrdPdf: { filename: `mrd-${body.date}.pdf`, dataBase64: pdf.toString("base64") },
    });
  } catch (e) {
    res.status(500).json({ error: "MRD generation failed", detail: String(e).slice(-300) });
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});
