/**
 * msvg-cli — the `msvg` command-line tool (Spec Sections 20-25).
 *
 * `main()` wires the testable command functions in `./commands/*` to a
 * commander program and translates their `{ exitCode, output }` results into
 * console output and a process exit code. All command logic lives in the
 * command modules so it can be unit-tested without spawning a process.
 */

import { Command } from "commander";
import { runCreate } from "./commands/create.js";
import { runValidate } from "./commands/validate.js";
import { runInspect } from "./commands/inspect.js";
import { runCheckTargets } from "./commands/check-targets.js";
import { runSummarize } from "./commands/summarize.js";
import { runPreview } from "./commands/preview.js";

export { runCreate } from "./commands/create.js";
export { runValidate } from "./commands/validate.js";
export { runInspect } from "./commands/inspect.js";
export { runCheckTargets } from "./commands/check-targets.js";
export { runSummarize } from "./commands/summarize.js";
export { runPreview, createPreviewServer } from "./commands/preview.js";
export { loadPackage } from "./package-io.js";
export type { CommandResult } from "./commands/validate.js";

function emit(output: string, exitCode: number): void {
  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(output + "\n");
  process.exit(exitCode);
}

/** Build the commander program and dispatch (Section 20.1). */
export function main(argv: string[] = process.argv): void {
  const program = new Command();

  program
    .name("msvg")
    .description("MotionSVG — create, validate, inspect, and preview SVG animation packages")
    .version("0.1.0");

  program
    .command("create")
    .argument("<name>", "kebab-case animation name")
    .description("Scaffold a new animation package under animations/<name>/")
    .action((name: string) => {
      const result = runCreate(name);
      emit(result.output, result.exitCode);
    });

  program
    .command("validate")
    .argument("<path>", "path to an animation package directory")
    .description("Validate a package against the msvg schema and its SVG")
    .option("--json", "emit the raw validation issue list as JSON")
    .action((path: string, opts: { json?: boolean }) => {
      const result = runValidate(path, { json: opts.json });
      emit(result.output, result.exitCode);
    });

  program
    .command("inspect")
    .argument("<path>", "path to an animation package directory")
    .description("Print a human-readable overview of the package structure")
    .action((path: string) => {
      const result = runInspect(path);
      emit(result.output, result.exitCode);
    });

  program
    .command("check-targets")
    .argument("<path>", "path to an animation package directory")
    .description("Resolve every target selector against assets/main.svg")
    .action((path: string) => {
      const result = runCheckTargets(path);
      emit(result.output, result.exitCode);
    });

  program
    .command("summarize")
    .argument("<path>", "path to an animation package directory")
    .description("Generate an AI-friendly Markdown summary of the package")
    .action((path: string) => {
      const result = runSummarize(path);
      emit(result.output, result.exitCode);
    });

  program
    .command("preview")
    .argument("<path>", "path to an animation package directory")
    .description("Start a local preview server with a control panel")
    .option("-p, --port <port>", "port to listen on", "4321")
    .option("-H, --host <host>", "interface to bind; use 0.0.0.0 to allow other devices on the network", "127.0.0.1")
    .action(async (path: string, opts: { port?: string; host?: string }) => {
      const port = opts.port ? Number(opts.port) : undefined;
      const result = await runPreview(path, { port, host: opts.host });
      process.stdout.write(result.output + "\n");
      if (result.exitCode !== 0) process.exit(result.exitCode);
      // On success the server keeps running until the process is interrupted.
    });

  program.parse(argv);
}
