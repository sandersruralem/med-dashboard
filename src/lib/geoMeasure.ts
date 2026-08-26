export interface GeoCorner {
  lat: number;
  lon: number;
}

export interface GeoViewport {
  bbox: [number, number, number, number];
  gpts: GeoCorner[];
  lpts: [number, number][];
}

const VIEWPORT_RE =
  /\/BBox\s*\[\s*([^\]]+)\][\s\S]{0,2400}?\/GPTS\s*\[\s*([^\]]+)\][\s\S]{0,400}?\/LPTS\s*\[\s*([^\]]+)\]/g;

function nums(s: string): number[] {
  return s
    .trim()
    .split(/[\s]+/)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

export function parseGeoViewports(pdfBytes: Uint8Array): GeoViewport[] {
  const ascii = new TextDecoder("latin1").decode(pdfBytes);
  const found: GeoViewport[] = [];
  for (const m of ascii.matchAll(VIEWPORT_RE)) {
    const bbox = nums(m[1]);
    const g = nums(m[2]);
    const l = nums(m[3]);
    if (bbox.length < 4 || g.length < 8 || l.length < 8) continue;
    const gpts: GeoCorner[] = [];
    for (let i = 0; i + 1 < g.length; i += 2) {
      gpts.push({ lat: g[i], lon: g[i + 1] });
    }
    const lpts: [number, number][] = [];
    for (let i = 0; i + 1 < l.length; i += 2) {
      lpts.push([l[i], l[i + 1]]);
    }
    found.push({
      bbox: [bbox[0], bbox[1], bbox[2], bbox[3]],
      gpts,
      lpts,
    });
  }
  return found;
}

export function largestViewport(views: GeoViewport[]): GeoViewport | undefined {
  return [...views].sort((a, b) => {
    const aa = Math.abs(a.bbox[2] - a.bbox[0]) * Math.abs(a.bbox[3] - a.bbox[1]);
    const ba = Math.abs(b.bbox[2] - b.bbox[0]) * Math.abs(b.bbox[3] - b.bbox[1]);
    return ba - aa;
  })[0];
}

export function viewportBounds(view: GeoViewport): [[number, number], [number, number]] {
  const lats = view.gpts.map((c) => c.lat);
  const lons = view.gpts.map((c) => c.lon);
  return [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ];
}
