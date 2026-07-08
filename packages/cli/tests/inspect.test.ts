import { describe, it, expect } from "vitest";
import { runInspect } from "../src/commands/inspect.js";
import { fixture, stripAnsi } from "./helpers.js";

describe("msvg inspect", () => {
  const out = stripAnsi(runInspect(fixture("inventory-agent")).output);

  it("exits 0 and prints identity", () => {
    const result = runInspect(fixture("inventory-agent"));
    expect(result.exitCode).toBe(0);
    expect(out).toContain("Animation: Inventory Agent");
    expect(out).toContain("ID: inventory-agent");
    expect(out).toContain("Version: 0.1.0");
  });

  it("prints assets with ./ stripped", () => {
    expect(out).toContain("Assets:");
    expect(out).toContain("SVG: assets/main.svg");
    expect(out).toContain("Preview: assets/preview.png");
  });

  it("prints the target -> selector table (without root)", () => {
    expect(out).toMatch(/Targets:/);
    expect(out).toMatch(/body\s+\[data-part='body'\]/);
    expect(out).toMatch(/leftArm\s+\[data-part='arm-left'\]/);
    expect(out).not.toMatch(/^\s+root\s/m);
  });

  it("prints clip counts and total durations", () => {
    expect(out).toMatch(/intro\s+2 clips, 650ms total/);
    expect(out).toMatch(/hover\s+1 clip, 200ms total/);
    expect(out).toMatch(/success\s+1 clip, 500ms total/);
    expect(out).toMatch(/error\s+1 clip, 400ms total/);
  });

  it("annotates a timeline looped by a state", () => {
    expect(out).toMatch(
      /loadingLoop\s+1 clip, 1200ms total \(looped by state "loading"\)/,
    );
  });

  it("prints states with outgoing event names", () => {
    expect(out).toMatch(/idle\s+→ HOVER, LOAD/);
    expect(out).toMatch(/loading\s+→ RESOLVE, REJECT/);
    expect(out).toMatch(/success\s+→ RESET/);
  });

  it("fails cleanly when the manifest is missing", () => {
    const result = runInspect(fixture("nope-not-here"));
    expect(result.exitCode).toBe(1);
    expect(stripAnsi(result.output)).toContain("Missing manifest");
  });
});
