import type { MsvgValidationIssue, MsvgTargets } from "../types.js";
import { error } from "./issue.js";
import { isRecord } from "./guards.js";

/**
 * Minimal structural view of an SVG root needed for target resolution. The CLI
 * can pass a linkedom document and `msvg` a real DOM element; both expose
 * `querySelectorAll`. Kept intentionally tiny so this package has zero runtime
 * dependencies.
 */
export interface MinimalSvgRoot {
  querySelectorAll(selector: string): ArrayLike<unknown>;
}

/**
 * DOM-dependent target rules (Spec Section 30.2): a selector matching nothing
 * is an error, and an `expect: "one"` target matching zero or 2+ nodes is an
 * error. Structural problems with the target map itself are reported by
 * `validateTargets`.
 */
export function checkTargetsAgainstSvg(
  svgRoot: MinimalSvgRoot,
  targets: MsvgTargets,
): MsvgValidationIssue[] {
  const issues: MsvgValidationIssue[] = [];

  if (!isRecord(targets)) return issues;

  for (const [name, value] of Object.entries(targets)) {
    const path = `targets.${name}`;

    let selector: string | undefined;
    let expect: string | undefined;
    if (typeof value === "string") {
      selector = value;
    } else if (isRecord(value) && typeof value.selector === "string") {
      selector = value.selector;
      expect = typeof value.expect === "string" ? value.expect : undefined;
    }

    // Empty/malformed selectors are a structural concern for validateTargets.
    if (selector === undefined || selector.length === 0) continue;

    let count: number;
    try {
      count = svgRoot.querySelectorAll(selector).length;
    } catch {
      issues.push(
        error(
          "invalid-selector",
          path,
          `Target "${name}" has a selector the DOM could not parse: "${selector}".`,
        ),
      );
      continue;
    }

    if (count === 0) {
      issues.push(
        error(
          "selector-no-match",
          path,
          `Target "${name}" selector "${selector}" matches no elements in the SVG.`,
        ),
      );
    } else if (expect === "one" && count > 1) {
      issues.push(
        error(
          "expect-one-violation",
          path,
          `Target "${name}" expects one match but selector "${selector}" matched ${count} elements.`,
        ),
      );
    }
  }

  return issues;
}
