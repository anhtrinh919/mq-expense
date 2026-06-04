import { Router } from "express";
import multer from "multer";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, extname } from "node:path";
import { run } from "../lib/run.ts";
import { readReceipt } from "../lib/claude.ts";
import { PYTHON, PYTHON_DIR, MAX_UPLOAD_BYTES, isAcceptedType, ACCEPTED_PDF } from "../lib/env.ts";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });

export const processReceiptRouter = Router();

processReceiptRouter.post("/process-receipt", (req, res) => {
  upload.single("file")(req, res, async (err: unknown) => {
    if (err && (err as { code?: string }).code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "file exceeds size limit" });
    }
    if (err) return res.status(400).json({ error: "upload failed" });

    const file = (req as unknown as { file?: Express.Multer.File }).file;
    if (!file || !file.buffer?.length) return res.status(400).json({ error: "no file" });
    if (!isAcceptedType(file.mimetype, file.originalname)) {
      return res.status(400).json({ error: "unsupported file type" });
    }

    // Everything below lives in a temp dir that is deleted in `finally`. Nothing persists.
    const dir = await mkdtemp(join(tmpdir(), "mqx-"));
    const ext = extname(file.originalname) || (file.mimetype === ACCEPTED_PDF ? ".pdf" : ".jpg");
    const inputPath = join(dir, `receipt${ext}`);
    try {
      await writeFile(inputPath, file.buffer);

      // 1) B&W scan (Pillow for images; PDFs pass through as their own scan)
      let bwScan: { mimeType: string; dataBase64: string };
      if (file.mimetype === ACCEPTED_PDF || ext.toLowerCase() === ".pdf") {
        bwScan = { mimeType: ACCEPTED_PDF, dataBase64: file.buffer.toString("base64") };
      } else {
        const outPath = join(dir, "scan.pdf");
        const r = await run(PYTHON, [join(PYTHON_DIR, "scan_receipt.py"), inputPath, outPath], { timeoutMs: 30_000 });
        if (r.code === 0) {
          const bytes = await readFile(outPath);
          bwScan = { mimeType: ACCEPTED_PDF, dataBase64: bytes.toString("base64") };
        } else {
          // scan failed — fall back to the original image as the retained scan
          bwScan = { mimeType: file.mimetype || "image/jpeg", dataBase64: file.buffer.toString("base64") };
        }
      }

      // 2) Read date/amount/currency via claude -p (held in memory only)
      const reading = await readReceipt(inputPath);

      const unreadable = reading.amount == null && reading.date == null && reading.currency == null;
      if (unreadable) {
        return res.status(422).json({ error: "could not read receipt", reading, bwScan });
      }
      return res.status(200).json({ reading, bwScan });
    } catch {
      return res.status(500).json({ error: "processing failed" });
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });
});
