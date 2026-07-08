---
name: preview
description: Preview MotionSVG (msvg) animation packages live in the browser by serving a gallery of every package under a directory, each running its state machine. Use when the user asks to preview / view / see / show / run / open an msvg animation, an animated icon package, a MotionSVG gallery, or wants to watch a loop and check for seams. Starts a local static server with an import map + fetch loader.
argument-hint: [dir-to-scan]
---

# Preview msvg packages

This skill runs a self-contained static server that scans a directory for msvg packages
(any folder with `animation.config.json`) and serves a gallery page. Each tile mounts a
package with `msvg-core`, sends `LOAD` to start its `loadingLoop`, and lets you tap to
pause/resume. Watch the loop restart for seams (house rule 2) and confirm nothing leaves
the viewBox (house rule 6).

The server is `scripts/serve.mjs`, bundled with this skill. Reference it with the plugin
root variable so the path resolves wherever the plugin is installed:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/preview/scripts/serve.mjs" <dir-to-scan>
```

- `<dir-to-scan>` defaults to the current directory. Pass the folder that contains your
  package(s) — e.g. a single package dir, or a parent like `examples/` that holds many.
- `PORT` (default **4400**) and `HOST` (default **0.0.0.0**) are environment variables:
  `PORT=5000 node "${CLAUDE_PLUGIN_ROOT}/skills/preview/scripts/serve.mjs" ./examples`
- Open the printed URL (e.g. `http://localhost:4400/`).

## Runtime resolution (msvg-core / msvg-schema)

The gallery loads the runtime in the browser via an import map, so the server has to find
built copies of `msvg-core` and `msvg-schema`. It looks, in order:

1. The scanned project's `node_modules` (resolved with Node's `createRequire`) — i.e.
   `node_modules/msvg-core/dist`.
2. A monorepo workspace root above the scan dir with `packages/core/dist` and
   `packages/schema/dist`.

If neither is found the server exits with instructions. The fix is almost always:

```bash
npm install msvg-core msvg-schema
```

(or, inside the msvg monorepo, `npm run build` so the `dist` folders exist), then re-run.

## Running the server without blocking

Start it in the background, confirm it's up, and keep the URL for the user:

```bash
PORT=4400 node "${CLAUDE_PLUGIN_ROOT}/skills/preview/scripts/serve.mjs" <dir-to-scan> &
sleep 1
curl -s -o /dev/null -w "gallery: %{http_code}\n" http://localhost:4400/
curl -s http://localhost:4400/packages.json   # lists the discovered packages
```

Tell the user the URL and, when they're done, stop the server (`kill %1`, or the printed
PID). If a `read ECONNRESET` / port-in-use error appears, pick another `PORT`.

## Endpoints (for debugging)

- `GET /` — the gallery page (HTML is inlined in the server).
- `GET /packages.json` — `[{ id, label }]` for every discovered package.
- `GET /pkg/<id>/...` — files inside a package (`id` is its path relative to the scan dir).
- `GET /vendor/msvg-core/...`, `GET /vendor/msvg-schema/...` — the resolved runtime dists.

## Single-package alternative

For one package with a full control panel (play individual timelines, fire state events),
the msvg CLI also ships a preview command:

```bash
npx -p msvg-cli msvg preview <package-dir>
```

Use this skill's gallery when you want to eyeball **many** packages at once (e.g. an icon
set) and spot loop seams across the board.
