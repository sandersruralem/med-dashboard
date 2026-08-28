// @ts-nocheck
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function lanIPv4(): string | null {
  const found: string[] = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      const family = addr.family === "IPv4" || addr.family === 4;
      if (!family || addr.internal) continue;
      found.push(addr.address);
    }
  }
  const privateLan = found.filter(
    (ip) => ip.startsWith("192.168.") || ip.startsWith("10.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip),
  );
  return privateLan[0] ?? found[0] ?? null;
}

function lanHost(): Plugin {
  const handle = (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (b: string) => void }, next: () => void) => {
    if (req.url?.split("?")[0] !== "/__lan") {
      next();
      return;
    }
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ host: lanIPv4() }));
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
