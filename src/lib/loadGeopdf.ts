import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type PDFPageProxy } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { largestViewport, parseGeoViewports, viewportBounds, type GeoViewport } from "./geoMeasure";

GlobalWorkerOptions.workerSrc = workerSrc;

export interface LoadedGeopdf {
  name: string;
  /** Low-res JPEG for first paint while tiles render. */
  imageUrl: string;
  bounds: [[number, number], [number, number]];
  viewport: GeoViewport;
  pageSize: { width: number; height: number };
  page: PDFPageProxy;
  dispose: () => void;
}

const WASM_URL = `${import.meta.env.BASE_URL}pdfjs-wasm/`;

export async function loadGeopdf(data: Uint8Array, name: string): Promise<LoadedGeopdf> {
  const views = parseGeoViewports(data);
  const viewport = largestViewport(views);
  if (!viewport) {
    throw new Error("No geospatial measure (GPTS/LPTS) found in this PDF.");
  }

  const task = getDocument({
    data: data.slice(),
    wasmUrl: WASM_URL,
  });
  const pdf: PDFDocumentProxy = await task.promise;
  const page = await pdf.getPage(1);
  const vp = page.getViewport({ scale: 1 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(vp.width);
  canvas.height = Math.floor(vp.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    await task.destroy();
    throw new Error("Could not create canvas for PDF page.");
  }
  await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;

  let disposed = false;
  return {
    name,
    imageUrl: canvas.toDataURL("image/jpeg", 0.85),
    bounds: viewportBounds(viewport),
    viewport,
    pageSize: { width: vp.width, height: vp.height },
    page,
    dispose() {
      if (disposed) return;
      disposed = true;
      void task.destroy();
    },
  };
}
