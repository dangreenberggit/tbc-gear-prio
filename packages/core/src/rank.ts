/**
 * rankUpgrades — the deep module interface (PLAN.md §4).
 * Stages land behind this; callers only see RankInput → Ranking.
 */

import type { Cutoff } from "./cutoff.js";
import type { GearSource } from "./seams/gear-source.js";
import type { SimRunner } from "./seams/sim-runner.js";
import type { Store } from "./seams/store.js";
import type {
  CharacterRef,
  ContentPhase,
  FightRef,
  Race,
  SpecId,
} from "./types.js";

export type RankInput = {
  character: CharacterRef;
  spec: SpecId;
  maxPhase: ContentPhase;
  fight?: FightRef;
  race?: Race;
  iterations?: number;
  seeds?: number[];
  fullPool?: boolean;
};

export type Deps = {
  gear: GearSource;
  sim: SimRunner;
  store: Store;
  clock: () => Date;
};

export type Progress =
  | { stage: "resolving" }
  | { stage: "reading-gear" }
  | { stage: "building-pool" }
  | { stage: "simming"; done: number; total: number }
  | { stage: "ranking" };

export type RankErrorKind =
  | "character-not-found"
  | "no-qualifying-fight"
  | "gear-unreadable"
  | "meta-unsolvable"
  | "sim-failed"
  | "wcl-budget-exhausted"
  | "not-implemented";

export class RankError extends Error {
  readonly kind: RankErrorKind;

  constructor(kind: RankErrorKind, message: string) {
    super(message);
    this.name = "RankError";
    this.kind = kind;
  }
}

/** Placeholder until stages land — keeps the public signature stable. */
export type Ranking = {
  contentHash: string;
  cutoff: Cutoff;
};

export async function rankUpgrades(
  input: RankInput,
  deps: Deps,
  onProgress?: (p: Progress) => void
): Promise<Ranking> {
  void input;
  void deps;
  void onProgress;
  throw new RankError(
    "not-implemented",
    "rankUpgrades stages are not wired yet (Phase 1 scaffold)"
  );
}
