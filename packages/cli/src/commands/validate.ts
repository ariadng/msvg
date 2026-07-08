/**
 * `msvg validate <path>` (Spec Section 22).
 *
 * Loads the package, runs the `msvg-schema` non-DOM validators plus DOM target
 * resolution against `assets/main.svg`, and renders checkmark lists for files,
 * targets, timelines, and states, followed by any issues and a final result.
 * Exits 1 when any error-severity issue is present; warnings alone exit 0.
 */

import {
  checkTargetsAgainstSvg,
  validatePackage,
  type MsvgValidationIssue,
} from "msvg-schema";
import { loadPackage, PACKAGE_FILES } from "../package-io.js";
import {
  check,
  columnWidth,
  cross,
  padName,
  parseSvg,
  renderIssues,
} from "../render.js";

export interface ValidateOptions {
  json?: boolean;
}

export interface CommandResult {
  exitCode: number;
  output: string;
}

/** Short human label for a target's DOM/structural failure, keyed by code. */
function targetFailureLabel(code: string): string {
  switch (code) {
    case "selector-no-match":
      return "not found in SVG";
    case "expect-one-violation":
      return "expected exactly one match";
    case "invalid-selector":
    case "invalid-target-selector":
      return "invalid selector";
    case "invalid-target-expect":
      return 'invalid "expect"';
    default:
      return "invalid";
  }
}

/** First error-severity issue anchored to `prefix` (exact or `prefix` + `[`/`.`). */
function errorFor(
  issues: readonly MsvgValidationIssue[],
  prefix: string,
): MsvgValidationIssue | undefined {
  return issues.find(
    (issue) =>
      issue.severity === "error" &&
      (issue.path === prefix ||
        issue.path.startsWith(`${prefix}.`) ||
        issue.path.startsWith(`${prefix}[`)),
  );
}

/** Validate the package at `dir` and produce console output + an exit code. */
export function runValidate(dir: string, options: ValidateOptions = {}): CommandResult {
  const loaded = loadPackage(dir);
  const issues: MsvgValidationIssue[] = [...loaded.issues];

  const canRunSchema =
    loaded.config !== undefined &&
    loaded.targets !== undefined &&
    loaded.timelines !== undefined;

  if (canRunSchema) {
    const result = validatePackage({
      config: loaded.config!,
      targets: loaded.targets!,
      timelines: loaded.timelines!,
      states: loaded.states,
    });
    issues.push(...result.issues);
  }

  if (loaded.targets !== undefined && loaded.svgMarkup !== undefined) {
    const svgRoot = parseSvg(loaded.svgMarkup);
    issues.push(...checkTargetsAgainstSvg(svgRoot, loaded.targets));
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const exitCode = errorCount > 0 ? 1 : 0;

  if (options.json) {
    return { exitCode, output: JSON.stringify(issues, null, 2) };
  }

  const lines: string[] = [];

  // --- Files ----------------------------------------------------------------
  const fileList: string[] = [
    PACKAGE_FILES.config,
    PACKAGE_FILES.svg,
    PACKAGE_FILES.targets,
    PACKAGE_FILES.timelines,
  ];
  if (loaded.hasStatesFile) fileList.push(PACKAGE_FILES.states);
  for (const file of fileList) {
    const ok = loaded.fileStatus[file] === "ok";
    lines.push(`${ok ? check : cross} ${file}`);
  }

  // --- Targets (root is an implementation detail; hidden like the spec) ------
  const targetNames = loaded.targets
    ? Object.keys(loaded.targets).filter((n) => n !== "root")
    : [];
  if (targetNames.length > 0) {
    lines.push("", "Targets:");
    const width = columnWidth(targetNames);
    for (const name of targetNames) {
      const err = errorFor(issues, `targets.${name}`);
      const status = err
        ? `${cross} ${targetFailureLabel(err.code)}`
        : `${check} found`;
      lines.push(`  ${padName(name, width)}${status}`);
    }
  }

  // --- Timelines ------------------------------------------------------------
  const timelineNames = loaded.timelines ? Object.keys(loaded.timelines) : [];
  if (timelineNames.length > 0) {
    lines.push("", "Timelines:");
    const width = columnWidth(timelineNames);
    for (const name of timelineNames) {
      const clips = loaded.timelines![name];
      const count = Array.isArray(clips) ? clips.length : 0;
      const err = errorFor(issues, `timelines.${name}`);
      const status = err
        ? `${cross} invalid`
        : `${check} ${count} ${count === 1 ? "clip" : "clips"}`;
      lines.push(`  ${padName(name, width)}${status}`);
    }
  }

  // --- States ---------------------------------------------------------------
  if (loaded.states && typeof loaded.states === "object") {
    const stateNames = loaded.states.states
      ? Object.keys(loaded.states.states)
      : [];
    if (stateNames.length > 0) {
      lines.push("", "States:");
      const width = columnWidth(stateNames);
      for (const name of stateNames) {
        const err = errorFor(issues, `states.states.${name}`);
        const status = err ? `${cross} invalid` : check;
        lines.push(`  ${padName(name, width)}${status}`);
      }
    }
  }

  // --- Issues ---------------------------------------------------------------
  if (issues.length > 0) {
    lines.push("", renderIssues(issues));
  }

  // --- Result ---------------------------------------------------------------
  lines.push("", "Result:");
  if (errorCount === 0) {
    lines.push("  Valid MotionSVG package.");
  } else {
    const errorWord = errorCount === 1 ? "error" : "errors";
    const warnPart =
      warningCount > 0
        ? `, ${warningCount} ${warningCount === 1 ? "warning" : "warnings"}`
        : "";
    lines.push(
      `  Invalid MotionSVG package (${errorCount} ${errorWord}${warnPart}).`,
    );
  }

  return { exitCode, output: lines.join("\n") };
}
