import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/AppShell";
import Home from "./screens/Home";
import Setup from "./screens/Setup";
import Capture from "./screens/Capture";
import Expenses from "./screens/Expenses";
import Reports from "./screens/Reports";
import Backup from "./screens/Backup";
import PinLock from "./screens/PinLock";
import Onboarding from "./screens/Onboarding";
import { getProfile } from "./data/repos";
import type { Profile } from "./data/types";

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [locked, setLocked] = useState(true);

  function refresh() {
    return getProfile().then((p) => {
      setProfile(p);
      return p;
    });
  }

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p);
      setLocked(!!p.pinHash);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return null; // brief blank while the local DB is read

  // First-run onboarding before anything else. After it, the user is already in —
  // don't demand the PIN they just set; the lock is for the *next* app open.
  if (profile && !profile.onboardingComplete) {
    return <Onboarding onDone={() => { setLocked(false); void refresh(); }} />;
  }

  // Soft PIN lock on open (data is never actually locked away).
  if (profile && profile.pinHash && locked) {
    return (
      <PinLock
        pinHash={profile.pinHash}
        name={(profile.submitter.name || "").trim().split(/\s+/)[0] || ""}
        onUnlock={() => { setLocked(false); void refresh(); }}
      />
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/capture" element={<Capture />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/backup" element={<Backup />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
