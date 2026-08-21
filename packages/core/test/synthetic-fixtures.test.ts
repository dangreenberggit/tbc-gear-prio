import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { filterPoolByPhase, poolFromUniverse } from "../src/pool.js";
import { rankUpgrades } from "../src/rank.js";
import { RecordedGearSource } from "../src/seams/gear-source.js";
import {
  RecordedSimRunner,
  type RaidSimRequest,
  type SimObservation,
} from "../src/seams/sim-runner.js";
import { MemoryStore } from "../src/seams/store.js";
import type { ContentPhase, SpecId } from "../src/types.js";
import {
  syntheticOfflineRecordings,
  RET_SYNTHETIC_REF,
  FERAL_SYNTHETIC_REF,
  RET_SYNTHETIC_FIGHT,
  FERAL_SYNTHETIC_FIGHT,
  RET_SYNTHETIC_ROW,
  FERAL_SYNTHETIC_ROW,
  FERAL_P3_SYNTHETIC_ROW,
  type PresetGearFile,
} from "../src/fixtures/synthetic-offline.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(root, rel), "utf8")) as T;
}

/**
 * Recorded by scripts/record_synthetic_fixtures.mjs against the pinned
 * wowsimcli (vendor/wowsimcli-v0.0.101-win32-x64) — see that script's header
 * for the regen command and its inputs (both gitignored: `pnpm
 * fetch:wowsimcli` and `python scripts/sync_wowsims.py --restore`).
 */
type RosterRecordingsFile = {
  simVersion: string;
  seed: number;
  iterations: number;
  rows: Record<
    string,
    {
      spec: SpecId;
      presetPhase: ContentPhase;
      maxPhase: ContentPhase;
      poolSize: number;
      aboveCutoffCount: number;
      baselineDps: number;
      iterations: number;
      seed: number;
      simVersion: string;
      recordings: Record<string, SimObservation>;
    }
  >;
};

const recordingsFile = loadJson<RosterRecordingsFile>(
  "packages/core/test/fixtures/synthetic-roster-recordings.json"
);

const ROSTER = {
  ret: {
    row: RET_SYNTHETIC_ROW,
    ref: RET_SYNTHETIC_REF,
    fight: RET_SYNTHETIC_FIGHT,
    presetGearPath: "vendor/wowsims/ret_preraid.gear.json",
    epWeightsPath: "data/presets/ret/p2.ep-weights.json",
    skeletonPath: "data/presets/ret/p2.raid-sim-skeleton.json",
    universePath: "data/universes/ret-p2.json",
    race: undefined as const | undefined,
  },
  feral: {
    row: FERAL_SYNTHETIC_ROW,
    ref: FERAL_SYNTHETIC_REF,
    fight: FERAL_SYNTHETIC_FIGHT,
    presetGearPath: "vendor/wowsims/feral_preraid.gear.json",
    epWeightsPath: "data/presets/feral/p1.ep-weights.json",
    skeletonPath: "data/presets/feral/p2.raid-sim-skeleton.json",
    universePath: "data/universes/feral-p2.json",
    race: "RaceTauren" as const,
  },
  "feral-p3": {
    row: FERAL_P3_SYNTHETIC_ROW,
    ref: FERAL_SYNTHETIC_REF,
    fight: FERAL_SYNTHETIC_FIGHT,
    presetGearPath: "vendor/wowsims/feral_preraid.gear.json",
    epWeightsPath: "data/presets/feral/p1.ep-weights.json",
    skeletonPath: "data/presets/feral/p2.raid-sim-skeleton.json",
    universePath: "data/universes/feral-p3.json",
    race: "RaceTauren" as const,
  },
} as const;

/**
 * Above-cutoff floor from candidate-pool.md §7.a: "the full-sweep shortlist
 * has >= 10 above-cutoff rows" is the property that makes a fixture usable
 * for M2's recall test (7.2) — a character already at its phase's BiS has
 * nothing to test recall against. Asserted here so a future data change
 * (a re-pinned wowsims tag, a reweighted EP file) that erodes it fails loudly
 * instead of silently shrinking the recall gate's evidence.
 */
const MIN_ABOVE_CUTOFF = 10;

describe.each(Object.entries(ROSTER))(
  "synthetic roster fixture: %s",
  (name, cfg) => {
    const recorded = recordingsFile.rows[name];
    if (!recorded) {
      throw new Error(
        `no recorded observations for ${name} in synthetic-roster-recordings.json — ` +
          "regenerate with `npx tsx scripts/record_synthetic_fixtures.mjs`"
      );
    }

    it("records the (spec, preset phase, maxPhase) triple this row was ranked at", () => {
      expect(cfg.row.spec).toBe(recorded.spec);
      expect(cfg.row.presetPhase).toBe(recorded.presetPhase);
      expect(cfg.row.maxPhase).toBe(recorded.maxPhase);
    });

    it("replays the recorded full-sweep ranking and clears the >=10 above-cutoff floor", async () => {
      const epWeights = loadJson<{ weights: Record<string, number> }>(
        cfg.epWeightsPath
      ).weights;
      const skeleton = loadJson<RaidSimRequest>(cfg.skeletonPath);
      const presetGear = loadJson<PresetGearFile>(cfg.presetGearPath);
      const pool = filterPoolByPhase(
        poolFromUniverse(
          loadJson<Parameters<typeof poolFromUniverse>[0]>(cfg.universePath)
        ),
        cfg.row.maxPhase
      );

      const gearData = syntheticOfflineRecordings({
        ref: cfg.ref,
        spec: cfg.row.spec,
        presetGear,
        fight: cfg.fight,
      });

      const recordings = new Map(Object.entries(recorded.recordings));
      const sim = new RecordedSimRunner(recorded.simVersion, recordings);

      // An exit code (or a green replay) is not evidence the sim ran the
      // iterations asked for — read iterationsDone back from every recorded
      // observation before trusting any of them.
      for (const obs of recordings.values()) {
        expect(obs.iterationsDone).toBe(recorded.iterations);
      }

      const ranking = await rankUpgrades(
        {
          character: cfg.ref,
          spec: cfg.row.spec,
          maxPhase: cfg.row.maxPhase,
          iterations: recorded.iterations,
          seeds: [recorded.seed],
          ...(cfg.race ? { race: cfg.race } : {}),
        },
        {
          gear: new RecordedGearSource(gearData),
          sim,
          store: new MemoryStore(),
          clock: () => new Date("2026-08-15T12:00:00.000Z"),
          raidSimSkeleton: skeleton,
          epWeights,
          pool,
        }
      );

      const aboveCutoff = ranking.items.filter((i) => !i.belowCutoff);
      expect(aboveCutoff.length).toBeGreaterThanOrEqual(MIN_ABOVE_CUTOFF);
      // Pins the measured count so a silent shrink still fails even if it
      // never drops below the floor — the recorded value is itself the claim.
      expect(aboveCutoff.length).toBe(recorded.aboveCutoffCount);
    });
  }
);
