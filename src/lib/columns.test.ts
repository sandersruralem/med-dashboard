import { describe, expect, it } from "vitest";
import {
  DEFAULT_COLUMN_WIDTHS,
  MIN_COLUMN_WIDTH_PX,
  clampColumnWidth,
  parseColumnVisibility,
  parseColumnWidths,
} from "./columns";

describe("column widths", () => {
  it("keeps defaults when storage is empty or invalid", () => {
    expect(parseColumnWidths(null)).toEqual(DEFAULT_COLUMN_WIDTHS);
    expect(parseColumnWidths("wide")).toEqual(DEFAULT_COLUMN_WIDTHS);
  });

  it("clamps stored widths and ignores unknown keys", () => {
    const parsed = parseColumnWidths({ fireName: 240, kind: 10, extra: 99 });
    expect(parsed.fireName).toBe(240);
    expect(parsed.kind).toBe(MIN_COLUMN_WIDTH_PX);
    expect(parsed.location).toBe(DEFAULT_COLUMN_WIDTHS.location);
    expect("extra" in parsed).toBe(false);
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
});
