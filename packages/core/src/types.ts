/** Domain refs shared by RankInput and the GearSource seam (PLAN.md §4–§5). */

export type Region = "US" | "EU" | "KR" | "TW" | "CN";

export type CharacterRef = {
  region: Region;
  realm: string;
  name: string;
};

/** A spec this engine can rank — i.e. one with a preset and a universe. */
export type SpecId = "ret" | "feral";

/**
 * A spec this engine can *identify*, which is a wider set than it can rank.
 * Feral tank shares its talent tree with feral cat, so classification has to
 * be able to name it in order to say "this is not the cat you asked for" —
 * see `classifyFeralForm` and carry-forward ticket 40.
 */
export type DetectedSpecId = SpecId | "feral-tank";

/** Inclusive content-tier filter 1–5 (PLAN.md §1.1). */
export type ContentPhase = 1 | 2 | 3 | 4 | 5;

export type FightRef = {
  reportCode: string;
  fightId: number;
};

export type Race =
  | "RaceHuman"
  | "RaceDwarf"
  | "RaceNightElf"
  | "RaceGnome"
  | "RaceDraenei"
  | "RaceOrc"
  | "RaceUndead"
  | "RaceTauren"
  | "RaceTroll"
  | "RaceBloodElf";
