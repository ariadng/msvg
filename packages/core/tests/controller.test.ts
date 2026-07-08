import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMsvg } from "msvg";
import type { MsvgPresetContext } from "msvg-schema";
import {
  MockAnimation,
  flush,
  installWaapiMock,
  removeMatchMedia,
  setReducedMotionPreference,
} from "./waapi-mock.js";
import {
  makeConfig,
  makeContainer,
  makePackage,
  mountRoot,
} from "./fixtures.js";

let uninstall: () => void;

beforeEach(() => {
  uninstall = installWaapiMock();
  setReducedMotionPreference(false);
});

afterEach(() => {
  uninstall();
  removeMatchMedia();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("createMsvg — mounting", () => {
  it("attaches to an existing root element", () => {
    const root = mountRoot();
    const controller = createMsvg({ root, animation: makePackage() });
    expect(controller.getTargets()).toContain("body");
  });

  it("mounts svgMarkup into a container and uses the injected svg as root", () => {
    const container = makeContainer();
    createMsvg({ container, animation: makePackage() });
    const injected = container.querySelector("[data-animation='test-agent']");
    expect(injected).not.toBeNull();
    expect(injected?.localName).toBe("svg");
  });

  it("throws a TypeError when neither root nor container is given", () => {
    expect(() =>
      createMsvg({ animation: makePackage() } as unknown as { animation: never }),
    ).toThrow(TypeError);
  });

  it("throws a TypeError when both root and container are given", () => {
    const root = mountRoot();
    const container = makeContainer();
    expect(() => createMsvg({ root, container, animation: makePackage() })).toThrow(
      TypeError,
    );
  });

  it("throws when container mode is used without svgMarkup", () => {
    const container = makeContainer();
    expect(() =>
      createMsvg({ container, animation: makePackage({ svgMarkup: undefined }) }),
    ).toThrow(/svgMarkup/);
  });
});

describe("createMsvg — accessibility on create", () => {
  it("applies accessibility metadata to the root", () => {
    const root = mountRoot();
    createMsvg({ root, animation: makePackage() });
    expect(root.getAttribute("role")).toBe("img");
    expect(root.querySelector("title")?.textContent).toBe("Test Agent");
  });

  it("marks decorative animations aria-hidden", () => {
    const root = mountRoot();
    createMsvg({
      root,
      animation: makePackage({
        config: makeConfig({
          accessibility: { title: "t", description: "d", decorative: true },
        }),
      }),
    });
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.querySelector("title")).toBeNull();
  });
});

describe("createMsvg — play", () => {
  it("resolves when every clip completes and toggles data-msvg-playing", async () => {
    const root = mountRoot();
    const controller = createMsvg({ root, animation: makePackage() });
    const promise = controller.play("intro");
    expect(root.hasAttribute("data-msvg-playing")).toBe(true);

    MockAnimation.instances.forEach((a) => a.finish());
    await promise;
    await flush();
    expect(root.hasAttribute("data-msvg-playing")).toBe(false);
  });

  it("resolves (does not reject) when stopped mid-flight", async () => {
    const root = mountRoot();
    const controller = createMsvg({ root, animation: makePackage() });
    const promise = controller.play("intro");
    controller.stop();
    await expect(promise).resolves.toBeUndefined();
    expect(root.hasAttribute("data-msvg-playing")).toBe(false);
  });

  it("auto-settles animations after natural completion", async () => {
    const root = mountRoot();
    const controller = createMsvg({ root, animation: makePackage() });
    const promise = controller.play("hover");
    const anim = MockAnimation.instances[0];
    anim?.finish();
    await promise;
    await flush();
    expect(anim?.commitStyles).toHaveBeenCalled();
    expect(anim?.cancel).toHaveBeenCalled();
  });

  it("warns and resolves for an unknown timeline in non-strict mode", async () => {
    const root = mountRoot();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const controller = createMsvg({ root, animation: makePackage() });
    await expect(controller.play("ghost")).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    expect(MockAnimation.instances).toHaveLength(0);
  });

  it("throws for an unknown timeline in strict mode", () => {
    const root = mountRoot();
    const controller = createMsvg({ root, animation: makePackage(), strict: true });
    expect(() => controller.play("ghost")).toThrow(/Unknown timeline/);
  });

  it("pause and resume forward to active animations", () => {
    const root = mountRoot();
    const controller = createMsvg({ root, animation: makePackage() });
    controller.play("intro");
    controller.pause();
    expect(MockAnimation.instances.every((a) => a.playState === "paused")).toBe(true);
    controller.resume();
    expect(MockAnimation.instances.every((a) => a.playState === "running")).toBe(true);
  });
});

describe("createMsvg — state machine", () => {
  it("enters the initial state onEnter when autoplay is true", () => {
    const root = mountRoot();
    createMsvg({ root, animation: makePackage(), initialState: "success" });
    expect(MockAnimation.instances.some((a) => a.part === "sparkles")).toBe(true);
  });

  it("does nothing on create when autoplay is false", () => {
    const root = mountRoot();
    const controller = createMsvg({
      root,
      animation: makePackage(),
      autoplay: false,
      initialState: "loading",
    });
    expect(MockAnimation.instances).toHaveLength(0);
    expect(controller.getState()).toBe("loading");
    controller.setState("loading");
    expect(MockAnimation.instances.some((a) => a.part === "loader")).toBe(true);
  });

  it("honors initialState precedence over states.initial", () => {
    const root = mountRoot();
    const controller = createMsvg({
      root,
      animation: makePackage(),
      initialState: "success",
    });
    expect(controller.getState()).toBe("success");
  });

  it("interrupts the current state's animations immediately on transition", () => {
    const root = mountRoot();
    const controller = createMsvg({
      root,
      animation: makePackage(),
      initialState: "loading",
    });
    const loader = MockAnimation.instances.find((a) => a.part === "loader");
    expect(loader).toBeDefined();

    controller.send("RESOLVE"); // loading -> success
    expect(loader?.commitStyles).toHaveBeenCalled();
    expect(loader?.cancel).toHaveBeenCalled();
    expect(MockAnimation.instances.some((a) => a.part === "sparkles")).toBe(true);
    expect(controller.getState()).toBe("success");
  });

  it("keeps looping timelines running and data-msvg-playing set across cycles", async () => {
    const root = mountRoot();
    const controller = createMsvg({
      root,
      animation: makePackage(),
      initialState: "loading",
    });
    expect(root.hasAttribute("data-msvg-playing")).toBe(true);
    const first = MockAnimation.instances.find((a) => a.part === "loader");
    first?.finish();
    await flush();
    expect(MockAnimation.instances.filter((a) => a.part === "loader")).toHaveLength(2);
    expect(root.hasAttribute("data-msvg-playing")).toBe(true);
    controller.destroy();
  });

  it("ignores unknown events silently", () => {
    const root = mountRoot();
    const controller = createMsvg({ root, animation: makePackage() });
    controller.send("NONEXISTENT");
    expect(controller.getState()).toBe("idle");
  });

  it("notifies onStateChange subscribers and supports unsubscribe", () => {
    const root = mountRoot();
    const controller = createMsvg({ root, animation: makePackage() });
    const listener = vi.fn();
    const unsubscribe = controller.onStateChange(listener);

    controller.send("LOAD"); // idle -> loading
    expect(listener).toHaveBeenCalledWith("loading");

    unsubscribe();
    controller.send("RESOLVE"); // loading -> success
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("throws from setState on an unknown state", () => {
    const root = mountRoot();
    const controller = createMsvg({ root, animation: makePackage() });
    expect(() => controller.setState("ghost")).toThrow(/Unknown state/);
  });

  it("warns and no-ops on send when the package has no state machine", () => {
    const root = mountRoot();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const controller = createMsvg({
      root,
      animation: makePackage({ states: undefined }),
    });
    controller.send("LOAD");
    expect(warn).toHaveBeenCalled();
    expect(controller.getState()).toBeNull();
    expect(controller.getStates()).toEqual([]);
  });
});

describe("createMsvg — reduced motion", () => {
  it("static: sets data-msvg-reduced, runs nothing, resolves immediately", async () => {
    setReducedMotionPreference(true);
    const root = mountRoot();
    const controller = createMsvg({
      root,
      animation: makePackage({
        config: makeConfig({ reducedMotion: { strategy: "static" } }),
      }),
    });
    expect(root.hasAttribute("data-msvg-reduced")).toBe(true);
    await expect(controller.play("intro")).resolves.toBeUndefined();
    expect(MockAnimation.instances).toHaveLength(0);
  });

  it("static: state transitions still occur without motion", () => {
    setReducedMotionPreference(true);
    const root = mountRoot();
    const controller = createMsvg({
      root,
      animation: makePackage({
        config: makeConfig({ reducedMotion: { strategy: "static" } }),
      }),
    });
    controller.send("LOAD");
    expect(controller.getState()).toBe("loading");
    expect(MockAnimation.instances).toHaveLength(0);
  });

  it("fade: strips transforms, clamps duration, keeps data-msvg-reduced", () => {
    setReducedMotionPreference(true);
    const root = mountRoot();
    const controller = createMsvg({
      root,
      animation: makePackage({
        config: makeConfig({ reducedMotion: { strategy: "fade" } }),
      }),
    });
    expect(root.hasAttribute("data-msvg-reduced")).toBe(true);
    controller.play("intro");
    expect(MockAnimation.instances).toHaveLength(2);
    for (const anim of MockAnimation.instances) {
      expect(Number(anim.options.duration)).toBeLessThanOrEqual(200);
      for (const kf of anim.keyframes) expect(kf).not.toHaveProperty("transform");
    }
  });

  it("shorten: clamps durations, scales offsets, disables looping", async () => {
    setReducedMotionPreference(true);
    const root = mountRoot();
    const controller = createMsvg({
      root,
      animation: makePackage({
        config: makeConfig({ reducedMotion: { strategy: "shorten" } }),
      }),
    });
    controller.play("intro");
    const [body, sparkles] = MockAnimation.instances;
    expect(body?.options.duration).toBe(120);
    // factor = 120 / 500 = 0.24 → at 300 becomes 72 (delay = at + delay)
    expect(Number(sparkles?.options.delay)).toBeCloseTo(72);

    // Looping is disabled: the loading loop does not restart.
    const loopController = createMsvg({
      root: mountRoot(),
      animation: makePackage({
        config: makeConfig({ reducedMotion: { strategy: "shorten" } }),
      }),
      initialState: "loading",
    });
    const loader = MockAnimation.instances.find((a) => a.part === "loader");
    loader?.finish();
    await flush();
    expect(MockAnimation.instances.filter((a) => a.part === "loader")).toHaveLength(1);
    loopController.destroy();
  });

  it("none: leaves clips unchanged and sets no attribute", () => {
    setReducedMotionPreference(true);
    const root = mountRoot();
    const controller = createMsvg({
      root,
      animation: makePackage({
        config: makeConfig({ reducedMotion: { strategy: "none" } }),
      }),
    });
    expect(root.hasAttribute("data-msvg-reduced")).toBe(false);
    controller.play("intro");
    expect(MockAnimation.instances).toHaveLength(2);
    expect(MockAnimation.instances[0]?.options.duration).toBe(500);
  });

  it("respectReducedMotion=false ignores the preference entirely", () => {
    setReducedMotionPreference(true);
    const root = mountRoot();
    const controller = createMsvg({
      root,
      respectReducedMotion: false,
      animation: makePackage({
        config: makeConfig({ reducedMotion: { strategy: "static" } }),
      }),
    });
    expect(root.hasAttribute("data-msvg-reduced")).toBe(false);
    controller.play("intro");
    expect(MockAnimation.instances).toHaveLength(2);
  });
});

describe("createMsvg — presets", () => {
  it("wires the preset context through the target map", () => {
    const root = mountRoot();
    let captured: MsvgPresetContext | null = null;
    const blink = vi.fn((ctx: MsvgPresetContext) => {
      captured = ctx;
      const eyes = ctx.getTarget("eyes");
      return eyes ? eyes.animate([{ opacity: 1 }], { duration: 100 }) : null;
    });

    const controller = createMsvg({
      root,
      animation: makePackage({ presets: { blink } }),
    });
    const anim = controller.runPreset("blink");

    expect(blink).toHaveBeenCalledOnce();
    expect(captured?.root).toBe(root);
    expect(captured?.getTarget("eyes")).not.toBeNull();
    expect(captured?.getTarget("nope")).toBeNull();
    expect(captured?.getTargets("eyes")).toHaveLength(1);
    expect(anim).not.toBeNull();

    // Preset animations participate in stop().
    controller.stop();
    expect((anim as unknown as MockAnimation).cancel).toHaveBeenCalled();
  });

  it("warns and returns null for an unknown preset", () => {
    const root = mountRoot();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const controller = createMsvg({ root, animation: makePackage() });
    expect(controller.runPreset("ghost")).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});

describe("createMsvg — introspection and destroy", () => {
  it("exposes timelines, states, and targets", () => {
    const root = mountRoot();
    const controller = createMsvg({ root, animation: makePackage() });
    expect(controller.getTimelines()).toEqual(
      expect.arrayContaining(["intro", "hover", "loadingLoop", "success"]),
    );
    expect(controller.getStates()).toEqual(
      expect.arrayContaining(["idle", "hovered", "loading", "success"]),
    );
    expect(controller.getTargets()).toEqual(
      expect.arrayContaining(["body", "eyes", "sparkles", "loader"]),
    );
  });

  it("destroy settles animations, clears attributes, listeners, and mounted markup", async () => {
    setReducedMotionPreference(true);
    const container = makeContainer();
    const controller = createMsvg({
      container,
      animation: makePackage({
        config: makeConfig({ reducedMotion: { strategy: "fade" } }),
      }),
    });
    const root = container.querySelector("[data-animation]") as Element;
    const listener = vi.fn();
    controller.onStateChange(listener);

    controller.play("intro");
    const anims = [...MockAnimation.instances];
    expect(root.hasAttribute("data-msvg-playing")).toBe(true);
    expect(root.hasAttribute("data-msvg-reduced")).toBe(true);

    controller.destroy();

    for (const anim of anims) expect(anim.cancel).toHaveBeenCalled();
    expect(root.hasAttribute("data-msvg-playing")).toBe(false);
    expect(root.hasAttribute("data-msvg-reduced")).toBe(false);
    expect(container.innerHTML).toBe("");

    // Listeners were detached: further transitions do not call them.
    controller.send("LOAD");
    expect(listener).not.toHaveBeenCalled();
  });
});
