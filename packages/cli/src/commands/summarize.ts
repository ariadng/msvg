/**
 * `msvg summarize <path>` (Spec Section 25).
 *
 * Emits an AI-friendly Markdown summary: which files are safe to edit, the
 * available target/timeline/state names, and the real validation status
 * (computed by running the validators). Intended as an agent's first read.
 */

import {
  checkTargetsAgainstSvg,
  validatePackage,
  type MsvgValidationIssue,
} from "msvg-schema";
import { loadPackage } from "../package-io.js";
import { parseSvg } from "../render.js";
import type { CommandResult } from "./validate.js";

const SAFE_FILES = [
  "motion/timelines.json",
  "motion/states.json",
  "motion/targets.json",
  "motion/idle.css",
  "animation.config.json",
];

/** Summarize the package at `dir` and produce Markdown output. */
export function runSummarize(dir: string): CommandResult {
  const loaded = loadPackage(dir);
  const lines: string[] = [];

  lines.push("# MotionSVG Package Summary", "");
  lines.push(`Animation: ${loaded.config?.id ?? "(unknown)"}`, "");

  lines.push("Safe files to edit:");
  for (const file of SAFE_FILES) lines.push(`- ${file}`);
  lines.push("");

  lines.push("Use these targets:");
  const targetNames = loaded.targets
    ? Object.keys(loaded.targets).filter((n) => n !== "root")
    : [];
  for (const name of targetNames) lines.push(`- ${name}`);
  lines.push("");

  lines.push("Available timelines:");
  const timelineNames = loaded.timelines ? Object.keys(loaded.timelines) : [];
  for (const name of timelineNames) lines.push(`- ${name}`);
  lines.push("");

  if (loaded.states && loaded.states.states) {
    lines.push("Available states:");
    for (const name of Object.keys(loaded.states.states)) lines.push(`- ${name}`);
    lines.push("");
  }

  // --- Real validation status -----------------------------------------------
  const issues: MsvgValidationIssue[] = [...loaded.issues];
  if (loaded.config && loaded.targets && loaded.timelines) {
    issues.push(
      ...validatePackage({
        config: loaded.config,
        targets: loaded.targets,
        timelines: loaded.timelines,
        states: loaded.states,
      }).issues,
    );
  }
  if (loaded.targets && loaded.svgMarkup) {
    issues.push(...checkTargetsAgainstSvg(parseSvg(loaded.svgMarkup), loaded.targets));
  }
  const errors = issues.filter((i) => i.severity === "error");

  lines.push("Validation status:");
  if (errors.length === 0) {
    lines.push("- Valid");
  } else {
    lines.push("- Invalid");
    for (const err of errors) lines.push(`  - ${err.message}`);
  }

  return { exitCode: 0, output: lines.join("\n") };
}
