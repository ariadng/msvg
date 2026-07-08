import type { MsvgValidationIssue } from "../types.js";
import { warning } from "./issue.js";
import { isRecord } from "./guards.js";
import { collectLoopingTimelines } from "./looping.js";

/**
 * Validate accessibility and reduced-motion metadata (Spec Section 30.5). All
 * findings are warnings: a missing title, a missing description on a
 * non-decorative animation, a missing reduced-motion config, and a looping
 * timeline present without a reduced-motion strategy.
 */
export function validateAccessibility(
  config: unknown,
  states?: unknown,
  timelines?: unknown,
): MsvgValidationIssue[] {
  const issues: MsvgValidationIssue[] = [];

  const configObject = isRecord(config) ? config : {};
  const accessibility = isRecord(configObject.accessibility)
    ? configObject.accessibility
    : undefined;

  const title =
    accessibility && typeof accessibility.title === "string"
      ? accessibility.title
      : "";
  if (title.length === 0) {
    issues.push(
      warning(
        "missing-title",
        "config.accessibility.title",
        "Animation is missing an accessible title.",
      ),
    );
  }

  const decorative = accessibility
    ? accessibility.decorative === true
    : false;
  const description =
    accessibility && typeof accessibility.description === "string"
      ? accessibility.description
      : "";
  if (!decorative && description.length === 0) {
    issues.push(
      warning(
        "missing-description",
        "config.accessibility.description",
        "Non-decorative animation is missing an accessible description.",
      ),
    );
  }

  const reducedMotion = isRecord(configObject.reducedMotion)
    ? configObject.reducedMotion
    : undefined;
  if (reducedMotion === undefined) {
    issues.push(
      warning(
        "missing-reduced-motion",
        "config.reducedMotion",
        "Animation has no reducedMotion configuration.",
      ),
    );
  }

  // A looping timeline needs a reduced-motion strategy other than "none".
  const looping = collectLoopingTimelines(states);
  let hasLoopingTimeline = looping.size > 0;
  if (hasLoopingTimeline && isRecord(timelines)) {
    hasLoopingTimeline = [...looping].some((name) =>
      Object.prototype.hasOwnProperty.call(timelines, name),
    );
  }

  if (hasLoopingTimeline) {
    const strategy =
      reducedMotion && typeof reducedMotion.strategy === "string"
        ? reducedMotion.strategy
        : undefined;
    if (strategy === undefined || strategy === "none") {
      issues.push(
        warning(
          "looping-without-reduced-motion",
          "config.reducedMotion.strategy",
          'A looping timeline is present but no reduced-motion strategy is configured (strategy is missing or "none").',
        ),
      );
    }
  }

  return issues;
}
