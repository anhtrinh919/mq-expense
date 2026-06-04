import { describe, it, expect } from "vitest";
import { effectiveRate, toVND, conversionNote, rateSource } from "./currency";

describe("currency conversion", () => {
  it("applies the markup to the rate", () => {
    expect(effectiveRate(800, 3)).toBeCloseTo(824, 5);
  });

  it("converts to whole VND with markup, rounded", () => {
    // 1250 THB × (736.82 × 1.03) = 948,655.75 → 948656
    expect(toVND(1250, 736.82, 3)).toBe(948656);
  });

  it("rounds to the nearest whole VND", () => {
    expect(toVND(1, 736.824, 0)).toBe(737);
  });

  it("builds the conversion note in the cowork format", () => {
    const eff = effectiveRate(736.82, 3);
    const vnd = toVND(1250, 736.82, 3);
    expect(conversionNote(1250, "THB", eff, vnd, 3)).toBe("1,250.00 THB × 759 = 948,656 VND [xe.com +3%]");
  });

  it("formats the rate source", () => {
    expect(rateSource(3)).toBe("xe.com +3%");
  });
});
