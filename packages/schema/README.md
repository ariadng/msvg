# msvg-schema

TypeScript types, JSON Schemas, and validators for [msvg (MotionSVG)](https://github.com/ariadng/msvg) animation packages. Zero dependencies. This is the package that makes msvg animations safe for both humans and AI agents to edit: every motion file is structured JSON that validates before it runs.

## Install

```bash
npm install msvg-schema
```

## Use

```ts
import { validatePackage, isValidEasing, easings, durations } from "msvg-schema";

const { valid, issues } = validatePackage({ config, targets, timelines, states });
if (!valid) {
  // each issue: { severity: "error" | "warning", code, path, message, suggestion? }
}
```

Granular validators are exported too: `validateManifest`, `validateTargets`, `validateTimelines`, `validateStates`, `validateAccessibility` — plus the full type definitions for every file in a package and the `easings` / `durations` design tokens.

For command-line validation of a package folder, use [`msvg-cli`](https://www.npmjs.com/package/msvg-cli):

```bash
npx -p msvg-cli msvg validate path/to/animation
```

## More

- [Package format](https://github.com/ariadng/msvg/blob/main/docs/package-format.md) — every file explained
- [Spec](https://github.com/ariadng/msvg/blob/main/Spec.md) — the normative reference
- Runtime: [`msvg-core`](https://www.npmjs.com/package/msvg-core)

MIT © ariadng
