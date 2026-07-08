/**
 * Filesystem loading for animation packages, shared by every CLI command.
 *
 * The loader reads the conventional package files, parses JSON defensively, and
 * turns missing files and JSON syntax errors into clean {@link MsvgValidationIssue}
 * records (never raw stack traces). Downstream commands run the `msvg-schema`
 * validators on whatever loaded successfully.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  MsvgAnimationConfig,
  MsvgStateMachine,
  MsvgTargets,
  MsvgTimelines,
  MsvgValidationIssue,
} from "msvg-schema";

/** Conventional package file locations, relative to the package directory. */
export const PACKAGE_FILES = {
  config: "animation.config.json",
  svg: "assets/main.svg",
  targets: "motion/targets.json",
  timelines: "motion/timelines.json",
  states: "motion/states.json",
  idleCss: "motion/idle.css",
} as const;

/** The always-required files, in the order `msvg validate` lists them. */
export const REQUIRED_FILES: readonly string[] = [
  PACKAGE_FILES.config,
  PACKAGE_FILES.svg,
  PACKAGE_FILES.targets,
  PACKAGE_FILES.timelines,
];

/** Result of loading a package directory from disk. */
export interface LoadedPackage {
  dir: string;
  config?: MsvgAnimationConfig;
  targets?: MsvgTargets;
  timelines?: MsvgTimelines;
  states?: MsvgStateMachine;
  svgMarkup?: string;
  /** Per-file presence/parse status keyed by relative path. */
  fileStatus: Record<string, "ok" | "missing" | "invalid-json">;
  /** File-level load issues (missing required files, bad JSON). */
  issues: MsvgValidationIssue[];
  /** Whether a states file is present on disk (states are optional). */
  hasStatesFile: boolean;
}

function loadJsonFile(
  path: string,
): { value?: unknown; status: "ok" | "missing" | "invalid-json"; message?: string } {
  if (!existsSync(path)) return { status: "missing" };
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    return { status: "invalid-json", message: (error as Error).message };
  }
  try {
    return { value: JSON.parse(raw), status: "ok" };
  } catch (error) {
    return { status: "invalid-json", message: (error as Error).message };
  }
}

/**
 * Load an animation package from `dir`. Never throws for missing or malformed
 * files; those surface as error-severity issues in the returned object.
 */
export function loadPackage(dir: string): LoadedPackage {
  const issues: MsvgValidationIssue[] = [];
  const fileStatus: Record<string, "ok" | "missing" | "invalid-json"> = {};

  const result: LoadedPackage = {
    dir,
    fileStatus,
    issues,
    hasStatesFile: false,
  };

  // --- animation.config.json (required) ------------------------------------
  const configResult = loadJsonFile(join(dir, PACKAGE_FILES.config));
  fileStatus[PACKAGE_FILES.config] = configResult.status;
  if (configResult.status === "missing") {
    issues.push({
      severity: "error",
      code: "missing-manifest",
      path: PACKAGE_FILES.config,
      message: `Missing manifest: ${PACKAGE_FILES.config} was not found.`,
    });
  } else if (configResult.status === "invalid-json") {
    issues.push({
      severity: "error",
      code: "invalid-json",
      path: PACKAGE_FILES.config,
      message: `Could not parse ${PACKAGE_FILES.config}: ${configResult.message ?? "invalid JSON"}.`,
    });
  } else {
    result.config = configResult.value as MsvgAnimationConfig;
  }

  // --- assets/main.svg (required) ------------------------------------------
  const svgPath = join(dir, PACKAGE_FILES.svg);
  if (!existsSync(svgPath)) {
    fileStatus[PACKAGE_FILES.svg] = "missing";
    issues.push({
      severity: "error",
      code: "missing-svg",
      path: PACKAGE_FILES.svg,
      message: `Missing SVG asset: ${PACKAGE_FILES.svg} was not found.`,
    });
  } else {
    fileStatus[PACKAGE_FILES.svg] = "ok";
    result.svgMarkup = readFileSync(svgPath, "utf8");
  }

  // --- motion/targets.json (required) --------------------------------------
  const targetsResult = loadJsonFile(join(dir, PACKAGE_FILES.targets));
  fileStatus[PACKAGE_FILES.targets] = targetsResult.status;
  if (targetsResult.status === "missing") {
    issues.push({
      severity: "error",
      code: "missing-targets-file",
      path: PACKAGE_FILES.targets,
      message: `Missing targets file: ${PACKAGE_FILES.targets} was not found.`,
    });
  } else if (targetsResult.status === "invalid-json") {
    issues.push({
      severity: "error",
      code: "invalid-json",
      path: PACKAGE_FILES.targets,
      message: `Could not parse ${PACKAGE_FILES.targets}: ${targetsResult.message ?? "invalid JSON"}.`,
    });
  } else {
    result.targets = targetsResult.value as MsvgTargets;
  }

  // --- motion/timelines.json (required) ------------------------------------
  const timelinesResult = loadJsonFile(join(dir, PACKAGE_FILES.timelines));
  fileStatus[PACKAGE_FILES.timelines] = timelinesResult.status;
  if (timelinesResult.status === "missing") {
    issues.push({
      severity: "error",
      code: "missing-timelines-file",
      path: PACKAGE_FILES.timelines,
      message: `Missing timelines file: ${PACKAGE_FILES.timelines} was not found.`,
    });
  } else if (timelinesResult.status === "invalid-json") {
    issues.push({
      severity: "error",
      code: "invalid-json",
      path: PACKAGE_FILES.timelines,
      message: `Could not parse ${PACKAGE_FILES.timelines}: ${timelinesResult.message ?? "invalid JSON"}.`,
    });
  } else {
    result.timelines = timelinesResult.value as MsvgTimelines;
  }

  // --- motion/states.json (optional) ---------------------------------------
  const statesPath = join(dir, PACKAGE_FILES.states);
  if (existsSync(statesPath)) {
    result.hasStatesFile = true;
    const statesResult = loadJsonFile(statesPath);
    fileStatus[PACKAGE_FILES.states] = statesResult.status;
    if (statesResult.status === "invalid-json") {
      issues.push({
        severity: "error",
        code: "invalid-json",
        path: PACKAGE_FILES.states,
        message: `Could not parse ${PACKAGE_FILES.states}: ${statesResult.message ?? "invalid JSON"}.`,
      });
    } else if (statesResult.status === "ok") {
      result.states = statesResult.value as MsvgStateMachine;
    }
  }

  return result;
}
