import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useMemo } from "react";
import { render, cleanup, act } from "@testing-library/react";
import { useMsvg } from "msvg-react";
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

function Harness(props: {
  onController: (c: MsvgController | null) => void;
}): JSX.Element {
  // A stable animation reference so the hook does not recreate the controller
  // on every render.
  const animation = useMemo(() => makeAnimation(), []);
  const { ref, controller } = useMsvg({ animation, initialState: "idle" });
  props.onController(controller);
  return <div ref={ref} data-testid="host" />;
}

describe("useMsvg", () => {
  it("exposes the ref and a controller that is available after mount", () => {
    const seen: Array<MsvgController | null> = [];
    const { container } = render(<Harness onController={(c) => seen.push(c)} />);

    // First render sees null; a re-render after the mount effect sees the controller.
    expect(seen[0]).toBeNull();
    const controller = seen[seen.length - 1];
    expect(controller).not.toBeNull();
    expect((controller as MsvgController).getState()).toBe("idle");

    // The SVG was mounted into the ref'd host.
    expect(container.querySelector("svg[data-animation='inventory-agent']")).not.toBeNull();
  });

  it("drives the controller returned by the hook", () => {
    let controller: MsvgController | null = null;
    render(<Harness onController={(c) => (controller = c ?? controller)} />);

    expect(controller).not.toBeNull();
    act(() => {
      (controller as unknown as MsvgController).send("LOAD");
    });
    expect((controller as unknown as MsvgController).getState()).toBe("loading");
  });

  it("destroys the controller and empties the host on unmount", () => {
    let controller: MsvgController | null = null;
    const { container, unmount } = render(
      <Harness onController={(c) => (controller = c ?? controller)} />,
    );
    const host = container.querySelector("[data-testid='host']") as HTMLElement;
    expect(host.querySelector("svg")).not.toBeNull();

    unmount();
    expect(host.innerHTML).toBe("");
  });
});
