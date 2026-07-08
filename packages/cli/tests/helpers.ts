/**
 * Shared test helpers: fixture paths and ANSI stripping. Not a `*.test.ts`
 * file, so vitest never runs it as a suite.
 *
 * happy-dom installs its own global `URL`, which does not round-trip `file:`
 * URLs the way `fileURLToPath` expects. We therefore use Node's `URL` from
 * `node:url` explicitly for all path math.
 */
import { fileURLToPath, URL as NodeURL } from "node:url";

const HERE = fileURLToPath(new NodeURL(".", import.meta.url));

/** Absolute path to a fixture package directory under `tests/fixtures/`. */
export function fixture(name: string): string {
  return fileURLToPath(new NodeURL(`./fixtures/${name}`, import.meta.url));
}

/** Absolute path to a file relative to the `packages/cli` package root. */
export function cliPath(relative: string): string {
  return fileURLToPath(new NodeURL(`../${relative}`, import.meta.url));
}

/** Absolute path to a file relative to the monorepo root. */
export function repoPath(relative: string): string {
  return fileURLToPath(new NodeURL(`../../../${relative}`, import.meta.url));
}

export const FIXTURES_DIR = fileURLToPath(new NodeURL("./fixtures", import.meta.url));
export const TESTS_DIR = HERE;

// eslint-disable-next-line no-control-regex
const ANSI = new RegExp("\\u001b\\[[0-9;]*m", "g");

/** Remove ANSI color escapes so assertions are color-agnostic. */
export function stripAnsi(input: string): string {
  return input.replace(ANSI, "");
}
