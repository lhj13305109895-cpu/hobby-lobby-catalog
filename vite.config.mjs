import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const seoScript = fileURLToPath(new URL("./scripts/generate-seo-pages.mjs", import.meta.url));

export default defineConfig({
  build: {
    outDir: "dist/client",
    rollupOptions: {
      input: [
        fileURLToPath(new URL("./index.html", import.meta.url)),
        fileURLToPath(new URL("./photo-number/index.html", import.meta.url)),
      ],
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [
    react(),
    {
      name: "catalogue-seo-pages",
      apply: "build",
      buildStart() {
        execFileSync(process.execPath, [seoScript, "--public"], { stdio: "inherit" });
      },
      writeBundle() {
        execFileSync(process.execPath, [seoScript, "--dist"], { stdio: "inherit" });
      },
    },
  ],
});
