/**
 * Meta gem activation (PLAN.md §9). Ported from wowsims
 * ui/core/proto_utils/gems.ts + gear.ts gemColorCounts / hasActiveMetaGem,
 * pinned at the same commit as data/wowsims.lock.json.
 *
 * The Go sim does not enforce meta activation — we must.
 */

import conditions from "../../../data/gems/meta-conditions.json" with { type: "json" };
import { getGem, type GemColour } from "./gems.js";
import { GemColor } from "./proto/common_pb.js";

export type GemColorCounts = { red: number; yellow: number; blue: number };

export type MetaStatus =
  | { kind: "no-meta-socket" }
  | { kind: "no-meta-gem" }
  | { kind: "active"; metaId: number; counts: GemColorCounts }
  | {
      kind: "inactive";
      metaId: number;
      counts: GemColorCounts;
      description: string;
    };

type MinColors = {
  id: number;
  description: string;
  minRed: number;
  minYellow: number;
  minBlue: number;
  compareGreater?: undefined;
  compareLesser?: undefined;
};

type CompareColors = {
  id: number;
  description: string;
  compareGreater: number;
  compareLesser: number;
  minRed?: undefined;
  minYellow?: undefined;
  minBlue?: undefined;
};

type Condition = MinColors | CompareColors;

const CONDITIONS = new Map<number, Condition>(
  (conditions as Condition[]).map((c) => [c.id, c])
);

/** Socket colour → gem colours that match it for meta counting / socket bonus. */
const SOCKET_TO_MATCHING: ReadonlyMap<
  GemColour,
  ReadonlySet<GemColour>
> = new Map([
  [GemColor.GemColorMeta, new Set([GemColor.GemColorMeta])],
  [
    GemColor.GemColorBlue,
    new Set([
      GemColor.GemColorBlue,
      GemColor.GemColorPurple,
      GemColor.GemColorGreen,
      GemColor.GemColorPrismatic,
    ]),
  ],
  [
    GemColor.GemColorRed,
    new Set([
      GemColor.GemColorRed,
      GemColor.GemColorPurple,
      GemColor.GemColorOrange,
      GemColor.GemColorPrismatic,
    ]),
  ],
  [
    GemColor.GemColorYellow,
    new Set([
      GemColor.GemColorYellow,
      GemColor.GemColorOrange,
      GemColor.GemColorGreen,
      GemColor.GemColorPrismatic,
    ]),
  ],
  [
    GemColor.GemColorPrismatic,
    new Set([
      GemColor.GemColorRed,
      GemColor.GemColorOrange,
      GemColor.GemColorYellow,
      GemColor.GemColorGreen,
      GemColor.GemColorBlue,
      GemColor.GemColorPurple,
      GemColor.GemColorPrismatic,
    ]),
  ],
]);

export function gemColorMatchesSocket(
  gemColor: GemColour,
  socketColor: GemColour
): boolean {
  if (gemColor === socketColor) return true;
  return SOCKET_TO_MATCHING.get(socketColor)?.has(gemColor) ?? false;
}

export function gemColorCounts(gemIds: readonly number[]): GemColorCounts {
  const colours: GemColour[] = [];
  for (const id of gemIds) {
    const gem = getGem(id);
    if (gem) colours.push(gem.colour);
  }
  return {
    red: colours.filter((c) => gemColorMatchesSocket(c, GemColor.GemColorRed))
      .length,
    yellow: colours.filter((c) =>
      gemColorMatchesSocket(c, GemColor.GemColorYellow)
    ).length,
    blue: colours.filter((c) => gemColorMatchesSocket(c, GemColor.GemColorBlue))
      .length,
  };
}

export function isMetaConditionMet(
  metaId: number,
  counts: GemColorCounts
): boolean {
  const cond = CONDITIONS.get(metaId);
  if (!cond) {
    throw new Error(`missing meta gem condition for gem: ${metaId}`);
  }
  if (cond.compareGreater != null && cond.compareLesser != null) {
    return (
      categoryCount(cond.compareGreater, counts) >
      categoryCount(cond.compareLesser, counts)
    );
  }
  return (
    counts.red >= (cond.minRed ?? 0) &&
    counts.yellow >= (cond.minYellow ?? 0) &&
    counts.blue >= (cond.minBlue ?? 0)
  );
}

function categoryCount(color: number, counts: GemColorCounts): number {
  if (color === GemColor.GemColorRed) return counts.red;
  if (color === GemColor.GemColorYellow) return counts.yellow;
  if (color === GemColor.GemColorBlue) return counts.blue;
  throw new Error(`invalid gem color for category check: ${color}`);
}

/**
 * How far counts are from meeting the meta condition. 0 = met.
 * Min-colour: sum of primary shortfalls. Compare-colour: how many more
 * of the greater colour are needed to strictly exceed lesser.
 */
export function metaDeficit(metaId: number, counts: GemColorCounts): number {
  const cond = CONDITIONS.get(metaId);
  if (!cond) {
    throw new Error(`missing meta gem condition for gem: ${metaId}`);
  }
  if (cond.compareGreater != null && cond.compareLesser != null) {
    const greater = categoryCount(cond.compareGreater, counts);
    const lesser = categoryCount(cond.compareLesser, counts);
    return Math.max(0, lesser - greater + 1);
  }
  return (
    Math.max(0, (cond.minRed ?? 0) - counts.red) +
    Math.max(0, (cond.minYellow ?? 0) - counts.yellow) +
    Math.max(0, (cond.minBlue ?? 0) - counts.blue)
  );
}

/**
 * Head sockets[0] is conventionally the meta socket when colour === Meta.
 * Pass every gem id on the character (all slots); meta is among them.
 */
export function metaStatus(
  headSockets: readonly number[],
  gemIds: readonly number[]
): MetaStatus {
  const hasMetaSocket = headSockets.includes(GemColor.GemColorMeta);
  if (!hasMetaSocket) return { kind: "no-meta-socket" };

  const metaId = gemIds.find(
    (id) => getGem(id)?.colour === GemColor.GemColorMeta
  );
  if (metaId == null) return { kind: "no-meta-gem" };

  const counts = gemColorCounts(gemIds);
  const cond = CONDITIONS.get(metaId);
  if (!cond) {
    throw new Error(`missing meta gem condition for gem: ${metaId}`);
  }
  if (isMetaConditionMet(metaId, counts)) {
    return { kind: "active", metaId, counts };
  }
  return {
    kind: "inactive",
    metaId,
    counts,
    description: cond.description,
  };
}
