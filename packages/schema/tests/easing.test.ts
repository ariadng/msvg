import { describe, it, expect } from "vitest";
import { isValidEasing } from "msvg-schema";

describe("isValidEasing (Spec Sections 10.3, 18.1)", () => {
  it("accepts every named token", () => {
    for (const token of ["linear", "standard", "soft", "emphasized", "bounceSoft"]) {
      expect(isValidEasing(token)).toBe(true);
    }
  });

  it("accepts raw CSS easing keywords", () => {
    for (const keyword of ["linear", "ease", "ease-in", "ease-out", "ease-in-out"]) {
      expect(isValidEasing(keyword)).toBe(true);
    }
  });

  it("accepts well-formed cubic-bezier with four numeric args", () => {
    expect(isValidEasing("cubic-bezier(.34, 1.56, .64, 1)")).toBe(true);
    expect(isValidEasing("cubic-bezier(0, 0, 1, 1)")).toBe(true);
    expect(isValidEasing("cubic-bezier(-.1, .7, .1, 1.2)")).toBe(true);
  });

  it("accepts steps() with and without a position", () => {
    expect(isValidEasing("steps(4)")).toBe(true);
    expect(isValidEasing("steps(4, jump-end)")).toBe(true);
    expect(isValidEasing("steps(3, start)")).toBe(true);
  });

  it("accepts caller-supplied extra tokens", () => {
    expect(isValidEasing("brandBounce", ["brandBounce"])).toBe(true);
  });

  it("rejects malformed and unknown easings", () => {
    expect(isValidEasing("wobble")).toBe(false);
    expect(isValidEasing("cubic-bezier(.1, .2, .3)")).toBe(false); // only 3 args
    expect(isValidEasing("cubic-bezier(a, b, c, d)")).toBe(false); // non-numeric
    expect(isValidEasing("steps(fast)")).toBe(false);
    expect(isValidEasing("steps(4, sideways)")).toBe(false);
    expect(isValidEasing("")).toBe(false);
    expect(isValidEasing(42)).toBe(false);
    expect(isValidEasing(undefined)).toBe(false);
  });
});
