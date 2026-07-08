import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createMsvg, type MsvgController } from "msvg-core";
import { readPackage } from "./helpers.js";
import { installWaapiMock, setReducedMotionPreference } from "./waapi-mock.js";

let uninstall: () => void;
let container: HTMLElement;

beforeEach(() => {
  uninstall = installWaapiMock();
  setReducedMotionPreference(false);
  document.body.innerHTML = "";
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  uninstall();
  document.body.innerHTML = "";
});

describe("inventory-agent integration", () => {
  it("mounts the SVG, plays intro, and walks LOAD -> RESOLVE (Section 15.4)", async () => {
    const animation = readPackage();
    const seen: string[] = [];

    const controller: MsvgController = createMsvg({ container, animation });
    controller.onStateChange((state) => seen.push(state));

    // Container mode mounts the markup.
    const svg = container.querySelector("svg[data-animation='inventory-agent']");
    expect(svg).not.toBeNull();
    expect(container.querySelector("[data-part='loader']")).not.toBeNull();

    // Autoplay entered the initial state.
    expect(controller.getState()).toBe("idle");

    // Play an explicit timeline. `play` returns a Promise that never rejects;
    // the timeline marks the root as playing while active.
    const played = controller.play("intro");
    expect(played).toBeInstanceOf(Promise);
    expect(svg?.getAttribute("data-msvg-playing")).toBe("true");

    // Drive the state machine as in the Spec's canonical usage (Section 15.4).
    controller.send("LOAD");
    expect(controller.getState()).toBe("loading");

    controller.send("RESOLVE");
    expect(controller.getState()).toBe("success");

    expect(seen).toEqual(["loading", "success"]);

    controller.destroy();
    expect(container.innerHTML).toBe("");
  });

  it("REJECT from loading lands on error, and RESET returns to idle", () => {
    const controller = createMsvg({ container, animation: readPackage() });

    controller.send("LOAD");
    controller.send("REJECT");
    expect(controller.getState()).toBe("error");

    controller.send("RESET");
    expect(controller.getState()).toBe("idle");

    controller.destroy();
  });

  it("exposes the package's timelines, states, and targets", () => {
    const controller = createMsvg({ container, animation: readPackage() });
    expect(controller.getTimelines()).toEqual([
      "intro",
      "hover",
      "loadingLoop",
      "success",
      "error",
    ]);
    expect(controller.getStates()).toContain("loading");
    expect(controller.getTargets()).toContain("leftArm");
    controller.destroy();
  });
});
