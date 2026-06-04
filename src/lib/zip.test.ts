import { describe, it, expect } from "vitest";
import { makeZip } from "./zip";

describe("zip writer", () => {
  it("produces a valid store-method zip with both entries", async () => {
    const a = new TextEncoder().encode("hello pdf");
    const b = new TextEncoder().encode("hello xlsx");
    const blob = makeZip([{ name: "a.pdf", data: a }, { name: "b.xlsx", data: b }]);
    expect(blob.type).toBe("application/zip");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    // local file header signature PK\x03\x04
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    // EOCD signature PK\x05\x06 near the end, with entry count = 2
    const dv = new DataView(bytes.buffer);
    const eocd = bytes.length - 22;
    expect(dv.getUint32(eocd, true)).toBe(0x06054b50);
    expect(dv.getUint16(eocd + 10, true)).toBe(2); // total central dir records
    // both filenames appear in the bytes
    const txt = new TextDecoder().decode(bytes);
    expect(txt.includes("a.pdf")).toBe(true);
    expect(txt.includes("b.xlsx")).toBe(true);
  });
});
