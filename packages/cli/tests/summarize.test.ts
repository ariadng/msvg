import { describe, it, expect } from "vitest";
import { runSummarize } from "../src/commands/summarize.js";
import { fixture, stripAnsi } from "./helpers.js";

describe("msvg summarize", () => {
  it("emits the Section 25 markdown for a valid package", () => {
    const result = runSummarize(fixture("inventory-agent"));
    const out = stripAnsi(result.output);

    expect(result.exitCode).toBe(0);
    expect(out).toContain("# MotionSVG Package Summary");
    expect(out).toContain("Animation: inventory-agent");

    expect(out).toContain(
      [
        "Safe files to edit:",
        "- motion/timelines.json",
        "- motion/states.json",
        "- motion/targets.json",
        "- motion/idle.css",
        "- animation.config.json",
      ].join("\n"),
    );

    expect(out).toContain(
      ["Use these targets:", "- body", "- eyes", "- leftArm", "- sparkles", "- loader"].join(
        "\n",
      ),
    );

    expect(out).toContain(
      [
        "Available timelines:",
        "- intro",
        "- hover",
        "- loadingLoop",
        "- success",
        "- error",
      ].join("\n"),
    );

    expect(out).toContain(
      ["Available states:", "- idle", "- hovered", "- loading", "- success", "- error"].join(
        "\n",
      ),
    );

    expect(out).toContain("Validation status:\n- Valid");
  });

  it("reports Invalid with error detail for a broken package", () => {
    const out = stripAnsi(runSummarize(fixture("broken-agent")).output);
    expect(out).toContain("Validation status:\n- Invalid");
    expect(out).toMatch(/- Invalid\n\s+- .*sparkle/);
  });
});
