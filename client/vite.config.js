import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const src = (p) => fileURLToPath(new URL(`./src/${p}`, import.meta.url));

// Aliases preserve the absolute-from-src imports enabled by jsconfig.json's baseUrl.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      components: src("components"),
      scenes: src("scenes"),
      state: src("state"),
      theme: src("theme.js"),
      utils: src("utils"),
    },
  },
  server: {
    port: 3000,
  },
});
