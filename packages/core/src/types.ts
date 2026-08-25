/** Domain refs shared by RankInput and the GearSource seam (PLAN.md §4–§5). */

export type Region = "US" | "EU" | "KR" | "TW" | "CN";

export type CharacterRef = {
  region: Region;
  realm: string;
  name: string;
};

/**
 * A spec this engine can rank — i.e. one with a preset and a universe.
 *
 * Every per-spec engine table is a **total** `Record<SpecId, …>`, so adding a
 * member here without filling each of them is a compile error rather than a
 * silent inheritance of ret's numbers. That is the point of the totality: the
 * tables that matter (`CAP_PROFILE_BY_SPEC`, `CUTOFF_BY_SPEC`,
 * `SPEC_PREFERRED_METAS`, `PRESET_ID_BY_SPEC`) each encode a per-spec game fact
 * that has no safe default.
 */
export type SpecId =
  | "balance"
  | "feral"
  | "hunter"
  | "mage"
  | "ret"
  | "shadow"
  | "rogue"
  | "ele"
  | "enh"
  | "warlock"
  | "warrior";

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
