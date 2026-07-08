import { describe, it, expect } from "vitest";
import { validateManifest } from "msvg-schema";
import { config } from "./fixtures.js";

const codes = (issues: { code: string }[]) => issues.map((i) => i.code);

describe("validateManifest (Spec Section 30.1)", () => {
  it("passes the spec example manifest", () => {
    expect(validateManifest(config)).toEqual([]);
  });

  it("flags a non-object manifest", () => {
    expect(codes(validateManifest(null))).toContain("invalid-manifest");
    expect(codes(validateManifest("nope"))).toContain("invalid-manifest");
  });

  it("flags a missing schemaVersion", () => {
    const { schemaVersion, ...rest } = config;
    expect(codes(validateManifest(rest))).toContain("missing-schema-version");
  });

  it("flags an unsupported schemaVersion", () => {
    const issues = validateManifest({ ...config, schemaVersion: "2.0" });
    expect(codes(issues)).toContain("unsupported-schema-version");
  });

  it("flags missing required fields", () => {
    const issues = validateManifest({ schemaVersion: "1.0" });
    const c = codes(issues);
    expect(c).toContain("missing-id");
    expect(c).toContain("missing-name");
    expect(c).toContain("missing-asset");
    expect(c).toContain("missing-motion");
  });

  it("flags a missing svg path", () => {
    const issues = validateManifest({ ...config, asset: {} });
    expect(codes(issues)).toContain("missing-svg");
  });

  it("flags missing motion paths", () => {
    const issues = validateManifest({ ...config, motion: {} });
    const c = codes(issues);
    expect(c).toContain("missing-targets-file");
    expect(c).toContain("missing-timelines-file");
  });

  it("warns on a non-kebab-case id", () => {
    const issues = validateManifest({ ...config, id: "InventoryAgent" });
    const idIssue = issues.find((i) => i.code === "id-naming-convention");
    expect(idIssue?.severity).toBe("warning");
  });

  it("flags an invalid reducedMotion strategy", () => {
    const issues = validateManifest({
      ...config,
      reducedMotion: { strategy: "sparkle" },
    });
    expect(codes(issues)).toContain("invalid-reduced-motion-strategy");
  });
});
