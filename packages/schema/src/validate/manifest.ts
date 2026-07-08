import type { MsvgValidationIssue } from "../types.js";
import { SUPPORTED_SCHEMA_VERSIONS } from "../tokens.js";
import { error, warning } from "./issue.js";
import { isRecord, isKebabCase } from "./guards.js";

const STRATEGIES = ["static", "fade", "shorten", "none"];

/**
 * Validate the animation manifest (Spec Section 30.1): required fields exist
 * and have the right shape, `schemaVersion` is supported, path fields are
 * non-empty strings, and `reducedMotion.strategy` (if present) is allowed.
 *
 * File-existence and JSON-parse errors are the caller's responsibility; this
 * validator operates on an already-parsed object.
 */
export function validateManifest(config: unknown): MsvgValidationIssue[] {
  const issues: MsvgValidationIssue[] = [];

  if (!isRecord(config)) {
    issues.push(
      error("invalid-manifest", "config", "Manifest must be a JSON object."),
    );
    return issues;
  }

  const schemaVersion = config.schemaVersion;
  if (typeof schemaVersion !== "string" || schemaVersion.length === 0) {
    issues.push(
      error(
        "missing-schema-version",
        "config.schemaVersion",
        'Manifest is missing required field "schemaVersion".',
      ),
    );
  } else if (!SUPPORTED_SCHEMA_VERSIONS.includes(schemaVersion)) {
    issues.push(
      error(
        "unsupported-schema-version",
        "config.schemaVersion",
        `Unsupported schemaVersion "${schemaVersion}".`,
        `Supported versions: ${SUPPORTED_SCHEMA_VERSIONS.join(", ")}.`,
      ),
    );
  }

  const id = config.id;
  if (typeof id !== "string" || id.length === 0) {
    issues.push(
      error("missing-id", "config.id", 'Manifest is missing required field "id".'),
    );
  } else if (!isKebabCase(id)) {
    issues.push(
      warning(
        "id-naming-convention",
        "config.id",
        `Animation id "${id}" should be kebab-case (Section 7.1).`,
      ),
    );
  }

  if (typeof config.name !== "string" || config.name.length === 0) {
    issues.push(
      error(
        "missing-name",
        "config.name",
        'Manifest is missing required field "name".',
      ),
    );
  }

  const asset = config.asset;
  if (!isRecord(asset)) {
    issues.push(
      error(
        "missing-asset",
        "config.asset",
        'Manifest is missing the required "asset" object.',
      ),
    );
  } else {
    if (typeof asset.svg !== "string" || asset.svg.length === 0) {
      issues.push(
        error(
          "missing-svg",
          "config.asset.svg",
          'Manifest "asset.svg" path is required.',
        ),
      );
    }
    if (asset.preview !== undefined && typeof asset.preview !== "string") {
      issues.push(
        error(
          "invalid-asset-preview",
          "config.asset.preview",
          '"asset.preview" must be a string path.',
        ),
      );
    }
  }

  const motion = config.motion;
  if (!isRecord(motion)) {
    issues.push(
      error(
        "missing-motion",
        "config.motion",
        'Manifest is missing the required "motion" object.',
      ),
    );
  } else {
    if (typeof motion.targets !== "string" || motion.targets.length === 0) {
      issues.push(
        error(
          "missing-targets-file",
          "config.motion.targets",
          'Manifest "motion.targets" path is required.',
        ),
      );
    }
    if (typeof motion.timelines !== "string" || motion.timelines.length === 0) {
      issues.push(
        error(
          "missing-timelines-file",
          "config.motion.timelines",
          'Manifest "motion.timelines" path is required.',
        ),
      );
    }
    if (motion.states !== undefined && typeof motion.states !== "string") {
      issues.push(
        error(
          "invalid-motion-states",
          "config.motion.states",
          '"motion.states" must be a string path.',
        ),
      );
    }
    if (motion.idleCss !== undefined && typeof motion.idleCss !== "string") {
      issues.push(
        error(
          "invalid-motion-idlecss",
          "config.motion.idleCss",
          '"motion.idleCss" must be a string path.',
        ),
      );
    }
  }

  const reducedMotion = config.reducedMotion;
  if (reducedMotion !== undefined) {
    if (!isRecord(reducedMotion)) {
      issues.push(
        error(
          "invalid-reduced-motion",
          "config.reducedMotion",
          '"reducedMotion" must be an object.',
        ),
      );
    } else if (
      typeof reducedMotion.strategy !== "string" ||
      !STRATEGIES.includes(reducedMotion.strategy)
    ) {
      issues.push(
        error(
          "invalid-reduced-motion-strategy",
          "config.reducedMotion.strategy",
          `reducedMotion.strategy must be one of: ${STRATEGIES.join(", ")}.`,
        ),
      );
    }
  }

  return issues;
}
