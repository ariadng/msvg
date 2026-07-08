import type { MsvgValidationIssue } from "../types.js";
import { error, warning } from "./issue.js";
import { isRecord, isUpperSnakeCase } from "./guards.js";
import { suggest } from "./levenshtein.js";

/**
 * Validate the state machine (Spec Section 30.4). `timelines` supplies the
 * valid timeline names for `onEnter.timeline` references. Structural problems
 * are errors; naming, unreachable, and dead-end findings are warnings.
 */
export function validateStates(
  states: unknown,
  timelines: unknown,
): MsvgValidationIssue[] {
  const issues: MsvgValidationIssue[] = [];

  if (!isRecord(states)) {
    issues.push(error("invalid-states", "states", "states.json must be a JSON object."));
    return issues;
  }

  const stateMap = states.states;
  if (!isRecord(stateMap)) {
    issues.push(
      error(
        "invalid-states",
        "states.states",
        'states.json must contain a "states" object.',
      ),
    );
    return issues;
  }

  const stateNames = Object.keys(stateMap);
  const timelineNames = isRecord(timelines) ? Object.keys(timelines) : [];

  // initial
  const initial = states.initial;
  if (typeof initial !== "string" || initial.length === 0) {
    issues.push(
      error(
        "missing-initial",
        "states.initial",
        'states.json is missing a required "initial" state name.',
      ),
    );
  } else if (!stateNames.includes(initial)) {
    issues.push(
      error(
        "unknown-initial-state",
        "states.initial",
        `Initial state "${initial}" does not exist.`,
        suggest(initial, stateNames),
      ),
    );
  }

  for (const [name, state] of Object.entries(stateMap)) {
    const statePath = `states.states.${name}`;

    if (!isRecord(state)) {
      issues.push(
        error("invalid-state", statePath, `State "${name}" must be an object.`),
      );
      continue;
    }

    // onEnter.timeline references an existing timeline
    const onEnter = state.onEnter;
    if (isRecord(onEnter) && onEnter.timeline !== undefined) {
      const timeline = onEnter.timeline;
      if (typeof timeline !== "string" || !timelineNames.includes(timeline)) {
        issues.push(
          error(
            "unknown-timeline",
            `${statePath}.onEnter.timeline`,
            `State "${name}" onEnter references timeline "${String(timeline)}", which does not exist.`,
            typeof timeline === "string"
              ? suggest(timeline, timelineNames)
              : undefined,
          ),
        );
      }
    }

    // transitions
    const on = state.on;
    let hasOutgoing = false;
    if (isRecord(on)) {
      for (const [event, targetState] of Object.entries(on)) {
        hasOutgoing = true;

        if (!isUpperSnakeCase(event)) {
          issues.push(
            warning(
              "event-naming-convention",
              `${statePath}.on.${event}`,
              `Event name "${event}" should be UPPER_SNAKE_CASE (Section 32.6).`,
            ),
          );
        }

        if (
          typeof targetState !== "string" ||
          !stateNames.includes(targetState)
        ) {
          issues.push(
            error(
              "unknown-transition-target",
              `${statePath}.on.${event}`,
              `Transition "${event}" in state "${name}" points to "${String(targetState)}", which does not exist.`,
              typeof targetState === "string"
                ? suggest(targetState, stateNames)
                : undefined,
            ),
          );
        }
      }
    }

    // dead-end
    if (!hasOutgoing && state.final !== true) {
      issues.push(
        warning(
          "dead-end-state",
          statePath,
          `State "${name}" has no outgoing transitions. Add transitions or mark it "final": true (Section 11.2).`,
        ),
      );
    }
  }

  // reachability from the initial state
  if (typeof initial === "string" && stateNames.includes(initial)) {
    const reachable = new Set<string>();
    const queue: string[] = [initial];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      if (reachable.has(current)) continue;
      reachable.add(current);

      const state = stateMap[current];
      if (isRecord(state) && isRecord(state.on)) {
        for (const next of Object.values(state.on)) {
          if (
            typeof next === "string" &&
            stateNames.includes(next) &&
            !reachable.has(next)
          ) {
            queue.push(next);
          }
        }
      }
    }

    for (const name of stateNames) {
      if (!reachable.has(name)) {
        issues.push(
          warning(
            "unreachable-state",
            `states.states.${name}`,
            `State "${name}" is unreachable from the initial state.`,
          ),
        );
      }
    }
  }

  return issues;
}
