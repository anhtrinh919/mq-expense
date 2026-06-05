import { Router } from "express";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../lib/run.ts";
import { PYTHON, PYTHON_DIR, ASSETS_DIR } from "../lib/env.ts";

export const generateReportRouter = Router();

interface Body {
  profile?: {
    invoicePrefix?: string; vendorId?: string;
    submitter?: { name?: string; email?: string; phone?: string; addressLine1?: string; addressLine2?: string; country?: string };
    invoiceTo?: { name?: string; address?: string; email?: string };
    bank?: { accountName?: string; accountNumber?: string; swift?: string; bankName?: string };
  };
  invoiceNumber?: string;
  periodLabel?: string;
  baseCurrency?: string;
  expenses?: Array<Record<string, unknown>>;
  receipts?: Array<{ expenseRef: string; mimeType: string; dataBase64: string }>;
}

generateReportRouter.post("/generate-report", async (req, res) => {
  const body = req.body as Body;
  const p = body.profile;
  const missing = (name: string) => res.status(400).json({ error: `missing field: ${name}` });

  if (!p) return missing("profile");
  if (!body.invoiceNumber?.trim()) return missing("invoiceNumber");
  if (!p.submitter?.name?.trim()) return missing("submitter.name");
  if (!p.submitter?.addressLine1?.trim()) return missing("submitter.addressLine1");
  if (!p.invoiceTo?.name?.trim()) return missing("invoiceTo.name");
  if (!p.bank?.accountName?.trim()) return missing("bank.accountName");
  if (!p.bank?.accountNumber?.toString().trim()) return missing("bank.accountNumber");
  if (!Array.isArray(body.expenses) || body.expenses.length === 0) {
    return res.status(422).json({ error: "no expenses to report" });
  }

  const dir = await mkdtemp(join(tmpdir(), "mqx-rep-"));
  try {
    // Write receipt scans to disk in expense order; pass their paths to the assembler.
    const receiptFiles: string[] = [];
    const receipts = body.receipts ?? [];
    for (let i = 0; i < receipts.length; i++) {
      const r = receipts[i];
      const ext = r.mimeType === "application/pdf" ? "pdf" : "img";
      const fp = join(dir, `receipt-${String(i).padStart(3, "0")}.${ext}`);
      await writeFile(fp, Buffer.from(r.dataBase64, "base64"));
      receiptFiles.push(fp);
    }

    const job = {
      profile: p,
      invoiceNumber: body.invoiceNumber.trim(),
      periodLabel: body.periodLabel ?? "",
      baseCurrency: (body.baseCurrency ?? "VND").toUpperCase(),
      expenses: body.expenses,
      receiptFiles,
      outDir: dir,
      invoiceTemplate: join(ASSETS_DIR, "expense_invoice_template.xlsx"),
      generatedDate: new Date().toISOString().slice(0, 10),
    };
    const jobPath = join(dir, "job.json");
    await writeFile(jobPath, JSON.stringify(job));

    const r = await run(PYTHON, [join(PYTHON_DIR, "generate_report.py"), jobPath], { timeoutMs: 120_000 });
    if (r.code !== 0) {
      return res.status(500).json({ error: "report assembly failed", detail: r.stderr.slice(-500) });
    }
    const out = JSON.parse(r.stdout.trim().split("\n").pop()!) as { combinedPdf: string; expenseXlsx: string };
    const [pdf, xlsx] = await Promise.all([readFile(out.combinedPdf), readFile(out.expenseXlsx)]);

    res.status(200).json({
      combinedPdf: { filename: `${job.invoiceNumber}-submission.pdf`, dataBase64: pdf.toString("base64") },
      expenseXlsx: { filename: `expenses-${job.invoiceNumber}.xlsx`, dataBase64: xlsx.toString("base64") },
    });
  } catch (e) {
    res.status(500).json({ error: "report assembly failed", detail: String(e).slice(-300) });
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

// Lightweight Excel-only export of a (possibly filtered) expense selection — the same
// formatted ledger the full report produces, but with no invoice and no PDF step. Pure
// openpyxl, so it works even where LibreOffice isn't installed.
interface XlsxBody {
  baseCurrency?: string;
  periodLabel?: string;
  expenses?: Array<{ date?: string; description?: string; amountVND?: number; accountCode?: string }>;
}

generateReportRouter.post("/export-expenses-xlsx", async (req, res) => {
  const body = req.body as XlsxBody;
  if (!Array.isArray(body.expenses) || body.expenses.length === 0) {
    return res.status(422).json({ error: "no expenses to export" });
  }
  const dir = await mkdtemp(join(tmpdir(), "mqx-xlsx-"));
  try {
    const job = {
      mode: "xlsx",
      periodLabel: body.periodLabel ?? "",
      baseCurrency: (body.baseCurrency ?? "VND").toUpperCase(),
      expenses: body.expenses,
      outDir: dir,
    };
    const jobPath = join(dir, "job.json");
    await writeFile(jobPath, JSON.stringify(job));
    const r = await run(PYTHON, [join(PYTHON_DIR, "generate_report.py"), jobPath], { timeoutMs: 60_000 });
    if (r.code !== 0) {
      return res.status(500).json({ error: "excel export failed", detail: r.stderr.slice(-500) });
    }
    const out = JSON.parse(r.stdout.trim().split("\n").pop()!) as { expenseXlsx: string };
    const xlsx = await readFile(out.expenseXlsx);
    const stamp = new Date().toISOString().slice(0, 10);
    res.status(200).json({
      expenseXlsx: { filename: `expenses-${stamp}.xlsx`, dataBase64: xlsx.toString("base64") },
    });
  } catch (e) {
    res.status(500).json({ error: "excel export failed", detail: String(e).slice(-300) });
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});
