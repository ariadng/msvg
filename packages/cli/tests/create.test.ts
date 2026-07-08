import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCreate } from "../src/commands/create.js";
import { runValidate } from "../src/commands/validate.js";
import { stripAnsi } from "./helpers.js";

describe("msvg create", () => {
  const temps: string[] = [];
  function tempCwd(): string {
    const dir = mkdtempSync(join(tmpdir(), "msvg-create-"));
    temps.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it("rejects a non-kebab-case name", () => {
    const result = runCreate("BadName", { cwd: tempCwd() });
    expect(result.exitCode).toBe(1);
    expect(stripAnsi(result.output)).toContain("must be kebab-case");
  });

  it("scaffolds every Section 21 file", () => {
    const cwd = tempCwd();
    const result = runCreate("widget-bot", { cwd });
    expect(result.exitCode).toBe(0);

    const base = join(cwd, "animations", "widget-bot");
    for (const file of [
      "animation.config.json",
      "index.ts",
      "README.md",
      "AGENTS.md",
      "assets/main.svg",
      "motion/targets.json",
      "motion/timelines.json",
      "motion/states.json",
      "motion/idle.css",
    ]) {
      expect(existsSync(join(base, file)), `missing ${file}`).toBe(true);
    }
  });

  it("scaffolds a package that then passes validate", () => {
    const cwd = tempCwd();
    runCreate("widget-bot", { cwd });
    const result = runValidate(join(cwd, "animations", "widget-bot"));
    expect(result.exitCode).toBe(0);
    expect(stripAnsi(result.output)).toContain("Valid MotionSVG package.");
  });

  it("templates the id, data-animation, and idle.css keyframes to the name", () => {
    const cwd = tempCwd();
    runCreate("widget-bot", { cwd });
    const base = join(cwd, "animations", "widget-bot");
    const svg = readText(join(base, "assets/main.svg"));
    const css = readText(join(base, "motion/idle.css"));
    const config = readText(join(base, "animation.config.json"));

    expect(svg).toContain('data-animation="widget-bot"');
    expect(css).toContain("widget-bot-sparkle");
    expect(JSON.parse(config).id).toBe("widget-bot");
  });

  it("refuses to overwrite an existing package", () => {
    const cwd = tempCwd();
    runCreate("widget-bot", { cwd });
    const second = runCreate("widget-bot", { cwd });
    expect(second.exitCode).toBe(1);
    expect(stripAnsi(second.output)).toContain("already exists");
  });
});

import { readFileSync } from "node:fs";
function readText(path: string): string {
  return readFileSync(path, "utf8");
}
