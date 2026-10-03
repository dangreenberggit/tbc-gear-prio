/**
 * A brute-force check of the fork's exact meta repair (ticket 535).
 *
 * Test support, not a test file. It writes the repair's value V and its six
 * conditions again from their definitions in
 * `.scratch/stage-gate/535-meta-repair-hit/plan.md`, Appendices A and C
 * (gitignored; ticket 535's comment holds the measurements), and finds the
 * best layout by trying every one. It calls only the fork's lookups and
 * colour rules (`getItem`, `getGem`, `socketBonusActive`, `gemColorCounts`,
 * `isMetaConditionMet`), never the repair code it checks.
 */

/** `GemColor.GemColorMeta` in the fork's proto (`proto/common.ts`). */
const META_COLOUR = 1;

export type OracleItem = { itemId: number; gems: number[] };
export type OracleGem = {
  id: number;
  colour: number;
  stats: readonly number[];
  unique: boolean;
};

/** The fork functions the oracle calls, passed in by the test. */
export interface OracleFork {
  getItem(
    itemId: number
  ): { sockets: readonly number[]; socketBonus: readonly number[] } | undefined;
  getGem(gemId: number): OracleGem | undefined;
  socketBonusActive(
    sockets: readonly number[],
    gemIds: readonly number[]
  ): boolean;
  gemColorCounts(gemIds: readonly number[]): {
    red: number;
    yellow: number;
    blue: number;
  };
  isMetaConditionMet(
    metaId: number,
    counts: { red: number; yellow: number; blue: number }
  ): boolean;
}

export type OracleOpts = {
  /** The gear before repair, in SIM_ORDER; the head (index 0) holds the meta. */
  items: readonly OracleItem[];
  weights: Readonly<Record<string, number>>;
  palette: readonly OracleGem[];
  hitCap?: { stat: number; remaining: number };
  maxChanges: number;
};

/** The stat the hit term prices; melee hit rating when there is no budget. */
const MELEE_HIT_RATING = 20;

function weighted(
  stats: readonly number[],
  weights: Readonly<Record<string, number>>,
  skip: number
): number {
  let sum = 0;
  for (const [key, w] of Object.entries(weights)) {
    const index = Number(key);
    if (index === skip) continue;
    sum += (stats[index] ?? 0) * w;
  }
  return sum;
}

function itemMatched(
  fork: OracleFork,
  itemId: number,
  gems: readonly number[]
): boolean {
  const item = fork.getItem(itemId);
  if (!item) return true;
  return fork.socketBonusActive(item.sockets, gems);
}

/** Every gem's hit plus every active socket bonus's hit. */
function layoutHit(
  fork: OracleFork,
  layout: readonly OracleItem[],
  stat: number
): number {
  let hit = 0;
  for (const it of layout) {
    const item = fork.getItem(it.itemId);
    if (!item) continue;
    for (const g of it.gems) hit += fork.getGem(g)?.stats[stat] ?? 0;
    if (itemMatched(fork, it.itemId, it.gems)) {
      hit += item.socketBonus[stat] ?? 0;
    }
  }
  return hit;
}

/**
 * V of `layout` relative to `opts.items`: the non-hit EP change of every
 * changed socket, minus each socket bonus switched off, plus each one switched
 * on, plus the hit term `w × (min(ΔH, r) − min(0, r))` with a budget or
 * `w × ΔH` without one.
 */
export function repairValue(
  fork: OracleFork,
  opts: OracleOpts,
  layout: readonly OracleItem[]
): number {
  const stat = opts.hitCap?.stat ?? MELEE_HIT_RATING;
  const nonHit = (stats: readonly number[]) =>
    weighted(stats, opts.weights, stat);
  let v = 0;
  for (let i = 0; i < opts.items.length; i++) {
    const before = opts.items[i]!;
    const after = layout[i]!;
    const item = fork.getItem(before.itemId);
    if (!item) continue;
    for (let s = 0; s < item.sockets.length; s++) {
      const o = before.gems[s] ?? 0;
      const n = after.gems[s] ?? 0;
      if (o === n) continue;
      v +=
        nonHit(fork.getGem(n)?.stats ?? []) -
        nonHit(fork.getGem(o)?.stats ?? []);
    }
    const was = itemMatched(fork, before.itemId, before.gems);
    const is = itemMatched(fork, after.itemId, after.gems);
    if (was && !is) v -= nonHit(item.socketBonus);
    if (!was && is) v += nonHit(item.socketBonus);
  }
  const w = opts.weights[String(stat)] ?? 0;
  const dH = layoutHit(fork, layout, stat) - layoutHit(fork, opts.items, stat);
  if (opts.hitCap) {
    const r = opts.hitCap.remaining;
    v += w * (Math.min(dH, r) - Math.min(0, r));
  } else {
    v += w * dH;
  }
  return v;
}

function allGemIds(layout: readonly OracleItem[]): number[] {
  return layout.flatMap((it) => it.gems.filter((g) => g > 0));
}

/** The meta gem in the head's meta socket, or undefined. */
function metaIdOf(fork: OracleFork, items: readonly OracleItem[]) {
  const head = items[0];
  const item = head ? fork.getItem(head.itemId) : undefined;
  if (!head || !item) return undefined;
  const socket = item.sockets.indexOf(META_COLOUR);
  if (socket < 0) return undefined;
  const id = head.gems[socket] ?? 0;
  return id > 0 ? id : undefined;
}

/**
 * The candidate gems for every socket. "full" is every non-meta palette gem.
 * "reduced" is, for each (colour, hit amount) group, the non-unique gem with
 * the highest non-hit EP (the first in palette order on a tie), plus each
 * unique gem whose non-hit EP beats it.
 */
export function candidatePool(
  opts: OracleOpts,
  pool: "reduced" | "full"
): OracleGem[] {
  const coloured = opts.palette.filter((g) => g.colour !== META_COLOUR);
  if (pool === "full") return coloured;
  const stat = opts.hitCap?.stat ?? MELEE_HIT_RATING;
  const hitOf = (g: OracleGem) => (opts.hitCap ? (g.stats[stat] ?? 0) : 0);
  const nonHit = (g: OracleGem) =>
    opts.hitCap
      ? weighted(g.stats, opts.weights, stat)
      : weighted(g.stats, opts.weights, -1);
  const groups = new Map<string, OracleGem[]>();
  for (const g of coloured) {
    const key = `${g.colour}|${hitOf(g)}`;
    groups.set(key, [...(groups.get(key) ?? []), g]);
  }
  const out: OracleGem[] = [];
  for (const members of groups.values()) {
    let best: OracleGem | undefined;
    for (const g of members) {
      if (g.unique) continue;
      if (!best || nonHit(g) > nonHit(best)) best = g;
    }
    if (best) out.push(best);
    for (const g of members) {
      if (g.unique && (!best || nonHit(g) > nonHit(best))) out.push(g);
    }
  }
  return out;
}

type Socket = { item: number; socket: number };

/**
 * The highest V over every layout that changes at most `opts.maxChanges`
 * coloured sockets to gems of `pool` and meets conditions 1–6, or undefined
 * when none does. `visit`, when given, sees every qualifying layout and its V.
 */
export function bruteForceBestValue(
  fork: OracleFork,
  opts: OracleOpts,
  pool: "reduced" | "full",
  visit?: (layout: OracleItem[], value: number) => void
): number | undefined {
  const metaId = metaIdOf(fork, opts.items);
  if (metaId === undefined) return undefined;
  const gems = candidatePool(opts, pool);
  const sockets: Socket[] = [];
  for (let i = 0; i < opts.items.length; i++) {
    const item = fork.getItem(opts.items[i]!.itemId);
    if (!item) continue;
    item.sockets.forEach((colour, s) => {
      if (colour !== META_COLOUR) sockets.push({ item: i, socket: s });
    });
  }
  const held = new Set(allGemIds(opts.items));
  const counts = (ids: readonly number[]) => fork.gemColorCounts(ids);
  const colourOf = (gemId: number) => counts(gemId > 0 ? [gemId] : []);
  const active = (layout: readonly OracleItem[]) =>
    fork.isMetaConditionMet(metaId, counts(allGemIds(layout)));

  const qualifies = (layout: OracleItem[], changed: readonly Socket[]) => {
    const placed = new Set<number>();
    for (const c of changed) {
      const from = opts.items[c.item]!.gems[c.socket] ?? 0;
      const to = layout[c.item]!.gems[c.socket]!;
      const a = colourOf(from);
      const b = colourOf(to);
      // Condition 2: the change alters its socket's colour.
      if (a.red === b.red && a.yellow === b.yellow && a.blue === b.blue) {
        return false;
      }
      // Condition 5: no unique gem the gear holds, and each placed once.
      if (fork.getGem(to)?.unique) {
        if (held.has(to) || placed.has(to)) return false;
        placed.add(to);
      }
    }
    // Condition 3: the meta is active.
    if (!active(layout)) return false;
    // Condition 4: undoing any one change leaves the meta inactive.
    for (const c of changed) {
      const undone = layout.map((it) => ({ ...it, gems: [...it.gems] }));
      undone[c.item]!.gems[c.socket] = opts.items[c.item]!.gems[c.socket] ?? 0;
      if (active(undone)) return false;
    }
    return true;
  };

  let best: number | undefined;
  const chosen: Socket[] = [];
  const layout = opts.items.map((it) => {
    const item = fork.getItem(it.itemId);
    const padded = [...it.gems];
    while (item && padded.length < item.sockets.length) padded.push(0);
    return { itemId: it.itemId, gems: padded };
  });

  const assign = (k: number) => {
    if (k === chosen.length) {
      if (chosen.length === 0 || !qualifies(layout, chosen)) return;
      const v = repairValue(fork, opts, layout);
      visit?.(
        layout.map((it) => ({ itemId: it.itemId, gems: [...it.gems] })),
        v
      );
      if (best === undefined || v > best) best = v;
      return;
    }
    const c = chosen[k]!;
    const from = opts.items[c.item]!.gems[c.socket] ?? 0;
    for (const g of gems) {
      // Condition 1: a non-meta palette gem, and a change, not the same gem.
      if (g.id === from) continue;
      layout[c.item]!.gems[c.socket] = g.id;
      assign(k + 1);
    }
    layout[c.item]!.gems[c.socket] = from;
  };

  // Condition 6: every set of at most `maxChanges` sockets.
  const choose = (start: number) => {
    if (chosen.length > 0) assign(0);
    if (chosen.length === opts.maxChanges) return;
    for (let j = start; j < sockets.length; j++) {
      chosen.push(sockets[j]!);
      choose(j + 1);
      chosen.pop();
    }
  };
  choose(0);
  return best;
}
