// @ts-nocheck
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { lanIPv4 } from "./server/lanHost";

function lanHost(): Plugin {
  const handle = (req, res, next) => {
    if (req.url?.split("?")[0] !== "/__lan") {
      next();
      return;
    }
    void lanIPv4().then((host) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ host, live: "partykit-dev" }));
    });
  };
  return {
    name: "lan-host",
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}

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
  plugins: [react(), lanHost(), pdfjsWasm()],
  assetsInclude: ["**/*.pdf"],
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
});
