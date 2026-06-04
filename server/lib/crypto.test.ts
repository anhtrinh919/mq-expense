import { describe, it, expect } from "vitest";
import {
  generateDek,
  wrapDek,
  unwrapDek,
  encryptRecord,
  decryptRecord,
  hashPin,
  verifyPin,
  randomToken,
} from "./crypto.ts";

describe("at-rest crypto", () => {
  it("wraps and unwraps a DEK losslessly", () => {
    const dek = generateDek();
    const recovered = unwrapDek(wrapDek(dek));
    expect(recovered.equals(dek)).toBe(true);
  });

  it("encrypts and decrypts a record under its DEK", () => {
    const dek = generateDek();
    const plaintext = JSON.stringify({ id: "e1", amountVND: 1658525, note: "taxi · sân bay" });
    const sealed = encryptRecord(plaintext, dek);
    expect(sealed.toString("utf8")).not.toContain("amountVND"); // not stored in the clear
    expect(decryptRecord(sealed, dek)).toBe(plaintext);
  });

  it("cannot decrypt one account's record with another account's DEK (isolation)", () => {
    const a = generateDek();
    const b = generateDek();
    const sealed = encryptRecord("secret", a);
    expect(() => decryptRecord(sealed, b)).toThrow();
  });

  it("a tampered ciphertext fails the auth tag", () => {
    const dek = generateDek();
    const sealed = encryptRecord("secret", dek);
    sealed[sealed.length - 1] ^= 0xff;
    expect(() => decryptRecord(sealed, dek)).toThrow();
  });
});

describe("PIN hashing", () => {
  it("verifies the correct PIN and rejects the wrong one", () => {
    const { hash, salt } = hashPin("4827");
    expect(verifyPin("4827", hash, salt)).toBe(true);
    expect(verifyPin("4828", hash, salt)).toBe(false);
  });

  it("salts so two identical PINs hash differently", () => {
    expect(hashPin("1234").hash).not.toBe(hashPin("1234").hash);
  });
});

describe("tokens", () => {
  it("generates distinct url-safe tokens", () => {
    const t1 = randomToken();
    const t2 = randomToken();
    expect(t1).not.toBe(t2);
    expect(t1).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
