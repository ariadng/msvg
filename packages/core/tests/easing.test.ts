import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveEasing } from "msvg-core";

describe("resolveEasing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves a token name to its CSS value", () => {
    expect(resolveEasing("soft")).toBe("cubic-bezier(.4, 0, .2, 1)");
    expect(resolveEasing("standard")).toBe("cubic-bezier(.2, 0, 0, 1)");
    expect(resolveEasing("linear")).toBe("linear");
    expect(resolveEasing("emphasized")).toBe("cubic-bezier(.05, .7, .1, 1)");
  });

  it("passes raw CSS easing strings through unchanged", () => {
    expect(resolveEasing("ease-in-out")).toBe("ease-in-out");
    expect(resolveEasing("cubic-bezier(0.1, 0.2, 0.3, 0.4)")).toBe(
      "cubic-bezier(0.1, 0.2, 0.3, 0.4)",
    );
    expect(resolveEasing("steps(4, jump-end)")).toBe("steps(4, jump-end)");
  });

  it("falls back to linear with an [msvg] warning for unknown values", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveEasing("wobbly")).toBe("linear");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("[msvg]");
    expect(warn.mock.calls[0]?.[0]).toContain("wobbly");
  });

  it("treats undefined/empty easing as linear without warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveEasing(undefined)).toBe("linear");
    expect(resolveEasing("")).toBe("linear");
    expect(resolveEasing("   ")).toBe("linear");
    expect(warn).not.toHaveBeenCalled();
  });

  it("prefers a custom token map, then falls back to the canonical table", () => {
    const custom = { snappy: "cubic-bezier(0.9, 0, 1, 1)" };
    expect(resolveEasing("snappy", custom)).toBe("cubic-bezier(0.9, 0, 1, 1)");
    // "soft" is not in the custom map but is canonical — still resolves.
    expect(resolveEasing("soft", custom)).toBe("cubic-bezier(.4, 0, .2, 1)");
  });
});
