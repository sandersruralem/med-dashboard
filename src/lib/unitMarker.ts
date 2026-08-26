import ambulanceIcon from "../assets/markers/ambulance.svg?url";
import emtIcon from "../assets/markers/emt.svg?url";
import medicIcon from "../assets/markers/medic.svg?url";
import remsIcon from "../assets/markers/rems.svg?url";
import type { Capability, MarkerKind } from "../types";

export function unitMarkerSrc(kind: MarkerKind, capability: Capability): string {
  if (kind === "ambulance") return ambulanceIcon;
  if (kind === "rems_pickup") return remsIcon;
  return capability === "ALS" ? medicIcon : emtIcon;
}

export function unitMarkerLabel(kind: MarkerKind, capability: Capability): string {
  if (kind === "ambulance") return "Ambulance";
  if (kind === "rems_pickup") return "REMS";
  return capability === "ALS" ? "Line paramedic" : "Line EMT";
}
