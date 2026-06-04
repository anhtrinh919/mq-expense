import { NavLink, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import "./AppShell.css";

const NAV = [
  { to: "/setup", label: "Setup", key: "1" },
  { to: "/capture", label: "Capture", key: "2" },
  { to: "/expenses", label: "Expenses", key: "3" },
  { to: "/reports", label: "Reports", key: "4" },
  { to: "/backup", label: "Backup", key: "5" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  // 1–5 keyboard shortcuts (desktop convenience, matches the sidebar kbd hints).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const hit = NAV.find((n) => n.key === e.key);
      if (hit) navigate(hit.to);
      if (e.key.toLowerCase() === "c") navigate("/capture");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <NavLink to="/" className="brand">
            <span className="brand-mark" aria-hidden />
            <span className="brand-name">MQ Expense</span>
          </NavLink>
          <nav className="nav">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
                <span className="nav-label">{n.label}</span>
                <span className="kbd">{n.key}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="sidebar-bot">
          <div className="local-card">
            <div className="local-head">
              <span className="dot" />
              LOCAL · THIS DEVICE
            </div>
            <p className="local-desc">Nothing leaves your device. Back up from Backup.</p>
          </div>
          {/* account slot — reserved for Phase 2 (login/account); intentionally minimal in single-user mode */}
          <div className="account-slot" aria-hidden>
            <span className="avatar" />
            <span className="account-label">You</span>
          </div>
        </div>
      </aside>

      <main className="main">{children}</main>

      {/* mobile bottom nav + center capture FAB */}
      <nav className="bottom-nav">
        <NavLink to="/setup" className={({ isActive }) => `bn${isActive ? " active" : ""}`}>Setup</NavLink>
        <NavLink to="/expenses" className={({ isActive }) => `bn${isActive ? " active" : ""}`}>Expenses</NavLink>
        <NavLink to="/capture" className="fab" aria-label="Add receipt">+</NavLink>
        <NavLink to="/reports" className={({ isActive }) => `bn${isActive ? " active" : ""}`}>Reports</NavLink>
        <NavLink to="/backup" className={({ isActive }) => `bn${isActive ? " active" : ""}`}>Backup</NavLink>
      </nav>
    </div>
  );
}
