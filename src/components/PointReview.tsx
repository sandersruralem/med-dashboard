import { CATEGORY_LABELS } from "../types";
import { downloadJson, parseImportedJson, snapPointsPayload, stampFilename } from "../lib/boardFile";
import { BoardIoBar } from "./BoardIoBar";
import { useStore } from "../store";

export function PointReview() {
  const { points, setPointReview, deletePoint, saveBoard, replacePoints, relocatingPointId, beginRelocate } = useStore();

  function importPoints(text: string) {
    const parsed = parseImportedJson(text);
    if (!parsed.ok) return parsed.message;
    if (parsed.kind === "units") return "That file is a unit table. Use Import on the Units header.";
    const next = parsed.kind === "board" ? parsed.snapshot.points : parsed.points;
    replacePoints(next);
  }

  return (
    <section className="side-section">
      <header className="section-head">
        <h2>Snap points</h2>
        <div className="section-actions">
          <BoardIoBar
            exportLabel="Export"
            importLabel="Import"
            confirmTitle="Replace snap points?"
            confirmBody="This replaces the snap list from the file. Units stay on the board. Markers undock if their point is missing from the file."
            onSave={saveBoard}
            onExport={() => downloadJson(stampFilename("snap-points"), snapPointsPayload(points))}
            onImportText={importPoints}
          />
          <span className="count">{points.filter((p) => p.review === "accepted").length}</span>
        </div>
      </header>
      {points.length === 0 ? (
        <p className="hint">Raster ops map — type a label, then click the map to place ICP, DP, H, camp.</p>
      ) : (
        <ul className="point-list">
          {points.map((p) => (
            <li key={p.id} className={`${p.review}${relocatingPointId === p.id ? " moving" : ""}`}>
              <span>
                <strong>{p.label}</strong>
                <em>{CATEGORY_LABELS[p.category]}</em>
              </span>
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
