// Minimal static server for the msvg Material-icons gallery.
// Serves the gallery page, the 12 icon packages, and the built msvg-core /
// msvg-schema dists (consumed in the browser through an import map).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(here, "../../..");
const iconsRoot = resolve(here, "..");

const ICONS = [
  "home", "search", "menu", "close",
  "settings", "favorite", "star", "add",
  "delete", "notifications", "person", "shopping-cart",
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json",
};

function safeJoin(root, sub) {
  const p = normalize(join(root, sub));
  return p.startsWith(root) ? p : null;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    let file = null;

    if (url.pathname === "/") {
      file = join(here, "index.html");
    } else if (url.pathname === "/icons.json") {
      res.setHeader("content-type", MIME[".json"]);
      res.end(JSON.stringify(ICONS));
      return;
    } else if (url.pathname.startsWith("/vendor/msvg-core/")) {
      file = safeJoin(join(repoRoot, "packages/core/dist"), url.pathname.slice("/vendor/msvg-core/".length));
    } else if (url.pathname.startsWith("/vendor/msvg-schema/")) {
      file = safeJoin(join(repoRoot, "packages/schema/dist"), url.pathname.slice("/vendor/msvg-schema/".length));
    } else if (url.pathname.startsWith("/icons/")) {
      file = safeJoin(iconsRoot, url.pathname.slice("/icons/".length));
    }

    if (!file) {
      res.statusCode = 404;
      res.end("not found");
      return;
    }
    const data = await readFile(file);
    res.setHeader("content-type", MIME[extname(file)] ?? "application/octet-stream");
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end("not found");
  }
});

const port = Number(process.env.PORT ?? 4322);
const host = process.env.HOST ?? "0.0.0.0";
server.listen(port, host, () => {
  console.log(`msvg icon gallery at http://${host}:${port}/`);
});
