/**
 * Easing-token resolution (Spec Sections 10.3, 18.1).
 *
 * `resolveEasing` turns the `easing` value written in `timelines.json` into a
 * value the Web Animations API accepts:
 *
 * - a token name resolves to its CSS easing value,
 * - a raw CSS easing string (`linear`, `ease-in-out`, `cubic-bezier(...)`,
 *   `steps(...)`) passes through unchanged,
 * - anything else falls back to `"linear"` with an `[msvg]` console warning.
 */

import { easings, isValidEasing } from "msvg-schema";
import type { EasingTokens } from "./tokens.js";

const SCHEMA_EASINGS = easings as unknown as Record<string, string>;

/**
 * Resolve an easing value against a token map (defaults to the canonical
 * {@link easings} table). Token names win over raw CSS; unknown values warn and
 * fall back to `"linear"`.
 */
export function resolveEasing(
  value: string | undefined,
  tokens: EasingTokens = easings,
): string {
  if (value == null) return "linear";
  const v = value.trim();
  if (v === "") return "linear";

  // Token name in the caller-supplied map.
  if (Object.prototype.hasOwnProperty.call(tokens, v)) {
    return tokens[v] as string;
  }
  // Token name in the canonical table (covers custom maps that omit a token).
  if (Object.prototype.hasOwnProperty.call(SCHEMA_EASINGS, v)) {
    return SCHEMA_EASINGS[v] as string;
  }
  // Raw CSS easing — token names were already handled above, so anything
  // `isValidEasing` accepts here is a genuine CSS easing string.
  if (isValidEasing(v)) {
    return v;
  }

  console.warn(`[msvg] Unknown easing "${value}" — falling back to "linear".`);
  return "linear";
}
