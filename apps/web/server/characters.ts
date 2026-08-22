/**
 * `GET /api/characters/:region/:realm/:name` — the fight list and worn gear
 * the character page renders before anything is ranked.
 *
 * Offline, so "which characters exist" is `RECORDED_CHARACTERS` rather than a
 * WCL query. An unrecorded name is a 404 that says so, not an empty page: the
 * live source is a follow-up ticket, and a blank result would read as "this
 * player has never raided" instead of "this build cannot look them up".
 */

import {
  RECORDED_CHARACTERS,
  type CharacterRef,
  type FightSummary,
  type GearSource,
  type LoggedGear,
  type SpecId,
} from "@tbc-gear-prio/core";

export type CharacterView = {
  readonly spec: SpecId;
  readonly character: CharacterRef;
  readonly fights: readonly FightSummary[];
  readonly gear?: LoggedGear;
};

/** Builds the gear source for one recorded character, or `undefined`. */
export type GearSourceFor = (
  ref: CharacterRef,
  spec: SpecId
) => GearSource | undefined;

export type CharacterResolver = {
  resolve(ref: CharacterRef): Promise<CharacterView | undefined>;
};

export function createCharacterResolver(
  gearSourceFor: GearSourceFor
): CharacterResolver {
  return {
    async resolve(ref: CharacterRef): Promise<CharacterView | undefined> {
      const spec = recordedSpecFor(ref);
      if (spec === undefined) return undefined;

      const source = gearSourceFor(ref, spec);
      if (!source) return undefined;

      const fights = await source.findFights(ref, spec);
      if (fights.length === 0) return { spec, character: ref, fights: [] };

      // The most recent kill is what the page pre-selects, so it is the one
      // whose gear is worth reading up front.
      const newest = mostRecent(fights);
      const gear = await source.readGear({
        reportCode: newest.reportCode,
        fightId: newest.fightId,
      });
      return { spec, character: ref, fights, gear };
    },
  };
}

/**
 * A fight with no `killedAt` cannot be ordered against one that has it — a raw
 * capture carries offsets from the report's own start and no wall clock, so
 * inventing a date would put a fabricated time on a real fixture. Undated
 * fights keep their source order behind the dated ones.
 */
function mostRecent(fights: readonly FightSummary[]): FightSummary {
  const dated = fights.filter((f) => f.killedAt !== undefined);
  if (dated.length === 0) return fights[0]!;
  return dated.reduce((best, f) =>
    (f.killedAt ?? "") > (best.killedAt ?? "") ? f : best
  );
}

/** The spec this character is recorded under, or `undefined` if unrecorded. */
export function recordedSpecFor(ref: CharacterRef): SpecId | undefined {
  return RECORDED_CHARACTERS.find(
    (c) =>
      c.ref.region === ref.region &&
      c.ref.realm.toLowerCase() === ref.realm.toLowerCase() &&
      c.ref.name.toLowerCase() === ref.name.toLowerCase()
  )?.spec;
}
