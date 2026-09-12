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
 * The id list is not written here: it is generated from the keys of
 * `spec-registry.json`, so the ids and the per-spec facts keyed by them cannot
 * drift apart. `SPEC_REGISTRY` (`spec-registry.ts`) is the one total table over
 * this union, and every field of a `SpecEntry` is required — so a spec added to
 * the JSON compiles only once its entry is complete, rather than silently
 * inheriting ret's numbers. Each of those fields is a per-spec game fact with
 * no safe default, which is why the totality is worth enforcing.
 */
export type { SpecId } from "./spec-ids.generated.js";

// Imported as well as re-exported: the line above is a pure re-export and does
// not bind `SpecId` in this module, which `DetectedSpecId` below needs.
import type { SpecId } from "./spec-ids.generated.js";

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
