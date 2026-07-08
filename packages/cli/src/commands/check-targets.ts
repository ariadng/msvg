/**
 * `msvg check-targets <path>` (Spec Section 24).
 *
 * The target-resolution subset of `msvg validate`: it resolves every target
 * selector against `assets/main.svg` (selector exists + `expect` cardinality)
 * and reports the result. Fast to run after editing `targets.json` or the SVG.
 * Exits 1 when any target fails to resolve; otherwise 0.
 */

import {
  checkTargetsAgainstSvg,
  type MsvgValidationIssue,
} from "msvg-schema";
import { loadPackage } from "../package-io.js";
import {
  check,
  columnWidth,
  cross,
  padName,
  parseSvg,
  renderIssues,
} from "../render.js";
import type { CommandResult } from "./validate.js";

function targetFailureLabel(code: string): string {
  switch (code) {
    case "selector-no-match":
      return "not found in SVG";
    case "expect-one-violation":
      return "expected exactly one match";
    case "invalid-selector":
      return "invalid selector";
    default:
      return "invalid";
  }
}

/** Resolve every target against the SVG and produce output + an exit code. */
export function runCheckTargets(dir: string): CommandResult {
  const loaded = loadPackage(dir);
  const issues: MsvgValidationIssue[] = [];

  // Surface hard load failures (missing SVG / targets) before resolving.
  for (const issue of loaded.issues) {
    if (
      issue.path === "assets/main.svg" ||
      issue.path === "motion/targets.json"
    ) {
      issues.push(issue);
    }
  }

  let domIssues: MsvgValidationIssue[] = [];
  if (loaded.targets !== undefined && loaded.svgMarkup !== undefined) {
    const svgRoot = parseSvg(loaded.svgMarkup);
    domIssues = checkTargetsAgainstSvg(svgRoot, loaded.targets);
    issues.push(...domIssues);
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const exitCode = errorCount > 0 ? 1 : 0;

  const lines: string[] = ["Targets:"];
  const targetNames = loaded.targets
    ? Object.keys(loaded.targets).filter((n) => n !== "root")
    : [];
  const width = columnWidth(targetNames);
  for (const name of targetNames) {
    const err = domIssues.find(
      (issue) => issue.severity === "error" && issue.path === `targets.${name}`,
    );
    const status = err
      ? `${cross} ${targetFailureLabel(err.code)}`
      : `${check} found`;
    lines.push(`  ${padName(name, width)}${status}`);
  }

  if (issues.length > 0) {
    lines.push("", renderIssues(issues));
  }

  lines.push("", "Result:");
  lines.push(
    errorCount === 0
      ? "  All targets resolve."
      : `  ${errorCount} ${errorCount === 1 ? "target" : "targets"} failed to resolve.`,
  );

  return { exitCode, output: lines.join("\n") };
}
