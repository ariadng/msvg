/**
 * Canonical motion tokens (Spec Section 18) and supported schema versions.
 *
 * This module is the single source of truth for these tables. `msvg`
 * re-exports them so runtime and validation never drift.
 */

/** Named easing tokens (Section 18.1). Values are raw CSS easing strings. */
export const easings = {
  linear: "linear",
  standard: "cubic-bezier(.2, 0, 0, 1)",
  soft: "cubic-bezier(.4, 0, .2, 1)",
  emphasized: "cubic-bezier(.05, .7, .1, 1)",
  bounceSoft: "cubic-bezier(.34, 1.56, .64, 1)",
} as const;

/** Named duration tokens in milliseconds (Section 18.2). */
export const durations = {
  instant: 0,
  fast: 180,
  medium: 420,
  slow: 900,
  ambient: 2800,
} as const;

/** Schema versions this library understands (Section 36). */
export const SUPPORTED_SCHEMA_VERSIONS: readonly string[] = ["1.0"];
