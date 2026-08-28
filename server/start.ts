import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { lanIPv4 } from "./lanHost";
import { DEFAULT_LAN_PORT, LAN_PORT_TRIES, startLanServer } from "./lanServer";

const here = __dirname;
const distDir = path.join(here, "dist");

function openBrowser(url: string): void {
  spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
}

async function main(): Promise<void> {
  if (!fs.existsSync(path.join(distDir, "index.html"))) {
    throw new Error(`Board files are missing next to the server (${distDir}). Copy the whole MedBoard-LAN folder.`);
  }

  const lan = await startLanServer({
    distDir,
    port: DEFAULT_LAN_PORT,
    portTries: LAN_PORT_TRIES,
    live: "same-origin",
  });
  const local = `http://127.0.0.1:${lan.port}/`;
  const host = await lanIPv4();
  const remote = host ? `http://${host}:${lan.port}/` : `${local}  (no private IPv4 found)`;

  console.log("Resource board");
  console.log(`This computer: ${local}`);
  console.log(`LAN viewers:   ${remote}`);
  console.log("In the browser, use Share board to copy the viewer link and QR.");
  console.log("Ctrl+C or close this window to stop.");
  openBrowser(host ? remote : local);

  const stop = async () => {
    await lan.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void stop());
  process.on("SIGTERM", () => void stop());
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
