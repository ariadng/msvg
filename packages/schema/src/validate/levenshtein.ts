/**
 * Levenshtein edit distance between two strings, computed with two rolling
 * rows for O(min(m, n)) memory.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return prev[n];
}

/**
 * "Did you mean" suggestion: the closest candidate to `name` by edit distance,
 * or `undefined` if none is close enough. The threshold scales with the length
 * of `name` so short names do not attract loose matches.
 */
export function suggest(
  name: string,
  candidates: readonly string[],
): string | undefined {
  let best: string | undefined;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    if (candidate === name) continue;
    const distance = levenshtein(name, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }

  if (best === undefined) return undefined;

  const threshold = Math.max(2, Math.floor(name.length / 3));
  return bestDistance <= threshold ? best : undefined;
}
