import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_PORT = process.env.API_PORT ?? "8787";

// Frontend dev server proxies /api to the Express server.
// `host: true` makes it reachable on the LAN (homepc-1 dogfooding from a phone).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": { target: `http://localhost:${API_PORT}`, changeOrigin: true },
    },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
