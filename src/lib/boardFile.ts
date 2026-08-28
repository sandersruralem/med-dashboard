import type {
  Capability,
  BoardSnapshot,
  DutyStatus,
  MapPoint,
  MapPointCategory,
  MarkerKind,
  MedicalResource,
  MovementState,
  ResourcePlacement,
  ReviewStatus,
} from "../types";

export type { BoardSnapshot } from "../types";

export const SNAP_FORMAT = "wildfire-med-snap-points";
export const UNITS_FORMAT = "wildfire-med-units";
export const BOARD_FORMAT = "wildfire-med-board";
export const FILE_VERSION = 1;
export const BOARD_STORAGE_KEY = "med-dashboard-board";

const CATEGORIES = new Set<MapPointCategory>([
  "drop_point",
  "junction",
  "helispot",
  "unimproved_helispot",
  "helibase",
  "icp",
  "camp",
  "staging",
  "safety_zone",
  "lookout",
  "incident_base",
]);
const KINDS = new Set<MarkerKind>(["ambulance", "firefighter", "rems_pickup"]);
const CAPS = new Set<Capability>(["ALS", "BLS"]);
const DUTIES = new Set<DutyStatus>(["at_location", "on_scene", "enroute", "returned"]);
const MOVEMENTS = new Set<MovementState>(["at_icp_camp", "en_route", "at_other", "moving", "returning"]);
const REVIEWS = new Set<ReviewStatus>(["pending", "accepted", "rejected"]);
const SOURCES = new Set<MapPoint["source"]>(["geopdf_extract", "manual"]);

export type ParsedImport =
  | { ok: true; kind: "points"; points: MapPoint[] }
  | { ok: true; kind: "units"; resources: MedicalResource[]; placements: ResourcePlacement[] }
  | { ok: true; kind: "board"; snapshot: BoardSnapshot }
  | { ok: false; message: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asFinite(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function parsePoint(v: unknown): MapPoint | null {
  if (!isRecord(v)) return null;
  const id = asString(v.id);
  const label = asString(v.label);
  const lat = asFinite(v.lat);
  const lon = asFinite(v.lon);
  const category = asString(v.category);
  const source = asString(v.source);
  const review = asString(v.review);
  if (!id || !label || lat === null || lon === null) return null;
  if (!category || !CATEGORIES.has(category as MapPointCategory)) return null;
  if (!source || !SOURCES.has(source as MapPoint["source"])) return null;
  if (!review || !REVIEWS.has(review as ReviewStatus)) return null;
  return {
    id,
    label,
    lat,
    lon,
    category: category as MapPointCategory,
    source: source as MapPoint["source"],
    review: review as ReviewStatus,
  };
}

function parseResource(v: unknown): MedicalResource | null {
  if (!isRecord(v)) return null;
  const id = asString(v.id);
  const vendor = asString(v.vendor);
  const fireName = asString(v.fireName);
  const leaderName = asString(v.leaderName);
  const leaderPhone = asString(v.leaderPhone);
  const capability = asString(v.capability);
  const kind = asString(v.kind);
  if (!id || vendor === null || fireName === null || leaderName === null || leaderPhone === null) return null;
  if (!capability || !CAPS.has(capability as Capability)) return null;
  if (!kind || !KINDS.has(kind as MarkerKind)) return null;
  return {
    id,
    vendor,
    fireName,
    leaderName,
    leaderPhone,
    capability: capability as Capability,
    kind: kind as MarkerKind,
  };
}

function parsePlacement(v: unknown): ResourcePlacement | null {
  if (!isRecord(v)) return null;
  const resourceId = asString(v.resourceId);
  const atPointId = asString(v.atPointId);
  const destination = asString(v.destination);
  const movement = asString(v.movement);
  const duty = asString(v.duty);
  if (!resourceId || atPointId === null || destination === null) return null;
  if (!movement || !MOVEMENTS.has(movement as MovementState)) return null;
  if (!duty || !DUTIES.has(duty as DutyStatus)) return null;
  if (typeof v.emergencyCare !== "boolean") return null;
  return {
    resourceId,
    atPointId,
    destination,
    movement: movement as MovementState,
    duty: duty as DutyStatus,
    emergencyCare: v.emergencyCare,
  };
}

function parsePointList(v: unknown): MapPoint[] | null {
  if (!Array.isArray(v)) return null;
  const out: MapPoint[] = [];
  for (const item of v) {
    const p = parsePoint(item);
    if (!p) return null;
    out.push(p);
  }
  return out;
}

function parseUnitLists(v: unknown): { resources: MedicalResource[]; placements: ResourcePlacement[] } | null {
  if (!isRecord(v)) return null;
  if (!Array.isArray(v.resources) || !Array.isArray(v.placements)) return null;
  const resources: MedicalResource[] = [];
  for (const item of v.resources) {
    const r = parseResource(item);
    if (!r) return null;
    resources.push(r);
  }
  const placements: ResourcePlacement[] = [];
  for (const item of v.placements) {
    const p = parsePlacement(item);
    if (!p) return null;
    placements.push(p);
  }
  const ids = new Set(resources.map((r) => r.id));
  if (placements.some((p) => !ids.has(p.resourceId))) return null;
  if (placements.length !== resources.length) {
    const missing = resources.filter((r) => !placements.some((p) => p.resourceId === r.id));
    for (const r of missing) {
      placements.push({
        resourceId: r.id,
        atPointId: "",
        destination: "",
        movement: "at_icp_camp",
        duty: "at_location",
        emergencyCare: false,
      });
    }
  }
  return { resources, placements };
}

export function parseImportedJson(text: string): ParsedImport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, message: "That file is not valid JSON." };
  }
  if (!isRecord(data)) return { ok: false, message: "That file is not a board export." };
  const format = asString(data.format);
  const version = asFinite(data.version);
  if (version !== FILE_VERSION) return { ok: false, message: "Unsupported export version." };

  if (format === SNAP_FORMAT) {
    const points = parsePointList(data.points);
    if (!points) return { ok: false, message: "Snap point list is incomplete or invalid." };
    return { ok: true, kind: "points", points };
  }
  if (format === UNITS_FORMAT) {
    const units = parseUnitLists(data);
    if (!units) return { ok: false, message: "Unit table is incomplete or invalid." };
    return { ok: true, kind: "units", ...units };
  }
  if (format === BOARD_FORMAT) {
    const points = parsePointList(data.points);
    const units = parseUnitLists(data);
    if (!points || !units) return { ok: false, message: "Board file is incomplete or invalid." };
    return { ok: true, kind: "board", snapshot: { points, ...units } };
  }
  return { ok: false, message: "Unrecognized export type." };
}

export function snapPointsPayload(points: MapPoint[]) {
  return { format: SNAP_FORMAT, version: FILE_VERSION, savedAt: new Date().toISOString(), points };
}

export function unitsPayload(resources: MedicalResource[], placements: ResourcePlacement[]) {
  return { format: UNITS_FORMAT, version: FILE_VERSION, savedAt: new Date().toISOString(), resources, placements };
}

export function boardPayload(snapshot: BoardSnapshot) {
  return { format: BOARD_FORMAT, version: FILE_VERSION, savedAt: new Date().toISOString(), ...snapshot };
}

export function loadStoredBoard(): BoardSnapshot | null {
  try {
    const raw = localStorage.getItem(BOARD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = parseImportedJson(raw);
    if (!parsed.ok || parsed.kind !== "board") return null;
    return parsed.snapshot;
  } catch {
    return null;
  }
}

export function writeStoredBoard(snapshot: BoardSnapshot): boolean {
  try {
    localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(boardPayload(snapshot)));
    return true;
  } catch {
    return false;
  }
}

export function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function stampFilename(prefix: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `${prefix}-${day}.json`;
}
