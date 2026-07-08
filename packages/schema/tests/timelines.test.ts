import { describe, it, expect } from "vitest";
import { validateTimelines } from "msvg-schema";
import { targets, timelines, states } from "./fixtures.js";

const codes = (issues: { code: string }[]) => issues.map((i) => i.code);
const find = (issues: { code: string }[], code: string) =>
  issues.find((i) => i.code === code);

describe("validateTimelines (Spec Section 30.3)", () => {
  it("passes the spec example timelines", () => {
    expect(validateTimelines(timelines, targets, states)).toEqual([]);
  });

  it("errors when timelines is not an object", () => {
    expect(codes(validateTimelines([], targets))).toContain(
      "invalid-timelines",
    );
  });

  it("errors when a timeline is not an array", () => {
    const issues = validateTimelines({ intro: { target: "body" } }, targets);
    expect(codes(issues)).toContain("timeline-not-array");
  });

  it("errors on an unknown target and offers a suggestion", () => {
    const issues = validateTimelines(
      {
        success: [
          {
            target: "sparkle",
            at: 0,
            keyframes: [{ opacity: 0 }, { opacity: 1 }],
            options: { duration: 300 },
          },
        ],
      },
      targets,
    );
    const issue = find(issues, "unknown-target");
    expect(issue).toBeDefined();
    expect(issue?.suggestion).toBe("sparkles");
    expect(issue?.path).toBe("timelines.success[0].target");
  });

  it("errors on an invalid at offset", () => {
    const issues = validateTimelines(
      {
        intro: [
          {
            target: "body",
            at: -5,
            keyframes: [{ opacity: 0 }],
            options: { duration: 300 },
          },
        ],
      },
      targets,
    );
    expect(codes(issues)).toContain("invalid-at");
  });

  it("errors on empty or missing keyframes", () => {
    const issues = validateTimelines(
      {
        intro: [{ target: "body", at: 0, keyframes: [], options: { duration: 300 } }],
      },
      targets,
    );
    expect(codes(issues)).toContain("invalid-keyframes");
  });

  it("errors on an invalid duration", () => {
    const issues = validateTimelines(
      {
        intro: [
          {
            target: "body",
            at: 0,
            keyframes: [{ opacity: 0 }],
            options: { duration: 0 },
          },
        ],
      },
      targets,
    );
    expect(codes(issues)).toContain("invalid-duration");
  });

  it("errors on an unknown easing token", () => {
    const issues = validateTimelines(
      {
        intro: [
          {
            target: "body",
            at: 0,
            keyframes: [{ opacity: 0 }],
            options: { duration: 300, easing: "wobble" },
          },
        ],
      },
      targets,
    );
    expect(codes(issues)).toContain("unknown-easing");
  });

  it("accepts a raw CSS easing string", () => {
    const issues = validateTimelines(
      {
        intro: [
          {
            target: "body",
            at: 0,
            keyframes: [{ opacity: 0 }],
            options: { duration: 300, easing: "cubic-bezier(.1, .2, .3, .4)" },
          },
        ],
      },
      targets,
    );
    expect(codes(issues)).not.toContain("unknown-easing");
  });

  it("warns on use-carefully properties (Section 33.2)", () => {
    const issues = validateTimelines(
      {
        intro: [
          {
            target: "body",
            at: 0,
            keyframes: [{ filter: "blur(0)" }, { filter: "blur(2px)" }],
            options: { duration: 300 },
          },
        ],
      },
      targets,
    );
    const issue = find(issues, "property-use-carefully");
    expect(issue?.severity).toBe("warning");
  });

  it("warns on unsupported properties", () => {
    const issues = validateTimelines(
      {
        intro: [
          {
            target: "body",
            at: 0,
            keyframes: [{ left: "0px" }, { left: "10px" }],
            options: { duration: 300 },
          },
        ],
      },
      targets,
    );
    const issue = find(issues, "unsupported-property");
    expect(issue?.severity).toBe("warning");
  });

  it("does not flag reserved keyframe keys (offset/easing) as properties", () => {
    const issues = validateTimelines(
      {
        intro: [
          {
            target: "body",
            at: 0,
            keyframes: [
              { opacity: 0, offset: 0, easing: "ease-in" },
              { opacity: 1, offset: 1 },
            ],
            options: { duration: 300 },
          },
        ],
      },
      targets,
    );
    expect(codes(issues)).not.toContain("unsupported-property");
  });

  it("errors on iterations: Infinity (Section 16.1)", () => {
    const issues = validateTimelines(
      {
        intro: [
          {
            target: "body",
            at: 0,
            keyframes: [{ opacity: 0 }],
            options: { duration: 300, iterations: Infinity },
          },
        ],
      },
      targets,
    );
    expect(codes(issues)).toContain("infinite-iterations");
  });

  it("warns when a non-looping timeline exceeds 1200ms (Section 10.4)", () => {
    const issues = validateTimelines(
      {
        intro: [
          {
            target: "body",
            at: 0,
            keyframes: [{ opacity: 0 }],
            options: { duration: 2000 },
          },
        ],
      },
      targets,
    );
    const issue = find(issues, "timeline-too-long");
    expect(issue?.severity).toBe("warning");
  });

  it("does not warn about length for a state-looped timeline", () => {
    const longLoop = {
      spin: [
        {
          target: "loader",
          at: 0,
          keyframes: [{ transform: "rotate(0)" }, { transform: "rotate(360deg)" }],
          options: { duration: 2000 },
        },
      ],
    };
    const loopingStates = {
      initial: "loading",
      states: { loading: { onEnter: { timeline: "spin", loop: true } } },
    };
    const issues = validateTimelines(longLoop, targets, loopingStates);
    expect(codes(issues)).not.toContain("timeline-too-long");
  });
});
