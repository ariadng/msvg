import { easings } from "./tokens.js";

/**
 * A CSS number: optional sign, integer/decimal/leading-dot forms, optional
 * scientific-notation exponent. Deliberately careful so `cubic-bezier(.34,
 * 1.56, .64, 1)` and `steps(4, jump-end)` both parse.
 */
const NUMBER = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?`;

const CUBIC_BEZIER = new RegExp(
  `^cubic-bezier\\(\\s*${NUMBER}\\s*,\\s*${NUMBER}\\s*,\\s*${NUMBER}\\s*,\\s*${NUMBER}\\s*\\)$`,
);

const STEP_POSITION = "jump-start|jump-end|jump-none|jump-both|start|end";
const STEPS = new RegExp(
  `^steps\\(\\s*[+-]?\\d+\\s*(?:,\\s*(?:${STEP_POSITION})\\s*)?\\)$`,
);

/** Bare CSS easing keywords accepted by the Web Animations API. */
const KEYWORDS = new Set([
  "linear",
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
]);

/**
 * True when `value` is a usable easing: a known token name (Section 18.1), a
 * caller-supplied extra token, or a raw CSS easing string — one of the bare
 * keywords, a well-formed `cubic-bezier(...)` with four numeric args, or a
 * `steps(...)` function.
 */
export function isValidEasing(
  value: unknown,
  extraTokens?: readonly string[],
): boolean {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (v === "") return false;

  if (Object.prototype.hasOwnProperty.call(easings, v)) return true;
  if (extraTokens !== undefined && extraTokens.includes(v)) return true;
  if (KEYWORDS.has(v)) return true;
  if (CUBIC_BEZIER.test(v)) return true;
  if (STEPS.test(v)) return true;

  return false;
}
