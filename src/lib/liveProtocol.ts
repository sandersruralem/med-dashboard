import type { BoardSnapshot, MapPointCategory } from "../types";

export const MAX_LIVE_MESSAGE_BYTES = 120 * 1024;
export const LIVE_EDITOR_KEY_PREFIX = "med-dashboard-editor:";
export const EMPTY_BOARD_SNAPSHOT: BoardSnapshot = { points: [], resources: [], placements: [] };

export function roomFromLocationHash(hash: string): string | null {
  const room = new URLSearchParams(hash.replace(/^#/, "")).get("room")?.trim() ?? "";
  return /^[A-Za-z0-9_-]{1,128}$/.test(room) ? room : null;
}

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
const SOURCES = new Set(["geopdf_extract", "manual"]);
const REVIEWS = new Set(["pending", "accepted", "rejected"]);
const KINDS = new Set(["ambulance", "firefighter", "rems_pickup"]);
const CAPABILITIES = new Set(["ALS", "BLS"]);
const MOVEMENTS = new Set(["at_icp_camp", "en_route", "at_other", "moving", "returning"]);
const DUTIES = new Set(["at_location", "on_scene", "enroute", "returned"]);

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function shortString(value: unknown, allowEmpty = true): value is string {
  return typeof value === "string" && value.length <= 4096 && (allowEmpty || value.length > 0);
}

export function isBoardSnapshot(value: unknown): value is BoardSnapshot {
  if (!record(value) || !Array.isArray(value.points) || !Array.isArray(value.resources) || !Array.isArray(value.placements)) {
    return false;
  }
  if (value.points.length > 2000 || value.resources.length > 1000 || value.placements.length > 1000) return false;

  const pointIds = new Set<string>();
  for (const point of value.points) {
    if (!record(point) || !shortString(point.id, false) || point.id.length > 256 || pointIds.has(point.id)) return false;
    if (!shortString(point.label, false) || typeof point.lat !== "number" || typeof point.lon !== "number") return false;
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon) || point.lat < -90 || point.lat > 90 || point.lon < -180 || point.lon > 180) {
      return false;
    }
    if (!CATEGORIES.has(point.category as MapPointCategory) || !SOURCES.has(point.source as string) || !REVIEWS.has(point.review as string)) {
      return false;
    }
    pointIds.add(point.id);
  }

  const resourceIds = new Set<string>();
  for (const resource of value.resources) {
    if (!record(resource) || !shortString(resource.id, false) || resource.id.length > 256 || resourceIds.has(resource.id)) return false;
    if (
      !shortString(resource.vendor) ||
      !shortString(resource.fireName) ||
      !shortString(resource.leaderName) ||
      !shortString(resource.leaderPhone) ||
      !KINDS.has(resource.kind as string) ||
      !CAPABILITIES.has(resource.capability as string)
    ) {
      return false;
    }
    resourceIds.add(resource.id);
  }

  const placed = new Set<string>();
  for (const placement of value.placements) {
    if (!record(placement) || !shortString(placement.resourceId, false) || placed.has(placement.resourceId)) return false;
    if (!resourceIds.has(placement.resourceId) || !shortString(placement.atPointId) || !shortString(placement.destination)) return false;
    if (placement.atPointId && !pointIds.has(placement.atPointId)) return false;
    if (
      !MOVEMENTS.has(placement.movement as string) ||
      !DUTIES.has(placement.duty as string) ||
      typeof placement.emergencyCare !== "boolean"
    ) {
      return false;
    }
    placed.add(placement.resourceId);
  }

  return placed.size === resourceIds.size;
}

export type LiveRole = "editor" | "viewer";
export type ClientLiveMessage = { type: "snapshot"; snapshot: BoardSnapshot };
export type ServerLiveMessage =
  | { type: "init"; role: LiveRole; snapshot: BoardSnapshot | null }
  | { type: "snapshot"; snapshot: BoardSnapshot }
  | { type: "error"; message: string };
