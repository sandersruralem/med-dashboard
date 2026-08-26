// @ts-nocheck
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

function pdfjsWasm(): Plugin {
  const src = path.resolve("node_modules/pdfjs-dist/wasm");
  return {
    name: "pdfjs-wasm",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/pdfjs-wasm/")) {
          next();
          return;
        }
        const rel = decodeURIComponent(req.url.slice("/pdfjs-wasm/".length).split("?")[0] ?? "");
        const file = path.resolve(src, rel);
        if (!file.startsWith(src) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
          next();
          return;
        }
        const ext = path.extname(file);
        res.setHeader("Content-Type", ext === ".wasm" ? "application/wasm" : "text/javascript");
        res.end(fs.readFileSync(file));
      });
    },
    closeBundle() {
      const dest = path.resolve("dist/pdfjs-wasm");
      if (fs.existsSync(src)) {
        fs.cpSync(src, dest, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), pdfjsWasm()],
  assetsInclude: ["**/*.pdf"],
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
});
