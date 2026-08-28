import { CRS, GridLayer, latLng, type Coords, type DoneCallback, type GridLayerOptions, type Map as LeafletMap } from "leaflet";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import {
  TILE_SIZE,
  capScale,
  intersectRects,
  overlaySouthWestNorthEast,
  pdfTileTransform,
  scaleRect,
  tileWorldRect,
  worldIntersectToPageRect,
  worldIntersectToTileRect,
} from "../lib/geopdfTiles";
import type { LoadedGeopdf } from "../lib/loadGeopdf";

const LRU_MAX = 64;
const PREVIEW_HIDE_AFTER = 8;

class RenderQueue {
  private q: Array<() => Promise<void>> = [];
  private running = false;

  enqueue(job: () => Promise<void>): void {
    this.q.push(job);
    void this.kick();
  }

  clear(): void {
    this.q = [];
  }

  private async kick() {
    if (this.running) return;
    this.running = true;
    while (this.q.length) {
      const job = this.q.shift();
      if (job) await job();
    }
    this.running = false;
  }
}

class TileLru {
  private map = new Map<string, ImageData>();

  get(key: string): ImageData | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    this.map.delete(key);
    this.map.set(key, hit);
    return hit;
  }

  set(key: string, value: ImageData): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.LRU_MAX) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  constructor(private readonly LRU_MAX = 64) {}
}

type LayerOpts = GridLayerOptions & {
  overlay: LoadedGeopdf;
  onPainted?: () => void;
};

class GeopdfGrid extends GridLayer {
  private overlay: LoadedGeopdf;
  private queue = new RenderQueue();
  private cache = new TileLru(LRU_MAX);
  private gen = 0;
  private painted = 0;
  private onPainted?: () => void;

  constructor(opts: LayerOpts) {
    const { overlay, onPainted, ...gridOpts } = opts;
    super({
      tileSize: TILE_SIZE,
      zIndex: 200,
      pane: "overlayPane",
      opacity: 1,
      keepBuffer: 2,
      className: "geopdf-tiles",
      ...gridOpts,
    });
    this.overlay = overlay;
    this.onPainted = onPainted;
  }

  onRemove(map: LeafletMap) {
    this.gen += 1;
    this.queue.clear();
    return super.onRemove(map);
  }

  createTile(coords: Coords, done: DoneCallback) {
    const canvas = document.createElement("canvas");
    const dpr = Math.max(1, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    canvas.width = TILE_SIZE * dpr;
    canvas.height = TILE_SIZE * dpr;
    canvas.style.width = `${TILE_SIZE}px`;
    canvas.style.height = `${TILE_SIZE}px`;

    const gen = this.gen;
    const key = `${coords.z}/${coords.x}/${coords.y}`;
    const cached = this.cache.get(key);
    if (cached) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.putImageData(cached, 0, 0);
      done(undefined, canvas);
      return canvas;
    }

    this.queue.enqueue(async () => {
      if (this.gen !== gen) return;
      try {
        await this.paint(coords, canvas, dpr, key);
        if (this.gen !== gen) return;
        done(undefined, canvas);
      } catch (err) {
        if (this.gen !== gen) return;
        done(err instanceof Error ? err : new Error("GeoPDF tile failed"), canvas);
      }
    });
    return canvas;
  }

  private notePainted() {
    this.painted += 1;
    if (this.painted === PREVIEW_HIDE_AFTER) this.onPainted?.();
  }

  private async paint(coords: Coords, canvas: HTMLCanvasElement, dpr: number, key: string) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { bounds, pageSize, page } = this.overlay;
    const { south, west, north, east } = overlaySouthWestNorthEast(bounds);
    const nw = CRS.EPSG3857.latLngToPoint(latLng(north, west), coords.z);
    const se = CRS.EPSG3857.latLngToPoint(latLng(south, east), coords.z);
    const overlayWorld = { x: nw.x, y: nw.y, width: se.x - nw.x, height: se.y - nw.y };
    if (overlayWorld.width <= 0 || overlayWorld.height <= 0) return;

    const tileWorld = tileWorldRect(coords.x, coords.y, coords.z);
    const hit = intersectRects(overlayWorld, tileWorld);
    if (!hit) {
      this.cache.set(key, ctx.getImageData(0, 0, canvas.width, canvas.height));
      return;
    }

    const pageRect = worldIntersectToPageRect(overlayWorld, hit, pageSize);
    const destCss = worldIntersectToTileRect(tileWorld, hit);
    const dest = scaleRect(destCss, dpr);
    if (pageRect.width <= 0 || pageRect.height <= 0 || dest.width <= 0 || dest.height <= 0) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rawScale = Math.max(dest.width / pageRect.width, dest.height / pageRect.height);
    const scale = capScale(rawScale);
    const shrink = scale / rawScale;
    const sliceW = Math.max(1, Math.round(dest.width * shrink));
    const sliceH = Math.max(1, Math.round(dest.height * shrink));
    const slice = document.createElement("canvas");
    slice.width = sliceW;
    slice.height = sliceH;
    const sliceCtx = slice.getContext("2d");
    if (!sliceCtx) return;

    try {
      await page.render({
        canvas: slice,
        canvasContext: sliceCtx,
        viewport: page.getViewport({ scale: 1 }),
        transform: pdfTileTransform(pageRect, { x: 0, y: 0, width: sliceW, height: sliceH }),
        background: "rgb(255,255,255)",
      }).promise;
    } catch {
      return;
    }
    ctx.drawImage(slice, dest.x, dest.y, dest.width, dest.height);

    this.cache.set(key, ctx.getImageData(0, 0, canvas.width, canvas.height));
    this.notePainted();
  }
}

export function GeopdfTileLayer({
  overlay,
  onReady,
}: {
  overlay: LoadedGeopdf;
  onReady?: () => void;
}) {
  const map = useMap();
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const layer = new GeopdfGrid({
      overlay,
      onPainted: () => readyRef.current?.(),
    });
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, overlay]);

  return null;
}
