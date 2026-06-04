import { describe, it, expect } from "vitest";
import { hashPin, verifyPin, isValidPin } from "./pin";

describe("pin", () => {
  it("hashes deterministically and never returns the plaintext", async () => {
    const h = await hashPin("1234");
    expect(h).toBe(await hashPin("1234"));
    expect(h).not.toContain("1234");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("verifies the right PIN and rejects the wrong one", async () => {
    const h = await hashPin("4821");
    expect(await verifyPin("4821", h)).toBe(true);
    expect(await verifyPin("0000", h)).toBe(false);
    expect(await verifyPin("4821", null)).toBe(false); // no PIN set
  });

  it("accepts 4–8 digit PINs only", () => {
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("12345678")).toBe(true);
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("123456789")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
  });
});
