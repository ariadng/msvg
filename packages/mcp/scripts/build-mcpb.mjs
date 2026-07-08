#!/usr/bin/env node
/**
 * Build the msvg Claude Desktop bundle (`msvg-0.1.0.mcpb`).
 *
 * This script proves the published packages are self-sufficient: it packs
 * `msvg-mcp` into a tarball, installs that tarball in a clean directory OUTSIDE
 * the monorepo (so `msvg-cli`, `msvg-core`, `msvg-schema`, the MCP SDK, and zod
 * all resolve from the PUBLIC npm registry), lays the result out per the MCPB
 * spec, then validates and packs it with `@anthropic-ai/mcpb`.
 *
 * Steps:
 *   1. Build the workspace packages (schema, core, cli, mcp).
 *   2. Render mcpb/icon.png from icon.svg via qlmanage (best-effort, macOS).
 *   3. `npm pack` msvg-mcp into a staging dir under the system temp dir.
 *   4. `npm install` the tarball there → deps come from the registry.
 *   5. Lay out the bundle: manifest.json + icon.png + server/ (+ node_modules).
 *   6. `mcpb validate` then `mcpb pack` → dist-mcpb/msvg-0.1.0.mcpb.
 *
 * Usage: node scripts/build-mcpb.mjs   (or `npm run build:mcpb`)
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = resolve(HERE, "..");
const REPO_ROOT = resolve(PKG_DIR, "..", "..");
const MCPB_SRC = join(PKG_DIR, "mcpb");
const OUT_DIR = join(PKG_DIR, "dist-mcpb");

const VERSION = JSON.parse(readFileSync(join(PKG_DIR, "package.json"), "utf8")).version;
const BUNDLE_NAME = "msvg";
const OUTPUT_MCPB = join(OUT_DIR, `${BUNDLE_NAME}-${VERSION}.mcpb`);

function log(msg) {
  process.stdout.write(`[build-mcpb] ${msg}\n`);
}

function run(cmd, args, opts = {}) {
  log(`$ ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { stdio: "inherit", ...opts });
}

/** Render mcpb/icon.png from icon.svg via qlmanage; return the png path or null. */
function ensureIcon() {
  const svg = join(MCPB_SRC, "icon.svg");
  const png = join(MCPB_SRC, "icon.png");
  if (!existsSync(svg)) {
    if (existsSync(png)) return png;
    log("no icon.svg and no icon.png; shipping without an icon");
    return null;
  }
  try {
    // qlmanage writes icon.svg.png next to -o dir; rename to icon.png.
    execFileSync("qlmanage", ["-t", "-s", "512", "-o", MCPB_SRC, svg], {
      stdio: "ignore",
    });
    const produced = join(MCPB_SRC, "icon.svg.png");
    if (existsSync(produced)) {
      rmSync(png, { force: true });
      cpSync(produced, png);
      rmSync(produced, { force: true });
    }
  } catch {
    log("qlmanage unavailable or failed; using existing icon.png if present");
  }
  return existsSync(png) ? png : null;
}

function main() {
  log(`building msvg ${VERSION} MCPB bundle`);

  // 1. Build the workspace packages the bundle needs.
  run("npm", [
    "run",
    "build",
    "-w",
    "msvg-schema",
    "-w",
    "msvg-core",
    "-w",
    "msvg-cli",
    "-w",
    "msvg-mcp",
  ], { cwd: REPO_ROOT });

  // 2. Render the icon (best-effort).
  const iconPath = ensureIcon();

  // 3. Stage: pack msvg-mcp into a clean temp dir.
  const staging = mkdtempSync(join(tmpdir(), "msvg-mcpb-stage-"));
  log(`staging dir: ${staging}`);
  writeFileSync(
    join(staging, "package.json"),
    JSON.stringify(
      { name: "msvg-mcpb-staging", private: true, version: "0.0.0" },
      null,
      2,
    ),
  );
  run("npm", ["pack", PKG_DIR, "--pack-destination", staging], { cwd: REPO_ROOT });
  const tarball = readdirSync(staging).find((f) => f.endsWith(".tgz"));
  if (!tarball) throw new Error("npm pack did not produce a tarball");
  log(`packed: ${tarball}`);

  // 4. Install the tarball → deps resolve from the PUBLIC registry.
  run(
    "npm",
    [
      "install",
      join(staging, tarball),
      "--no-save",
      "--omit=dev",
      "--install-strategy=hoisted",
    ],
    { cwd: staging },
  );

  const installedPkg = join(staging, "node_modules", "msvg-mcp");
  if (!existsSync(installedPkg)) {
    throw new Error("msvg-mcp was not installed from the tarball");
  }

  // 5. Lay out the bundle directory.
  const bundle = mkdtempSync(join(tmpdir(), "msvg-mcpb-bundle-"));
  log(`bundle dir: ${bundle}`);

  // manifest.json (drop the icon field if we have no icon).
  const manifest = JSON.parse(readFileSync(join(MCPB_SRC, "manifest.json"), "utf8"));
  if (!iconPath) delete manifest.icon;
  writeFileSync(join(bundle, "manifest.json"), JSON.stringify(manifest, null, 2));
  if (iconPath) cpSync(iconPath, join(bundle, "icon.png"));

  // server/ = the installed msvg-mcp package files (package.json, dist, bin).
  const serverDir = join(bundle, "server");
  mkdirSync(serverDir, { recursive: true });
  for (const entry of ["package.json", "dist", "bin"]) {
    const src = join(installedPkg, entry);
    if (existsSync(src)) cpSync(src, join(serverDir, entry), { recursive: true });
  }

  // server/node_modules = every installed dependency (minus msvg-mcp itself).
  const serverNodeModules = join(serverDir, "node_modules");
  cpSync(join(staging, "node_modules"), serverNodeModules, { recursive: true });
  rmSync(join(serverNodeModules, "msvg-mcp"), { recursive: true, force: true });
  rmSync(join(serverNodeModules, ".package-lock.json"), { force: true });

  // 6. Validate + pack.
  run("npx", ["-y", "@anthropic-ai/mcpb", "validate", join(bundle, "manifest.json")]);
  mkdirSync(OUT_DIR, { recursive: true });
  rmSync(OUTPUT_MCPB, { force: true });
  run("npx", ["-y", "@anthropic-ai/mcpb", "pack", bundle, OUTPUT_MCPB]);

  // Clean up temp dirs (leave the .mcpb).
  rmSync(staging, { recursive: true, force: true });
  rmSync(bundle, { recursive: true, force: true });

  log(`done: ${OUTPUT_MCPB}`);
}

main();
