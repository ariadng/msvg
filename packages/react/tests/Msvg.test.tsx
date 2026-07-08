import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StrictMode } from "react";
import { render, cleanup, act } from "@testing-library/react";
import { Msvg } from "msvg-react";
import type { MsvgController } from "msvg-core";
import { makeAnimation } from "./fixture.js";
import { installWaapiMock, setReducedMotionPreference } from "./waapi-mock.js";

let uninstall: () => void;

beforeEach(() => {
  uninstall = installWaapiMock();
  setReducedMotionPreference(false);
});

afterEach(() => {
  cleanup();
  uninstall();
});

describe("<Msvg />", () => {
  it("mounts the SVG markup into the host element", () => {
    const { container } = render(<Msvg animation={makeAnimation()} />);
    const svg = container.querySelector("svg[data-animation='inventory-agent']");
    expect(svg).not.toBeNull();
    expect(container.querySelector("[data-part='body']")).not.toBeNull();
  });

  it("passes native div props through untouched (Section 29.3)", () => {
    const { getByTestId } = render(
      <Msvg animation={makeAnimation()} data-testid="host" className="card" role="group" />,
    );
    const host = getByTestId("host");
    expect(host.tagName).toBe("DIV");
    expect(host.className).toBe("card");
    expect(host.getAttribute("role")).toBe("group");
  });

  it("calls onReady with a working controller", () => {
    let controller: MsvgController | null = null;
    render(
      <Msvg
        animation={makeAnimation()}
        onReady={(c) => {
          controller = c;
        }}
      />,
    );
    expect(controller).not.toBeNull();
    const ctrl = controller as unknown as MsvgController;
    expect(ctrl.getState()).toBe("idle");
    expect(ctrl.getTimelines()).toEqual(
      expect.arrayContaining(["intro", "hover", "loadingLoop", "success"]),
    );
    expect(ctrl.getStates()).toEqual(
      expect.arrayContaining(["idle", "hovered", "loading", "success"]),
    );
  });

  it("drives the machine from the controlled state prop", () => {
    let controller: MsvgController | null = null;
    const onStateChange = vi.fn();
    const animation = makeAnimation();
    const { rerender } = render(
      <Msvg
        animation={animation}
        state="loading"
        onStateChange={onStateChange}
        onReady={(c) => {
          controller = c;
        }}
      />,
    );

    expect((controller as unknown as MsvgController).getState()).toBe("loading");
    expect(onStateChange).toHaveBeenCalledWith("loading");

    rerender(
      <Msvg animation={animation} state="success" onStateChange={onStateChange} />,
    );

    expect((controller as unknown as MsvgController).getState()).toBe("success");
    expect(onStateChange).toHaveBeenCalledWith("success");
  });

  it("reports transitions through onStateChange", () => {
    let controller: MsvgController | null = null;
    const onStateChange = vi.fn();
    render(
      <Msvg
        animation={makeAnimation()}
        initialState="idle"
        onStateChange={onStateChange}
        onReady={(c) => {
          controller = c;
        }}
      />,
    );

    act(() => {
      (controller as unknown as MsvgController).send("LOAD");
    });

    expect(onStateChange).toHaveBeenCalledWith("loading");
    expect((controller as unknown as MsvgController).getState()).toBe("loading");
  });

  it("maps DOM events on the host to state-machine events", () => {
    let controller: MsvgController | null = null;
    const { getByTestId } = render(
      <Msvg
        animation={makeAnimation()}
        initialState="idle"
        events={{ pointerenter: "HOVER" }}
        data-testid="host"
        onReady={(c) => {
          controller = c;
        }}
      />,
    );

    const host = getByTestId("host");
    act(() => {
      host.dispatchEvent(new Event("pointerenter"));
    });

    expect((controller as unknown as MsvgController).getState()).toBe("hovered");
  });

  it("destroys the controller on unmount, emptying the host", () => {
    const { container, unmount } = render(
      <Msvg animation={makeAnimation()} data-testid="host" />,
    );
    const host = container.querySelector("[data-testid='host']") as HTMLElement;
    expect(host.querySelector("svg")).not.toBeNull();

    unmount();
    expect(host.innerHTML).toBe("");
  });

  it("survives a StrictMode double mount", () => {
    let readyCount = 0;
    const { container } = render(
      <StrictMode>
        <Msvg
          animation={makeAnimation()}
          onReady={() => {
            readyCount += 1;
          }}
        />
      </StrictMode>,
    );
    // Exactly one live controller and one mounted SVG remain.
    expect(container.querySelectorAll("svg[data-animation]").length).toBe(1);
    expect(readyCount).toBeGreaterThanOrEqual(1);
  });
});
