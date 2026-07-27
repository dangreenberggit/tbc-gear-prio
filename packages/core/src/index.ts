// Public surface of @tbc-gear-prio/core (PLAN.md §4).
export { CUTOFF, type Cutoff } from "./cutoff.js";
export {
  RankError,
  rankUpgrades,
  type Deps,
  type Progress,
  type RankErrorKind,
  type RankInput,
  type Ranking,
} from "./rank.js";
export {
  RecordedGearSource,
  characterFightKey,
  fightGearKey,
  type FightSummary,
  type GearSource,
  type LoggedGear,
  type LoggedItem,
  type RecordedGearSourceData,
} from "./seams/gear-source.js";
export {
  RecordedSimRunner,
  simCacheKey,
  type RaidSimRequest,
  type SimObservation,
  type SimRunOpts,
  type SimRunner,
} from "./seams/sim-runner.js";
export { CliSimRunner } from "./seams/cli-sim-runner.js";
export {
  MemoryStore,
  type Job,
  type JobCreateInput,
  type JobStatus,
  type JobUpdateInput,
  type Store,
} from "./seams/store.js";
export {
  SIM_ORDER,
  WCL_ORDER,
  mapWclGearToSim,
  type SimItemSpec,
  type WclGearEntry,
} from "./slots.js";
export type {
  CharacterRef,
  ContentPhase,
  FightRef,
  Race,
  Region,
  SpecId,
} from "./types.js";
