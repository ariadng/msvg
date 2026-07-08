/**
 * `msvg preview <path>` (Spec Sections 20.2, 22-note).
 *
 * A local static server with a minimal control panel: one button per timeline,
 * one button per state-machine event, and a reduced-motion toggle. It is a
 * manual authoring aid, not part of the validation pipeline.
 *
 * `msvg` is resolved and imported lazily, only inside the request handler
 * (never at module load), via `module.createRequire`, and served at
 * `/msvg-core.js`. This keeps the CLI build and its tests independent of whether
 * `msvg` has been built.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { loadPackage } from "../package-io.js";
import type { CommandResult } from "./validate.js";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
};

function contentTypeFor(path: string): string {
  return CONTENT_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream";
}

/** Resolve the built `msvg` entry file lazily, or `null` if unavailable. */
function resolveCorePath(): string | null {
  try {
    const require = createRequire(import.meta.url);
    return require.resolve("msvg");
  } catch {
    return null;
  }
}

/** Build the control-panel HTML for the loaded package. */
function controlPanelHtml(dir: string): string {
  const loaded = loadPackage(dir);
  const svgMarkup = loaded.svgMarkup ?? "<p>Missing assets/main.svg</p>";
  const animationId = loaded.config?.id ?? "animation";
  const timelineNames = loaded.timelines ? Object.keys(loaded.timelines) : [];

  const events = new Set<string>();
  if (loaded.states?.states) {
    for (const state of Object.values(loaded.states.states)) {
      if (state?.on) for (const event of Object.keys(state.on)) events.add(event);
    }
  }

  const bootstrap = JSON.stringify({
    animationId,
    timelines: timelineNames,
    events: [...events],
    hasStates: Boolean(loaded.states?.states),
  });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>msvg preview — ${animationId}</title>
<link rel="stylesheet" href="/motion/idle.css" />
<style>
  body { font: 14px/1.5 system-ui, sans-serif; margin: 0; display: flex; min-height: 100vh; }
  #stage { flex: 1; display: grid; place-items: center; background: #0b1020; }
  #stage svg { width: min(60vmin, 480px); height: auto; }
  #panel { width: 260px; padding: 16px; border-left: 1px solid #ddd; box-sizing: border-box; }
  #panel h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #666; margin: 16px 0 8px; }
  button { display: block; width: 100%; margin: 4px 0; padding: 8px; cursor: pointer; }
  label { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
</style>
</head>
<body>
  <div id="stage">${svgMarkup}</div>
  <div id="panel">
    <h2>Timelines</h2>
    <div id="timelines"></div>
    <h2>Events</h2>
    <div id="events"></div>
    <h2>Options</h2>
    <label><input type="checkbox" id="reduced" /> Reduced motion</label>
  </div>
  <script type="application/json" id="bootstrap">${bootstrap}</script>
  <script type="module">
    const boot = JSON.parse(document.getElementById("bootstrap").textContent);
    const stage = document.getElementById("stage");
    const svg = stage.querySelector("svg") ?? stage;

    const easings = {
      linear: "linear",
      standard: "cubic-bezier(.2, 0, 0, 1)",
      soft: "cubic-bezier(.4, 0, .2, 1)",
      emphasized: "cubic-bezier(.05, .7, .1, 1)",
      bounceSoft: "cubic-bezier(.34, 1.56, .64, 1)",
    };
    const resolveEasing = (e) => (e && easings[e]) || e || "linear";

    let pkg = null;
    async function loadPkg() {
      const [targets, timelines, states] = await Promise.all([
        fetch("/motion/targets.json").then((r) => r.json()),
        fetch("/motion/timelines.json").then((r) => r.json()),
        boot.hasStates ? fetch("/motion/states.json").then((r) => r.json()) : Promise.resolve(null),
      ]);
      pkg = { targets, timelines, states };
    }

    const selectorFor = (t) => (typeof t === "string" ? t : t && t.selector);
    let running = [];
    let reduced = false;

    function stopAll() {
      for (const a of running) { try { a.commitStyles(); } catch {} a.cancel(); }
      running = [];
    }

    function playTimeline(name, loop) {
      if (!pkg || reduced) return;
      const clips = pkg.timelines[name];
      if (!clips) return;
      stopAll();
      for (const clip of clips) {
        const sel = selectorFor(pkg.targets[clip.target]);
        if (!sel) continue;
        for (const el of svg.querySelectorAll(sel)) {
          el.style.transformBox = "fill-box";
          el.style.transformOrigin = "center";
          const a = el.animate(clip.keyframes, {
            ...clip.options,
            delay: (clip.options.delay ?? 0) + (clip.at ?? 0),
            easing: resolveEasing(clip.options.easing),
            fill: clip.options.fill ?? "both",
            iterations: loop ? Infinity : (clip.options.iterations ?? 1),
          });
          running.push(a);
        }
      }
    }

    let current = null;
    function enter(state) {
      current = state;
      const def = pkg?.states?.states?.[state];
      if (def?.onEnter?.timeline) playTimeline(def.onEnter.timeline, def.onEnter.loop === true);
    }
    function send(event) {
      const def = pkg?.states?.states?.[current];
      const next = def?.on?.[event];
      if (next) { stopAll(); enter(next); }
    }

    // Best-effort: the built core is served here, as required. A raw browser may
    // not resolve its bare/relative imports, so the inline player above is the
    // reliable driver either way.
    import("/msvg-core.js").catch(() => {});

    function button(label, onClick) {
      const b = document.createElement("button");
      b.textContent = label;
      b.addEventListener("click", onClick);
      return b;
    }

    (async () => {
      await loadPkg();
      const tl = document.getElementById("timelines");
      for (const name of boot.timelines) tl.appendChild(button(name, () => playTimeline(name, false)));
      const ev = document.getElementById("events");
      for (const name of boot.events) ev.appendChild(button(name, () => send(name)));
      document.getElementById("reduced").addEventListener("change", (e) => {
        reduced = e.target.checked;
        svg.toggleAttribute("data-msvg-reduced", reduced);
        if (reduced) stopAll();
      });
      if (pkg?.states) enter(pkg.states.initial);
    })();
  </script>
</body>
</html>
`;
}

/** Serve a static file from within `dir`, guarding against path traversal. */
function serveStatic(dir: string, urlPath: string, res: ServerResponse): void {
  const relative = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(dir, `.${sep}${relative}`);
  const base = resolve(dir);
  if (filePath !== base && !filePath.startsWith(base + sep)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404).end("Not found");
    return;
  }
  res.writeHead(200, { "content-type": contentTypeFor(filePath) });
  res.end(readFileSync(filePath));
}

/**
 * Build (but do not start) the preview HTTP server for the package at `dir`.
 * Exposed for testing; `runPreview` starts it and prints the URL.
 */
export function createPreviewServer(dir: string): Server {
  return createServer((req: IncomingMessage, res: ServerResponse) => {
    const urlPath = (req.url ?? "/").split("?")[0];

    if (urlPath === "/" || urlPath === "/index.html") {
      res.writeHead(200, { "content-type": CONTENT_TYPES[".html"] });
      res.end(controlPanelHtml(dir));
      return;
    }

    if (urlPath === "/msvg-core.js") {
      const corePath = resolveCorePath();
      if (corePath && existsSync(corePath)) {
        res.writeHead(200, { "content-type": CONTENT_TYPES[".js"] });
        res.end(readFileSync(corePath));
      } else {
        res.writeHead(200, { "content-type": CONTENT_TYPES[".js"] });
        res.end("// msvg is not built; preview uses its inline fallback player.\n");
      }
      return;
    }

    serveStatic(dir, urlPath, res);
  });
}

export interface PreviewOptions {
  port?: number;
  host?: string;
}

/** Start the preview server. Resolves once it is listening; runs until closed. */
export function runPreview(
  dir: string,
  options: PreviewOptions = {},
): Promise<{ server: Server; url: string } & CommandResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    if (!existsSync(join(dir, "assets", "main.svg"))) {
      resolvePromise({
        server: createServer(),
        url: "",
        exitCode: 1,
        output: `Cannot preview: ${join(dir, "assets", "main.svg")} was not found.`,
      });
      return;
    }
    const port = options.port ?? 4321;
    const host = options.host ?? "127.0.0.1";
    const server = createPreviewServer(dir);
    server.on("error", rejectPromise);
    server.listen(port, host, () => {
      const url = `http://${host}:${port}/`;
      resolvePromise({
        server,
        url,
        exitCode: 0,
        output: `msvg preview running at ${url}\nPress Ctrl+C to stop.`,
      });
    });
  });
}
