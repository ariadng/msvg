import { isRecord } from "./guards.js";

/**
 * Names of timelines that a state machine loops via `onEnter.loop: true`
 * (Section 16.1). A timeline in this set is exempt from the long-timeline
 * warning (Section 10.4).
 */
export function collectLoopingTimelines(states: unknown): Set<string> {
  const looping = new Set<string>();
  if (!isRecord(states)) return looping;

  const stateMap = states.states;
  if (!isRecord(stateMap)) return looping;

  for (const state of Object.values(stateMap)) {
    if (!isRecord(state)) continue;
    const onEnter = state.onEnter;
    if (
      isRecord(onEnter) &&
      onEnter.loop === true &&
      typeof onEnter.timeline === "string"
    ) {
      looping.add(onEnter.timeline);
    }
  }

  return looping;
}
