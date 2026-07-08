/**
 * msvg-schema — TypeScript types, motion tokens, and validators for msvg
 * (MotionSVG) animation packages. Zero runtime dependencies.
 */

export * from "./types.js";

export { easings, durations, SUPPORTED_SCHEMA_VERSIONS } from "./tokens.js";
export { isValidEasing } from "./easing.js";

export {
  validatePackage,
  validateManifest,
  validateTargets,
  validateTimelines,
  validateStates,
  validateAccessibility,
  checkTargetsAgainstSvg,
  levenshtein,
  suggest,
} from "./validate/index.js";
export type {
  ValidatePackageInput,
  MinimalSvgRoot,
} from "./validate/index.js";
