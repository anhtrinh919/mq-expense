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
  const [drawerOpen, setDrawerOpen] = useState(false);

  const nav = account.role === "manager" ? [...BASE_NAV, { to: "/team", label: "Invite & Team", key: "6" }] : BASE_NAV;

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  // Close drawer on route change (mobile)
  useEffect(() => { setDrawerOpen(false); }, [navigate]);

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

  const sidebarContent = (
    <>
      <div className="sidebar-top">
        <NavLink to="/" className="brand" onClick={() => setDrawerOpen(false)}>
          <span className="brand-mark" aria-hidden />
          <span className="brand-name">MQ Expense</span>
        </NavLink>
        <nav className="nav">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}${n.to === "/team" ? " nav-mgr" : ""}`}
            >
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
    </>
  );

  return (
    <div className="shell">
      {/* Desktop sidebar */}
      <aside className="sidebar">{sidebarContent}</aside>

      {/* Mobile top bar */}
      <header className="mobile-topbar">
        <NavLink to="/" className="brand brand-mobile">
          <span className="brand-mark" aria-hidden />
          <span className="brand-name">MQ Expense</span>
        </NavLink>
        <button
          className="hamburger"
          aria-label={drawerOpen ? "Close menu" : "Open menu"}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((o) => !o)}
        >
          <span className={`ham-icon${drawerOpen ? " open" : ""}`} aria-hidden />
        </button>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />}
      <aside className={`drawer${drawerOpen ? " drawer-open" : ""}`}>{sidebarContent}</aside>

      <main className="main">{children}</main>
      <button hidden onClick={onLogout} aria-hidden />
    </div>
  );
}
