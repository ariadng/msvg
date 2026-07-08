#!/usr/bin/env node
// Generic msvg gallery server.
//
// Usage:   node serve.mjs [scan-dir]      (default scan-dir = cwd)
// Env:     PORT (default 4400), HOST (default 0.0.0.0)
//
// Recursively scans <scan-dir> for msvg packages (any directory containing an
// animation.config.json), then serves a single self-contained gallery page that
// loads every package in the browser via an import map + fetch. The msvg-core
// and msvg-schema runtimes are resolved from the scanned project's
// node_modules, or from a monorepo's packages/core|schema/dist, and served
// under /vendor/.
import { createServer } from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, join, normalize, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

// ---------------------------------------------------------------------------
// 1. Resolve the scan root.
// ---------------------------------------------------------------------------
const scanRoot = resolve(process.argv[2] ?? process.cwd());
if (!existsSync(scanRoot)) {
  console.error(`[msvg] scan directory not found: ${scanRoot}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Locate the built msvg-core / msvg-schema dist directories.
//    Preference order:
//      a. node_modules resolved from the scanned project (createRequire)
//      b. a monorepo workspace root with packages/<name>/dist, walking up
//         from scanRoot.
// ---------------------------------------------------------------------------
function resolveFromNodeModules(pkg) {
  // createRequire needs a real file path to anchor resolution; a non-existent
  // "package.json" inside scanRoot works because only its dirname is used.
  const req = createRequire(pathToFileURL(join(scanRoot, "package.json")));
  try {
    const pkgJson = req.resolve(`${pkg}/package.json`);
    const dist = join(dirname(pkgJson), "dist");
    return existsSync(join(dist, "index.js")) ? dist : null;
  } catch {
    return null;
  }
}

function resolveFromMonorepo(pkgDirName) {
  let dir = scanRoot;
  for (let i = 0; i < 8; i++) {
    const dist = join(dir, "packages", pkgDirName, "dist");
    if (existsSync(join(dist, "index.js"))) return dist;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function resolveDist(pkg, pkgDirName) {
  return resolveFromNodeModules(pkg) ?? resolveFromMonorepo(pkgDirName);
}

const coreDist = resolveDist("msvg-core", "core");
const schemaDist = resolveDist("msvg-schema", "schema");

if (!coreDist || !schemaDist) {
  const missing = [!coreDist && "msvg-core", !schemaDist && "msvg-schema"].filter(Boolean);
  console.error(
    `[msvg] Could not locate a built runtime for: ${missing.join(", ")}\n` +
      `\n` +
      `The gallery loads msvg-core and msvg-schema in the browser. Install them\n` +
      `into the project you are previewing:\n` +
      `\n` +
      `    npm install msvg-core msvg-schema\n` +
      `\n` +
      `Or run this server from inside the msvg monorepo after building\n` +
      `(npm run build), so packages/core/dist and packages/schema/dist exist.\n` +
      `\n` +
      `Scanned from: ${scanRoot}`,
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 3. Scan for packages (directories containing animation.config.json).
// ---------------------------------------------------------------------------
const IGNORE = new Set(["node_modules", ".git", "dist", ".claude", ".claude-plugin"]);

async function findPackages(root) {
  const found = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (entries.some((e) => e.isFile() && e.name === "animation.config.json")) {
      found.push(dir);
      return; // don't descend into a package
    }
    for (const e of entries) {
      if (!e.isDirectory() || IGNORE.has(e.name) || e.name.startsWith(".")) continue;
      await walk(join(dir, e.name));
    }
  }
  await walk(root);
  return found.sort();
}

const pkgDirs = await findPackages(scanRoot);
if (pkgDirs.length === 0) {
  console.error(
    `[msvg] No msvg packages found under ${scanRoot}\n` +
      `(looked for directories containing animation.config.json).`,
  );
  process.exit(1);
}

// Build the manifest the page fetches: a stable id (relative path, POSIX slashes)
// and a human label taken from the package config when readable.
const packages = [];
for (const dir of pkgDirs) {
  const id = relative(scanRoot, dir).split(sep).join("/") || ".";
  let label = id;
  try {
    const cfg = JSON.parse(await readFile(join(dir, "animation.config.json"), "utf8"));
    label = cfg.name ?? cfg.id ?? id;
  } catch {
    /* keep id as label */
  }
  packages.push({ id, label });
}

// ---------------------------------------------------------------------------
// 4. HTTP server.
// ---------------------------------------------------------------------------
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json",
  ".png": "image/png",
};

// Join a subpath under a root and refuse anything that escapes it.
function safeJoin(root, sub) {
  const decoded = decodeURIComponent(sub);
  const p = normalize(join(root, decoded));
  return p === root || p.startsWith(root + sep) ? p : null;
}

async function sendFile(res, file) {
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    const data = await readFile(file);
    res.setHeader("content-type", MIME[extname(file)] ?? "application/octet-stream");
    res.setHeader("cache-control", "no-store");
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end("not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const p = url.pathname;

  if (p === "/") {
    res.setHeader("content-type", MIME[".html"]);
    res.setHeader("cache-control", "no-store");
    res.end(PAGE);
    return;
  }
  if (p === "/packages.json") {
    res.setHeader("content-type", MIME[".json"]);
    res.setHeader("cache-control", "no-store");
    res.end(JSON.stringify(packages));
    return;
  }
  if (p.startsWith("/vendor/msvg-core/")) {
    const file = safeJoin(coreDist, p.slice("/vendor/msvg-core/".length));
    return void (file ? sendFile(res, file) : ((res.statusCode = 404), res.end("not found")));
  }
  if (p.startsWith("/vendor/msvg-schema/")) {
    const file = safeJoin(schemaDist, p.slice("/vendor/msvg-schema/".length));
    return void (file ? sendFile(res, file) : ((res.statusCode = 404), res.end("not found")));
  }
  if (p.startsWith("/pkg/")) {
    const file = safeJoin(scanRoot, p.slice("/pkg/".length));
    return void (file ? sendFile(res, file) : ((res.statusCode = 404), res.end("not found")));
  }

  res.statusCode = 404;
  res.end("not found");
});

const port = Number(process.env.PORT ?? 4400);
const host = process.env.HOST ?? "0.0.0.0";
server.listen(port, host, () => {
  console.log(`msvg gallery: http://${host === "0.0.0.0" ? "localhost" : host}:${port}/`);
  console.log(`scanning:     ${scanRoot}`);
  console.log(`packages:     ${packages.length}`);
  console.log(`runtime:      ${coreDist}`);
});

// ---------------------------------------------------------------------------
// 5. The inlined gallery page.
// ---------------------------------------------------------------------------
const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>msvg gallery</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #fafafa; --fg: #1c1c1e; --muted: #86868b;
    --tile: #fff; --tile-border: rgba(0,0,0,.07);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #111113; --fg: #f2f2f4; --muted: #8e8e93;
      --tile: #1c1c1f; --tile-border: rgba(255,255,255,.08);
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--fg);
    font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
    display: flex; min-height: 100dvh; flex-direction: column;
  }
  main { flex: 1; width: min(760px, 100% - 2rem); margin: 0 auto; }
  header { padding: 2.5rem 0 1rem; }
  h1 { font-size: 1.25rem; font-weight: 650; margin: 0; letter-spacing: -.01em; }
  header p { margin: .35rem 0 0; color: var(--muted); font-size: .9rem; }
  .grid {
    display: grid; gap: .75rem;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    padding-bottom: 2rem;
  }
  .tile {
    appearance: none; border: 1px solid var(--tile-border); background: var(--tile);
    color: inherit; border-radius: 14px; padding: 1.25rem .5rem .9rem;
    display: flex; flex-direction: column; align-items: center; gap: .6rem;
    cursor: pointer; transition: transform 120ms ease, opacity 120ms ease;
    -webkit-tap-highlight-color: transparent;
  }
  .tile:active { transform: scale(.96); }
  .tile.paused { opacity: .45; }
  .slot { width: 56px; height: 56px; }
  .slot svg { width: 100%; height: 100%; display: block; }
  .label { font-size: .78rem; color: var(--muted); text-align: center; word-break: break-word; }
  footer { padding: 1rem; text-align: center; color: var(--muted); font-size: .78rem; }
  footer a { color: inherit; }
</style>
</head>
<body>
<main>
  <header>
    <h1>msvg gallery</h1>
    <p>MotionSVG packages, looping through their state machines. Tap a tile to pause or resume.</p>
  </header>
  <div id="grid" class="grid"></div>
</main>
<footer>Runtime: <a href="https://github.com/ariadng/msvg">msvg</a> &middot; honors reduced-motion</footer>

<script type="importmap">
{ "imports": {
  "msvg-core": "/vendor/msvg-core/index.js",
  "msvg-schema": "/vendor/msvg-schema/index.js"
} }
</script>
<script type="module">
  import { createMsvg } from "msvg-core";

  const grid = document.querySelector("#grid");
  const packages = await fetch("/packages.json").then((r) => r.json());

  // Resolve a motion-file path (e.g. "./motion/targets.json") against a package base.
  const j = (base, p) => base + "/" + String(p).replace(/^\\.?\\//, "");

  async function loadPackage(base) {
    const config = await fetch(base + "/animation.config.json").then((r) => r.json());
    const motion = config.motion ?? {};
    const [targets, timelines] = await Promise.all([
      fetch(j(base, motion.targets ?? "./motion/targets.json")).then((r) => r.json()),
      fetch(j(base, motion.timelines ?? "./motion/timelines.json")).then((r) => r.json()),
    ]);
    let states;
    if (motion.states) {
      states = await fetch(j(base, motion.states))
        .then((r) => (r.ok ? r.json() : undefined))
        .catch(() => undefined);
    }
    const svgPath = config.asset?.svg ?? "./assets/main.svg";
    const svgMarkup = await fetch(j(base, svgPath)).then((r) => r.text());
    return { config, targets, timelines, states, svgMarkup };
  }

  for (const { id, label } of packages) {
    const tile = document.createElement("button");
    tile.className = "tile";
    tile.setAttribute("aria-label", label + " — tap to pause or resume");
    const slot = document.createElement("div");
    slot.className = "slot";
    const cap = document.createElement("span");
    cap.className = "label";
    cap.textContent = label;
    tile.append(slot, cap);
    grid.append(tile);

    loadPackage("/pkg/" + id)
      .then((animation) => {
        const controller = createMsvg({ container: slot, animation });
        const states = controller.getStates ? controller.getStates() : [];
        if (states.includes("loading")) {
          controller.send("LOAD");
          tile.addEventListener("click", () => {
            const looping = controller.getState() === "loading";
            controller.send(looping ? "RESET" : "LOAD");
            tile.classList.toggle("paused", looping);
          });
        } else {
          // No canonical loading state: play a sensible timeline once.
          const tls = controller.getTimelines ? controller.getTimelines() : [];
          const pick = ["loadingLoop", "loop", "idle", "intro"].find((n) => tls.includes(n)) ?? tls[0];
          if (pick) {
            controller.play(pick);
            tile.addEventListener("click", () => controller.play(pick));
          }
        }
      })
      .catch((err) => {
        cap.textContent = label + ": failed to load";
        console.error(id, err);
      });
  }
</script>
</body>
</html>
`;
