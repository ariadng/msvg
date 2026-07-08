import type { MsvgValidationIssue } from "../types.js";
import { easings } from "../tokens.js";
import { isValidEasing } from "../easing.js";
import { error, warning } from "./issue.js";
import { isRecord } from "./guards.js";
import { suggest } from "./levenshtein.js";
import { collectLoopingTimelines } from "./looping.js";

/** Compositor-friendly properties preferred in v1 (Section 33.1). */
const ALLOWED_PROPERTIES = new Set(["opacity", "transform"]);

/**
 * Web Animations API keyframe-level keys that are not animatable properties.
 * `offset` positions the keyframe (Section 10.2); `easing`/`composite` are
 * per-keyframe options. They must not be flagged as unsupported properties.
 */
const RESERVED_KEYFRAME_KEYS = new Set(["offset", "easing", "composite"]);

/** Properties that animate but should be used carefully (Section 33.2). */
const CAREFUL_PROPERTIES = new Set([
  "filter",
  "clip-path",
  "clipPath",
  "stroke-dashoffset",
  "strokeDashoffset",
  "stroke-dasharray",
  "strokeDasharray",
]);

const MAX_UI_DURATION_MS = 1200;

/**
 * Validate timelines (Spec Section 30.3). `targets` supplies the valid target
 * names for clip references; `states` (optional) identifies looping timelines
 * so the long-timeline warning is suppressed for them (Section 10.4).
 */
export function validateTimelines(
  timelines: unknown,
  targets: unknown,
  states?: unknown,
): MsvgValidationIssue[] {
  const issues: MsvgValidationIssue[] = [];

  if (!isRecord(timelines)) {
    issues.push(
      error(
        "invalid-timelines",
        "timelines",
        "timelines.json must be a JSON object mapping names to clip arrays.",
      ),
    );
    return issues;
  }

  const targetNames = isRecord(targets) ? Object.keys(targets) : [];
  const easingTokens = Object.keys(easings);
  const loopingTimelines = collectLoopingTimelines(states);

  for (const [name, clips] of Object.entries(timelines)) {
    const timelinePath = `timelines.${name}`;

    if (!Array.isArray(clips)) {
      issues.push(
        error(
          "timeline-not-array",
          timelinePath,
          `Timeline "${name}" must be an array of clips.`,
        ),
      );
      continue;
    }

    let totalDuration = 0;

    clips.forEach((clip, index) => {
      const clipPath = `${timelinePath}[${index}]`;

      if (!isRecord(clip)) {
        issues.push(
          error(
            "invalid-clip",
            clipPath,
            `Clip ${index} in timeline "${name}" must be an object.`,
          ),
        );
        return;
      }

      // target
      const target = clip.target;
      if (typeof target !== "string" || target.length === 0) {
        issues.push(
          error(
            "invalid-target-reference",
            `${clipPath}.target`,
            `Clip ${index} in timeline "${name}" is missing a "target" name.`,
          ),
        );
      } else if (!targetNames.includes(target)) {
        issues.push(
          error(
            "unknown-target",
            `${clipPath}.target`,
            `Timeline "${name}" references target "${target}", but no target named "${target}" exists.`,
            suggest(target, targetNames),
          ),
        );
      }

      // at
      const at = clip.at;
      const atIsValid =
        typeof at === "number" && Number.isFinite(at) && at >= 0;
      if (!atIsValid) {
        issues.push(
          error(
            "invalid-at",
            `${clipPath}.at`,
            `Clip ${index} in timeline "${name}" has invalid "at" (must be a number >= 0).`,
          ),
        );
      }

      // keyframes
      const keyframes = clip.keyframes;
      if (!Array.isArray(keyframes) || keyframes.length === 0) {
        issues.push(
          error(
            "invalid-keyframes",
            `${clipPath}.keyframes`,
            `Clip ${index} in timeline "${name}" must have a non-empty "keyframes" array.`,
          ),
        );
      } else {
        keyframes.forEach((keyframe, keyframeIndex) => {
          if (!isRecord(keyframe)) {
            issues.push(
              error(
                "invalid-keyframes",
                `${clipPath}.keyframes[${keyframeIndex}]`,
                `Keyframe ${keyframeIndex} in timeline "${name}" must be an object.`,
              ),
            );
            return;
          }
          for (const property of Object.keys(keyframe)) {
            if (
              RESERVED_KEYFRAME_KEYS.has(property) ||
              ALLOWED_PROPERTIES.has(property)
            ) {
              continue;
            }
            if (CAREFUL_PROPERTIES.has(property)) {
              issues.push(
                warning(
                  "property-use-carefully",
                  `${clipPath}.keyframes[${keyframeIndex}].${property}`,
                  `Property "${property}" can animate but should be used carefully (Section 33.2).`,
                ),
              );
            } else {
              issues.push(
                warning(
                  "unsupported-property",
                  `${clipPath}.keyframes[${keyframeIndex}].${property}`,
                  `Property "${property}" is not a recommended animatable property; prefer transform and opacity (Section 33.1).`,
                ),
              );
            }
          }
        });
      }

      // options
      const options = clip.options;
      let duration = 0;
      let iterations = 1;

      if (!isRecord(options)) {
        issues.push(
          error(
            "invalid-options",
            `${clipPath}.options`,
            `Clip ${index} in timeline "${name}" is missing an "options" object.`,
          ),
        );
      } else {
        const rawDuration = options.duration;
        if (
          typeof rawDuration !== "number" ||
          !Number.isFinite(rawDuration) ||
          rawDuration <= 0
        ) {
          issues.push(
            error(
              "invalid-duration",
              `${clipPath}.options.duration`,
              `Clip ${index} in timeline "${name}" has invalid "duration" (must be a positive number).`,
            ),
          );
        } else {
          duration = rawDuration;
        }

        const easing = options.easing;
        if (easing !== undefined && !isValidEasing(easing)) {
          issues.push(
            error(
              "unknown-easing",
              `${clipPath}.options.easing`,
              `Clip ${index} in timeline "${name}" uses unknown easing "${String(easing)}".`,
              suggest(String(easing), easingTokens),
            ),
          );
        }

        const rawIterations = options.iterations;
        if (rawIterations !== undefined) {
          if (
            typeof rawIterations !== "number" ||
            !Number.isFinite(rawIterations)
          ) {
            issues.push(
              error(
                "infinite-iterations",
                `${clipPath}.options.iterations`,
                `Clip ${index} in timeline "${name}" uses non-finite "iterations". Infinite repetition is expressed only through state-level loop (Section 16.1).`,
              ),
            );
          } else {
            iterations = rawIterations;
          }
        }
      }

      const clipStart = atIsValid ? (at as number) : 0;
      const clipEnd = clipStart + duration * iterations;
      if (clipEnd > totalDuration) totalDuration = clipEnd;
    });

    if (!loopingTimelines.has(name) && totalDuration > MAX_UI_DURATION_MS) {
      issues.push(
        warning(
          "timeline-too-long",
          timelinePath,
          `Timeline "${name}" runs ${Math.round(totalDuration)}ms, exceeding the ${MAX_UI_DURATION_MS}ms product-UI guideline (Section 10.4).`,
        ),
      );
    }
  }

  return issues;
}
