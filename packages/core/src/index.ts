// Public surface of @tbc-gear-prio/core (PLAN.md §4).
export { CUTOFF, meetsCutoff, type Cutoff } from "./cutoff.js";
export {
  DegenerateSeedsError,
  PAIRED_REPLICATE_TOP_N,
  assertUsableSeeds,
  pairedReplicateSe,
  usesPairedReplication,
} from "./se.js";
export {
  applyView,
  type ViewOptions,
  type ViewResult,
  type ViewRow,
} from "./view.js";
export {
  RankError,
  rankUpgrades,
  resolveFight,
  type Deps,
  type Progress,
  type RankErrorKind,
  type RankInput,
  type RankedItem,
  type Ranking,
  type ResolvedFight,
} from "./rank.js";
export {
  REPORT_EVENTS_REF,
  reportEventsOfflineRecordings,
  type ReportEventsRawFixture,
} from "./fixtures/report-events-offline.js";
export {
  capStateFrom,
  isHitDriven,
  statDeltaBetween,
  HIT_CAP_RATING,
  HIT_CAP_UNCERTAINTY,
  PHYSICAL_HIT_RATING_PER_HIT_PERCENT,
  type CapEntry,
  type CapState,
  type HitCapEntry,
} from "./caps.js";
export {
  buildStandingAssumptions,
  hitCapBanner,
  renderDisclosure,
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
export { isKaelTempLegendary, KAEL_TEMP_LEGENDARY_IDS } from "./kael-temp.js";
export {
  CachingGearSource,
  RecordedGearSource,
  characterFightKey,
  fightGearKey,
  gearCacheKey,
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
  SqliteStore,
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
  classifyFeralForm,
  classifySpec,
  talentPointsFromWclTalents,
  type FeralFormClassification,
  type FormUptime,
  type SpecClassification,
  type TalentPointsByTree,
} from "./spec.js";
export type {
  CharacterRef,
  ContentPhase,
  DetectedSpecId,
  FightRef,
  Race,
  Region,
  SpecId,
} from "./types.js";
export {
  fillCandidateGems,
  fillEmptyCandidateGems,
  gemEp,
  gemFillWeights,
} from "./candidate-gems.js";
export { migrateGemsToItem, gemEligibleForSocket } from "./migrate-gems.js";
export {
  SLOT_ORDER,
  formatItemSource,
  groupBySlot,
  partitionShortlist,
  renderRankHtml,
  type RankReportMeta,
} from "./rank-report.js";
export {
  gemPalette,
  findMetaGemId,
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
export {
  enchantAppliesToItem,
  getEnchant,
  type EnchantEntry,
} from "./enchants.js";
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
