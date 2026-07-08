/**
 * Motion tokens (Spec Section 18).
 *
 * The canonical token tables live in `msvg-schema` so that validation and the
 * runtime can never drift. `msvg` re-exports them unchanged — the schema
 * package is the single source of truth.
 */

export { easings, durations } from "msvg-schema";

/** A map of easing-token names to raw CSS easing strings. */
export type EasingTokens = Record<string, string>;
