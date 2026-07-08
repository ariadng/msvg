import { afterEach, describe, expect, it } from "vitest";
import { applyAccessibility } from "msvg";
import { makeConfig, mountRoot } from "./fixtures.js";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("applyAccessibility", () => {
  it("injects <title>/<desc>, role=img, and aria-labelledby", () => {
    const root = mountRoot();
    applyAccessibility(root, makeConfig());

    const title = root.querySelector("title");
    const desc = root.querySelector("desc");
    expect(title?.textContent).toBe("Test Agent");
    expect(desc?.textContent).toBe("A test animation.");
    expect(title?.getAttribute("id")).toBe("test-agent-title");
    expect(desc?.getAttribute("id")).toBe("test-agent-desc");

    expect(root.getAttribute("role")).toBe("img");
    expect(root.getAttribute("aria-labelledby")).toBe(
      "test-agent-title test-agent-desc",
    );
  });

  it("inserts title before desc as the first children", () => {
    const root = mountRoot();
    applyAccessibility(root, makeConfig());
    expect(root.children[0]?.localName).toBe("title");
    expect(root.children[1]?.localName).toBe("desc");
  });

  it("uses namespaced SVG elements", () => {
    const root = mountRoot();
    applyAccessibility(root, makeConfig());
    const title = root.querySelector("title");
    expect(title?.namespaceURI).toBe("http://www.w3.org/2000/svg");
  });

  it("sets aria-hidden and skips injection for decorative animations", () => {
    const root = mountRoot();
    applyAccessibility(
      root,
      makeConfig({
        accessibility: { title: "x", description: "y", decorative: true },
      }),
    );
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.querySelector("title")).toBeNull();
    expect(root.querySelector("desc")).toBeNull();
    expect(root.hasAttribute("role")).toBe(false);
  });

  it("does nothing when there is no accessibility metadata", () => {
    const root = mountRoot();
    applyAccessibility(root, makeConfig({ accessibility: undefined }));
    expect(root.hasAttribute("role")).toBe(false);
    expect(root.hasAttribute("aria-hidden")).toBe(false);
    expect(root.querySelector("title")).toBeNull();
  });

  it("does not duplicate title/desc when applied twice", () => {
    const root = mountRoot();
    applyAccessibility(root, makeConfig());
    applyAccessibility(root, makeConfig());
    expect(root.querySelectorAll("title")).toHaveLength(1);
    expect(root.querySelectorAll("desc")).toHaveLength(1);
  });
});
