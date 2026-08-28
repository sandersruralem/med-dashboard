import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { loadStoredBoard, writeStoredBoard } from "./lib/boardFile";
import { findPointByLabel, labelsMatch } from "./lib/labels";
import { EMPTY_BOARD_SNAPSHOT, LIVE_EDITOR_KEY_PREFIX, roomFromLocationHash } from "./lib/liveProtocol";
import { seedPlacements, seedResources } from "./seed";
import type { LoadedGeopdf } from "./lib/loadGeopdf";
import type {
  BoardSnapshot,
  DutyStatus,
  MapPoint,
  MapPointCategory,
  MedicalResource,
  MovementState,
  ResourcePlacement,
} from "./types";

export interface Store {
  points: MapPoint[];
  resources: MedicalResource[];
  placements: ResourcePlacement[];
  snapshot: BoardSnapshot;
  readOnly: boolean;
  setReadOnly: (readOnly: boolean) => void;
  replaceRemoteSnapshot: (snapshot: BoardSnapshot) => void;
  overlay: LoadedGeopdf | null;
  pdfError: string | null;
  pdfBusy: boolean;
  setOverlay: (overlay: LoadedGeopdf | null, error?: string | null) => void;
  setPdfBusy: (busy: boolean) => void;
  addPoint: (lat: number, lon: number, label: string, category: MapPointCategory) => void;
  movePoint: (id: string, lat: number, lon: number) => void;
  relocatingPointId: string | null;
  beginRelocate: (id: string) => void;
  cancelRelocate: () => void;
  setPointReview: (id: string, review: MapPoint["review"]) => void;
  deletePoint: (id: string) => void;
  updateResource: (resourceId: string, patch: Partial<MedicalResource>) => void;
  addResource: () => void;
  removeResources: (ids: string[]) => void;
  reorderResources: (fromId: string, toId: string) => void;
  setDestination: (resourceId: string, raw: string) => void;
  markArrival: (resourceId: string) => void;
  dropOnClosest: (resourceId: string, lat: number, lon: number) => void;
  setDuty: (resourceId: string, duty: DutyStatus) => void;
  setEmergencyCare: (resourceId: string, on: boolean) => void;
  boardNotice: string | null;
  saveBoard: () => void;
  replacePoints: (next: MapPoint[]) => void;
  replaceUnits: (resources: MedicalResource[], placements: ResourcePlacement[]) => void;
}

const StoreContext = createContext<Store | null>(null);

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function closestAccepted(points: MapPoint[], lat: number, lon: number): MapPoint | undefined {
  const accepted = points.filter((p) => p.review === "accepted");
  if (accepted.length === 0) return undefined;
  return [...accepted].sort((a, b) => {
    const da = haversineKm(lat, lon, a.lat, a.lon);
    const db = haversineKm(lat, lon, b.lat, b.lon);
    if (da !== db) return da - db;
    return a.label.localeCompare(b.label);
  })[0];
}

function movementForPoint(point: MapPoint): MovementState {
  if (point.category === "icp" || point.category === "camp") return "at_icp_camp";
  return "at_other";
}

function movementForDuty(duty: DutyStatus, point?: MapPoint): MovementState {
  if (duty === "enroute") return "en_route";
  if (duty === "returned") return "returning";
  if (point) return movementForPoint(point);
  return "at_other";
}

function initialBoard(): {
  points: MapPoint[];
  resources: MedicalResource[];
  placements: ResourcePlacement[];
  restored: boolean;
} {
  const saved = loadStoredBoard();
  if (saved) return { ...saved, points: sortedByLabel(saved.points), restored: true };
  return { points: [], resources: seedResources, placements: seedPlacements, restored: false };
}

/** Viewer live links must not flash this browser's last local board. */
function viewerLiveHold(): boolean {
  if (typeof window === "undefined") return false;
  const room = roomFromLocationHash(window.location.hash);
  if (!room) return false;
  return sessionStorage.getItem(`${LIVE_EDITOR_KEY_PREFIX}${room}`) == null;
}

/** A to Z, with DP-2 ahead of DP-10. */
function sortedByLabel(points: MapPoint[]): MapPoint[] {
  return [...points].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" }));
}

function dockedToKnownPoints(placements: ResourcePlacement[], points: MapPoint[]): ResourcePlacement[] {
  const ids = new Set(points.map((p) => p.id));
  return placements.map((p) => (ids.has(p.atPointId) ? p : { ...p, atPointId: "" }));
}

function attachEmpty(placements: ResourcePlacement[], point: MapPoint): ResourcePlacement[] {
  return placements.map((p) =>
    p.atPointId
      ? p
      : {
          ...p,
          atPointId: point.id,
          movement: movementForPoint(point),
          duty: p.duty === "enroute" ? "enroute" : "at_location",
          destination: "",
        },
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [boot] = useState(initialBoard);
  const [hold] = useState(viewerLiveHold);
  const [points, setPoints] = useState(hold ? EMPTY_BOARD_SNAPSHOT.points : boot.points);
  const [resources, setResources] = useState(hold ? EMPTY_BOARD_SNAPSHOT.resources : boot.resources);
  const [placements, setPlacements] = useState(hold ? EMPTY_BOARD_SNAPSHOT.placements : boot.placements);
  const [overlay, setOverlayState] = useState<LoadedGeopdf | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [readOnly, setReadOnlyState] = useState(hold);
  const [boardNotice, setBoardNotice] = useState<string | null>(
    hold ? null : boot.restored ? "Restored the last saved board in this browser." : null,
  );
  const [relocatingPointId, setRelocatingPointId] = useState<string | null>(null);
  const localBoard = useRef<BoardSnapshot>({
    points: boot.points,
    resources: boot.resources,
    placements: boot.placements,
  });
  const skipAutosave = useRef(true);

  useEffect(() => {
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }
    if (!readOnly) {
      localBoard.current = { points, resources, placements };
      writeStoredBoard(localBoard.current);
    }
  }, [points, resources, placements, readOnly]);

  const value = useMemo<Store>(
    () => ({
      points,
      resources,
      placements,
      snapshot: { points, resources, placements },
      readOnly,
      setReadOnly(next) {
        if (next === readOnly) return;
        if (next) {
          localBoard.current = { points, resources, placements };
        } else {
          setPoints(localBoard.current.points);
          setResources(localBoard.current.resources);
          setPlacements(localBoard.current.placements);
        }
        setReadOnlyState(next);
        setRelocatingPointId(null);
      },
      replaceRemoteSnapshot(snapshot) {
        setPoints(sortedByLabel(snapshot.points));
        setResources(snapshot.resources);
        setPlacements(snapshot.placements);
        setRelocatingPointId(null);
        setBoardNotice(null);
      },
      overlay,
      pdfError,
      pdfBusy,
      setOverlay(next, error = null) {
        setOverlayState(next);
        setPdfError(error);
      },
      setPdfBusy,
      addPoint(lat, lon, label, category) {
        if (readOnly) return;
        const point: MapPoint = {
          id: `pt-${crypto.randomUUID()}`,
          category,
          label,
          lat,
          lon,
          source: "manual",
          review: "accepted",
        };
        setPoints((prev) => sortedByLabel([...prev, point]));
        setPlacements((prev) => attachEmpty(prev, point));
      },
      movePoint(id, lat, lon) {
        if (readOnly) return;
        setPoints((prev) => prev.map((p) => (p.id === id ? { ...p, lat, lon } : p)));
        setRelocatingPointId(null);
      },
      relocatingPointId,
      beginRelocate(id) {
        if (readOnly) return;
        setRelocatingPointId((cur) => (cur === id ? null : id));
      },
      cancelRelocate() {
        setRelocatingPointId(null);
      },
      setPointReview(id, review) {
        if (readOnly) return;
        setPoints((prev) => prev.map((p) => (p.id === id ? { ...p, review } : p)));
      },
      deletePoint(id) {
        if (readOnly) return;
        setPoints((prev) => prev.filter((p) => p.id !== id));
        setPlacements((prev) =>
          prev.map((p) => (p.atPointId === id ? { ...p, atPointId: "", destination: p.destination } : p)),
        );
        setRelocatingPointId((cur) => (cur === id ? null : cur));
      },
      updateResource(resourceId, patch) {
        if (readOnly) return;
        setResources((prev) => prev.map((r) => (r.id === resourceId ? { ...r, ...patch, id: r.id } : r)));
      },
      addResource() {
        if (readOnly) return;
        const id = `r-${crypto.randomUUID()}`;
        const n = resources.length + 1;
        const home = points.find((p) => p.review === "accepted");
        const resource: MedicalResource = {
          id,
          vendor: "",
          fireName: `UNIT-${String(n).padStart(2, "0")}`,
          leaderName: "",
          leaderPhone: "",
          capability: "BLS",
          kind: "ambulance",
        };
        setResources((prev) => [...prev, resource]);
        setPlacements((prev) => [
          ...prev,
          {
            resourceId: id,
            atPointId: home?.id ?? "",
            destination: "",
            movement: home ? movementForPoint(home) : "at_icp_camp",
            duty: "at_location",
            emergencyCare: false,
          },
        ]);
      },
      removeResources(ids) {
        if (readOnly) return;
        const drop = new Set(ids);
        setResources((prev) => prev.filter((r) => !drop.has(r.id)));
        setPlacements((prev) => prev.filter((p) => !drop.has(p.resourceId)));
      },
      reorderResources(fromId, toId) {
        if (readOnly) return;
        if (fromId === toId) return;
        setResources((prev) => {
          const from = prev.findIndex((r) => r.id === fromId);
          const to = prev.findIndex((r) => r.id === toId);
          if (from < 0 || to < 0) return prev;
          const next = [...prev];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          return next;
        });
      },
      setDestination(resourceId, raw) {
        if (readOnly) return;
        setPlacements((prev) =>
          prev.map((p) => {
            if (p.resourceId !== resourceId) return p;
            const dest = raw.trim();
            const at = points.find((pt) => pt.id === p.atPointId);
            const alreadyThere = Boolean(at && dest && labelsMatch(at.label, dest));
            if (!dest || alreadyThere) {
              return {
                ...p,
                destination: "",
                movement: at ? movementForPoint(at) : p.movement,
                duty: p.duty === "enroute" ? "at_location" : p.duty,
              };
            }
            return { ...p, destination: dest, movement: "en_route", duty: "enroute" };
          }),
        );
      },
      markArrival(resourceId) {
        if (readOnly) return;
        setPlacements((prev) =>
          prev.map((p) => {
            if (p.resourceId !== resourceId) return p;
            const match = findPointByLabel(points, p.destination);
            if (!match || match.review !== "accepted") return p;
            return {
              ...p,
              atPointId: match.id,
              destination: "",
              movement: movementForPoint(match),
              duty: "at_location",
            };
          }),
        );
      },
      dropOnClosest(resourceId, lat, lon) {
        if (readOnly) return;
        const match = closestAccepted(points, lat, lon);
        if (!match) return;
        setPlacements((prev) =>
          prev.map((p) =>
            p.resourceId === resourceId
              ? {
                  ...p,
                  atPointId: match.id,
                  destination: "",
                  movement: movementForPoint(match),
                  duty: "at_location",
                }
              : p,
          ),
        );
      },
      setDuty(resourceId, duty) {
        if (readOnly) return;
        setPlacements((prev) =>
          prev.map((p) => {
            if (p.resourceId !== resourceId) return p;
            const at = points.find((pt) => pt.id === p.atPointId);
            return {
              ...p,
              duty,
              movement: movementForDuty(duty, at),
            };
          }),
        );
      },
      setEmergencyCare(resourceId, on) {
        if (readOnly) return;
        setPlacements((prev) => prev.map((p) => (p.resourceId === resourceId ? { ...p, emergencyCare: on } : p)));
      },
      boardNotice,
      saveBoard() {
        if (readOnly) return;
        const ok = writeStoredBoard({ points, resources, placements });
        setBoardNotice(ok ? "Saved snap points and units in this browser." : "Could not save in this browser.");
      },
      replacePoints(next) {
        if (readOnly) return;
        setPoints(sortedByLabel(next));
        setPlacements((prev) => dockedToKnownPoints(prev, next));
        setRelocatingPointId(null);
        setBoardNotice(`Imported ${next.length} snap point${next.length === 1 ? "" : "s"}.`);
      },
      replaceUnits(nextResources, nextPlacements) {
        if (readOnly) return;
        setResources(nextResources);
        setPlacements(dockedToKnownPoints(nextPlacements, points));
        setBoardNotice(`Imported ${nextResources.length} unit${nextResources.length === 1 ? "" : "s"}.`);
      },
    }),
    [points, resources, placements, overlay, pdfError, pdfBusy, boardNotice, relocatingPointId, readOnly],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
