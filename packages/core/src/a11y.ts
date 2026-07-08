/**
 * Accessibility runtime application (Spec Section 7.1).
 *
 * On mount or attach, inject `<title>` / `<desc>` from the manifest, set
 * `role="img"`, and link them with `aria-labelledby`. When the animation is
 * decorative, set `aria-hidden="true"` and skip injection instead.
 */

import type { MsvgAnimationConfig } from "msvg-schema";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Apply accessibility metadata from the manifest to the root element. */
export function applyAccessibility(root: Element, config: MsvgAnimationConfig): void {
  const a11y = config.accessibility;
  if (!a11y) return;

  if (a11y.decorative) {
    root.setAttribute("aria-hidden", "true");
    return;
  }

  const doc = root.ownerDocument;
  if (!doc) return;

  const baseId = config.id && config.id !== "" ? config.id : "msvg";
  const labelledBy: string[] = [];

  if (a11y.title) {
    const id = `${baseId}-title`;
    let el = findChild(root, "title", id);
    if (!el) {
      el = doc.createElementNS(SVG_NS, "title");
      el.setAttribute("id", id);
      root.insertBefore(el, root.firstChild);
    }
    el.textContent = a11y.title;
    labelledBy.push(id);
  }

  if (a11y.description) {
    const id = `${baseId}-desc`;
    let el = findChild(root, "desc", id);
    if (!el) {
      el = doc.createElementNS(SVG_NS, "desc");
      el.setAttribute("id", id);
      const titleEl = findChild(root, "title", `${baseId}-title`);
      root.insertBefore(el, titleEl ? titleEl.nextSibling : root.firstChild);
    }
    el.textContent = a11y.description;
    labelledBy.push(id);
  }

  root.setAttribute("role", "img");
  if (labelledBy.length > 0) {
    root.setAttribute("aria-labelledby", labelledBy.join(" "));
  }
}

function findChild(root: Element, localName: string, id: string): Element | null {
  for (const child of Array.from(root.children)) {
    if (child.localName === localName && child.getAttribute("id") === id) {
      return child;
    }
  }
  return null;
}
