import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/AppShell";
import Home from "./screens/Home";
import Setup from "./screens/Setup";
import Capture from "./screens/Capture";
import Expenses from "./screens/Expenses";
import Reports from "./screens/Reports";
import Backup from "./screens/Backup";

export default function App() {
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
