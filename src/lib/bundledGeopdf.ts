import samplePdfUrl from "../../docs/samples/geopdf/ops_arch_e_land_20260824_1905_HighLava_WAGPF000684_0825day.pdf?url";
import { sha256Hex, type OverlayFile } from "./mapShare";

export const BUNDLED_GEOPDF_URL = samplePdfUrl;
export const BUNDLED_GEOPDF_NAME = "High Lava ops map";

let cachedBytes: Uint8Array | null = null;
let cachedHash: string | null = null;

export async function loadBundledGeopdfBytes(): Promise<Uint8Array> {
  if (cachedBytes) return cachedBytes;
  const res = await fetch(BUNDLED_GEOPDF_URL);
  if (!res.ok) throw new Error("Bundled GeoPDF is missing.");
  cachedBytes = new Uint8Array(await res.arrayBuffer());
  return cachedBytes;
}

export async function bundledGeopdfHash(): Promise<string> {
  if (cachedHash) return cachedHash;
  cachedHash = await sha256Hex(await loadBundledGeopdfBytes());
  return cachedHash;
}

export async function overlayFileFromBytes(bytes: Uint8Array, name: string): Promise<OverlayFile> {
  const sha256 = await sha256Hex(bytes);
  const bundled = cachedHash ?? (cachedBytes ? await bundledGeopdfHash() : null);
  return {
    name,
    bytes,
    sha256,
    size: bytes.byteLength,
    source: bundled && sha256 === bundled ? "bundled" : "bytes",
  };
}
