import { describe, expect, it } from "vitest";
import {
  DEFAULT_COLUMN_WIDTHS,
  MIN_COLUMN_WIDTH_PX,
  MIN_LOCATION_WIDTH_PX,
  clampColumnWidth,
  parseColumnVisibility,
  parseColumnWidths,
} from "./columns";

describe("column widths", () => {
  it("keeps defaults when storage is empty or invalid", () => {
    expect(parseColumnWidths(null)).toEqual(DEFAULT_COLUMN_WIDTHS);
    expect(parseColumnWidths("wide")).toEqual(DEFAULT_COLUMN_WIDTHS);
  });

  it("lets location go narrower than other columns", () => {
    const parsed = parseColumnWidths({ location: 10, kind: 10 });
    expect(parsed.location).toBe(MIN_LOCATION_WIDTH_PX);
    expect(parsed.kind).toBe(MIN_COLUMN_WIDTH_PX);
  });

  it("does not let visibility parse wipe unknown fields onto widths", () => {
    const vis = parseColumnVisibility({ fireName: false, vendor: true });
    expect(vis.vendor).toBe(true);
    expect(vis.fireName).toBe(false);
    expect(vis.location).toBe(true);
  });
});

describe("clampColumnWidth", () => {
  it("rejects non-finite values", () => {
    expect(clampColumnWidth(Number.NaN)).toBe(MIN_COLUMN_WIDTH_PX);
  });

  it("uses the location floor when clamping location", () => {
    expect(clampColumnWidth(10, "location")).toBe(MIN_LOCATION_WIDTH_PX);
    expect(clampColumnWidth(60, "location")).toBe(60);
  });
});
