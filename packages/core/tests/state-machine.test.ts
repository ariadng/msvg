import { describe, expect, it, vi } from "vitest";
import { createStateMachine } from "msvg";
import type { StateMachineActions } from "msvg";
import { states } from "./fixtures.js";

function makeActions() {
  return {
    playTimeline: vi.fn(),
    stopCurrent: vi.fn(),
  } satisfies StateMachineActions;
}

describe("createStateMachine", () => {
  it("enters the initial state and runs its onEnter timeline", () => {
    const actions = makeActions();
    createStateMachine(states, actions, { initial: "loading" });
    expect(actions.playTimeline).toHaveBeenCalledWith("loadingLoop", { loop: true });
  });

  it("does not auto-enter when autoEnter is false", () => {
    const actions = makeActions();
    const machine = createStateMachine(states, actions, {
      initial: "loading",
      autoEnter: false,
    });
    expect(actions.playTimeline).not.toHaveBeenCalled();
    expect(machine.getState()).toBe("loading");
  });

  it("respects the initial override (initialState precedence)", () => {
    const actions = makeActions();
    const machine = createStateMachine(states, actions, { initial: "success" });
    expect(machine.getState()).toBe("success");
    expect(actions.playTimeline).toHaveBeenCalledWith("success", { loop: undefined });
  });

  it("ignores unknown events silently", () => {
    const actions = makeActions();
    const onChange = vi.fn();
    const machine = createStateMachine(states, actions, { onChange });
    machine.send("NONEXISTENT");
    expect(machine.getState()).toBe("idle");
    expect(actions.stopCurrent).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("transitions on a valid event: stop current, switch, enter, then notify", () => {
    const actions = makeActions();
    const onChange = vi.fn();
    const machine = createStateMachine(states, actions, { onChange });
    machine.send("LOAD");
    expect(actions.stopCurrent).toHaveBeenCalledOnce();
    expect(machine.getState()).toBe("loading");
    expect(actions.playTimeline).toHaveBeenCalledWith("loadingLoop", { loop: true });
    expect(onChange).toHaveBeenCalledWith("loading");
  });

  it("setState bypasses transitions and validates the target state", () => {
    const actions = makeActions();
    const onChange = vi.fn();
    const machine = createStateMachine(states, actions, { onChange });
    machine.setState("success");
    expect(actions.stopCurrent).toHaveBeenCalledOnce();
    expect(machine.getState()).toBe("success");
    expect(onChange).toHaveBeenCalledWith("success");
  });

  it("setState throws on an unknown state", () => {
    const actions = makeActions();
    const machine = createStateMachine(states, actions);
    expect(() => machine.setState("ghost")).toThrow(/Unknown state/);
  });
});
