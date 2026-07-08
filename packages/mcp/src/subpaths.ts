/**
 * Faithful TypeScript port of the battle-tested Python subpath splitter at
 * `plugin/skills/animate/scripts/split-subpaths.py`.
 *
 * It splits an SVG path `d` string into its subpaths (one per `M`/`m` command),
 * rewriting each subpath's leading moveto as an absolute `M` and tracking the
 * pen position across every command so relative subpath starts resolve to
 * absolute coordinates. The output shape matches the Python tool exactly:
 * `[{ start: [x, y], d }]`, `start` rounded to 3 decimals.
 *
 * HOLE SUBPATHS: a subpath drawn counter-directionally inside another subpath
 * acts as a HOLE via the nonzero/evenodd fill rule (e.g. the transparent lens
 * ring inside a camera body). A hole MUST stay in the SAME `<path>` as its outer
 * shape, or the fill inverts and the hole fills solid. This splitter does NOT
 * recombine holes — the caller must concatenate a hole's `d` onto its outer
 * shape's `d` (outer first, hole second). `start` is provided so the caller can
 * tell which subpaths nest inside which: a subpath whose start lies inside
 * another's bounds is almost always its hole.
 */

/** A single subpath: its absolute start point and standalone `d` string. */
export interface Subpath {
  /** Absolute [x, y] start, rounded to 3 decimals (matches the Python tool). */
  start: [number, number];
  /** The subpath's own `d`, with an absolutized leading `M`. */
  d: string;
}

/** Number-token regex — identical to the Python `NUM` (tolerates `.084`, `4.`, `1e-3`). */
const NUM = /[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g;

/** Command tokenizer — identical to the Python token regex. */
const TOKEN = /([MmZzLlHhVvCcSsQqTtAa])([^MmZzLlHhVvCcSsQqTtAa]*)/g;

/** Argument arity per command letter (uppercased). */
const ARGS: Record<string, number> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
  Z: 0,
};

/**
 * Round to 3 decimals, mirroring the Python `round(x, 3)` used for `start`.
 *
 * Uses `toFixed(3)`, which rounds the true decimal value of the double (like
 * Python's `round`), rather than `Math.round(x * 1000)` whose float multiply can
 * push a value such as 5.8385 (stored as 5.83849999…) up to exactly 5838.5 and
 * mis-round it to 5.839. `+()` re-normalizes "-0.000"/"5.030" to -0/5.03.
 */
function round3(x: number): number {
  return Number(x.toFixed(3));
}

/**
 * Approximate Python's `%g` (6 significant digits, trailing zeros stripped),
 * used only for the implicit-lineto tail after a multi-coordinate moveto.
 */
function formatG(n: number): string {
  if (n === 0) return "0";
  return Number(n.toPrecision(6)).toString();
}

/**
 * Split an SVG path `d` string into absolutized subpaths.
 *
 * @param d the raw `d` attribute value
 * @returns one `Subpath` per `M`/`m` command, in document order
 */
export function splitSubpaths(d: string): Subpath[] {
  const subpaths: Subpath[] = [];
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let current: Subpath | null = null;

  for (const match of d.matchAll(TOKEN)) {
    const letter = match[1];
    const body = match[2];
    const ns = (body.match(NUM) ?? []).map(Number);
    const upper = letter.toUpperCase();
    const rel = letter !== upper; // letter.islower()
    const n = ARGS[upper];

    // Group the number list into per-command argument tuples.
    const groups: number[][] = [];
    if (n === 0) {
      groups.push([]);
    } else {
      for (let i = 0; i < ns.length; i += n) {
        groups.push(ns.slice(i, i + n));
      }
    }

    if (upper === "M") {
      const g0 = groups[0];
      const px = rel ? cx + g0[0] : g0[0];
      const py = rel ? cy + g0[1] : g0[1];
      current = {
        start: [round3(px), round3(py)],
        d: `M${px.toFixed(4)} ${py.toFixed(4)}`,
      };
      subpaths.push(current);
      cx = px;
      cy = py;
      sx = px;
      sy = py;
      // Implicit linetos following the initial moveto coordinate pair.
      for (let gi = 1; gi < groups.length; gi++) {
        const g = groups[gi];
        cx = rel ? cx + g[0] : g[0];
        cy = rel ? cy + g[1] : g[1];
        current.d += (rel ? "l" : "L") + `${formatG(g[0])} ${formatG(g[1])}`;
      }
      continue;
    }

    for (const g of groups) {
      if (upper === "Z") {
        cx = sx;
        cy = sy;
      } else if (upper === "H") {
        cx = rel ? cx + g[0] : g[0];
      } else if (upper === "V") {
        cy = rel ? cy + g[0] : g[0];
      } else {
        const ex = g[g.length - 2];
        const ey = g[g.length - 1];
        cx = rel ? cx + ex : ex;
        cy = rel ? cy + ey : ey;
      }
    }
    // `current` is always set here: a well-formed `d` starts with M/m.
    if (current) current.d += letter + body.trim();
  }

  return subpaths;
}

/** Extract the first `<path d="...">` value from raw SVG markup, or `null`. */
export function firstPathData(svg: string): string | null {
  const m = /\bd="([^"]+)"/.exec(svg);
  return m ? m[1] : null;
}
