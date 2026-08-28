import PartySocket from "partysocket";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  EMPTY_BOARD_SNAPSHOT,
  LIVE_EDITOR_KEY_PREFIX,
  MAX_LIVE_MESSAGE_BYTES,
  isBoardSnapshot,
  isMapMeta,
  roomFromLocationHash,
  type LiveRole,
  type MapMeta,
  type ServerLiveMessage,
} from "./lib/liveProtocol";
import { BUNDLED_GEOPDF_NAME, loadBundledGeopdfBytes, overlayFileFromBytes } from "./lib/bundledGeopdf";
import { loadGeopdf } from "./lib/loadGeopdf";
import { toArrayBuffer } from "./lib/mapShare";
import { useStore } from "./store";
import type { BoardSnapshot } from "./types";

type ConnectionStatus = "local" | "connecting" | "connected" | "disconnected";

interface LiveRoom {
  roomId: string | null;
  role: LiveRole | null;
  status: ConnectionStatus;
  message: string | null;
  viewerLink: string | null;
  shareBoard: () => Promise<void>;
  copyViewerLink: () => Promise<void>;
  dismissViewerLink: () => void;
}

const LiveRoomContext = createContext<LiveRoom | null>(null);
const PUSH_DEBOUNCE_MS = 350;

function roomFromHash(): string | null {
  return roomFromLocationHash(window.location.hash);
}

function isLoopback(host: string): boolean {
  const name = host.replace(/^\[|\]$/g, "").split("%")[0] ?? host;
  return name === "localhost" || name === "127.0.0.1" || name === "::1" || name === "0.0.0.0";
}

type LanLiveMode = "same-origin" | "partykit-dev";

interface LanInfo {
  host: string | null;
  live?: LanLiveMode;
}

async function fetchLanInfo(): Promise<LanInfo> {
  try {
    const res = await fetch("/__lan");
    if (!res.ok) return { host: null };
    const data = (await res.json()) as { host?: string | null; live?: string };
    const host = typeof data.host === "string" && data.host ? data.host : null;
    const live = data.live === "same-origin" || data.live === "partykit-dev" ? data.live : undefined;
    return { host, live };
  } catch {
    return { host: null };
  }
}

async function lanInfo(): Promise<LanInfo> {
  const info = await fetchLanInfo();
  const host = info.host && !isLoopback(info.host) ? info.host : null;
  if (host) return { host, live: info.live };
  if (!isLoopback(window.location.hostname)) return { host: window.location.hostname, live: info.live };
  return { host: null, live: info.live };
}

async function viewerUrl(roomId: string): Promise<string | null> {
  const url = new URL(window.location.href);
  const info = await lanInfo();
  if (info.host) url.hostname = info.host;
  url.hash = new URLSearchParams({ room: roomId }).toString();
  if (isLoopback(url.hostname)) return null;
  return url.toString();
}

function partySocketHost(info: LanInfo): string {
  if (info.live === "same-origin") return window.location.host;
  const configured = import.meta.env.VITE_PARTYKIT_HOST?.trim() ?? "";
  const stripped = configured.replace(/^https?:\/\//, "").replace(/^wss?:\/\//, "").replace(/\/+$/, "");
  const configuredName = stripped.split(":")[0] ?? "";
  if (stripped && !isLoopback(configuredName)) return stripped;
  if (import.meta.env.DEV || info.live === "partykit-dev") {
    const pageHost = window.location.hostname;
    const host = !isLoopback(pageHost) ? pageHost : info.host ?? "localhost";
    return `${host}:1999`;
  }
  return stripped;
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

function snapshotMessage(snapshot: BoardSnapshot): string | null {
  const payload = JSON.stringify({ type: "snapshot", snapshot });
  return new TextEncoder().encode(payload).byteLength <= MAX_LIVE_MESSAGE_BYTES ? payload : null;
}

function liveMapHttpUrl(partyHost: string, roomId: string, query?: Record<string, string>): string {
  const path = `/parties/main/${roomId}/map`;
  const qs = query && Object.keys(query).length > 0 ? `?${new URLSearchParams(query).toString()}` : "";
  if (partyHost === window.location.host) return `${window.location.origin}${path}${qs}`;
  const name = partyHost.split(":")[0] ?? partyHost;
  const local = name === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(name);
  return `${local ? "http:" : "https:"}//${partyHost}${path}${qs}`;
}

function mapReadyMessage(map: MapMeta): string {
  return JSON.stringify({ type: "map-ready", map });
}

async function loadSharedMapBytes(meta: MapMeta, partyHost: string, roomId: string): Promise<Uint8Array> {
  if (meta.source === "bundled") return loadBundledGeopdfBytes();
  const res = await fetch(liveMapHttpUrl(partyHost, roomId));
  if (!res.ok) throw new Error("Shared map is unavailable.");
  return new Uint8Array(await res.arrayBuffer());
}

export function LiveRoomProvider({ children }: { children: ReactNode }) {
  const { snapshot, overlay, overlayFile, replaceRemoteSnapshot, setReadOnly, setOverlay, setPdfBusy } = useStore();
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;
  const [roomId, setRoomId] = useState(roomFromHash);
  const [role, setRole] = useState<LiveRole | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>(roomId ? "connecting" : "local");
  const [message, setMessage] = useState<string | null>(null);
  const [viewerLink, setViewerLink] = useState<string | null>(null);
  const socketRef = useRef<PartySocket | null>(null);
  const snapshotRef = useRef(snapshot);
  const overlayFileRef = useRef(overlayFile);
  const replaceRemoteRef = useRef(replaceRemoteSnapshot);
  const setReadOnlyRef = useRef(setReadOnly);
  const setOverlayRef = useRef(setOverlay);
  const setPdfBusyRef = useRef(setPdfBusy);
  const roleRef = useRef<LiveRole | null>(null);
  const receivedRemoteRef = useRef(false);
  const publishedShaRef = useRef<string | null>(null);
  const appliedShaRef = useRef<string | null>(null);
  const partyHostRef = useRef<string | null>(null);

  snapshotRef.current = snapshot;
  overlayFileRef.current = overlayFile;
  replaceRemoteRef.current = replaceRemoteSnapshot;
  setReadOnlyRef.current = setReadOnly;
  setOverlayRef.current = setOverlay;
  setPdfBusyRef.current = setPdfBusy;
  roleRef.current = role;

  useEffect(() => {
    const onHashChange = () => setRoomId(roomFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    socketRef.current?.close();
    socketRef.current = null;
    setRole(null);
    setMessage(null);

    if (!roomId) {
      receivedRemoteRef.current = false;
      setReadOnlyRef.current(false);
      setStatus("local");
      return;
    }

    receivedRemoteRef.current = false;
    publishedShaRef.current = null;
    appliedShaRef.current = null;
    partyHostRef.current = null;
    setStatus("connecting");
    const editorKey = sessionStorage.getItem(`${LIVE_EDITOR_KEY_PREFIX}${roomId}`);
    // Editors keep working locally until init assigns a role. Viewers lock and
    // hide the last local board so it cannot look like the live incident.
    if (editorKey) {
      setReadOnlyRef.current(false);
    } else {
      setReadOnlyRef.current(true);
      replaceRemoteRef.current(EMPTY_BOARD_SNAPSHOT);
    }
    const liveRoom: string = roomId;
    let cancelled = false;
    let socket: PartySocket | null = null;

    void (async () => {
      const info = await lanInfo();
      if (cancelled) return;
      const host = partySocketHost(info);
      partyHostRef.current = host || null;
      if (!host) {
        setStatus("disconnected");
        setMessage("Live host is not configured.");
        return;
      }

      socket = new PartySocket({
        host,
        room: roomId,
        query: editorKey ? { editorKey } : undefined,
      });
      if (cancelled) {
        socket.close();
        return;
      }
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        setStatus("connecting");
        setMessage(null);
      });
      socket.addEventListener("close", () => {
        if (cancelled) return;
        setStatus("disconnected");
        setMessage(
          receivedRemoteRef.current
            ? "Disconnected — showing the last received board."
            : "Disconnected — live board is unavailable.",
        );
      });
      socket.addEventListener("error", () => {
        if (cancelled) return;
        setStatus("disconnected");
        setMessage(
          receivedRemoteRef.current
            ? "Live connection error — showing the last board."
            : "Live connection error — live board is unavailable.",
        );
      });
      socket.addEventListener("message", (event) => {
        if (typeof event.data !== "string") return;
        let parsed: ServerLiveMessage;
        try {
          parsed = JSON.parse(event.data) as ServerLiveMessage;
        } catch {
          return;
        }
        if (parsed.type === "error") {
          setMessage(parsed.message);
          return;
        }
        if (parsed.type === "init") {
          setRole(parsed.role);
          roleRef.current = parsed.role;
          setReadOnlyRef.current(parsed.role === "viewer");
          setStatus("connected");
          setMessage(null);
          if (parsed.role === "editor") {
            window.setTimeout(() => {
              if (socket?.readyState === WebSocket.OPEN) {
                const payload = snapshotMessage(snapshotRef.current);
                if (payload) socket.send(payload);
                else setMessage("Board is too large to send to live viewers.");
              }
            }, 0);
          } else if (parsed.snapshot && isBoardSnapshot(parsed.snapshot)) {
            receivedRemoteRef.current = true;
            replaceRemoteRef.current(parsed.snapshot);
          } else if (parsed.role === "viewer") {
            receivedRemoteRef.current = true;
            replaceRemoteRef.current(EMPTY_BOARD_SNAPSHOT);
          }
          if (parsed.role === "viewer" && parsed.map && isMapMeta(parsed.map)) {
            void applyViewerMap(parsed.map);
          }
          return;
        }
        if (parsed.type === "snapshot" && roleRef.current === "viewer" && isBoardSnapshot(parsed.snapshot)) {
          receivedRemoteRef.current = true;
          replaceRemoteRef.current(parsed.snapshot);
          setStatus("connected");
        }
        if (parsed.type === "map-ready" && roleRef.current === "viewer" && isMapMeta(parsed.map)) {
          void applyViewerMap(parsed.map);
        }
      });

      async function applyViewerMap(meta: MapMeta) {
        if (appliedShaRef.current === meta.sha256) return;
        const host = partyHostRef.current;
        if (!host) return;
        setPdfBusyRef.current(true);
        try {
          const bytes = await loadSharedMapBytes(meta, host, liveRoom);
          const loaded = await loadGeopdf(bytes, meta.name || BUNDLED_GEOPDF_NAME);
          const file = await overlayFileFromBytes(bytes, meta.name || BUNDLED_GEOPDF_NAME);
          setOverlayRef.current(loaded, null, file);
          appliedShaRef.current = meta.sha256;
        } catch (err) {
          setOverlayRef.current(overlayRef.current, err instanceof Error ? err.message : "Shared map is unavailable.");
        } finally {
          setPdfBusyRef.current(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      socket?.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId || role !== "editor") return;
    const timer = window.setTimeout(() => {
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        const payload = snapshotMessage(snapshot);
        if (payload) socket.send(payload);
        else setMessage("Board is too large to send to live viewers.");
      }
    }, PUSH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [roomId, role, snapshot]);

  useEffect(() => {
    if (!roomId || role !== "editor" || !overlayFile) return;
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN) return;
    if (publishedShaRef.current === overlayFile.sha256) return;
    const editorKey = sessionStorage.getItem(`${LIVE_EDITOR_KEY_PREFIX}${roomId}`) ?? "";
    const file = overlayFile;
    let cancelled = false;
    void (async () => {
      try {
        const host = partyHostRef.current ?? partySocketHost(await lanInfo());
        if (!host || cancelled) return;
        partyHostRef.current = host;
        if (file.source === "bytes") {
          const url = liveMapHttpUrl(host, roomId, { editorKey, name: file.name });
          const res = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/pdf" },
            body: new Blob([toArrayBuffer(file.bytes)], { type: "application/pdf" }),
          });
          if (!res.ok) throw new Error((await res.text()) || "Could not share the map file.");
        }
        if (cancelled || socket.readyState !== WebSocket.OPEN) return;
        const meta: MapMeta = { name: file.name, size: file.size, sha256: file.sha256, source: file.source };
        socket.send(mapReadyMessage(meta));
        publishedShaRef.current = file.sha256;
      } catch (err) {
        if (!cancelled) setMessage(err instanceof Error ? err.message : "Could not share the map file.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, role, overlayFile]);

  const copyViewerLink = useCallback(async () => {
    if (!roomId) return;
    const link = await viewerUrl(roomId);
    if (!link) {
      setViewerLink(null);
      setMessage("No LAN IP — connect this computer to the incident Wi-Fi/Ethernet.");
      return;
    }
    setViewerLink(link);
    try {
      await copyText(link);
      setMessage(`Viewer link copied: ${link}`);
    } catch {
      setMessage("Could not copy automatically. Use the link or QR below.");
    }
  }, [roomId]);

  const shareBoard = useCallback(async () => {
    const nextRoom = crypto.randomUUID();
    const editorKey = crypto.randomUUID();
    sessionStorage.setItem(`${LIVE_EDITOR_KEY_PREFIX}${nextRoom}`, editorKey);
    window.location.hash = new URLSearchParams({ room: nextRoom }).toString();
    const link = await viewerUrl(nextRoom);
    if (!link) {
      setViewerLink(null);
      setMessage("No LAN IP — connect this computer to the incident Wi-Fi/Ethernet.");
      return;
    }
    setViewerLink(link);
    try {
      await copyText(link);
      setMessage(`Live viewer link copied: ${link}`);
    } catch {
      setMessage("Could not copy automatically. Use the link or QR below.");
    }
  }, []);

  const dismissViewerLink = useCallback(() => setViewerLink(null), []);

  const value = useMemo<LiveRoom>(
    () => ({ roomId, role, status, message, viewerLink, shareBoard, copyViewerLink, dismissViewerLink }),
    [roomId, role, status, message, viewerLink, shareBoard, copyViewerLink, dismissViewerLink],
  );

  return <LiveRoomContext.Provider value={value}>{children}</LiveRoomContext.Provider>;
}

export function useLiveRoom(): LiveRoom {
  const context = useContext(LiveRoomContext);
  if (!context) throw new Error("useLiveRoom must be used inside LiveRoomProvider");
  return context;
}
