import { describe, it, expect } from "vitest";
import { validateAccessibility } from "msvg-schema";
import { config, states, timelines } from "./fixtures.js";

const codes = (issues: { code: string; severity: string }[]) =>
  issues.map((i) => i.code);

describe("validateAccessibility (Spec Section 30.5, all warnings)", () => {
  it("passes the spec example config", () => {
    expect(validateAccessibility(config, states, timelines)).toEqual([]);
  });

  it("emits only warnings, never errors", () => {
    const issues = validateAccessibility({}, states, timelines);
    expect(issues.every((i) => i.severity === "warning")).toBe(true);
  });

  it("warns on a missing title", () => {
    const issues = validateAccessibility({
      accessibility: { description: "x", decorative: false },
      reducedMotion: { strategy: "static" },
    });
    expect(codes(issues)).toContain("missing-title");
  });

  it("warns on a missing description for a non-decorative animation", () => {
    const issues = validateAccessibility({
      accessibility: { title: "x", decorative: false },
      reducedMotion: { strategy: "static" },
    });
    expect(codes(issues)).toContain("missing-description");
  });

  it("does not warn about description when decorative is true", () => {
    const issues = validateAccessibility({
      accessibility: { title: "x", decorative: true },
      reducedMotion: { strategy: "static" },
    });
    expect(codes(issues)).not.toContain("missing-description");
  });

  it("warns on a missing reducedMotion config", () => {
    const issues = validateAccessibility({
      accessibility: { title: "x", description: "y" },
    });
    expect(codes(issues)).toContain("missing-reduced-motion");
  });

  it("warns when a looping timeline has strategy none", () => {
    const issues = validateAccessibility(
      {
        accessibility: { title: "x", description: "y" },
        reducedMotion: { strategy: "none" },
      },
      states,
      timelines,
    );
    expect(codes(issues)).toContain("looping-without-reduced-motion");
  });

  it("does not warn about looping when a real strategy is set", () => {
    const issues = validateAccessibility(
      {
        accessibility: { title: "x", description: "y" },
        reducedMotion: { strategy: "static" },
      },
      states,
      timelines,
    );
    expect(codes(issues)).not.toContain("looping-without-reduced-motion");
  });
});
