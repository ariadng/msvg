import type {
  MsvgAnimationConfig,
  MsvgStateMachine,
  MsvgTargets,
  MsvgTimelines,
  MsvgValidationIssue,
  MsvgValidationResult,
} from "../types.js";
import { validateManifest } from "./manifest.js";
import { validateTargets } from "./targets.js";
import { validateTimelines } from "./timelines.js";
import { validateStates } from "./states.js";
import { validateAccessibility } from "./accessibility.js";

/** Input to {@link validatePackage}: the parsed, non-DOM package pieces. */
export interface ValidatePackageInput {
  config: MsvgAnimationConfig;
  targets: MsvgTargets;
  timelines: MsvgTimelines;
  states?: MsvgStateMachine;
}

/**
 * Run every non-DOM validator over a package and aggregate the findings.
 * `valid` is true iff there are no error-severity issues. DOM-dependent target
 * resolution is separate — see `checkTargetsAgainstSvg`.
 */
export function validatePackage(pkg: ValidatePackageInput): MsvgValidationResult {
  const issues: MsvgValidationIssue[] = [];

  issues.push(...validateManifest(pkg.config));
  issues.push(...validateTargets(pkg.targets));
  issues.push(...validateTimelines(pkg.timelines, pkg.targets, pkg.states));
  if (pkg.states !== undefined) {
    issues.push(...validateStates(pkg.states, pkg.timelines));
  }
  issues.push(...validateAccessibility(pkg.config, pkg.states, pkg.timelines));

  const valid = !issues.some((issue) => issue.severity === "error");
  return { valid, issues };
}

export { validateManifest } from "./manifest.js";
export { validateTargets } from "./targets.js";
export { validateTimelines } from "./timelines.js";
export { validateStates } from "./states.js";
export { validateAccessibility } from "./accessibility.js";
export { checkTargetsAgainstSvg } from "./svg.js";
export type { MinimalSvgRoot } from "./svg.js";
export { levenshtein, suggest } from "./levenshtein.js";
