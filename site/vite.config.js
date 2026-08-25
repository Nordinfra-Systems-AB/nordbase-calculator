import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        resources: resolve(__dirname, "resources.html"),
        partners: resolve(__dirname, "partners.html"),
        product: resolve(__dirname, "product.html"),
        installation: resolve(__dirname, "installation.html"),
      },
    },
  },
});
