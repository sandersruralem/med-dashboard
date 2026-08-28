import {
  MAX_LIVE_MESSAGE_BYTES,
  isBoardSnapshot,
  isMapMeta,
  type LiveRole,
  type MapMeta,
  type ServerLiveMessage,
} from "../src/lib/liveProtocol";
import { MAX_MAP_BYTES, isPdfMagic } from "../src/lib/mapShare";
import type { BoardSnapshot } from "../src/types";

export interface LiveRoomState {
  editorKey: string | null;
  snapshot: BoardSnapshot | null;
  map: MapMeta | null;
  mapBytes: Uint8Array | null;
}

export function emptyLiveRoom(): LiveRoomState {
  return { editorKey: null, snapshot: null, map: null, mapBytes: null };
}

export function editorKeyFromSearch(search: string | URLSearchParams): string {
  const params = typeof search === "string" ? new URLSearchParams(search.startsWith("?") ? search : `?${search}`) : search;
  return params.get("editorKey")?.trim() ?? "";
}

export function roomIdFromPartyPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 3 || parts[0] !== "parties" || parts[1] !== "main") return null;
  const room = parts[2] ?? "";
  return /^[A-Za-z0-9_-]{1,128}$/.test(room) ? room : null;
}

export function roomIdFromPartyMapPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 4 || parts[0] !== "parties" || parts[1] !== "main" || parts[3] !== "map") return null;
  const room = parts[2] ?? "";
  return /^[A-Za-z0-9_-]{1,128}$/.test(room) ? room : null;
}

export function resolveConnect(editorKey: string | null, suppliedRaw: string): { nextEditorKey: string | null; role: LiveRole } {
  const supplied = suppliedRaw.trim();
  const nextEditorKey = !editorKey && supplied && supplied.length <= 512 ? supplied : editorKey;
  const role: LiveRole = supplied !== "" && supplied === nextEditorKey ? "editor" : "viewer";
  return { nextEditorKey, role };
}

export function initMessage(role: LiveRole, snapshot: BoardSnapshot | null, map: MapMeta | null = null): ServerLiveMessage {
  return { type: "init", role, snapshot, map };
}

export type EditorInbound =
  | { ok: true; kind: "snapshot"; snapshot: BoardSnapshot }
  | { ok: true; kind: "map"; map: MapMeta }
  | { ok: false; message: string };

export function parseEditorInbound(role: LiveRole, message: string | ArrayBuffer | ArrayBufferView): EditorInbound {
  if (role !== "editor") {
    return { ok: false, message: "Read-only connections cannot update this board." };
  }
  if (typeof message !== "string" || new TextEncoder().encode(message).byteLength > MAX_LIVE_MESSAGE_BYTES) {
    return { ok: false, message: "Live message is too large or invalid." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(message);
  } catch {
    return { ok: false, message: "Live message is malformed." };
  }
  if (parsed === null || typeof parsed !== "object") {
    return { ok: false, message: "Live message is malformed." };
  }
  const type = (parsed as { type?: unknown }).type;
  if (type === "snapshot" && isBoardSnapshot((parsed as { snapshot?: unknown }).snapshot)) {
    return { ok: true, kind: "snapshot", snapshot: (parsed as { snapshot: BoardSnapshot }).snapshot };
  }
  if (type === "map-ready" && isMapMeta((parsed as { map?: unknown }).map)) {
    return { ok: true, kind: "map", map: (parsed as { map: MapMeta }).map };
  }
  return { ok: false, message: "Live message is malformed." };
}

export function parseEditorSnapshot(
  role: LiveRole,
  message: string | ArrayBuffer | ArrayBufferView,
): { ok: true; snapshot: BoardSnapshot } | { ok: false; message: string } {
  const parsed = parseEditorInbound(role, message);
  if (!parsed.ok) return parsed;
  if (parsed.kind !== "snapshot") return { ok: false, message: "Live message is malformed." };
  return { ok: true, snapshot: parsed.snapshot };
}

export function snapshotOutbound(snapshot: BoardSnapshot): string {
  return JSON.stringify({ type: "snapshot", snapshot } satisfies ServerLiveMessage);
}

export function mapReadyOutbound(map: MapMeta): string {
  return JSON.stringify({ type: "map-ready", map } satisfies ServerLiveMessage);
}

export function errorOutbound(message: string): string {
  return JSON.stringify({ type: "error", message } satisfies ServerLiveMessage);
}

export function initOutbound(role: LiveRole, snapshot: BoardSnapshot | null, map: MapMeta | null = null): string {
  return JSON.stringify(initMessage(role, snapshot, map));
}

export function validateMapPut(
  editorKey: string | null,
  suppliedKey: string,
  bytes: Uint8Array,
): string | null {
  if (!editorKey || suppliedKey !== editorKey) return "Editor key is required to upload a map.";
  if (bytes.byteLength < 5 || bytes.byteLength > MAX_MAP_BYTES) return "Map file is missing or larger than 20 MB.";
  if (!isPdfMagic(bytes)) return "Map file must be a PDF.";
  return null;
}

export function mapCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}
