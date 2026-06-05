import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { seedCountryCodesIfEmpty } from "./data/repos";
import "./styles/globals.css";

// First-run seed of the SEA example country codes (only when none exist).
seedCountryCodesIfEmpty().catch((e) => console.error("[seed]", e));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

// Register the service worker so the app is installable (Add to Home Screen / Install)
// and works offline. Best-effort: failure here never blocks the app.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
