import type { MsvgValidationIssue } from "../types.js";
import { error, warning } from "./issue.js";
import { isRecord, isCamelCase } from "./guards.js";

/**
 * Validate the targets map (Spec Section 30.2, non-DOM subset). Checks the
 * structure of each entry — a selector string or a `{ selector, expect }`
 * object (Section 9.3) — and the camelCase naming convention (Section 32.2).
 *
 * Whether a selector actually matches SVG nodes is a DOM-dependent rule; see
 * `checkTargetsAgainstSvg`.
 */
export function validateTargets(targets: unknown): MsvgValidationIssue[] {
  const issues: MsvgValidationIssue[] = [];

  if (!isRecord(targets)) {
    issues.push(
      error(
        "invalid-targets",
        "targets",
        "targets.json must be a JSON object mapping names to selectors.",
      ),
    );
    return issues;
  }

  for (const [name, value] of Object.entries(targets)) {
    const path = `targets.${name}`;

    if (!isCamelCase(name)) {
      issues.push(
        warning(
          "target-naming-convention",
          path,
          `Target name "${name}" should be camelCase (Section 32.2).`,
        ),
      );
    }

    if (typeof value === "string") {
      if (value.length === 0) {
        issues.push(
          error(
            "invalid-target-selector",
            path,
            `Target "${name}" has an empty selector.`,
          ),
        );
      }
      continue;
    }

    if (isRecord(value)) {
      if (typeof value.selector !== "string" || value.selector.length === 0) {
        issues.push(
          error(
            "invalid-target-selector",
            `${path}.selector`,
            `Target "${name}" is missing a non-empty "selector" string.`,
          ),
        );
      }
      if (
        value.expect !== undefined &&
        value.expect !== "one" &&
        value.expect !== "many"
      ) {
        issues.push(
          error(
            "invalid-target-expect",
            `${path}.expect`,
            `Target "${name}" has invalid "expect" (must be "one" or "many").`,
          ),
        );
      }
      continue;
    }

    issues.push(
      error(
        "invalid-target",
        path,
        `Target "${name}" must be a selector string or an object { selector, expect }.`,
      ),
    );
  }

  return issues;
}
