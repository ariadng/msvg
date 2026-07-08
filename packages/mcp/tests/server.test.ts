import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { get } from "node:http";
import { connect, call, textOf, fixture, repoPath } from "./helpers.js";

const EXAMPLE_PKG = repoPath("examples/social-icons/instagram");

/** The known-good instagram subpath starts (Spec fixture), to 3 decimals. */
const EXPECTED_STARTS = [
  [7.03, 0.084],
  [7.17, 21.777],
  [16.953, 5.586],
  [5.838, 12.012],
  [8, 12.008],
];

function fetchStatus(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    }).on("error", reject);
  });
}

const temps: string[] = [];
function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temps.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("msvg-mcp server", () => {
  it("registers exactly the eight documented tools", async () => {
    const h = await connect();
    try {
      const { tools } = await h.client.listTools();
      const names = tools.map((t) => t.name).sort();
      expect(names).toEqual(
        [
          "msvg_check_targets",
          "msvg_create",
          "msvg_inspect",
          "msvg_preview_start",
          "msvg_preview_stop",
          "msvg_split_subpaths",
          "msvg_summarize",
          "msvg_validate",
        ].sort(),
      );
      // Every tool must carry a non-trivial description (agents pick by it).
      for (const t of tools) {
        expect(t.description, `missing description for ${t.name}`).toBeTruthy();
        expect((t.description ?? "").length).toBeGreaterThan(40);
      }
    } finally {
      await h.close();
    }
  });
});

describe("msvg_split_subpaths", () => {
  it("splits the instagram SVG file into the 5 known subpaths (parity)", async () => {
    const h = await connect();
    try {
      const result = await call(h.client, "msvg_split_subpaths", {
        svgPath: fixture("instagram.svg"),
      });
      expect(result.isError).toBeFalsy();
      const subpaths = JSON.parse(textOf(result)) as Array<{ start: [number, number]; d: string }>;
      expect(subpaths).toHaveLength(5);
      const starts = subpaths.map((s) => [
        Number(s.start[0].toFixed(3)),
        Number(s.start[1].toFixed(3)),
      ]);
      expect(starts).toEqual(EXPECTED_STARTS);
      // Each subpath's `d` is absolutized to a leading `M`.
      for (const s of subpaths) expect(s.d.startsWith("M")).toBe(true);
    } finally {
      await h.close();
    }
  });

  it("accepts a raw `d` string and matches the file result", async () => {
    const h = await connect();
    try {
      const d = "M10 10 h 80 v 80 h -80 Z M30 30 h 20 v 20 h -20 Z";
      const result = await call(h.client, "msvg_split_subpaths", { d });
      expect(result.isError).toBeFalsy();
      const subpaths = JSON.parse(textOf(result)) as Array<{ start: number[] }>;
      expect(subpaths).toHaveLength(2);
      expect(subpaths[0].start).toEqual([10, 10]);
      expect(subpaths[1].start).toEqual([30, 30]);
    } finally {
      await h.close();
    }
  });

  it("errors when neither d nor svgPath is provided", async () => {
    const h = await connect();
    try {
      const result = await call(h.client, "msvg_split_subpaths", {});
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Provide either");
    } finally {
      await h.close();
    }
  });
});

describe("msvg_validate", () => {
  it("reports a valid package as valid with no errors", async () => {
    const h = await connect();
    try {
      const result = await call(h.client, "msvg_validate", { dir: EXAMPLE_PKG });
      expect(result.isError).toBeFalsy();
      const summary = JSON.parse(textOf(result));
      expect(summary.valid).toBe(true);
      expect(summary.errorCount).toBe(0);
      expect(Array.isArray(summary.issues)).toBe(true);
    } finally {
      await h.close();
    }
  });

  it("reports a broken package as invalid with the issue list", async () => {
    const h = await connect();
    try {
      const dir = tempDir("msvg-mcp-broken-");
      writeFileSync(join(dir, "animation.config.json"), "{ not valid json", "utf8");
      const result = await call(h.client, "msvg_validate", { dir });
      expect(result.isError).toBeFalsy();
      const summary = JSON.parse(textOf(result));
      expect(summary.valid).toBe(false);
      expect(summary.errorCount).toBeGreaterThan(0);
      expect(summary.issues.length).toBeGreaterThan(0);
    } finally {
      await h.close();
    }
  });

  it("errors on a non-absolute path", async () => {
    const h = await connect();
    try {
      const result = await call(h.client, "msvg_validate", { dir: "relative/path" });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("absolute path");
    } finally {
      await h.close();
    }
  });
});

describe("msvg_create round-trip", () => {
  it("scaffolds a package that then passes msvg_validate", async () => {
    const h = await connect();
    try {
      const parentDir = tempDir("msvg-mcp-create-");
      const created = await call(h.client, "msvg_create", {
        parentDir,
        name: "widget-bot",
      });
      expect(created.isError).toBeFalsy();
      expect(textOf(created)).toContain("widget-bot");

      const pkgDir = join(parentDir, "animations", "widget-bot");
      const validated = await call(h.client, "msvg_validate", { dir: pkgDir });
      const summary = JSON.parse(textOf(validated));
      expect(summary.valid).toBe(true);
      expect(summary.errorCount).toBe(0);
    } finally {
      await h.close();
    }
  });

  it("rejects a non-kebab-case name", async () => {
    const h = await connect();
    try {
      const parentDir = tempDir("msvg-mcp-create-bad-");
      const created = await call(h.client, "msvg_create", {
        parentDir,
        name: "BadName",
      });
      expect(created.isError).toBe(true);
      expect(textOf(created)).toContain("kebab-case");
    } finally {
      await h.close();
    }
  });
});

describe("msvg_inspect / msvg_summarize / msvg_check_targets", () => {
  it("inspect returns a structured overview", async () => {
    const h = await connect();
    try {
      const result = await call(h.client, "msvg_inspect", { dir: EXAMPLE_PKG });
      expect(result.isError).toBeFalsy();
      expect(textOf(result)).toContain("Timelines:");
    } finally {
      await h.close();
    }
  });

  it("summarize returns AI-friendly markdown", async () => {
    const h = await connect();
    try {
      const result = await call(h.client, "msvg_summarize", { dir: EXAMPLE_PKG });
      expect(result.isError).toBeFalsy();
      expect(textOf(result)).toContain("MotionSVG Package Summary");
    } finally {
      await h.close();
    }
  });

  it("check_targets resolves selectors", async () => {
    const h = await connect();
    try {
      const result = await call(h.client, "msvg_check_targets", { dir: EXAMPLE_PKG });
      expect(result.isError).toBeFalsy();
      expect(textOf(result)).toContain("Targets:");
    } finally {
      await h.close();
    }
  });
});

describe("msvg_preview_start / msvg_preview_stop", () => {
  it("starts on an auto-selected port, GET returns 200, stop closes it", async () => {
    const h = await connect();
    try {
      const started = await call(h.client, "msvg_preview_start", { dir: EXAMPLE_PKG });
      expect(started.isError).toBeFalsy();
      const info = JSON.parse(textOf(started).split("\n\nPreview")[0]) as {
        url: string;
        port: number;
      };
      expect(info.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);

      const status = await fetchStatus(info.url);
      expect(status).toBe(200);

      const stopped = await call(h.client, "msvg_preview_stop", { port: info.port });
      expect(stopped.isError).toBeFalsy();
      expect(textOf(stopped)).toContain(String(info.port));

      // After stopping, the port should no longer accept connections.
      await expect(fetchStatus(info.url)).rejects.toBeTruthy();
    } finally {
      await h.close();
    }
  });

  it("stop with all=true closes every running preview", async () => {
    const h = await connect();
    try {
      await call(h.client, "msvg_preview_start", { dir: EXAMPLE_PKG });
      await call(h.client, "msvg_preview_start", { dir: EXAMPLE_PKG });
      const stopped = await call(h.client, "msvg_preview_stop", { all: true });
      expect(stopped.isError).toBeFalsy();
      expect(textOf(stopped)).toMatch(/Stopped \d+ preview/);
    } finally {
      await h.close();
    }
  });

  it("errors when previewing a directory without assets/main.svg", async () => {
    const h = await connect();
    try {
      const dir = tempDir("msvg-mcp-nopreview-");
      const result = await call(h.client, "msvg_preview_start", { dir });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("was not found");
    } finally {
      await h.close();
    }
  });
});
