import { app, BrowserWindow, dialog } from "electron";
import path from "node:path";
import { lanIPv4 } from "../server/lanHost";
import { DEFAULT_LAN_PORT, LAN_PORT_TRIES, startLanServer, type LanServer } from "../server/lanServer";

const here = __dirname;

function distDir(): string {
  return app.isPackaged ? path.join(app.getAppPath(), "dist") : path.join(here, "..", "dist");
}

function preloadPath(): string {
  return path.join(here, "preload.cjs");
}

let lan: LanServer | null = null;
let mainWindow: BrowserWindow | null = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
  app.whenReady().then(() => void start());
}

async function createWindow(url: string): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "Resource board",
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  await mainWindow.loadURL(url);
}

async function start(): Promise<void> {
  const root = distDir();
  try {
    lan = await startLanServer({
      distDir: root,
      port: DEFAULT_LAN_PORT,
      portTries: LAN_PORT_TRIES,
      live: "same-origin",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start the LAN server.";
    await dialog.showErrorBox(
      "MedBoard LAN",
      `Could not listen on ports ${DEFAULT_LAN_PORT}–${DEFAULT_LAN_PORT + LAN_PORT_TRIES - 1}. ${message}`,
    );
    app.quit();
    return;
  }
  const host = await lanIPv4();
  const url = host ? `http://${host}:${lan.port}/` : `http://127.0.0.1:${lan.port}/`;
  await createWindow(url);
}

app.on("window-all-closed", () => {
  void (async () => {
    if (lan) {
      await lan.close();
      lan = null;
    }
    app.quit();
  })();
});
