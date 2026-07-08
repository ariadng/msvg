# Material icon animations

Twelve of the most-used [Google Material Symbols](https://fonts.google.com/icons) icons, each packaged as a standalone msvg animation. Every package has a mandatory seamless `loadingLoop` timeline driven by the state machine (`idle → LOAD → loading`, `loop: true`), plus an `intro`.

```txt
material-icons/
  _raw/          # original SVGs as downloaded from fonts.gstatic.com
  <icon>/        # one msvg package per icon (validate with: msvg validate <icon>)
  gallery/       # browsable examples page: node gallery/serve.mjs
```

Run the gallery:

```bash
node examples/material-icons/gallery/serve.mjs
# → http://<host>:4322/
```

The gallery consumes the built `msvg-core` dist directly in the browser through an import map — no bundler — and assembles each package with `fetch` (the Spec §14.1 no-bundler path).

## License

The icon artwork is from Google Material Symbols, licensed under the
[Apache License 2.0](https://github.com/google/material-design-icons/blob/master/LICENSE).
The animation definitions follow the repository's MIT license.
