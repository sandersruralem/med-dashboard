import { IncidentMap } from "./components/IncidentMap";
import { PointReview } from "./components/PointReview";
import { ResourceTable } from "./components/ResourceTable";
import { StoreProvider } from "./store";
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const MIN = 32;
const MAX = 78;

export function App() {
  const [mapPct, setMapPct] = useState(67);
  const workspaceRef = useRef<HTMLDivElement>(null);

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
    <StoreProvider>
      <div className="app">
        <header className="app-bar">
          <p className="eyebrow">Wildfire medical tracker</p>
          <h1>Resource board</h1>
        </header>
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
    </StoreProvider>
  );
}
