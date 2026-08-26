import { useEffect, useState } from "react";
import { downloadJson, parseImportedJson, stampFilename, unitsPayload } from "../lib/boardFile";
import {
  loadColumnVisibility,
  saveColumnVisibility,
  toggleColumn,
  type UnitColumnId,
} from "../lib/columns";
import { isInTransit, rowTone, type Capability, type DutyStatus, type MarkerKind } from "../types";
import { BoardIoBar } from "./BoardIoBar";
import { ColumnPickerDialog } from "./ColumnPickerDialog";
import { LocationCombobox } from "./LocationCombobox";
import { RemoveUnitsDialog } from "./RemoveUnitsDialog";
import { useStore } from "../store";

function ColumnHead({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <th>
      <span className="th-inner">
        <span>{label}</span>
        <button type="button" className="kebab" aria-label={`Show or hide columns from ${label}`} onClick={onOpen}>
          <span />
          <span />
          <span />
        </button>
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
  } = useStore();
  const [removing, setRemoving] = useState(false);
  const [colsOpen, setColsOpen] = useState(false);
  const [visibility, setVisibility] = useState(loadColumnVisibility);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const locationOptions = points.filter((p) => p.review === "accepted").map((p) => p.label);

  useEffect(() => {
    saveColumnVisibility(visibility);
  }, [visibility]);

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
    if (parsed.kind === "points") return "That file is snap points. Use Import points on the snap list.";
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
            confirmBody="This replaces the unit table (and dock positions) from the file. Snap points stay as they are. Leader names and phones are in the file — keep it off shared drives if that matters."
            onSave={saveBoard}
            onExport={() => downloadJson(stampFilename("units"), unitsPayload(resources, placements))}
            onImportText={importUnits}
          />
          <button type="button" className="btn tiny" onClick={addResource}>
            Add resource
          </button>
          <button type="button" className="btn tiny danger" onClick={() => setRemoving(true)}>
            Remove units
          </button>
          <span className="count">{resources.length}</span>
        </div>
      </header>
      {boardNotice ? <p className="hint pad">{boardNotice}</p> : null}
      <p className="hint pad">
        Edit any cell. Drag the handle on the left to reorder units. Location lists known points, or accepts a custom
        name.
      </p>
      <div className="legend">
        <span className="swatch blue">At location</span>
        <span className="swatch yellow">En route</span>
        <span className="swatch green">On scene</span>
        <span className="swatch slate">Returned</span>
        <span className="swatch red">IWI / emergency</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="grip-head">
                <span className="sr-only">Reorder</span>
              </th>
              {visibility.vendor ? <ColumnHead label="Vendor / org" onOpen={() => setColsOpen(true)} /> : null}
              {visibility.fireName ? <ColumnHead label="Fire name" onOpen={() => setColsOpen(true)} /> : null}
              {visibility.kind ? <ColumnHead label="Type" onOpen={() => setColsOpen(true)} /> : null}
              {visibility.leaderName ? <ColumnHead label="Leader" onOpen={() => setColsOpen(true)} /> : null}
              {visibility.leaderPhone ? <ColumnHead label="Phone" onOpen={() => setColsOpen(true)} /> : null}
              {visibility.capability ? <ColumnHead label="ALS/BLS" onOpen={() => setColsOpen(true)} /> : null}
              {visibility.location ? <ColumnHead label="Location" onOpen={() => setColsOpen(true)} /> : null}
              {visibility.status ? <ColumnHead label="Status" onOpen={() => setColsOpen(true)} /> : null}
              {visibility.actions ? <ColumnHead label="Actions" onOpen={() => setColsOpen(true)} /> : null}
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
                  draggable={dragId === r.id}
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
                    <td>
                      <input
                        className="field cell"
                        value={r.vendor}
                        onChange={(e) => updateResource(r.id, { vendor: e.target.value })}
                        aria-label={`Vendor for ${r.fireName}`}
                      />
                    </td>
                  ) : null}
                  {visibility.fireName ? (
                    <td>
                      <input
                        className="field cell name"
                        value={r.fireName}
                        onChange={(e) => updateResource(r.id, { fireName: e.target.value })}
                        aria-label="Fire-specific name"
                      />
                    </td>
                  ) : null}
                  {visibility.kind ? (
                    <td>
                      <select
                        className="field cell kind-select"
                        value={r.kind}
                        onChange={(e) => updateResource(r.id, { kind: e.target.value as MarkerKind })}
                        aria-label={`Type for ${r.fireName}`}
                      >
                        <option value="ambulance">Ambulance</option>
                        <option value="firefighter">Line EMT / Paramedic</option>
                        <option value="rems_pickup">REMS</option>
                      </select>
                    </td>
                  ) : null}
                  {visibility.leaderName ? (
                    <td>
                      <input
                        className="field cell"
                        value={r.leaderName}
                        onChange={(e) => updateResource(r.id, { leaderName: e.target.value })}
                        aria-label={`Leader for ${r.fireName}`}
                      />
                    </td>
                  ) : null}
                  {visibility.leaderPhone ? (
                    <td>
                      <input
                        className="field cell"
                        value={r.leaderPhone}
                        onChange={(e) => updateResource(r.id, { leaderPhone: e.target.value })}
                        aria-label={`Phone for ${r.fireName}`}
                      />
                    </td>
                  ) : null}
                  {visibility.capability ? (
                    <td>
                      <select
                        className="field cell cap-select"
                        value={r.capability}
                        onChange={(e) => updateResource(r.id, { capability: e.target.value as Capability })}
                        aria-label={`Capability for ${r.fireName}`}
                      >
                        <option value="ALS">ALS</option>
                        <option value="BLS">BLS</option>
                      </select>
                    </td>
                  ) : null}
                  {visibility.location ? (
                    <td>
                      <LocationCombobox
                        value={locationValue}
                        options={locationOptions}
                        onChange={(next) => setDestination(r.id, next)}
                        ariaLabel={`Location for ${r.fireName}`}
                      />
                    </td>
                  ) : null}
                  {visibility.status ? (
                    <td>
                      <select
                        className="field cell status-select"
                        value={place.duty}
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
                    <td className="actions">
                      {isInTransit(place) ? (
                        <button type="button" className="btn cell-action" onClick={() => markArrival(r.id)}>
                          Arrive
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={`btn cell-action${place.emergencyCare ? " danger on" : ""}`}
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
