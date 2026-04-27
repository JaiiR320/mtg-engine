import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: ["mtg-engineweb-production.up.railway.app"],
  },
  resolve: {
    alias: {
      "@mtg-engine/core": fileURLToPath(
        new URL("../../packages/core/src/index.ts", import.meta.url),
      ),
      "@mtg-engine/schemas": fileURLToPath(
        new URL("../../packages/schemas/src/index.ts", import.meta.url),
      ),
    },
  },
});
