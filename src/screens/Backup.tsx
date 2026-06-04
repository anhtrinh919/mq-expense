import { Link } from "react-router-dom";
import { exportAll } from "../lib/backup";
import { PageHeader } from "../components/ui";
import "./Backup.css";

export default function Backup() {
  async function doExport() {
    const { blob, filename } = await exportAll();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
          <h3 className="section-title">Restore</h3>
          <p className="section-hint tertiary">Bringing data back onto a device happens during first-run setup, or any time from Settings.</p>
          <p className="muted">Go to <Link to="/settings" className="mono">Settings → Restore from a backup</Link> to import a <span className="mono">.mqx</span> file. Keeping restore there avoids accidentally overwriting your data from the page you use every month.</p>
          <Link to="/settings" className="btn">Open Settings</Link>
        </section>
      </div>
    </div>
  );
}
