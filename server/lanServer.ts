import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { WebSocket, WebSocketServer } from "ws";
import { lanIPv4 } from "./lanHost";
import {
  editorKeyFromSearch,
  emptyLiveRoom,
  errorOutbound,
  initOutbound,
  mapCorsHeaders,
  mapReadyOutbound,
  parseEditorInbound,
  resolveConnect,
  roomIdFromPartyMapPath,
  roomIdFromPartyPath,
  snapshotOutbound,
  validateMapPut,
  type LiveRoomState,
} from "./liveRooms";
import type { LiveRole, MapMeta } from "../src/lib/liveProtocol";
import { MAX_MAP_BYTES } from "../src/lib/mapShare";

export const DEFAULT_LAN_PORT = 8787;
export const LAN_PORT_TRIES = 10;

export type LanLiveMode = "same-origin" | "partykit-dev";

interface RoomConnection {
  socket: WebSocket;
  role: LiveRole;
}

const MIME: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export interface LanServerOptions {
  distDir: string;
  port?: number;
  portTries?: number;
  live?: LanLiveMode;
}

export interface LanServer {
  port: number;
  close: () => Promise<void>;
}

function safeFile(distDir: string, urlPath: string): string | null {
  const decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const rel = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const file = path.resolve(distDir, rel);
  const root = path.resolve(distDir);
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  return file;
}

function socketMessage(data: WebSocket.RawData): string {
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return Buffer.concat(data).toString();
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString();
  return data.toString();
}

function sendFile(res: http.ServerResponse, file: string): void {
  const ext = path.extname(file).toLowerCase();
  res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
  res.end(fs.readFileSync(file));
}

function isAddrInUse(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "EADDRINUSE");
}

function writeCors(res: http.ServerResponse, status: number, body?: string | Buffer, extra?: Record<string, string>): void {
  res.statusCode = status;
  for (const [key, value] of Object.entries({ ...mapCorsHeaders(), ...extra })) {
    res.setHeader(key, value);
  }
  res.end(body);
}

function readBody(req: http.IncomingMessage, maxBytes: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        req.destroy();
        reject(new Error("too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    req.on("error", reject);
  });
}

async function sha256HexNode(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function broadcastViewers(
  connections: Map<string, Set<RoomConnection>>,
  roomId: string,
  payload: string,
): void {
  for (const other of connections.get(roomId) ?? []) {
    if (other.role === "viewer" && other.socket.readyState === WebSocket.OPEN) {
      other.socket.send(payload);
    }
  }
}

function listen(server: http.Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (err: Error) => {
      server.off("listening", onListening);
      reject(err);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "0.0.0.0");
  });
}

export async function startLanServer(options: LanServerOptions): Promise<LanServer> {
  const distDir = path.resolve(options.distDir);
  const preferred = options.port ?? DEFAULT_LAN_PORT;
  const tries = Math.max(1, options.portTries ?? 1);
  const live = options.live ?? "same-origin";
  const rooms = new Map<string, LiveRoomState>();
  const connections = new Map<string, Set<RoomConnection>>();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://lan.local");
    const urlPath = url.pathname;
    const mapRoom = roomIdFromPartyMapPath(urlPath);
    if (mapRoom) {
      if (req.method === "OPTIONS") {
        writeCors(res, 204);
        return;
      }
      if (req.method === "GET") {
        const state = rooms.get(mapRoom);
        if (!state?.mapBytes || state.map?.source !== "bytes") {
          writeCors(res, 404, "No shared map");
          return;
        }
        writeCors(res, 200, Buffer.from(state.mapBytes), {
          "Content-Type": "application/pdf",
          "Cache-Control": "no-store",
        });
        return;
      }
      if (req.method === "PUT") {
        void (async () => {
          try {
            const bytes = await readBody(req, MAX_MAP_BYTES + 1);
            const state = rooms.get(mapRoom) ?? emptyLiveRoom();
            const err = validateMapPut(state.editorKey, editorKeyFromSearch(url.searchParams), bytes);
            if (err) {
              writeCors(res, err.includes("Editor key") ? 403 : 400, err);
              return;
            }
            const name = (url.searchParams.get("name")?.trim() || "ops-map.pdf").slice(0, 512);
            const meta: MapMeta = {
              name,
              size: bytes.byteLength,
              sha256: await sha256HexNode(bytes),
              source: "bytes",
            };
            state.map = meta;
            state.mapBytes = bytes;
            rooms.set(mapRoom, state);
            broadcastViewers(connections, mapRoom, mapReadyOutbound(meta));
            writeCors(res, 204);
          } catch {
            writeCors(res, 400, "Map upload failed.");
          }
        })();
        return;
      }
      writeCors(res, 405, "Method not allowed");
      return;
    }

    if (urlPath === "/__lan") {
      void lanIPv4()
        .then((host) => {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ host, live }));
        })
        .catch(() => {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ host: null, live }));
        });
      return;
    }

    const file = safeFile(distDir, urlPath);
    if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
      sendFile(res, file);
      return;
    }

    const index = path.join(distDir, "index.html");
    if (fs.existsSync(index)) {
      sendFile(res, index);
      return;
    }

    res.statusCode = 404;
    res.end("Not found");
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", "http://lan.local");
    const roomId = roomIdFromPartyPath(url.pathname);
    if (!roomId) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      const state = rooms.get(roomId) ?? emptyLiveRoom();
      const supplied = editorKeyFromSearch(url.searchParams);
      const { nextEditorKey, role } = resolveConnect(state.editorKey, supplied);
      state.editorKey = nextEditorKey;
      rooms.set(roomId, state);

      const peer: RoomConnection = { socket: ws, role };
      const peers = connections.get(roomId) ?? new Set<RoomConnection>();
      peers.add(peer);
      connections.set(roomId, peers);

      ws.send(initOutbound(role, state.snapshot, state.map));

      ws.on("message", (data) => {
        const current = rooms.get(roomId) ?? state;
        const parsed = parseEditorInbound(role, socketMessage(data));
        if (!parsed.ok) {
          ws.send(errorOutbound(parsed.message));
          return;
        }
        if (parsed.kind === "snapshot") {
          current.snapshot = parsed.snapshot;
          rooms.set(roomId, current);
          broadcastViewers(connections, roomId, snapshotOutbound(parsed.snapshot));
          return;
        }
        current.map = parsed.map;
        if (parsed.map.source === "bundled") current.mapBytes = null;
        rooms.set(roomId, current);
        broadcastViewers(connections, roomId, mapReadyOutbound(parsed.map));
      });

      ws.on("close", () => {
        peers.delete(peer);
        if (peers.size === 0) connections.delete(roomId);
      });
    });
  });

  let bound = preferred;
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    const port = preferred + i;
    try {
      await listen(server, port);
      bound = port;
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      if (!isAddrInUse(err)) break;
    }
  }
  if (lastErr) {
    server.close();
    throw lastErr;
  }

  return {
    port: bound,
    close() {
      return new Promise((done, fail) => {
        for (const peers of connections.values()) {
          for (const peer of peers) peer.socket.close();
        }
        connections.clear();
        wss.close();
        server.close((err) => (err ? fail(err) : done()));
      });
    },
  };
}
