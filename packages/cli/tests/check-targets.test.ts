import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCheckTargets } from "../src/commands/check-targets.js";
import { fixture, stripAnsi } from "./helpers.js";

describe("msvg check-targets", () => {
  it("passes when every target resolves against the SVG", () => {
    const result = runCheckTargets(fixture("inventory-agent"));
    const out = stripAnsi(result.output);
    expect(result.exitCode).toBe(0);
    expect(out).toMatch(/body\s+✓ found/);
    expect(out).toMatch(/loader\s+✓ found/);
    expect(out).toContain("All targets resolve.");
  });

  it("fails when a selector matches nothing in the SVG", () => {
    const dir = mkdtempSync(join(tmpdir(), "msvg-ct-"));
    try {
      cpSync(fixture("inventory-agent"), dir, { recursive: true });
      // Point a target at a part that does not exist in the SVG.
      mkdirSync(join(dir, "motion"), { recursive: true });
      writeFileSync(
        join(dir, "motion", "targets.json"),
        JSON.stringify(
          {
            root: "[data-animation='inventory-agent']",
            body: "[data-part='body']",
            ghost: "[data-part='ghost']",
          },
          null,
          2,
        ),
      );

      const result = runCheckTargets(dir);
      const out = stripAnsi(result.output);
      expect(result.exitCode).toBe(1);
      expect(out).toMatch(/ghost\s+✗ not found in SVG/);
      expect(out).toContain("failed to resolve");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails expect:one when a selector matches multiple nodes", () => {
    const dir = mkdtempSync(join(tmpdir(), "msvg-ct-"));
    try {
      cpSync(fixture("inventory-agent"), dir, { recursive: true });
      writeFileSync(
        join(dir, "motion", "targets.json"),
        JSON.stringify(
          {
            root: "[data-animation='inventory-agent']",
            // The SVG has two <circle> eyes; expect:one must fail.
            dot: { selector: "[data-part='eyes'] circle", expect: "one" },
          },
          null,
          2,
        ),
      );

      const result = runCheckTargets(dir);
      const out = stripAnsi(result.output);
      expect(result.exitCode).toBe(1);
      expect(out).toMatch(/dot\s+✗ expected exactly one match/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
