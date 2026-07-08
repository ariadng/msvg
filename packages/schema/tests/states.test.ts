import { describe, it, expect } from "vitest";
import { validateStates } from "msvg-schema";
import { timelines, states } from "./fixtures.js";

const codes = (issues: { code: string }[]) => issues.map((i) => i.code);
const find = (issues: { code: string }[], code: string) =>
  issues.find((i) => i.code === code);

describe("validateStates (Spec Section 30.4)", () => {
  it("passes the spec example state machine", () => {
    expect(validateStates(states, timelines)).toEqual([]);
  });

  it("errors when the initial state does not exist", () => {
    const issues = validateStates(
      { initial: "idel", states: { idle: {} } },
      timelines,
    );
    const issue = find(issues, "unknown-initial-state");
    expect(issue).toBeDefined();
    expect(issue?.suggestion).toBe("idle");
  });

  it("errors when a transition points to a missing state", () => {
    const issues = validateStates(
      {
        initial: "idle",
        states: {
          idle: { on: { LOAD: "loadng" } },
          loading: { final: true },
        },
      },
      timelines,
    );
    const issue = find(issues, "unknown-transition-target");
    expect(issue).toBeDefined();
    expect(issue?.suggestion).toBe("loading");
  });

  it("errors when onEnter.timeline references a missing timeline", () => {
    const issues = validateStates(
      {
        initial: "idle",
        states: {
          idle: { onEnter: { timeline: "successs" }, final: true },
        },
      },
      timelines,
    );
    const issue = find(issues, "unknown-timeline");
    expect(issue).toBeDefined();
    expect(issue?.suggestion).toBe("success");
  });

  it("warns on unreachable states", () => {
    const issues = validateStates(
      {
        initial: "idle",
        states: {
          idle: { on: { LOAD: "loading" } },
          loading: { final: true },
          orphan: { final: true },
        },
      },
      timelines,
    );
    const issue = find(issues, "unreachable-state");
    expect(issue?.severity).toBe("warning");
    expect(issue?.path).toBe("states.states.orphan");
  });

  it("warns on dead-end states without final: true", () => {
    const issues = validateStates(
      {
        initial: "idle",
        states: {
          idle: { on: { LOAD: "loading" } },
          loading: {},
        },
      },
      timelines,
    );
    const issue = find(issues, "dead-end-state");
    expect(issue?.severity).toBe("warning");
    expect(issue?.path).toBe("states.states.loading");
  });

  it("does not flag a dead-end marked final: true", () => {
    const issues = validateStates(
      {
        initial: "idle",
        states: {
          idle: { on: { DONE: "done" } },
          done: { final: true },
        },
      },
      timelines,
    );
    expect(codes(issues)).not.toContain("dead-end-state");
  });

  it("warns on non-UPPER_SNAKE_CASE event names", () => {
    const issues = validateStates(
      {
        initial: "idle",
        states: {
          idle: { on: { hover: "hovered" } },
          hovered: { final: true },
        },
      },
      timelines,
    );
    const issue = find(issues, "event-naming-convention");
    expect(issue?.severity).toBe("warning");
  });

  it("accepts UPPER_SNAKE_CASE with an underscore", () => {
    const issues = validateStates(
      {
        initial: "idle",
        states: {
          idle: { on: { FORM_SUBMITTED: "done" } },
          done: { final: true },
        },
      },
      timelines,
    );
    expect(codes(issues)).not.toContain("event-naming-convention");
  });
});
