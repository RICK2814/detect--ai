import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Always load `.env` from this folder (frontend/), even if Vite is started with a different cwd.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  envDir: __dirname,
  plugins: [react()],
  server: {
    port: 5173,
    // If 5173 is taken, try the next port instead of exiting (avoids "ghost" servers + missing env).
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
