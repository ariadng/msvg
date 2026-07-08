import { describe, it, expect, beforeAll } from "vitest";
import { spawnSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { stripAnsi, fixture, cliPath, repoPath } from "./helpers.js";

const BIN = cliPath("bin/msvg.js");
const CLI_DIST = cliPath("dist/index.js");
const SCHEMA_DIST = repoPath("packages/schema/dist/index.js");
const REPO_ROOT = repoPath("");

function run(args: string[]): { code: number; stdout: string; stderr: string } {
  const result = spawnSync("node", [BIN, ...args], { encoding: "utf8" });
  return {
    code: result.status ?? 1,
    stdout: stripAnsi(result.stdout ?? ""),
    stderr: stripAnsi(result.stderr ?? ""),
  };
}

describe("msvg bin (e2e)", () => {
  beforeAll(() => {
    // The real bin runs the compiled dist. Build schema + cli if missing so the
    // e2e test is self-contained (the vitest source aliases do not apply here).
    if (!existsSync(SCHEMA_DIST)) {
      execSync("npm run build --workspace=msvg-schema", { cwd: REPO_ROOT, stdio: "ignore" });
    }
    if (!existsSync(CLI_DIST)) {
      execSync("npm run build --workspace=msvg-cli", { cwd: REPO_ROOT, stdio: "ignore" });
    }
  }, 120_000);

  it("validate on a valid package exits 0", () => {
    const { code, stdout } = run(["validate", fixture("inventory-agent")]);
    expect(code).toBe(0);
    expect(stdout).toContain("Valid MotionSVG package.");
  });

  it("validate on a broken package exits 1 with a suggestion", () => {
    const { code, stdout, stderr } = run(["validate", fixture("broken-agent")]);
    const out = stdout + stderr;
    expect(code).toBe(1);
    expect(out).toContain('no target named "sparkle" exists');
    expect(out).toContain("Did you mean:");
  });

  it("inspect prints the animation identity", () => {
    const { code, stdout } = run(["inspect", fixture("inventory-agent")]);
    expect(code).toBe(0);
    expect(stdout).toContain("Animation: Inventory Agent");
  });

  it("--help lists all six commands", () => {
    const { stdout } = run(["--help"]);
    for (const cmd of [
      "create",
      "validate",
      "inspect",
      "check-targets",
      "preview",
      "summarize",
    ]) {
      expect(stdout).toContain(cmd);
    }
  });
});
