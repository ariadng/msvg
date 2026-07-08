import { describe, it, expect } from "vitest";
import { validatePackage } from "msvg-schema";
import { inventoryAgent } from "./fixtures.js";

// The canary: spec Section 34 example must validate cleanly. If this breaks,
// the implementation and the spec have diverged.
describe("Spec Section 34 complete example (canary)", () => {
  it("validates with zero errors", () => {
    const result = validatePackage(inventoryAgent);
    const errors = result.issues.filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("produces no issues at all — not even warnings", () => {
    const result = validatePackage(inventoryAgent);
    expect(result.issues).toEqual([]);
  });
});
