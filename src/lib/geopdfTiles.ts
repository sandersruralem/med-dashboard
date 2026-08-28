/** ImageOverlay-equivalent mapping: page pixels stretch between GPTS corners. */

export const TILE_SIZE = 256;
export const MAX_RENDER_SCALE = 8;

export type OverlayBounds = [[number, number], [number, number]];

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function overlaySouthWestNorthEast(bounds: OverlayBounds) {
  return {
    south: bounds[0][0],
    west: bounds[0][1],
    north: bounds[1][0],
    east: bounds[1][1],
  };
}

/** Page canvas: x=0 → west, x=width → east; y=0 (top) → north, y=height → south. */
export function lonLatToPagePx(lat: number, lon: number, bounds: OverlayBounds, page: Size) {
  const { south, west, north, east } = overlaySouthWestNorthEast(bounds);
  const x = ((lon - west) / (east - west)) * page.width;
  const y = ((north - lat) / (north - south)) * page.height;
  return { x, y };
}

export function pagePxToLonLat(x: number, y: number, bounds: OverlayBounds, page: Size) {
  const { south, west, north, east } = overlaySouthWestNorthEast(bounds);
  return {
    lon: west + (x / page.width) * (east - west),
    lat: north - (y / page.height) * (north - south),
  };
}

export function intersectRects(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const width = right - x;
  const height = bottom - y;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

/** Leaflet ImageOverlay stretch: linear in layer / world pixels between NW and SE. */
export function worldIntersectToPageRect(overlayWorld: Rect, hit: Rect, page: Size): Rect {
  return {
    x: ((hit.x - overlayWorld.x) / overlayWorld.width) * page.width,
    y: ((hit.y - overlayWorld.y) / overlayWorld.height) * page.height,
    width: (hit.width / overlayWorld.width) * page.width,
    height: (hit.height / overlayWorld.height) * page.height,
  };
}

export function worldIntersectToTileRect(tileWorld: Rect, hit: Rect): Rect {
  return {
    x: hit.x - tileWorld.x,
    y: hit.y - tileWorld.y,
    width: hit.width,
    height: hit.height,
  };
}

export function wrapTileX(x: number, z: number): number {
  const n = 2 ** z;
  return ((x % n) + n) % n;
}

export function tileWorldRect(x: number, y: number, z: number, tileSize = TILE_SIZE): Rect {
  return {
    x: wrapTileX(x, z) * tileSize,
    y: y * tileSize,
    width: tileSize,
    height: tileSize,
  };
}

export function capScale(scale: number, max = MAX_RENDER_SCALE): number {
  if (!Number.isFinite(scale) || scale <= 0) return 1;
  return Math.min(scale, max);
}

/**
 * pdf.js `transform` applied before the scale-1 viewport, so `pageRect`
 * (scale-1 page pixels) fills `dest` on the tile canvas.
 */
export function pdfTileTransform(pageRect: Rect, dest: Rect): [number, number, number, number, number, number] {
  const sx = dest.width / pageRect.width;
  const sy = dest.height / pageRect.height;
  return [sx, 0, 0, sy, dest.x - pageRect.x * sx, dest.y - pageRect.y * sy];
}

export function tileRenderScale(pageRect: Rect, dest: Rect): number {
  return capScale(Math.max(dest.width / pageRect.width, dest.height / pageRect.height));
}

export function scaleRect(rect: Rect, factor: number): Rect {
  return {
    x: rect.x * factor,
    y: rect.y * factor,
    width: rect.width * factor,
    height: rect.height * factor,
  };
}
