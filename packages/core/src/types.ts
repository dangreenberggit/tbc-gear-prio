/** Domain refs shared by RankInput and the GearSource seam (PLAN.md §4–§5). */

export type Region = "US" | "EU" | "KR" | "TW" | "CN";

export type CharacterRef = {
  region: Region;
  realm: string;
  name: string;
};

export type SpecId = "ret" | "feral";

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
