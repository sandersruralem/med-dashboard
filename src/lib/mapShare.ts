export const MAX_MAP_BYTES = 20 * 1024 * 1024;
export const MAP_CHUNK_BYTES = 64 * 1024;
export const MAP_META_STORAGE = "mapMeta";

export type MapSource = "bundled" | "bytes";

export interface MapMeta {
  name: string;
  size: number;
  sha256: string;
  source: MapSource;
}

export interface OverlayFile extends MapMeta {
  bytes: Uint8Array;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isPdfMagic(data: Uint8Array): boolean {
  return data.length >= 4 && data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46;
}

export function isMapMeta(value: unknown): value is MapMeta {
  if (!record(value)) return false;
  if (typeof value.name !== "string" || value.name.length === 0 || value.name.length > 512) return false;
  if (typeof value.size !== "number" || !Number.isFinite(value.size) || value.size < 1 || value.size > MAX_MAP_BYTES) {
    return false;
  }
  if (typeof value.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(value.sha256)) return false;
  return value.source === "bundled" || value.source === "bytes";
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", toArrayBuffer(data));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function mapChunkCount(size: number): number {
  return Math.ceil(size / MAP_CHUNK_BYTES);
}

export function mapChunkKey(index: number): string {
  return `map:${index}`;
}

export function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

export function asUint8(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return null;
}
