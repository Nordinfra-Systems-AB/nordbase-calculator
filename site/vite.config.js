import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    // Allow the dev server to read ../../shared/chargerData.js (single
    // source of truth for charger data, shared with the calculator app) —
    // this app's src/ files now import from two directories above the
    // project root. Doesn't affect `npm run build`, only `npm run dev`.
    fs: {
      allow: [resolve(__dirname, "../.."), resolve(__dirname, ".")],
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        resources: resolve(__dirname, "resources.html"),
        partners: resolve(__dirname, "partners.html"),
        product: resolve(__dirname, "product.html"),
        installation: resolve(__dirname, "installation.html"),
        siteplanner: resolve(__dirname, "site-planner.html"),
      },
    },
  },
});
