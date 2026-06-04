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
