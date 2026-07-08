import { describe, it, expect } from "vitest";
import { validatePackage } from "msvg-schema";
import type { ValidatePackageInput } from "msvg-schema";
import { config, targets, timelines, states } from "./fixtures.js";

describe("validatePackage (aggregate, Spec Section 30)", () => {
  it("is valid with zero issues for the spec example", () => {
    const result = validatePackage({ config, targets, timelines, states });
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("works without a state machine", () => {
    const result = validatePackage({ config, targets, timelines });
    expect(result.valid).toBe(true);
  });

  it("is invalid when any validator reports an error", () => {
    const brokenTimelines = {
      ...timelines,
      broken: [
        {
          target: "ghost",
          at: 0,
          keyframes: [{ opacity: 0 }],
          options: { duration: 300 },
        },
      ],
    };
    const result = validatePackage({
      config,
      targets,
      timelines: brokenTimelines,
      states,
    } as ValidatePackageInput);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "unknown-target")).toBe(true);
  });

  it("stays valid when only warnings are present", () => {
    const noA11y = {
      ...config,
      accessibility: undefined,
      reducedMotion: undefined,
    };
    const result = validatePackage({
      config: noA11y,
      targets,
      timelines,
      states,
    } as ValidatePackageInput);
    expect(result.valid).toBe(true);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.every((i) => i.severity === "warning")).toBe(true);
  });
});
