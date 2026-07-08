import { describe, it, expect } from "vitest";
import { validatePackage } from "msvg-schema";
import { readPackage } from "./helpers.js";

describe("inventory-agent manifest", () => {
  const pkg = readPackage();

  it("is a valid package with zero errors (Spec Section 34)", () => {
    const result = validatePackage({
      config: pkg.config,
      targets: pkg.targets,
      timelines: pkg.timelines,
      states: pkg.states,
    });

    const errors = result.issues.filter((i) => i.severity === "error");
    expect(errors, JSON.stringify(errors, null, 2)).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("has no validation warnings either", () => {
    const result = validatePackage({
      config: pkg.config,
      targets: pkg.targets,
      timelines: pkg.timelines,
      states: pkg.states,
    });
    expect(result.issues, JSON.stringify(result.issues, null, 2)).toEqual([]);
  });

  it("matches the Section 34.1 manifest fields", () => {
    expect(pkg.config.schemaVersion).toBe("1.0");
    expect(pkg.config.id).toBe("inventory-agent");
    expect(pkg.config.name).toBe("Inventory Agent");
    expect(pkg.config.reducedMotion).toEqual({ strategy: "static", fallbackState: "idle" });
    expect(pkg.config.accessibility?.decorative).toBe(false);
  });

  it("declares the Section 34.3 timelines and 34.4 states", () => {
    expect(Object.keys(pkg.timelines)).toEqual([
      "intro",
      "hover",
      "loadingLoop",
      "success",
      "error",
    ]);
    expect(pkg.states?.initial).toBe("idle");
    expect(Object.keys(pkg.states?.states ?? {})).toEqual([
      "idle",
      "hovered",
      "loading",
      "success",
      "error",
    ]);
  });
});
