import { CATEGORY_LABELS } from "../types";
import { downloadJson, parseImportedJson, snapPointsPayload, stampFilename } from "../lib/boardFile";
import { BoardIoBar } from "./BoardIoBar";
import { useStore } from "../store";

const OPEN_KEY = "med-dashboard-map-points-open";

export function loadMapPointsOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveMapPointsOpen(open: boolean): void {
  try {
    localStorage.setItem(OPEN_KEY, open ? "1" : "0");
  } catch {
    /* private mode / quota */
  }
}

export function PointReview({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { points, setPointReview, deletePoint, saveBoard, replacePoints, relocatingPointId, beginRelocate, readOnly } =
    useStore();

  function importPoints(text: string) {
    const parsed = parseImportedJson(text);
    if (!parsed.ok) return parsed.message;
    if (parsed.kind === "units") return "That file is a unit table. Use Import on the Units header.";
    const next = parsed.kind === "board" ? parsed.snapshot.points : parsed.points;
    replacePoints(next);
  }

  return (
    <section className={open ? "side-section" : "side-section collapsed"}>
      <header className="section-head">
        <button
          type="button"
          className="disclosure"
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
        >
          <span className="chevron" aria-hidden="true" />
          <h2>Map points</h2>
        </button>
        <div className="section-actions">
          <BoardIoBar
            exportLabel="Export"
            importLabel="Import"
            confirmTitle="Replace map points?"
            confirmBody="This replaces the map list from the file. Units stay on the board. Markers undock if their point is missing from the file."
            onSave={saveBoard}
            onExport={() => downloadJson(stampFilename("snap-points"), snapPointsPayload(points))}
            onImportText={importPoints}
            readOnly={readOnly}
          />
          <span className="count">{points.filter((p) => p.review === "accepted").length}</span>
        </div>
      </header>
      {open ? (
        points.length === 0 ? (
          <p className="hint">Raster ops map — type a label, then click the map to place ICP, DP, H, camp.</p>
        ) : (
          <ul className="point-list">
            {points.map((p) => (
              <li key={p.id} className={`${p.review}${relocatingPointId === p.id ? " moving" : ""}`}>
                <span>
                  <strong>{p.label}</strong>
                  <em>{CATEGORY_LABELS[p.category]}</em>
                </span>
                {!readOnly ? (
                  <span className="point-actions">
                    {p.review !== "rejected" ? (
                      <>
                        <button
                          type="button"
                          className={relocatingPointId === p.id ? "btn tiny primary" : "btn tiny"}
                          onClick={() => beginRelocate(p.id)}
                        >
                          {relocatingPointId === p.id ? "Moving…" : "Move"}
                        </button>
                        <button type="button" className="btn tiny" onClick={() => setPointReview(p.id, "rejected")}>
                          Remove
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="btn tiny" onClick={() => setPointReview(p.id, "accepted")}>
                          Restore
                        </button>
                        <button type="button" className="btn tiny danger" onClick={() => deletePoint(p.id)}>
                          Delete
                        </button>
                      </>
                    )}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )
      ) : null}
    </section>
  );
}
