/**
 * State-machine runtime (Spec Section 17).
 *
 * A timeline controls *how* motion happens; the state machine controls *when*.
 * The machine starts at its initial state, runs `onEnter` actions, accepts
 * events through {@link StateMachine.send}, interrupts the previous state's
 * animations on a valid transition, and notifies subscribers.
 *
 * The controller supplies the side effects (`playTimeline`, `stopCurrent`,
 * `onChange`) so the machine itself stays free of DOM concerns.
 */

import type { MsvgStateMachine } from "msvg-schema";

/** Side effects the controller provides to the machine. */
export type StateMachineActions = {
  /** Run a state's `onEnter` timeline (with an optional loop flag). */
  playTimeline: (timelineName: string, opts: { loop?: boolean }) => void;
  /** Interrupt the current state's animations — commit styles, then cancel. */
  stopCurrent: () => void;
};

export type StateMachineOptions = {
  /** Overrides `config.initial` (the `initialState` option, Section 15.2). */
  initial?: string;
  /** Run the initial `onEnter` immediately. Set `false` for `autoplay: false`. */
  autoEnter?: boolean;
  /** Called after every state change (send-transition or `setState`). */
  onChange?: (state: string) => void;
};

export type StateMachine = {
  send: (eventName: string) => void;
  setState: (stateName: string) => void;
  getState: () => string;
};

/** Create a state machine driven by `config` and the supplied `actions`. */
export function createStateMachine(
  config: MsvgStateMachine,
  actions: StateMachineActions,
  options: StateMachineOptions = {},
): StateMachine {
  let current = options.initial ?? config.initial;

  function enter(stateName: string): void {
    const state = config.states[stateName];
    if (state?.onEnter?.timeline) {
      actions.playTimeline(state.onEnter.timeline, { loop: state.onEnter.loop });
    }
    // onExit is reserved for a future version and ignored by the v1 runtime.
  }

  function transition(eventName: string): void {
    const currentState = config.states[current];
    const next = currentState?.on?.[eventName];
    if (!next) return; // Unknown event — ignored silently, not queued.

    actions.stopCurrent();
    current = next;
    enter(current);
    options.onChange?.(current);
  }

  function setState(stateName: string): void {
    if (!config.states[stateName]) {
      throw new Error(`[msvg] Unknown state: ${stateName}`);
    }
    actions.stopCurrent();
    current = stateName;
    enter(current);
    options.onChange?.(current);
  }

  if (options.autoEnter !== false) {
    enter(current);
  }

  return {
    send: transition,
    setState,
    getState: () => current,
  };
}
