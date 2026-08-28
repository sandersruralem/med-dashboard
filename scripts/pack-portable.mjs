import { spawnSync } from "node:child_process";
import { createWriteStream, copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Pinned official Node for Windows x64. Keep in sync with docs/HOSTING.md. */
export const NODE_VERSION = "22.18.0";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = path.join(root, ".cache", "node-win-x64");
const zipName = `node-v${NODE_VERSION}-win-x64.zip`;
const zipUrl = `https://nodejs.org/dist/v${NODE_VERSION}/${zipName}`;
const extractName = `node-v${NODE_VERSION}-win-x64`;
const outDir = path.join(root, "release", "MedBoard-LAN");
const zipOut = path.join(root, "release", "MedBoard-LAN-portable.zip");

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: false });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed (${result.status ?? "spawn error"})`);
  }
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const loc = res.headers.location;
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && loc) {
          res.resume();
          download(new URL(loc, url).href, dest).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Download failed: ${res.statusCode} ${url}`));
          return;
        }
        const out = createWriteStream(dest);
        res.pipe(out);
        out.on("finish", () => out.close((err) => (err ? reject(err) : resolve())));
        out.on("error", reject);
      })
      .on("error", reject);
  });
}

function startCmd() {
  return [
    "@echo off",
    "cd /d \"%~dp0\"",
    "title Resource board",
    "echo Starting the resource board...",
    "node.exe server.cjs",
    "if errorlevel 1 pause",
    "",
  ].join("\r\n");
}

async function main() {
  mkdirSync(cacheDir, { recursive: true });
  const zipPath = path.join(cacheDir, zipName);
  if (!existsSync(zipPath)) {
    console.log(`Downloading official Node ${NODE_VERSION} win-x64…`);
    await download(zipUrl, zipPath);
  } else {
    console.log(`Using cached ${zipName}`);
  }

  const extractDir = path.join(cacheDir, extractName);
  const extractedExe = path.join(extractDir, "node.exe");
  if (!existsSync(extractedExe)) {
    rmSync(extractDir, { recursive: true, force: true });
    mkdirSync(extractDir, { recursive: true });
    run("tar", ["-xf", zipPath, "-C", cacheDir]);
  }
  if (!existsSync(extractedExe)) {
    throw new Error(`node.exe missing after extract: ${extractedExe}`);
  }

  const distDir = path.join(root, "dist");
  if (!existsSync(path.join(distDir, "index.html"))) {
    throw new Error("dist/ is missing. Run npm run build first.");
  }

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  run(process.execPath, [
    path.join(root, "node_modules", "esbuild", "bin", "esbuild"),
    path.join(root, "server", "start.ts"),
    "--bundle",
    "--platform=node",
    "--format=cjs",
    `--outfile=${path.join(outDir, "server.cjs")}`,
  ]);

  copyFileSync(extractedExe, path.join(outDir, "node.exe"));
  const nodeLicense = path.join(extractDir, "LICENSE");
  if (existsSync(nodeLicense)) {
    copyFileSync(nodeLicense, path.join(outDir, "LICENSE-NODE.txt"));
  }
  cpSync(distDir, path.join(outDir, "dist"), { recursive: true });
  writeFileSync(path.join(outDir, "Start-MedBoard.cmd"), startCmd());

  rmSync(zipOut, { force: true });
  run("tar", ["-a", "-cf", zipOut, "-C", path.join(root, "release"), "MedBoard-LAN"]);

  console.log(`USB folder: ${outDir}`);
  console.log(`Zip:        ${zipOut}`);
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
