import { useEffect, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { downloadJson, parseImportedJson, stampFilename, unitsPayload } from "../lib/boardFile";
import {
  clampColumnWidth,
  loadColumnVisibility,
  loadColumnWidths,
  saveColumnVisibility,
  saveColumnWidths,
  toggleColumn,
  type UnitColumnId,
} from "../lib/columns";
import { isInTransit, rowTone, type Capability, type DutyStatus, type MarkerKind } from "../types";
import { BoardIoBar } from "./BoardIoBar";
import { ColumnPickerDialog } from "./ColumnPickerDialog";
import { LocationCombobox } from "./LocationCombobox";
import { RemoveUnitsDialog } from "./RemoveUnitsDialog";
import { useStore } from "../store";

function colStyle(width: number): CSSProperties {
  return { width, minWidth: width, maxWidth: width };
}

function ColumnHead({
  id,
  label,
  width,
  onOpen,
  onResize,
}: {
  id: UnitColumnId;
  label: string;
  width: number;
  onOpen: () => void;
  onResize: (id: UnitColumnId, width: number) => void;
}) {
  function onResizePointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startW = width;

    const onMove = (ev: PointerEvent) => {
      onResize(id, clampColumnWidth(startW + (ev.clientX - startX), id));
    };
    const onUp = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
  }

  return (
    <th style={colStyle(width)}>
      <span className="th-inner">
        <span>{label}</span>
        <button type="button" className="kebab" aria-label={`Show or hide columns from ${label}`} onClick={onOpen}>
          <span />
          <span />
          <span />
        </button>
        <button type="button" className="col-resize" aria-label={`Resize ${label} column`} onPointerDown={onResizePointerDown} />
      </span>
    </th>
  );
}

export function ResourceTable() {
  const {
    resources,
    placements,
    points,
    updateResource,
    addResource,
    removeResources,
    setDestination,
    markArrival,
    setDuty,
    setEmergencyCare,
    boardNotice,
    saveBoard,
    replaceUnits,
    reorderResources,
    readOnly,
  } = useStore();
  const [removing, setRemoving] = useState(false);
  const [colsOpen, setColsOpen] = useState(false);
  const [visibility, setVisibility] = useState(loadColumnVisibility);
  const [widths, setWidths] = useState(loadColumnWidths);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const locationOptions = points.filter((p) => p.review === "accepted").map((p) => p.label);

  useEffect(() => {
    saveColumnVisibility(visibility);
  }, [visibility]);

  useEffect(() => {
    saveColumnWidths(widths);
  }, [widths]);

  function onToggle(id: UnitColumnId) {
    setVisibility((prev) => toggleColumn(prev, id));
  }

  function nudge(id: string, delta: number) {
    const from = resources.findIndex((r) => r.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= resources.length) return;
    reorderResources(id, resources[to].id);
  }

  function importUnits(text: string) {
    const parsed = parseImportedJson(text);
    if (!parsed.ok) return parsed.message;
    if (parsed.kind === "points") return "That file is map points. Use Import on the map list.";
    const bundle = parsed.kind === "board" ? parsed.snapshot : parsed;
    replaceUnits(bundle.resources, bundle.placements);
  }

  return (
    <section className="resource-block">
      <header className="section-head">
        <h2>Units</h2>
        <div className="section-actions">
          <BoardIoBar
            exportLabel="Export"
            importLabel="Import"
            confirmTitle="Replace units?"
            confirmBody="This replaces the unit table (and dock positions) from the file. Map points stay as they are. Leader names and phones are in the file — keep it off shared drives if that matters."
            onSave={saveBoard}
            onExport={() => downloadJson(stampFilename("units"), unitsPayload(resources, placements))}
            onImportText={importUnits}
            readOnly={readOnly}
          />
          {!readOnly ? (
            <>
              <button type="button" className="btn tiny" onClick={addResource}>
                Add resource
              </button>
              <button type="button" className="btn tiny danger" onClick={() => setRemoving(true)}>
                Remove units
              </button>
            </>
          ) : null}
          <span className="count">{resources.length}</span>
        </div>
      </header>
      {boardNotice ? <p className="hint pad">{boardNotice}</p> : null}
      {!readOnly ? (
        <p className="hint pad">
          Edit any cell. Drag the handle on the left to reorder units. Location lists known points, or accepts a custom
          name.
        </p>
      ) : null}
      <div className="legend">
        <span className="swatch blue">At location</span>
        <span className="swatch yellow">En route</span>
        <span className="swatch green">On scene</span>
        <span className="swatch slate">Returned</span>
        <span className="swatch red">IWI / emergency</span>
      </div>
      <div className="table-wrap">
        <table className="unit-table">
          <thead>
            <tr>
              <th className="grip-head">
                <span className="sr-only">Reorder</span>
              </th>
              {visibility.vendor ? (
                <ColumnHead id="vendor" label="Vendor / org" width={widths.vendor} onOpen={() => setColsOpen(true)} onResize={(id, w) => setWidths((prev) => ({ ...prev, [id]: w }))} />
              ) : null}
              {visibility.fireName ? (
                <ColumnHead id="fireName" label="Fire name" width={widths.fireName} onOpen={() => setColsOpen(true)} onResize={(id, w) => setWidths((prev) => ({ ...prev, [id]: w }))} />
              ) : null}
              {visibility.kind ? (
                <ColumnHead id="kind" label="Type" width={widths.kind} onOpen={() => setColsOpen(true)} onResize={(id, w) => setWidths((prev) => ({ ...prev, [id]: w }))} />
              ) : null}
              {visibility.leaderName ? (
                <ColumnHead id="leaderName" label="Leader" width={widths.leaderName} onOpen={() => setColsOpen(true)} onResize={(id, w) => setWidths((prev) => ({ ...prev, [id]: w }))} />
              ) : null}
              {visibility.leaderPhone ? (
                <ColumnHead id="leaderPhone" label="Phone" width={widths.leaderPhone} onOpen={() => setColsOpen(true)} onResize={(id, w) => setWidths((prev) => ({ ...prev, [id]: w }))} />
              ) : null}
              {visibility.capability ? (
                <ColumnHead id="capability" label="ALS/BLS" width={widths.capability} onOpen={() => setColsOpen(true)} onResize={(id, w) => setWidths((prev) => ({ ...prev, [id]: w }))} />
              ) : null}
              {visibility.location ? (
                <ColumnHead id="location" label="Location" width={widths.location} onOpen={() => setColsOpen(true)} onResize={(id, w) => setWidths((prev) => ({ ...prev, [id]: w }))} />
              ) : null}
              {visibility.status ? (
                <ColumnHead id="status" label="Status" width={widths.status} onOpen={() => setColsOpen(true)} onResize={(id, w) => setWidths((prev) => ({ ...prev, [id]: w }))} />
              ) : null}
              {visibility.actions ? (
                <ColumnHead id="actions" label="Actions" width={widths.actions} onOpen={() => setColsOpen(true)} onResize={(id, w) => setWidths((prev) => ({ ...prev, [id]: w }))} />
              ) : null}
            </tr>
          </thead>
          <tbody>
            {resources.map((r) => {
              const place = placements.find((p) => p.resourceId === r.id);
              if (!place) return null;
              const at = points.find((pt) => pt.id === place.atPointId);
              const tone = rowTone(place);
              const locationValue = place.destination || at?.label || "";
              const dragClass = dragId === r.id ? " dragging" : overId === r.id && dragId ? " drag-over" : "";
              return (
                <tr
                  key={r.id}
                  className={`row-${tone}${isInTransit(place) ? " pulse" : ""}${dragClass}`}
                  draggable={!readOnly && dragId === r.id}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", r.id);
                  }}
                  onDragEnter={() => setOverId(r.id)}
                  onDragOver={(e) => {
                    if (!dragId) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragId) reorderResources(dragId, r.id);
                    setDragId(null);
                    setOverId(null);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverId(null);
                  }}
                >
                  <td className="grip-cell">
                    <button
                      type="button"
                      className="grip"
                      disabled={readOnly}
                      aria-label={`Reorder ${r.fireName || "unit"}. Use alt with arrow up or down.`}
                      onPointerDown={() => setDragId(r.id)}
                      onPointerUp={() => setDragId((cur) => (cur === r.id ? null : cur))}
                      onKeyDown={(e) => {
                        if (!e.altKey) return;
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          nudge(r.id, -1);
                        } else if (e.key === "ArrowDown") {
                          e.preventDefault();
                          nudge(r.id, 1);
                        }
                      }}
                    >
                      <span />
                      <span />
                      <span />
                    </button>
                  </td>
                  {visibility.vendor ? (
                    <td style={colStyle(widths.vendor)}>
                      <input
                        className="field cell"
                        value={r.vendor}
                        disabled={readOnly}
                        onChange={(e) => updateResource(r.id, { vendor: e.target.value })}
                        aria-label={`Vendor for ${r.fireName}`}
                      />
                    </td>
                  ) : null}
                  {visibility.fireName ? (
                    <td style={colStyle(widths.fireName)}>
                      <input
                        className="field cell name"
                        value={r.fireName}
                        disabled={readOnly}
                        onChange={(e) => updateResource(r.id, { fireName: e.target.value })}
                        aria-label="Fire-specific name"
                      />
                    </td>
                  ) : null}
                  {visibility.kind ? (
                    <td style={colStyle(widths.kind)}>
                      <select
                        className="field cell kind-select"
                        value={r.kind === "firefighter" ? (r.capability === "ALS" ? "line_paramedic" : "line_emt") : r.kind}
                        disabled={readOnly}
                        onChange={(e) => updateResource(r.id, { kind: e.target.value as MarkerKind })}
                        aria-label={`Type for ${r.fireName}`}
                      >
                        <option value="ambulance">Ambulance</option>
                        <option value="line_emt">Line EMT</option>
                        <option value="line_paramedic">Line Paramedic</option>
                        <option value="rems_pickup">REMS</option>
                      </select>
                    </td>
                  ) : null}
                  {visibility.leaderName ? (
                    <td style={colStyle(widths.leaderName)}>
                      <input
                        className="field cell"
                        value={r.leaderName}
                        disabled={readOnly}
                        onChange={(e) => updateResource(r.id, { leaderName: e.target.value })}
                        aria-label={`Leader for ${r.fireName}`}
                      />
                    </td>
                  ) : null}
                  {visibility.leaderPhone ? (
                    <td style={colStyle(widths.leaderPhone)}>
                      <input
                        className="field cell"
                        value={r.leaderPhone}
                        disabled={readOnly}
                        onChange={(e) => updateResource(r.id, { leaderPhone: e.target.value })}
                        aria-label={`Phone for ${r.fireName}`}
                      />
                    </td>
                  ) : null}
                  {visibility.capability ? (
                    <td style={colStyle(widths.capability)}>
                      <select
                        className="field cell cap-select"
                        value={r.capability}
                        disabled={readOnly}
                        onChange={(e) => updateResource(r.id, { capability: e.target.value as Capability })}
                        aria-label={`Capability for ${r.fireName}`}
                      >
                        <option value="ALS">ALS</option>
                        <option value="BLS">BLS</option>
                      </select>
                    </td>
                  ) : null}
                  {visibility.location ? (
                    <td style={colStyle(widths.location)}>
                      <LocationCombobox
                        value={locationValue}
                        options={locationOptions}
                        onChange={(next) => setDestination(r.id, next)}
                        ariaLabel={`Location for ${r.fireName}`}
                        disabled={readOnly}
                      />
                    </td>
                  ) : null}
                  {visibility.status ? (
                    <td style={colStyle(widths.status)}>
                      <select
                        className="field cell status-select"
                        value={place.duty}
                        disabled={readOnly}
                        onChange={(e) => setDuty(r.id, e.target.value as DutyStatus)}
                        aria-label={`Status for ${r.fireName}`}
                      >
                        <option value="at_location">At location</option>
                        <option value="on_scene">On scene</option>
                        <option value="enroute">En route</option>
                        <option value="returned">Returned</option>
                      </select>
                    </td>
                  ) : null}
                  {visibility.actions ? (
                    <td className="actions" style={colStyle(widths.actions)}>
                      {!readOnly && isInTransit(place) ? (
                        <button type="button" className="btn cell-action" onClick={() => markArrival(r.id)}>
                          Arrive
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={`btn cell-action${place.emergencyCare ? " danger on" : ""}`}
                        disabled={readOnly}
                        aria-pressed={place.emergencyCare}
                        title="Unit assigned to an IWI. No patient details."
                        onClick={() => setEmergencyCare(r.id, !place.emergencyCare)}
                      >
                        Emergency
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ColumnPickerDialog open={colsOpen} visibility={visibility} onClose={() => setColsOpen(false)} onToggle={onToggle} />
      <RemoveUnitsDialog
        open={removing}
        resources={resources}
        onClose={() => setRemoving(false)}
        onConfirmDelete={removeResources}
      />
    </section>
  );
}
