import type * as Party from "partykit/server";
import {
  MAX_LIVE_MESSAGE_BYTES,
  isBoardSnapshot,
  type ClientLiveMessage,
  type LiveRole,
  type ServerLiveMessage,
} from "../src/lib/liveProtocol";
import type { BoardSnapshot } from "../src/types";

const EDITOR_KEY_STORAGE = "editorKey";
const SNAPSHOT_STORAGE = "snapshot";

interface ConnectionState {
  role: LiveRole;
}

function send(connection: Party.Connection, message: ServerLiveMessage): void {
  connection.send(JSON.stringify(message));
}

export default class LiveBoardServer implements Party.Server {
  private editorKey: string | null = null;
  private snapshot: BoardSnapshot | null = null;

  constructor(readonly room: Party.Room) {}

  async onStart(): Promise<void> {
    const stored = await this.room.storage.get<unknown>([
      EDITOR_KEY_STORAGE,
      SNAPSHOT_STORAGE,
    ]);
    const editorKey = stored.get(EDITOR_KEY_STORAGE);
    const snapshot = stored.get(SNAPSHOT_STORAGE);
    this.editorKey = typeof editorKey === "string" && editorKey.length > 0 ? editorKey : null;
    this.snapshot = isBoardSnapshot(snapshot) ? snapshot : null;
  }

  async onConnect(connection: Party.Connection<ConnectionState>, context: Party.ConnectionContext): Promise<void> {
    const supplied = new URL(context.request.url).searchParams.get("editorKey")?.trim() ?? "";
    if (!this.editorKey && supplied && supplied.length <= 512) {
      this.editorKey = supplied;
      await this.room.storage.put(EDITOR_KEY_STORAGE, supplied);
    }

    const role: LiveRole = supplied !== "" && supplied === this.editorKey ? "editor" : "viewer";
    connection.setState({ role });
    send(connection, { type: "init", role, snapshot: this.snapshot });
  }

  async onMessage(message: string | ArrayBuffer | ArrayBufferView, sender: Party.Connection<ConnectionState>): Promise<void> {
    if (sender.state?.role !== "editor") {
      send(sender, { type: "error", message: "Read-only connections cannot update this board." });
      return;
    }
    if (typeof message !== "string" || new TextEncoder().encode(message).byteLength > MAX_LIVE_MESSAGE_BYTES) {
      send(sender, { type: "error", message: "Snapshot message is too large or invalid." });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(message);
    } catch {
      send(sender, { type: "error", message: "Snapshot message is malformed." });
      return;
    }
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      (parsed as { type?: unknown }).type !== "snapshot" ||
      !isBoardSnapshot((parsed as { snapshot?: unknown }).snapshot)
    ) {
      send(sender, { type: "error", message: "Snapshot message is malformed." });
      return;
    }

    const snapshot = (parsed as ClientLiveMessage).snapshot;
    this.snapshot = snapshot;
    await this.room.storage.put(SNAPSHOT_STORAGE, snapshot);
    const outbound = JSON.stringify({ type: "snapshot", snapshot } satisfies ServerLiveMessage);
    for (const connection of this.room.getConnections<ConnectionState>()) {
      if (connection.state?.role === "viewer") connection.send(outbound);
    }
  }
}

LiveBoardServer satisfies Party.Worker;
