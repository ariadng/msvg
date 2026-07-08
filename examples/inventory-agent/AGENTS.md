# Agent Instructions for inventory-agent

You may safely edit:

- motion/timelines.json
- motion/states.json
- motion/targets.json
- motion/idle.css
- animation.config.json

Be careful when editing:

- assets/main.svg

Do not edit:

- index.ts unless exports are broken

Rules:

1. Use only target names defined in motion/targets.json.
2. Do not create random selectors inside timelines.json.
3. Prefer transform and opacity animations.
4. Avoid path morphing unless explicitly requested.
5. Keep product UI timelines under 1200ms.
6. Always preserve accessibility metadata.
7. Always run `msvg validate` after editing.
