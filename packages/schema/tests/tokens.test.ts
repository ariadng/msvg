import { describe, it, expect } from "vitest";
import { easings, durations, SUPPORTED_SCHEMA_VERSIONS } from "msvg-schema";

describe("tokens (Spec Section 18)", () => {
  it("exposes the canonical easing table verbatim", () => {
    expect(easings).toEqual({
      linear: "linear",
      standard: "cubic-bezier(.2, 0, 0, 1)",
      soft: "cubic-bezier(.4, 0, .2, 1)",
      emphasized: "cubic-bezier(.05, .7, .1, 1)",
      bounceSoft: "cubic-bezier(.34, 1.56, .64, 1)",
    });
  });

  it("pins emphasized to the exact spec value", () => {
    expect(easings.emphasized).toBe("cubic-bezier(.05, .7, .1, 1)");
  });

  it("exposes the canonical duration table verbatim", () => {
    expect(durations).toEqual({
      instant: 0,
      fast: 180,
      medium: 420,
      slow: 900,
      ambient: 2800,
    });
  });

  it("supports schema version 1.0", () => {
    expect(SUPPORTED_SCHEMA_VERSIONS).toEqual(["1.0"]);
  });
});
