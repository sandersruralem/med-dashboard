import { describe, expect, it } from "vitest";
import { normalizeMarkerKind } from "./types";

describe("normalizeMarkerKind", () => {
  it("splits the old firefighter kind using ALS/BLS", () => {
    expect(normalizeMarkerKind("firefighter", "BLS")).toBe("line_emt");
    expect(normalizeMarkerKind("firefighter", "ALS")).toBe("line_paramedic");
  });

  it("keeps the four current types", () => {
    expect(normalizeMarkerKind("ambulance", "ALS")).toBe("ambulance");
    expect(normalizeMarkerKind("line_emt", "ALS")).toBe("line_emt");
    expect(normalizeMarkerKind("line_paramedic", "BLS")).toBe("line_paramedic");
    expect(normalizeMarkerKind("rems_pickup", "ALS")).toBe("rems_pickup");
  });

  it("rejects unknown kinds", () => {
    expect(normalizeMarkerKind("helicopter", "ALS")).toBeNull();
  });
});
