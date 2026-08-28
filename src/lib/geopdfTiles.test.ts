import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { largestViewport, parseGeoViewports, viewportBounds } from "./geoMeasure";
import {
  MAX_RENDER_SCALE,
  capScale,
  intersectRects,
  lonLatToPagePx,
  pagePxToLonLat,
  pdfTileTransform,
  tileWorldRect,
  worldIntersectToPageRect,
  worldIntersectToTileRect,
  wrapTileX,
} from "./geopdfTiles";

const bounds: [[number, number], [number, number]] = [
  [45.0, -122.5],
  [46.0, -121.5],
];
const page = { width: 2000, height: 1000 };

describe("lonLatToPagePx / pagePxToLonLat", () => {
  it("maps GPTS corners to page corners", () => {
    expect(lonLatToPagePx(46.0, -122.5, bounds, page)).toEqual({ x: 0, y: 0 });
    expect(lonLatToPagePx(45.0, -121.5, bounds, page)).toEqual({ x: 2000, y: 1000 });
    expect(lonLatToPagePx(45.0, -122.5, bounds, page)).toEqual({ x: 0, y: 1000 });
    expect(lonLatToPagePx(46.0, -121.5, bounds, page)).toEqual({ x: 2000, y: 0 });
  });

  it("inverts through the page center", () => {
    const mid = lonLatToPagePx(45.5, -122.0, bounds, page);
    expect(mid.x).toBeCloseTo(1000);
    expect(mid.y).toBeCloseTo(500);
    const back = pagePxToLonLat(mid.x, mid.y, bounds, page);
    expect(back.lat).toBeCloseTo(45.5);
    expect(back.lon).toBeCloseTo(-122.0);
  });
});

describe("intersectRects", () => {
  it("returns null when the tile misses the overlay", () => {
    const overlay = { x: 100, y: 100, width: 50, height: 50 };
    const tile = { x: 0, y: 0, width: 40, height: 40 };
    expect(intersectRects(overlay, tile)).toBeNull();
  });

  it("clips a partial overlap", () => {
    const overlay = { x: 10, y: 10, width: 100, height: 80 };
    const tile = { x: 80, y: 0, width: 256, height: 256 };
    expect(intersectRects(overlay, tile)).toEqual({ x: 80, y: 10, width: 30, height: 80 });
  });
});

describe("worldIntersectToPageRect", () => {
  it("maps the overlay world rect to the full page", () => {
    const overlayWorld = { x: 400, y: 200, width: 800, height: 400 };
    const pageRect = worldIntersectToPageRect(overlayWorld, overlayWorld, page);
    expect(pageRect.x).toBeCloseTo(0);
    expect(pageRect.y).toBeCloseTo(0);
    expect(pageRect.width).toBeCloseTo(2000);
    expect(pageRect.height).toBeCloseTo(1000);
  });
});

describe("worldIntersectToTileRect", () => {
  it("places the hit in tile-local pixels", () => {
    const tile = tileWorldRect(3, 5, 4);
    const hit = { x: tile.x + 10, y: tile.y + 20, width: 40, height: 50 };
    expect(worldIntersectToTileRect(tile, hit)).toEqual({ x: 10, y: 20, width: 40, height: 50 });
  });
});

describe("wrapTileX / capScale / pdfTileTransform", () => {
  it("wraps negative and overflow tile x", () => {
    expect(wrapTileX(-1, 3)).toBe(7);
    expect(wrapTileX(8, 3)).toBe(0);
  });

  it("caps render scale at 8", () => {
    expect(capScale(200)).toBe(MAX_RENDER_SCALE);
    expect(capScale(2)).toBe(2);
    expect(capScale(0)).toBe(1);
  });

  it("builds a pdf.js transform that maps pageRect onto dest", () => {
    const t = pdfTileTransform({ x: 100, y: 50, width: 200, height: 100 }, { x: 10, y: 20, width: 400, height: 200 });
    expect(t[0]).toBeCloseTo(2);
    expect(t[3]).toBeCloseTo(2);
    expect(t[4]).toBeCloseTo(10 - 200);
    expect(t[5]).toBeCloseTo(20 - 100);
  });
});

describe("High Lava sample GPTS", () => {
  it("maps GPTS bbox corners onto a page rectangle", () => {
    const bytes = new Uint8Array(
      readFileSync(resolve("docs/samples/geopdf/ops_arch_e_land_20260824_1905_HighLava_WAGPF000684_0825day.pdf")),
    );
    const view = largestViewport(parseGeoViewports(bytes));
    expect(view).toBeTruthy();
    const gpts = viewportBounds(view!);
    const page = { width: 3456, height: 2592 };
    const nw = lonLatToPagePx(gpts[1][0], gpts[0][1], gpts, page);
    const se = lonLatToPagePx(gpts[0][0], gpts[1][1], gpts, page);
    expect(nw.x).toBeCloseTo(0);
    expect(nw.y).toBeCloseTo(0);
    expect(se.x).toBeCloseTo(page.width);
    expect(se.y).toBeCloseTo(page.height);
    expect(gpts[0][0]).toBeGreaterThan(45.8);
    expect(gpts[1][0]).toBeLessThan(46.0);
  });
});
