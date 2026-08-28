import { IncidentMap } from "./components/IncidentMap";
import { PointReview } from "./components/PointReview";
import { ResourceTable } from "./components/ResourceTable";
import { StoreProvider } from "./store";
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { LiveRoomProvider, useLiveRoom } from "./live";
import { useStore } from "./store";

const MIN = 32;
const MAX = 78;

function BoardApp() {
  const [mapPct, setMapPct] = useState(67);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const { readOnly } = useStore();
  const { roomId, role, status, message, shareBoard, copyViewerLink } = useLiveRoom();

  const onSplitPointerDown = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const box = workspaceRef.current?.getBoundingClientRect();
      if (!box) return;
      const stacked = box.width < 960;
      const raw = stacked
        ? ((ev.clientY - box.top) / box.height) * 100
        : ((ev.clientX - box.left) / box.width) * 100;
      setMapPct(Math.min(MAX, Math.max(MIN, raw)));
    };

    const onUp = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      window.dispatchEvent(new Event("resize"));
    };

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
  }, []);

  return (
    <div className="app">
        <header className="app-bar">
          <div>
            <p className="eyebrow">Wildfire medical tracker</p>
            <h1>Resource board</h1>
          </div>
          <div className="live-controls">
            {!readOnly ? (
              <button type="button" className="btn" onClick={() => void shareBoard()}>
                Share board
              </button>
            ) : null}
            {roomId ? (
              <button type="button" className="btn" onClick={() => void copyViewerLink()}>
                Copy viewer link
              </button>
            ) : null}
            <span className={`live-status ${status}`}>
              {status === "local"
                ? "Local"
                : status === "connected"
                  ? `Live · ${role ?? "connected"}`
                  : status === "connecting"
                    ? "Live · connecting"
                    : "Live · disconnected"}
            </span>
            {message ? <span className="live-message">{message}</span> : null}
          </div>
        </header>
        {readOnly ? <div className="read-only-banner">Live view — read only</div> : null}
        <div
          ref={workspaceRef}
          className="workspace"
          style={{ ["--map-pct" as string]: `${mapPct}%` }}
        >
          <IncidentMap />
          <button
            type="button"
            className="workspace-split"
            aria-label="Resize map and table"
            aria-orientation="vertical"
            aria-valuemin={MIN}
            aria-valuemax={MAX}
            aria-valuenow={Math.round(mapPct)}
            onPointerDown={onSplitPointerDown}
          />
          <aside className="table-pane">
            <PointReview />
            <ResourceTable />
          </aside>
        </div>
    </div>
  );
}

export function App() {
  return (
    <StoreProvider>
      <LiveRoomProvider>
        <BoardApp />
      </LiveRoomProvider>
    </StoreProvider>
  );
}
