import { describe, it, expect } from "vitest";
import { get } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createPreviewServer } from "../src/commands/preview.js";
import { fixture } from "./helpers.js";

function listen(server: Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve((server.address() as AddressInfo).port);
    });
  });
}

function fetchText(
  url: string,
): Promise<{ status: number; body: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () =>
        resolve({
          status: res.statusCode ?? 0,
          body,
          contentType: String(res.headers["content-type"] ?? ""),
        }),
      );
    }).on("error", reject);
  });
}

describe("msvg preview server", () => {
  it("serves the control panel with the SVG inlined and buttons for timelines/events", async () => {
    const server = createPreviewServer(fixture("inventory-agent"));
    const port = await listen(server);
    try {
      const { status, body, contentType } = await fetchText(`http://127.0.0.1:${port}/`);
      expect(status).toBe(200);
      expect(contentType).toContain("text/html");
      expect(body).toContain("<!doctype html>");
      // SVG is inlined into the page.
      expect(body).toContain('data-animation="inventory-agent"');
      // Bootstrap data includes timeline + event names for the buttons.
      expect(body).toContain("loadingLoop");
      expect(body).toContain("RESOLVE");
      // The reduced-motion toggle exists.
      expect(body).toContain('id="reduced"');
    } finally {
      server.close();
    }
  });

  it("serves assets/main.svg as a static file", async () => {
    const server = createPreviewServer(fixture("inventory-agent"));
    const port = await listen(server);
    try {
      const { status, body, contentType } = await fetchText(
        `http://127.0.0.1:${port}/assets/main.svg`,
      );
      expect(status).toBe(200);
      expect(contentType).toContain("image/svg+xml");
      expect(body).toContain('data-part="body"');
    } finally {
      server.close();
    }
  });

  it("serves msvg at /msvg-core.js", async () => {
    const server = createPreviewServer(fixture("inventory-agent"));
    const port = await listen(server);
    try {
      const { status, contentType } = await fetchText(
        `http://127.0.0.1:${port}/msvg-core.js`,
      );
      expect(status).toBe(200);
      expect(contentType).toContain("javascript");
    } finally {
      server.close();
    }
  });

  it("blocks path traversal", async () => {
    const server = createPreviewServer(fixture("inventory-agent"));
    const port = await listen(server);
    try {
      const { status } = await fetchText(
        `http://127.0.0.1:${port}/..%2f..%2fpackage.json`,
      );
      expect(status === 403 || status === 404).toBe(true);
    } finally {
      server.close();
    }
  });
});
