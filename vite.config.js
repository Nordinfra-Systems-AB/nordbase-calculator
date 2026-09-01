import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    // Allow the dev server to read ../shared/chargerData.js (single source
    // of truth for charger data, shared with site/) — this app's src/ files
    // now import from one directory above the project root. Doesn't affect
    // `npm run build`, only `npm run dev`.
    fs: { allow: [resolve(__dirname, ".."), resolve(__dirname, ".")] },
  },
});
