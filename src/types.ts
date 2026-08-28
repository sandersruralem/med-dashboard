export type Capability = "ALS" | "BLS";

export type MarkerKind = "ambulance" | "firefighter" | "rems_pickup";

export type DutyStatus = "at_location" | "on_scene" | "enroute" | "returned";

export type MovementState =
  | "at_icp_camp"
  | "en_route"
  | "at_other"
  | "moving"
  | "returning";

export type MapPointCategory =
  | "drop_point"
  | "junction"
  | "helispot"
  | "unimproved_helispot"
  | "helibase"
  | "icp"
  | "camp"
  | "staging"
  | "safety_zone"
  | "lookout"
  | "incident_base";

export const CATEGORY_LABELS: Record<MapPointCategory, string> = {
  drop_point: "Drop point",
  junction: "Junction",
  helispot: "Helispot",
  unimproved_helispot: "Unimproved helispot",
  helibase: "Helibase",
  icp: "ICP",
  camp: "Camp",
  staging: "Staging",
  safety_zone: "Safety zone",
  lookout: "Lookout",
  incident_base: "Incident base",
};

export type ReviewStatus = "pending" | "accepted" | "rejected";

export interface MapPoint {
  id: string;
  category: MapPointCategory;
  label: string;
  lat: number;
  lon: number;
  source: "geopdf_extract" | "manual";
  review: ReviewStatus;
}

export interface MedicalResource {
  id: string;
  vendor: string;
  fireName: string;
  leaderName: string;
  leaderPhone: string;
  capability: Capability;
  kind: MarkerKind;
}

export interface ResourcePlacement {
  resourceId: string;
  atPointId: string;
  destination: string;
  movement: MovementState;
  duty: DutyStatus;
  emergencyCare: boolean;
}

export interface BoardSnapshot {
  points: MapPoint[];
  resources: MedicalResource[];
  placements: ResourcePlacement[];
}

export function isInTransit(placement: ResourcePlacement): boolean {
  return placement.duty === "enroute";
}

export function rowTone(placement: ResourcePlacement): "blue" | "yellow" | "green" | "slate" | "red" {
  if (placement.emergencyCare) return "red";
  if (placement.duty === "enroute") return "yellow";
  if (placement.duty === "on_scene") return "green";
  if (placement.duty === "returned") return "slate";
  return "blue";
}
