/**
 * `msvg create <name>` (Spec Section 21).
 *
 * Scaffolds `animations/<name>/` with a complete, valid package: manifest,
 * index, README, AGENTS.md, a resting-state placeholder SVG, and the motion
 * files. The name must be kebab-case (Section 7.1 / 32.1). The scaffolded
 * package passes `msvg validate` immediately.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { check, cross } from "../render.js";
import { scaffoldFiles } from "../templates.js";
import type { CommandResult } from "./validate.js";

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface CreateOptions {
  /** Base directory under which `animations/<name>/` is created. */
  cwd?: string;
}

export interface CreateResult extends CommandResult {
  /** Absolute path of the created package directory (on success). */
  dir?: string;
}

/** Scaffold a new animation package. */
export function runCreate(name: string, options: CreateOptions = {}): CreateResult {
  const cwd = options.cwd ?? process.cwd();

  if (!KEBAB_CASE.test(name)) {
    return {
      exitCode: 1,
      output: `${cross} Invalid name "${name}". Animation names must be kebab-case (e.g. "inventory-agent").`,
    };
  }

  const dir = join(cwd, "animations", name);
  if (existsSync(dir)) {
    return {
      exitCode: 1,
      output: `${cross} Cannot create: ${join("animations", name)} already exists.`,
    };
  }

  const files = scaffoldFiles(name);
  const written: string[] = [];
  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = join(dir, relativePath);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, contents, "utf8");
    written.push(relativePath);
  }

  const lines: string[] = [`${check} Created animations/${name}/`, ""];
  for (const relativePath of written.sort()) {
    lines.push(`  ${relativePath}`);
  }
  lines.push("", `Next: msvg validate animations/${name}`);

  return { exitCode: 0, output: lines.join("\n"), dir };
}
