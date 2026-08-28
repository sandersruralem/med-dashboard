import type * as Party from "partykit/server";
import {
  editorKeyFromSearch,
  initMessage,
  mapCorsHeaders,
  mapReadyOutbound,
  parseEditorInbound,
  resolveConnect,
  snapshotOutbound,
  validateMapPut,
} from "../server/liveRooms";
import type { LiveRole, MapMeta, ServerLiveMessage } from "../src/lib/liveProtocol";
import { isBoardSnapshot, isMapMeta } from "../src/lib/liveProtocol";
import {
  MAP_CHUNK_BYTES,
  MAP_META_STORAGE,
  asUint8,
  mapChunkCount,
  mapChunkKey,
  toArrayBuffer,
} from "../src/lib/mapShare";
import type { BoardSnapshot } from "../src/types";

const EDITOR_KEY_STORAGE = "editorKey";
const SNAPSHOT_STORAGE = "snapshot";

interface ConnectionState {
  role: LiveRole;
}

interface StoredMapMeta extends MapMeta {
  chunkCount?: number;
}

function send(connection: Party.Connection, message: ServerLiveMessage): void {
  connection.send(JSON.stringify(message));
}

function corsResponse(status: number, body: BodyInit | null = null, extra: HeadersInit = {}): Response {
  return new Response(body, { status, headers: { ...mapCorsHeaders(), ...extra } });
}

function isMapPath(pathname: string): boolean {
  return pathname.endsWith("/map") || pathname.endsWith("/map/");
}

export default class LiveBoardServer implements Party.Server {
  private editorKey: string | null = null;
  private snapshot: BoardSnapshot | null = null;
  private map: MapMeta | null = null;

  constructor(readonly room: Party.Room) {}

  async onStart(): Promise<void> {
    const stored = await this.room.storage.get<unknown>([EDITOR_KEY_STORAGE, SNAPSHOT_STORAGE, MAP_META_STORAGE]);
    const editorKey = stored.get(EDITOR_KEY_STORAGE);
    const snapshot = stored.get(SNAPSHOT_STORAGE);
    const map = stored.get(MAP_META_STORAGE);
    this.editorKey = typeof editorKey === "string" && editorKey.length > 0 ? editorKey : null;
    this.snapshot = isBoardSnapshot(snapshot) ? snapshot : null;
    this.map = isMapMeta(map) ? map : null;
  }

  async onConnect(connection: Party.Connection<ConnectionState>, context: Party.ConnectionContext): Promise<void> {
    const supplied = editorKeyFromSearch(new URL(context.request.url).searchParams);
    const { nextEditorKey, role } = resolveConnect(this.editorKey, supplied);
    if (nextEditorKey !== this.editorKey && nextEditorKey) {
      this.editorKey = nextEditorKey;
      await this.room.storage.put(EDITOR_KEY_STORAGE, nextEditorKey);
    }
    connection.setState({ role });
    send(connection, initMessage(role, this.snapshot, this.map));
  }

  async onMessage(message: string | ArrayBuffer | ArrayBufferView, sender: Party.Connection<ConnectionState>): Promise<void> {
    const parsed = parseEditorInbound(sender.state?.role ?? "viewer", message);
    if (!parsed.ok) {
      send(sender, { type: "error", message: parsed.message });
      return;
    }

    if (parsed.kind === "snapshot") {
      this.snapshot = parsed.snapshot;
      await this.room.storage.put(SNAPSHOT_STORAGE, parsed.snapshot);
      const outbound = snapshotOutbound(parsed.snapshot);
      for (const connection of this.room.getConnections<ConnectionState>()) {
        if (connection.state?.role === "viewer") connection.send(outbound);
      }
      return;
    }

    this.map = parsed.map;
    await this.room.storage.put(MAP_META_STORAGE, parsed.map);
    if (parsed.map.source === "bundled") await this.deleteMapChunks();
    const outbound = mapReadyOutbound(parsed.map);
    for (const connection of this.room.getConnections<ConnectionState>()) {
      if (connection.state?.role === "viewer") connection.send(outbound);
    }
  }

  async onRequest(req: Party.Request): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return corsResponse(204);

    if (!isMapPath(url.pathname)) return corsResponse(404, "Not found");

    if (req.method === "GET") {
      const bytes = await this.readMapBytes();
      if (!bytes) return corsResponse(404, "No shared map");
      return corsResponse(200, toArrayBuffer(bytes), {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
      });
    }

    if (req.method === "PUT") {
      const supplied = editorKeyFromSearch(url.searchParams);
      const raw = new Uint8Array(await req.arrayBuffer());
      const err = validateMapPut(this.editorKey, supplied, raw);
      if (err) return corsResponse(err.includes("Editor key") ? 403 : 400, err);
      const name = url.searchParams.get("name")?.trim() || "ops-map.pdf";
      const digest = await crypto.subtle.digest("SHA-256", raw);
      const sha256 = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
      await this.writeMapBytes(raw);
      const meta: MapMeta = {
        name: name.slice(0, 512),
        size: raw.byteLength,
        sha256,
        source: "bytes",
      };
      this.map = meta;
      await this.room.storage.put(MAP_META_STORAGE, { ...meta, chunkCount: mapChunkCount(raw.byteLength) });
      const outbound = mapReadyOutbound(meta);
      for (const connection of this.room.getConnections<ConnectionState>()) {
        if (connection.state?.role === "viewer") connection.send(outbound);
      }
      return corsResponse(204);
    }

    return corsResponse(405, "Method not allowed");
  }

  private async deleteMapChunks(): Promise<void> {
    const stored = await this.room.storage.get<unknown>(MAP_META_STORAGE);
    const count =
      stored && typeof stored === "object" && typeof (stored as StoredMapMeta).chunkCount === "number"
        ? (stored as StoredMapMeta).chunkCount
        : 0;
    if (!count) return;
    const keys = Array.from({ length: count }, (_, i) => mapChunkKey(i));
    await this.room.storage.delete(keys);
  }

  private async writeMapBytes(bytes: Uint8Array): Promise<void> {
    await this.deleteMapChunks();
    const count = mapChunkCount(bytes.byteLength);
    for (let i = 0; i < count; i++) {
      const slice = bytes.subarray(i * MAP_CHUNK_BYTES, (i + 1) * MAP_CHUNK_BYTES);
      await this.room.storage.put(mapChunkKey(i), toArrayBuffer(slice));
    }
  }

  private async readMapBytes(): Promise<Uint8Array | null> {
    const stored = await this.room.storage.get<unknown>(MAP_META_STORAGE);
    if (!isMapMeta(stored) || stored.source !== "bytes") return null;
    const storedCount = (stored as StoredMapMeta).chunkCount;
    const count = typeof storedCount === "number" ? storedCount : mapChunkCount(stored.size);
    const parts: Uint8Array[] = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
      const chunk = asUint8(await this.room.storage.get(mapChunkKey(i)));
      if (!chunk) return null;
      parts.push(chunk);
      total += chunk.byteLength;
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.byteLength;
    }
    return out;
  }
}

LiveBoardServer satisfies Party.Worker;
