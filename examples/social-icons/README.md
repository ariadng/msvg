# Social icon animations

The eight most popular social networks (by global active users), each packaged as a standalone msvg animation with a mandatory seamless `loadingLoop` driven by the state machine — same conventions as [examples/material-icons](../material-icons).

```txt
social-icons/
  _raw/       # original SVGs as downloaded from Simple Icons
  <icon>/     # one msvg package per icon (validate with: msvg validate <icon>)
```

They appear in the shared gallery under a separate **Social** section:

```bash
node examples/material-icons/gallery/serve.mjs
# → http://<host>:4322/
```

## License

Icon artwork is from [Simple Icons](https://simpleicons.org) (CC0-1.0). The brands
and their logos are trademarks of their respective owners; use of these marks does
not imply endorsement. Animation definitions follow the repository's MIT license.
