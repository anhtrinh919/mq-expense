import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import type { AccountState } from "../data/types";
import "./AppShell.css";

const BASE_NAV = [
  { to: "/profile", label: "Profile", key: "1" },
  { to: "/capture", label: "Capture", key: "2" },
  { to: "/expenses", label: "Expenses", key: "3" },
  { to: "/reports", label: "Reports", key: "4" },
  { to: "/settings", label: "Settings", key: "5" },
];

export default function AppShell({
  account,
  onLogout,
  children,
}: {
  account: AccountState;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  const nav = account.role === "manager" ? [...BASE_NAV, { to: "/team", label: "Invite & Team", key: "6" }] : BASE_NAV;

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  // 1–6 keyboard shortcuts (desktop convenience).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const hit = nav.find((n) => n.key === e.key);
      if (hit) navigate(hit.to);
      if (e.key.toLowerCase() === "c") navigate("/capture");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, nav]);

  const initial = (account.name || account.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <NavLink to="/" className="brand">
            <span className="brand-mark" aria-hidden />
            <span className="brand-name">MQ Expense</span>
          </NavLink>
          <nav className="nav">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item${isActive ? " active" : ""}${n.to === "/team" ? " nav-mgr" : ""}`}>
                <span className="nav-label">{n.label}</span>
                <span className="kbd">{n.key}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="sidebar-bot">
          <div className="account-slot">
            <span className="avatar">{initial}</span>
            <span className="account-meta">
              <span className="account-name">{account.name || "You"}</span>
              <span className="account-mail">{account.email}</span>
            </span>
          </div>
          <div className="sync-row">
            <span className={`sync-dot ${online ? "synced" : "offline"}`} />
            {online ? "Synced" : "Offline · changes saved here"}
          </div>
        </div>
      </aside>

      <main className="main">{children}</main>

      {/* mobile bottom nav + center capture FAB */}
      <nav className="bottom-nav">
        <NavLink to="/profile" className={({ isActive }) => `bn${isActive ? " active" : ""}`}>Profile</NavLink>
        <NavLink to="/expenses" className={({ isActive }) => `bn${isActive ? " active" : ""}`}>Expenses</NavLink>
        <NavLink to="/capture" className="fab" aria-label="Add receipt">+</NavLink>
        <NavLink to="/reports" className={({ isActive }) => `bn${isActive ? " active" : ""}`}>Reports</NavLink>
        <NavLink to="/settings" className={({ isActive }) => `bn${isActive ? " active" : ""}`}>Settings</NavLink>
      </nav>
      <button hidden onClick={onLogout} aria-hidden />
    </div>
  );
}
