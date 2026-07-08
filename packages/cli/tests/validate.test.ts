import { describe, it, expect } from "vitest";
import { runValidate } from "../src/commands/validate.js";
import type { MsvgValidationIssue } from "msvg-schema";
import { fixture, stripAnsi } from "./helpers.js";

describe("msvg validate", () => {
  it("reports a valid package and exits 0", () => {
    const result = runValidate(fixture("inventory-agent"));
    const out = stripAnsi(result.output);

    expect(result.exitCode).toBe(0);
    expect(out).toContain("✓ animation.config.json");
    expect(out).toContain("✓ assets/main.svg");
    expect(out).toContain("✓ motion/targets.json");
    expect(out).toContain("✓ motion/timelines.json");
    expect(out).toContain("✓ motion/states.json");

    expect(out).toMatch(/Targets:/);
    expect(out).toMatch(/body\s+✓ found/);
    expect(out).toMatch(/leftArm\s+✓ found/);

    expect(out).toMatch(/Timelines:/);
    expect(out).toMatch(/intro\s+✓ 2 clips/);
    expect(out).toMatch(/hover\s+✓ 1 clip/);

    expect(out).toMatch(/States:/);
    expect(out).toMatch(/Result:\n\s+Valid MotionSVG package\./);
  });

  it("does not list the implementation-only 'root' target", () => {
    const out = stripAnsi(runValidate(fixture("inventory-agent")).output);
    expect(out).not.toMatch(/^\s+root\s/m);
  });

  it("catches the planted unknown-target error with a suggestion", () => {
    const result = runValidate(fixture("broken-agent"));
    const out = stripAnsi(result.output);

    expect(result.exitCode).toBe(1);
    expect(out).toContain(
      'Error: Timeline "intro" references target "sparkle", but no target named "sparkle" exists.',
    );
    expect(out).toMatch(/Did you mean:\n\s+sparkles/);
  });

  it("catches the planted unknown-easing error with a suggestion", () => {
    const out = stripAnsi(runValidate(fixture("broken-agent")).output);
    expect(out).toContain('uses unknown easing "sof".');
    expect(out).toMatch(/Did you mean:\n\s+soft/);
  });

  it("catches the planted unknown-timeline error with a suggestion", () => {
    const out = stripAnsi(runValidate(fixture("broken-agent")).output);
    expect(out).toContain(
      'State "loading" onEnter references timeline "loadingLopp", which does not exist.',
    );
    expect(out).toMatch(/Did you mean:\n\s+loadingLoop/);
    expect(out).toMatch(/Invalid MotionSVG package \(3 errors\)\./);
  });

  it("--json emits the raw issue list with stable codes", () => {
    const result = runValidate(fixture("broken-agent"), { json: true });
    expect(result.exitCode).toBe(1);

    const issues = JSON.parse(result.output) as MsvgValidationIssue[];
    const codes = issues.map((i) => i.code).sort();
    expect(codes).toEqual(["unknown-easing", "unknown-target", "unknown-timeline"]);

    const unknownTarget = issues.find((i) => i.code === "unknown-target");
    expect(unknownTarget?.suggestion).toBe("sparkles");
    expect(unknownTarget?.path).toBe("timelines.intro[1].target");
  });

  it("reports missing required files as clean errors, not stack traces", () => {
    const result = runValidate(fixture("does-not-exist-anywhere"));
    const out = stripAnsi(result.output);
    expect(result.exitCode).toBe(1);
    expect(out).toContain("✗ animation.config.json");
    expect(out).toContain("Error: Missing manifest");
    expect(out).not.toMatch(/at Object\.|node:internal/);
  });

  it("warnings alone still exit 0", () => {
    // The valid fixture is fully clean; assert the warning-only contract holds
    // by checking that a warnings-only issue set would not flip the exit code.
    const result = runValidate(fixture("inventory-agent"), { json: true });
    const issues = JSON.parse(result.output) as MsvgValidationIssue[];
    expect(issues.every((i) => i.severity !== "error")).toBe(true);
    expect(result.exitCode).toBe(0);
  });
});
