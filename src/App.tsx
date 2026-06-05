import { useEffect, useState, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/AppShell";
import Home from "./screens/Home";
import Profile from "./screens/Profile";
import Settings from "./screens/Settings";
import Capture from "./screens/Capture";
import Expenses from "./screens/Expenses";
import Reports from "./screens/Reports";
import Team from "./screens/Team";
import Login from "./screens/Login";
import Join from "./screens/Join";
import { getProfile, saveProfile } from "./data/repos";
import type { AccountState } from "./data/types";
import {
  restoreSession,
  getAccount,
  isAuthenticated,
  logout as doLogout,
  wipeWorkspace,
} from "./lib/authClient";
import { syncNow, hasLocalData } from "./lib/sync";
import { getSessionToken } from "./lib/api";
import "./screens/Onboarding.css";

function inviteTokenFromUrl(): string | null {
  try {
    return new URLSearchParams(window.location.search).get("invite");
  } catch {
    return null;
  }
}

export default function App() {
  const [account, setAccount] = useState<AccountState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [locked, setLocked] = useState(false);
  const [migrate, setMigrate] = useState(false);
  const inviteToken = inviteTokenFromUrl();

  const refresh = useCallback(async () => {
    const a = await getAccount();
    setAccount(a);
    return a;
  }, []);

  useEffect(() => {
    (async () => {
      const a = await restoreSession();
      setAccount(a);
      setLocked(isAuthenticated(a) && !!a.pinHashLocal); // require quick-unlock on a fresh open
      setLoaded(true);
    })();
  }, []);

  // Background sync while signed in and unlocked. A live SSE channel nudges this device
  // to pull the instant another device pushes; the interval poll is a fallback for when
  // the stream is down (offline, proxy hiccup). Pulled data reaches open screens via the
  // useSyncSignal hook — App state isn't churned here, so this effect subscribes once per
  // signed-in session (keyed on email), not on every sync tick.
  const authedEmail = account && isAuthenticated(account) && !locked && !migrate ? account.email : null;
  useEffect(() => {
    if (!authedEmail) return;
    void syncNow();
    const iv = setInterval(() => void syncNow(), 60000);
    const onVis = () => { if (document.visibilityState === "visible") void syncNow(); };
    document.addEventListener("visibilitychange", onVis);

    let es: EventSource | null = null;
    const token = getSessionToken();
    if (token && typeof EventSource !== "undefined") {
      es = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
      es.addEventListener("changed", () => void syncNow());
      // EventSource auto-reconnects on error using the server's `retry` hint; nothing to do.
    }

    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
      es?.close();
    };
  }, [authedEmail]);

  // After a fresh login/register: decide migration, pull, and skip the legacy wizard for new accounts.
  const handleAuthed = useCallback(async () => {
    const a = await getAccount();
    setAccount(a);
    setLocked(false);
    if (a.pullCursor === 0 && a.pushHigh === 0 && (await hasLocalData())) {
      setMigrate(true);
      return;
    }
    await syncNow();
    const p = await getProfile();
    if (!p.onboardingComplete) {
      await saveProfile({ ...p, onboardingComplete: true, submitter: { ...p.submitter, name: p.submitter.name || a.name || "" } });
    }
    await refresh();
  }, [refresh]);

  async function resolveMigration(bring: boolean) {
    if (!bring) await wipeWorkspace();
    setMigrate(false);
    await syncNow();
    const p = await getProfile();
    if (!p.onboardingComplete) {
      const a = await getAccount();
      await saveProfile({ ...p, onboardingComplete: true, submitter: { ...p.submitter, name: p.submitter.name || a.name || "" } });
    }
    await refresh();
  }

  async function onLogout() {
    await doLogout();
    await refresh();
    setLocked(false);
    setMigrate(false);
  }

  if (!loaded || !account) return null;

  // Not signed in: invite link → Join; otherwise Login.
  if (!isAuthenticated(account)) {
    if (inviteToken) return <Join token={inviteToken} onAuthed={handleAuthed} />;
    return <Login initialMode="login" knownEmail={account.email} onAuthed={handleAuthed} />;
  }

  // Signed in but the app was just opened: quick PIN unlock (local, offline).
  if (locked) {
    return <Login initialMode="unlock" knownName={account.name} knownEmail={account.email} onAuthed={() => { setLocked(false); }} />;
  }

  // First login on a device that already has data: offer to bring it in.
  if (migrate) {
    return (
      <div className="onb">
        <div className="onb-card">
          <div className="onb-brand">MQ Expense</div>
          <div className="onb-body">
            <h1 className="onb-title serif">Bring your data in?</h1>
            <p className="onb-sub muted">We found existing expenses on this device. Add them to your account so they sync to your other devices?</p>
            <button className="btn btn-primary onb-go" onClick={() => void resolveMigration(true)}>Add them to my account</button>
            <button className="onb-link" onClick={() => void resolveMigration(false)}>Not now</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell account={account} onLogout={onLogout}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/setup" element={<Navigate to="/profile" replace />} />
        <Route path="/backup" element={<Navigate to="/settings" replace />} />
        <Route path="/capture" element={<Capture />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/reports" element={<Reports />} />
        {account.role === "manager" && <Route path="/team" element={<Team />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
