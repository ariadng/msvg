/**
 * The msvg-mcp server: an `McpServer` exposing the MotionSVG toolchain over the
 * Model Context Protocol. It wraps the tested `msvg-cli` library functions
 * (`runCreate`, `runValidate`, `runInspect`, `runCheckTargets`, `runSummarize`,
 * `createPreviewServer`) plus a faithful port of the subpath splitter, so any
 * MCP client (Claude Desktop, Claude Code, a generic client) can drive the same
 * workflow the `msvg` CLI offers.
 *
 * Design rules honored here:
 *  - Never `process.chdir`: `runCreate` is given an explicit `cwd`.
 *  - All directory inputs must be absolute paths; clear errors otherwise.
 *  - Every tool returns an `isError: true` result on operational failure rather
 *    than throwing, so the client always gets a structured answer.
 *  - Preview servers bind `127.0.0.1`, default to port 4321, auto-increment when
 *    busy, and are tracked so they can be stopped individually or all at once.
 */

import { existsSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import type { Server } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  createPreviewServer,
  runCheckTargets,
  runCreate,
  runInspect,
  runSummarize,
  runValidate,
} from "msvg-cli";
import { firstPathData, splitSubpaths } from "./subpaths.js";
import { readFileSync } from "node:fs";

/** Package version, kept in sync with package.json. */
export const MSVG_MCP_VERSION = "0.1.0";

const DEFAULT_PREVIEW_PORT = 4321;
const PREVIEW_HOST = "127.0.0.1";
const PREVIEW_MAX_PORT_TRIES = 20;

/** Build a plain text tool result. */
function text(body: string, isError = false): CallToolResult {
  return { content: [{ type: "text", text: body }], isError };
}

/** Build an error tool result from a thrown value or message. */
function errorResult(prefix: string, err: unknown): CallToolResult {
  const message = err instanceof Error ? err.message : String(err);
  return text(`${prefix}: ${message}`, true);
}

/** Validate that `dir` is a non-empty absolute path; return an error string or null. */
function absolutePathError(dir: string, label = "path"): string | null {
  if (typeof dir !== "string" || dir.trim() === "") {
    return `The "${label}" argument is required and must be a non-empty string.`;
  }
  if (!isAbsolute(dir)) {
    return `The "${label}" argument must be an absolute path (got "${dir}").`;
  }
  return null;
}

/** Assert an existing directory at an absolute path; return an error string or null. */
function existingDirError(dir: string, label = "dir"): string | null {
  const abs = absolutePathError(dir, label);
  if (abs) return abs;
  if (!existsSync(dir)) return `No such directory: ${dir}`;
  if (!statSync(dir).isDirectory()) return `Not a directory: ${dir}`;
  return null;
}

/** Listen on `startPort`, incrementing past busy ports; resolves with the bound port. */
function listenWithAutoIncrement(
  server: Server,
  startPort: number,
  host: string,
  maxTries: number,
): Promise<number> {
  return new Promise((resolve, reject) => {
    let port = startPort;
    let attempts = 0;

    const attempt = (): void => {
      attempts += 1;

      const onError = (err: NodeJS.ErrnoException): void => {
        server.removeListener("listening", onListening);
        if (err.code === "EADDRINUSE" && attempts < maxTries) {
          port += 1;
          attempt();
          return;
        }
        reject(err);
      };

      const onListening = (): void => {
        server.removeListener("error", onError);
        resolve(port);
      };

      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(port, host);
    };

    attempt();
  });
}

/**
 * Create the msvg MCP server and register all eight tools.
 *
 * Returns the `McpServer` plus a `closeAllPreviews` helper; the caller is
 * responsible for connecting a transport and, on shutdown, closing previews.
 */
export function createMsvgServer(): {
  server: McpServer;
  closeAllPreviews: () => Promise<void>;
} {
  const server = new McpServer(
    { name: "msvg-mcp", version: MSVG_MCP_VERSION },
    {
      instructions:
        "MotionSVG (msvg) toolchain. Use these tools to scaffold, validate, " +
        "inspect, summarize, and preview msvg animation packages, and to split " +
        "an SVG path into subpaths for per-part animation. All directory " +
        "arguments must be absolute paths.",
    },
  );

  /** Running preview HTTP servers, keyed by their bound port. */
  const previews = new Map<number, Server>();

  const closeAllPreviews = async (): Promise<void> => {
    const servers = [...previews.values()];
    previews.clear();
    await Promise.all(
      servers.map(
        (s) =>
          new Promise<void>((resolve) => {
            s.close(() => resolve());
          }),
      ),
    );
  };

  // --- msvg_create ----------------------------------------------------------
  server.registerTool(
    "msvg_create",
    {
      title: "Create an msvg animation package",
      description:
        "Scaffold a new, valid MotionSVG animation package. Use this to START a " +
        "new animation. Creates `animations/<name>/` under `parentDir` with a " +
        "manifest, resting-state SVG, targets/timelines/states, and README. The " +
        "scaffold passes msvg_validate immediately. `parentDir` must be an " +
        "absolute path; `name` must be kebab-case (e.g. \"inventory-agent\").",
      inputSchema: {
        parentDir: z
          .string()
          .describe("Absolute path to the directory under which animations/<name>/ is created."),
        name: z.string().describe("kebab-case animation name, e.g. \"inventory-agent\"."),
      },
    },
    async ({ parentDir, name }) => {
      const pathErr = existingDirError(parentDir, "parentDir");
      if (pathErr) return text(pathErr, true);
      try {
        const result = runCreate(name, { cwd: parentDir });
        const body =
          result.exitCode === 0 && result.dir
            ? `${result.output}\n\nPackage directory: ${result.dir}`
            : result.output;
        return text(body, result.exitCode !== 0);
      } catch (err) {
        return errorResult("msvg_create failed", err);
      }
    },
  );

  // --- msvg_validate --------------------------------------------------------
  server.registerTool(
    "msvg_validate",
    {
      title: "Validate an msvg package",
      description:
        "Validate a MotionSVG package against the msvg schema and its SVG " +
        "(target selectors, timelines, states). Use this AFTER editing a package " +
        "to confirm it is well-formed, or before shipping. Returns a JSON object " +
        "{ valid, errorCount, warningCount, issues } where `issues` is the full " +
        "structured issue list (path, code, severity, message). `dir` must be an " +
        "absolute path to a package directory.",
      inputSchema: {
        dir: z.string().describe("Absolute path to an msvg package directory."),
      },
    },
    async ({ dir }) => {
      const pathErr = existingDirError(dir);
      if (pathErr) return text(pathErr, true);
      try {
        const result = runValidate(dir, { json: true });
        const issues = JSON.parse(result.output) as Array<{ severity?: string }>;
        const errorCount = issues.filter((i) => i.severity === "error").length;
        const warningCount = issues.filter((i) => i.severity === "warning").length;
        const summary = {
          valid: errorCount === 0,
          errorCount,
          warningCount,
          issues,
        };
        return text(JSON.stringify(summary, null, 2));
      } catch (err) {
        return errorResult("msvg_validate failed", err);
      }
    },
  );

  // --- msvg_inspect ---------------------------------------------------------
  server.registerTool(
    "msvg_inspect",
    {
      title: "Inspect an msvg package",
      description:
        "Print a human-readable overview of a MotionSVG package: identity, " +
        "assets, the target->selector table, timelines with clip counts and total " +
        "durations, and the state table with transitions. Use this to UNDERSTAND " +
        "an existing package's structure before editing it. `dir` must be an " +
        "absolute path.",
      inputSchema: {
        dir: z.string().describe("Absolute path to an msvg package directory."),
      },
    },
    async ({ dir }) => {
      const pathErr = existingDirError(dir);
      if (pathErr) return text(pathErr, true);
      try {
        const result = runInspect(dir);
        return text(result.output, result.exitCode !== 0);
      } catch (err) {
        return errorResult("msvg_inspect failed", err);
      }
    },
  );

  // --- msvg_check_targets ---------------------------------------------------
  server.registerTool(
    "msvg_check_targets",
    {
      title: "Check msvg target selectors",
      description:
        "Resolve every target selector in a MotionSVG package against " +
        "assets/main.svg and report which resolve and which fail (missing " +
        "element or wrong cardinality). Use this as a FAST check right after " +
        "editing motion/targets.json or the SVG, without running full validation. " +
        "`dir` must be an absolute path.",
      inputSchema: {
        dir: z.string().describe("Absolute path to an msvg package directory."),
      },
    },
    async ({ dir }) => {
      const pathErr = existingDirError(dir);
      if (pathErr) return text(pathErr, true);
      try {
        const result = runCheckTargets(dir);
        return text(result.output);
      } catch (err) {
        return errorResult("msvg_check_targets failed", err);
      }
    },
  );

  // --- msvg_summarize -------------------------------------------------------
  server.registerTool(
    "msvg_summarize",
    {
      title: "Summarize an msvg package for an agent",
      description:
        "Emit an AI-friendly Markdown summary of a MotionSVG package: which " +
        "files are safe to edit, the available target/timeline/state names, and " +
        "the real validation status. Use this as your FIRST read when an agent " +
        "is about to work on an existing package. `dir` must be an absolute path.",
      inputSchema: {
        dir: z.string().describe("Absolute path to an msvg package directory."),
      },
    },
    async ({ dir }) => {
      const pathErr = existingDirError(dir);
      if (pathErr) return text(pathErr, true);
      try {
        const result = runSummarize(dir);
        return text(result.output);
      } catch (err) {
        return errorResult("msvg_summarize failed", err);
      }
    },
  );

  // --- msvg_preview_start ---------------------------------------------------
  server.registerTool(
    "msvg_preview_start",
    {
      title: "Start an msvg preview server",
      description:
        "Start a local preview server (bound to 127.0.0.1) with a control panel " +
        "that plays the package's timelines and state transitions in a browser. " +
        "Use this to VISUALLY review an animation. Returns the URL. Defaults to " +
        "port 4321 and auto-increments if the port is busy. `dir` must be an " +
        "absolute path to a package directory. Stop it later with " +
        "msvg_preview_stop.",
      inputSchema: {
        dir: z.string().describe("Absolute path to an msvg package directory."),
        port: z
          .number()
          .int()
          .min(1)
          .max(65535)
          .optional()
          .describe("Preferred port (default 4321). Auto-increments if busy."),
      },
    },
    async ({ dir, port }) => {
      const pathErr = existingDirError(dir);
      if (pathErr) return text(pathErr, true);
      const svgPath = join(dir, "assets", "main.svg");
      if (!existsSync(svgPath)) {
        return text(`Cannot preview: ${svgPath} was not found.`, true);
      }
      try {
        const httpServer = createPreviewServer(dir);
        const boundPort = await listenWithAutoIncrement(
          httpServer,
          port ?? DEFAULT_PREVIEW_PORT,
          PREVIEW_HOST,
          PREVIEW_MAX_PORT_TRIES,
        );
        previews.set(boundPort, httpServer);
        const url = `http://${PREVIEW_HOST}:${boundPort}/`;
        return text(
          JSON.stringify({ url, port: boundPort, dir }, null, 2) +
            `\n\nPreview running at ${url}`,
        );
      } catch (err) {
        return errorResult("msvg_preview_start failed", err);
      }
    },
  );

  // --- msvg_preview_stop ----------------------------------------------------
  server.registerTool(
    "msvg_preview_stop",
    {
      title: "Stop msvg preview server(s)",
      description:
        "Stop a preview server started by msvg_preview_start. Pass `port` to stop " +
        "one server, or omit it (or pass `all: true`) to stop ALL running " +
        "previews. Use this to free ports when you are done reviewing.",
      inputSchema: {
        port: z
          .number()
          .int()
          .min(1)
          .max(65535)
          .optional()
          .describe("Port of the preview to stop. Omit to stop all."),
        all: z.boolean().optional().describe("Stop all running previews."),
      },
    },
    async ({ port, all }) => {
      try {
        if (all !== true && typeof port === "number") {
          const httpServer = previews.get(port);
          if (!httpServer) {
            return text(`No preview server is running on port ${port}.`, true);
          }
          await new Promise<void>((resolve) => httpServer.close(() => resolve()));
          previews.delete(port);
          return text(`Stopped preview server on port ${port}.`);
        }
        const ports = [...previews.keys()];
        await closeAllPreviews();
        if (ports.length === 0) return text("No preview servers were running.");
        return text(`Stopped ${ports.length} preview server(s): ${ports.join(", ")}.`);
      } catch (err) {
        return errorResult("msvg_preview_stop failed", err);
      }
    },
  );

  // --- msvg_split_subpaths --------------------------------------------------
  server.registerTool(
    "msvg_split_subpaths",
    {
      title: "Split an SVG path into subpaths",
      description:
        "Split an SVG path `d` string into its subpaths (one per M/m command), " +
        "each with an absolutized leading moveto and its own `d`. Use this when " +
        "PREPARING an SVG for per-part animation: it turns a single compound " +
        "<path> into fragments you can group as <g data-part>. Provide EITHER " +
        "`d` (a raw path data string) OR `svgPath` (an absolute path to an .svg " +
        "file, whose first <path d> is used). Returns [{ start:[x,y], d }].\n\n" +
        "HOLE WARNING: a subpath drawn counter-directionally inside another acts " +
        "as a HOLE (fill rule) and MUST stay in the SAME <path> as its outer " +
        "shape, or the hole fills solid. This tool does NOT recombine holes — " +
        "concatenate a hole's `d` onto its outer shape's `d` (outer first). Use " +
        "each subpath's `start` to detect nesting: a start inside another " +
        "subpath's bounds is almost always its hole.",
      inputSchema: {
        d: z
          .string()
          .optional()
          .describe("Raw SVG path `d` string to split. Provide this OR svgPath."),
        svgPath: z
          .string()
          .optional()
          .describe("Absolute path to an .svg file; its first <path d> is split."),
      },
    },
    async ({ d, svgPath }) => {
      try {
        let data = d;
        if (!data && svgPath) {
          const pathErr = absolutePathError(svgPath, "svgPath");
          if (pathErr) return text(pathErr, true);
          if (!existsSync(svgPath)) return text(`No such file: ${svgPath}`, true);
          const svg = readFileSync(svgPath, "utf8");
          const extracted = firstPathData(svg);
          if (!extracted) {
            return text(`No <path d="..."> found in ${svgPath}.`, true);
          }
          data = extracted;
        }
        if (!data) {
          return text(
            'Provide either "d" (a path data string) or "svgPath" (an absolute .svg file path).',
            true,
          );
        }
        const subpaths = splitSubpaths(data);
        return text(JSON.stringify(subpaths, null, 2));
      } catch (err) {
        return errorResult("msvg_split_subpaths failed", err);
      }
    },
  );

  return { server, closeAllPreviews };
}
