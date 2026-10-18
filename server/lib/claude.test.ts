import { describe, it, expect } from "vitest";
import { parseCliOutput } from "./claude.ts";

describe("parseCliOutput", () => {
  it("reads a good CLI reply", () => {
    const out = JSON.stringify({ is_error: false, result: '{"date":"2026-07-02","amount":289249,"currency":"VND","confidence":"high"}' });
    expect(parseCliOutput(out)).toEqual({ date: "2026-07-02", amount: 289249, currency: "VND", confidence: "high" });
  });

  it("marks the reader offline when the CLI replies with an error (exit code is still 0)", () => {
    const out = JSON.stringify({ is_error: true, result: "Failed to authenticate: OAuth session expired and could not be refreshed" });
    expect(parseCliOutput(out)).toEqual({ date: null, amount: null, currency: null, confidence: "low", offline: true });
  });

  it("still reads plain text that is not an envelope", () => {
    expect(parseCliOutput('{"date":null,"amount":12.5,"currency":"usd","confidence":"low"}')).toEqual({
      date: null, amount: 12.5, currency: "USD", confidence: "low",
    });
  });
});
