import type { MedicalResource, ResourcePlacement } from "./types";

export const seedResources: MedicalResource[] = [
  {
    id: "r-1",
    vendor: "Sierra Ambulance",
    fireName: "AMB-ALS-01",
    leaderName: "J. Hale",
    leaderPhone: "530-555-0101",
    capability: "ALS",
    kind: "ambulance",
  },
  {
    id: "r-2",
    vendor: "County EMS",
    fireName: "EMTF-04",
    leaderName: "R. Chen",
    leaderPhone: "530-555-0144",
    capability: "BLS",
    kind: "line_emt",
  },
  {
    id: "r-3",
    vendor: "Contract REMS",
    fireName: "REMS-T2-01",
    leaderName: "A. Ortiz",
    leaderPhone: "530-555-0190",
    capability: "ALS",
    kind: "rems_pickup",
  },
];

export const seedPlacements: ResourcePlacement[] = [
  {
    resourceId: "r-1",
    atPointId: "",
    destination: "",
    movement: "at_icp_camp",
    duty: "at_location",
    emergencyCare: false,
  },
  {
    resourceId: "r-2",
    atPointId: "",
    destination: "DP-7",
    movement: "en_route",
    duty: "enroute",
    emergencyCare: false,
  },
  {
    resourceId: "r-3",
    atPointId: "",
    destination: "",
    movement: "at_other",
    duty: "on_scene",
    emergencyCare: false,
  },
];
