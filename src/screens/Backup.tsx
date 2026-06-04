import { useRef, useState } from "react";
import { exportAll, importAll, type RestoreCounts } from "../lib/backup";
import { PageHeader, Banner } from "../components/ui";
import "./Backup.css";

type Phase = "idle" | "importing" | "done" | "error";

export default function Backup() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [counts, setCounts] = useState<RestoreCounts | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function doExport() {
    const { blob, filename } = await exportAll();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function doImport(file: File) {
    setFileName(file.name); setPhase("importing"); setErr(null);
    try {
      const c = await importAll(file);
      setCounts(c); setPhase("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Import failed."); setPhase("error");
    }
  }

  return (
    <div className="backup">
      <PageHeader title="Backup" subtitle="Your data lives on this device · back up regularly" />

      <div className="reassure">
        <span className="reassure-ico">⤓</span>
        <div>
          <strong>Nothing of yours is on a server</strong>
          <p className="muted">Every setting, expense, receipt image, and report is on this device. A backup file is the only way to move your data to another device or recover it.</p>
        </div>
      </div>

      {phase === "done" && counts && (
        <Banner kind="attention" title="Backup restored" body={`Restored ${counts.expenses} expenses, ${counts.reports} reports, and ${counts.images} receipt images.`} />
      )}
      {phase === "error" && <Banner kind="error" title="That file isn't a valid backup" body={err ?? undefined} />}

      <div className="backup-cards">
        <section className="card backup-card">
          <h3 className="section-title">Export</h3>
          <p className="section-hint tertiary">Download everything as a single <span className="mono">.mqx</span> file.</p>
          <ul className="contains">
            <li>Profile, invoice &amp; bank details</li>
            <li>All expenses + both image sets</li>
            <li>Report history + generated files</li>
            <li>Country codes &amp; settings</li>
          </ul>
          <button className="btn btn-primary" onClick={doExport}>Export backup</button>
        </section>

        <section className="card backup-card">
          <h3 className="section-title">Import</h3>
          <Banner kind="attention" title="Import replaces everything on this device" />
          <div className="dropzone import-dz" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) doImport(e.dataTransfer.files[0]); }}>
            {phase === "importing" ? (
              <div className="importing"><span className="spinner" /> Restoring {fileName}… do not close this tab</div>
            ) : (
              <>
                <p className="muted">Drop a <span className="mono">.mqx</span> file here</p>
                <p className="tertiary">only files exported from MQ Expense will work</p>
                <button className="btn" onClick={() => input.current?.click()}>Choose file</button>
              </>
            )}
            <input ref={input} type="file" accept=".mqx,application/json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
          </div>
        </section>
      </div>
    </div>
  );
}
