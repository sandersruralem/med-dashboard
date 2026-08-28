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
  roomFromLocationHash,
  type LiveRole,
  type ServerLiveMessage,
} from "./lib/liveProtocol";
import { useStore } from "./store";
import type { BoardSnapshot } from "./types";

type ConnectionStatus = "local" | "connecting" | "connected" | "disconnected";

interface LiveRoom {
  roomId: string | null;
  role: LiveRole | null;
  status: ConnectionStatus;
  message: string | null;
  shareBoard: () => Promise<void>;
  copyViewerLink: () => Promise<void>;
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

async function lanIpv4(): Promise<string | null> {
  if (!isLoopback(window.location.hostname)) return window.location.hostname;
  try {
    const res = await fetch("/__lan");
    if (!res.ok) return null;
    const data = (await res.json()) as { host?: string | null };
    return typeof data.host === "string" && data.host ? data.host : null;
  } catch {
    return null;
  }
}

async function viewerUrl(roomId: string): Promise<string> {
  const url = new URL(window.location.href);
  const lan = await lanIpv4();
  if (lan) url.hostname = lan;
  url.hash = new URLSearchParams({ room: roomId }).toString();
  return url.toString();
}

function partySocketHost(lanIp: string | null): string {
  const configured = import.meta.env.VITE_PARTYKIT_HOST?.trim() ?? "";
  const stripped = configured.replace(/^https?:\/\//, "").replace(/^wss?:\/\//, "").replace(/\/+$/, "");
  const configuredName = stripped.split(":")[0] ?? "";
  if (stripped && !isLoopback(configuredName)) return stripped;
  if (import.meta.env.DEV) {
    const pageHost = window.location.hostname;
    const host = !isLoopback(pageHost) ? pageHost : lanIp ?? "localhost";
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

export function LiveRoomProvider({ children }: { children: ReactNode }) {
  const { snapshot, replaceRemoteSnapshot, setReadOnly } = useStore();
  const [roomId, setRoomId] = useState(roomFromHash);
  const [role, setRole] = useState<LiveRole | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>(roomId ? "connecting" : "local");
  const [message, setMessage] = useState<string | null>(null);
  const socketRef = useRef<PartySocket | null>(null);
  const snapshotRef = useRef(snapshot);
  const replaceRemoteRef = useRef(replaceRemoteSnapshot);
  const setReadOnlyRef = useRef(setReadOnly);
  const roleRef = useRef<LiveRole | null>(null);
  const receivedRemoteRef = useRef(false);

  snapshotRef.current = snapshot;
  replaceRemoteRef.current = replaceRemoteSnapshot;
  setReadOnlyRef.current = setReadOnly;
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
    let cancelled = false;
    let socket: PartySocket | null = null;

    void (async () => {
      const lan = await lanIpv4();
      if (cancelled) return;
      const host = partySocketHost(lan);
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
          return;
        }
        if (parsed.type === "snapshot" && roleRef.current === "viewer" && isBoardSnapshot(parsed.snapshot)) {
          receivedRemoteRef.current = true;
          replaceRemoteRef.current(parsed.snapshot);
          setStatus("connected");
        }
      });
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

  const copyViewerLink = useCallback(async () => {
    if (!roomId) return;
    try {
      const link = await viewerUrl(roomId);
      await copyText(link);
      setMessage(`Viewer link copied: ${link}`);
    } catch {
      setMessage("Could not copy automatically. Copy the LAN URL shown in the Vite terminal.");
    }
  }, [roomId]);

  const shareBoard = useCallback(async () => {
    const nextRoom = crypto.randomUUID();
    const editorKey = crypto.randomUUID();
    sessionStorage.setItem(`${LIVE_EDITOR_KEY_PREFIX}${nextRoom}`, editorKey);
    window.location.hash = new URLSearchParams({ room: nextRoom }).toString();
    try {
      const link = await viewerUrl(nextRoom);
      await copyText(link);
      setMessage(`Live viewer link copied: ${link}`);
    } catch {
      setMessage("Live board started. Copy the LAN IP URL for viewers.");
    }
  }, []);

  const value = useMemo<LiveRoom>(
    () => ({ roomId, role, status, message, shareBoard, copyViewerLink }),
    [roomId, role, status, message, shareBoard, copyViewerLink],
  );

  return <LiveRoomContext.Provider value={value}>{children}</LiveRoomContext.Provider>;
}

export function useLiveRoom(): LiveRoom {
  const context = useContext(LiveRoomContext);
  if (!context) throw new Error("useLiveRoom must be used inside LiveRoomProvider");
  return context;
}
