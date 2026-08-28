import { describe, expect, it } from "vitest";
import { parseEditorInbound, roomIdFromPartyMapPath, validateMapPut } from "../../server/liveRooms";
import { isMapMeta, isPdfMagic, mapChunkCount, sha256Hex } from "./mapShare";

describe("mapShare", () => {
  it("accepts PDF magic and rejects other bytes", () => {
    expect(isPdfMagic(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(true);
    expect(isPdfMagic(new Uint8Array([0x00, 0x01, 0x02, 0x03]))).toBe(false);
  });

  it("validates map meta", () => {
    const meta = {
      name: "ops.pdf",
      size: 12,
      sha256: "a".repeat(64),
      source: "bundled" as const,
    };
    expect(isMapMeta(meta)).toBe(true);
    expect(isMapMeta({ ...meta, source: "other" })).toBe(false);
    expect(isMapMeta({ ...meta, sha256: "zz" })).toBe(false);
  });

  it("counts 64 KiB chunks", () => {
    expect(mapChunkCount(1)).toBe(1);
    expect(mapChunkCount(64 * 1024)).toBe(1);
    expect(mapChunkCount(64 * 1024 + 1)).toBe(2);
  });

  it("hashes bytes", async () => {
    const hex = await sha256Hex(new Uint8Array([1, 2, 3]));
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("live map routes", () => {
  it("parses /parties/main/:room/map", () => {
    expect(roomIdFromPartyMapPath("/parties/main/abc-1/map")).toBe("abc-1");
    expect(roomIdFromPartyMapPath("/parties/main/abc-1")).toBeNull();
  });

  it("parses editor map-ready and rejects viewers", () => {
    const map = { name: "ops.pdf", size: 8, sha256: "b".repeat(64), source: "bytes" as const };
    const parsed = parseEditorInbound("editor", JSON.stringify({ type: "map-ready", map }));
    expect(parsed).toEqual({ ok: true, kind: "map", map });
    expect(parseEditorInbound("viewer", JSON.stringify({ type: "map-ready", map })).ok).toBe(false);
  });

  it("requires an editor key and PDF magic for PUT", () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(validateMapPut("secret", "secret", pdf)).toBeNull();
    expect(validateMapPut("secret", "other", pdf)).toMatch(/Editor key/);
    expect(validateMapPut("secret", "secret", new Uint8Array([1, 2, 3, 4, 5]))).toMatch(/PDF/);
  });
});
