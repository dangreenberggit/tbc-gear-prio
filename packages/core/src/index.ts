// Public surface of @tbc-gear-prio/core (PLAN.md §4).
export { CUTOFF, type Cutoff } from "./cutoff.js";
export {
  RankError,
  rankUpgrades,
  type Deps,
  type Progress,
  type RankErrorKind,
  type RankInput,
  type RankedItem,
  type Ranking,
} from "./rank.js";
export {
  buildStandingAssumptions,
  substitutionsFromMetaRepair,
  type Assumptions,
  type StandingAssumption,
  type StandingAssumptionId,
  type Substitution,
} from "./disclosure.js";
export {
  filterByZone,
  filterPoolByPhase,
  filterPoolByZone,
  poolEntryFromUniverse,
  poolFromUniverse,
  simSlotsForPoolSlot,
  zonesInPool,
  type ItemSource,
  type PoolEntry,
  type UniverseEntry,
} from "./pool.js";
export { isKaelTempLegendary } from "./kael-temp.js";
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
export {
  classifySpec,
  talentPointsFromWclTalents,
  type SpecClassification,
  type TalentPointsByTree,
} from "./spec.js";
export type {
  CharacterRef,
  ContentPhase,
  FightRef,
  Race,
  Region,
  SpecId,
} from "./types.js";
export {
  gemPalette,
  gemsForPhase,
  getGem,
  type GemColour,
  type GemEntry,
} from "./gems.js";
export {
  getItem,
  isEnchantable,
  socketsFor,
  type ItemEntry,
  type ItemSlot,
} from "./items.js";
export { compose, type ComposePlayer } from "./compose.js";
export { setBreakNote } from "./set-bonus.js";
export { Stat, epScore, statAt } from "./stats.js";
export {
  gemColorCounts,
  gemColorMatchesSocket,
  isMetaConditionMet,
  metaDeficit,
  metaStatus,
  type GemColorCounts,
  type MetaStatus,
} from "./meta.js";
export {
  MetaUnsolvableError,
  repairMeta,
  type MetaRepairResult,
  type MetaRepairSwap,
  type SocketedItem,
} from "./meta-repair.js";
