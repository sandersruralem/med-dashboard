import ambulanceIcon from "../assets/markers/ambulance.svg?url";
import emtIcon from "../assets/markers/emt.svg?url";
import medicIcon from "../assets/markers/medic.svg?url";
import remsIcon from "../assets/markers/rems.svg?url";
import type { Capability, MarkerKind } from "../types";

export function unitMarkerSrc(kind: MarkerKind, capability: Capability): string {
  if (kind === "ambulance") return ambulanceIcon;
  if (kind === "rems_pickup") return remsIcon;
  if (kind === "line_paramedic" || (kind === "firefighter" && capability === "ALS")) return medicIcon;
  return emtIcon;
}

export function unitMarkerLabel(kind: MarkerKind, capability: Capability): string {
  if (kind === "ambulance") return "Ambulance";
  if (kind === "rems_pickup") return "REMS";
  if (kind === "line_paramedic" || (kind === "firefighter" && capability === "ALS")) return "Line Paramedic";
  return "Line EMT";
}
