/**
 * The full sweep reproduces the recorded above-cutoff set — the gate that
 * inherits racing.test.ts 7.2/7.3's purpose (candidate-pool.md §7).
 *
 * ## Why this file exists, and what it is allowed to assert
 *
 * 7.2/7.3 asked whether a *screening* pass lost an above-cutoff row: they
 * compared a noised screening run against an un-noised full sweep, two
 * genuinely different computations, over 30 noise draws. Racing is gone
 * (ADR-0026), so there is only one code path and that comparison no longer
 * has two sides. The constraint from §7 — "the recall gate is never weakened
 * to make a rule look good" — does not go away with it; what remains gated
 * is that the full sweep still finds the set it is supposed to find.
 *
 * A gate like that is worth nothing if it derives its own expected answer
 * from the run it is checking: that asserts a computation equals itself.
 * So the truth here is external on both counts:
 *
 *   - **It came from the real binary, not a replay.**
 *     `scripts/record_synthetic_fixtures.mjs` ran `rankUpgrades` against the
 *     pinned wowsimcli and wrote `aboveCutoffCount` and
 *     `aboveCutoffItemIds` into the committed fixture. Nothing in this file
 *     can recompute those; it can only agree or disagree with them.
 *
 *   - **The replay cannot screen even if someone reintroduced screening.**
 *     `RecordedSimRunner` throws on any (seed, iterations) pair absent from
 *     the fixture (`sim-runner.ts`), and the fixture holds full-iteration
 *     rows only. A screening pass would ask for 1000-iteration observations
 *     that are not there and fail loudly rather than quietly under-sim. That
 *     makes assertion (a) below a structural check, not merely a numeric one.
 *
 * ## Why (a) is `>=` and not `===`
 *
 * A paired slot (rings, trinkets, weapons) tries both placements and keeps
 * the better one, so those candidates issue two requests. The fixture
 * records 267/260/428 requests against pools of 226/220/357 non-owned
 * candidates for exactly that reason. `>= eligible` is therefore the honest
 * assertion; the exact-count claim belongs to the recorded request totals,
 * not here. The companion assertion — that `runsByIterations` has no key
 * other than the recorded iteration count — is what actually pins "no
 * screening happened", and it is exact.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  FERAL_P3_SYNTHETIC_ROW,
  FERAL_SYNTHETIC_FIGHT,
  FERAL_SYNTHETIC_REF,
  FERAL_SYNTHETIC_ROW,
  RET_SYNTHETIC_FIGHT,
  RET_SYNTHETIC_REF,
  RET_SYNTHETIC_ROW,
  syntheticOfflineRecordings,
  type PresetGearFile,
} from "../src/fixtures/synthetic-offline.js";
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
import { CountingSimRunner } from "./measure-support.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(root, rel), "utf8")) as T;
}

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
      aboveCutoffItemIds: number[];
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

type RowCase = {
  rowKey: string;
  ref: typeof RET_SYNTHETIC_REF;
  spec: SpecId;
  maxPhase: ContentPhase;
  fight: typeof RET_SYNTHETIC_FIGHT;
  epWeightsPath: string;
  skeletonPath: string;
  presetGearPath: string;
  universePath: string;
  race?: "RaceTauren";
};

const ROWS: RowCase[] = [
  {
    rowKey: "ret",
    ref: RET_SYNTHETIC_REF,
    spec: RET_SYNTHETIC_ROW.spec,
    maxPhase: RET_SYNTHETIC_ROW.maxPhase,
    fight: RET_SYNTHETIC_FIGHT,
    epWeightsPath: "data/presets/ret/p2.ep-weights.json",
    skeletonPath: "data/presets/ret/p2.raid-sim-skeleton.json",
    presetGearPath: "vendor/wowsims/ret_preraid.gear.json",
    universePath: "data/universes/ret-p2.json",
  },
  {
    rowKey: "feral",
    ref: FERAL_SYNTHETIC_REF,
    spec: FERAL_SYNTHETIC_ROW.spec,
    maxPhase: FERAL_SYNTHETIC_ROW.maxPhase,
    fight: FERAL_SYNTHETIC_FIGHT,
    epWeightsPath: "data/presets/feral/p1.ep-weights.json",
    skeletonPath: "data/presets/feral/p2.raid-sim-skeleton.json",
    presetGearPath: "vendor/wowsims/feral_preraid.gear.json",
    universePath: "data/universes/feral-p2.json",
    race: "RaceTauren",
  },
  {
    rowKey: "feral-p3",
    ref: FERAL_SYNTHETIC_REF,
    spec: FERAL_P3_SYNTHETIC_ROW.spec,
    maxPhase: FERAL_P3_SYNTHETIC_ROW.maxPhase,
    fight: FERAL_SYNTHETIC_FIGHT,
    epWeightsPath: "data/presets/feral/p1.ep-weights.json",
    skeletonPath: "data/presets/feral/p2.raid-sim-skeleton.json",
    presetGearPath: "vendor/wowsims/feral_preraid.gear.json",
    universePath: "data/universes/feral-p3.json",
    race: "RaceTauren",
  },
];

describe.each(ROWS)(
  "full-sweep recall — $rowKey",
  ({
    rowKey,
    ref,
    spec,
    maxPhase,
    fight,
    epWeightsPath,
    skeletonPath,
    presetGearPath,
    universePath,
    race,
  }) => {
    const recorded = recordingsFile.rows[rowKey]!;
    const epWeights = loadJson<{ weights: Record<string, number> }>(
      epWeightsPath
    ).weights;
    const skeleton = loadJson<RaidSimRequest>(skeletonPath);
    const presetGear = loadJson<PresetGearFile>(presetGearPath);
    // The same expression racing.test.ts used for `eligibleCount`, so the
    // denominator this gate reports is the one the old gate reported.
    const pool = filterPoolByPhase(
      poolFromUniverse(
        loadJson<Parameters<typeof poolFromUniverse>[0]>(universePath)
      ),
      maxPhase
    );
    const gearData = syntheticOfflineRecordings({
      ref,
      spec,
      presetGear,
      fight,
    });

    async function rank() {
      const sim = new CountingSimRunner(
        new RecordedSimRunner(
          recorded.simVersion,
          new Map(Object.entries(recorded.recordings))
        )
      );
      const ranking = await rankUpgrades(
        {
          character: ref,
          spec,
          maxPhase,
          iterations: recorded.iterations,
          seeds: [recorded.seed],
          ...(race === undefined ? {} : { race }),
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
      return { ranking, sim };
    }

    it("sims every eligible candidate, and at no other iteration count", async () => {
      const { sim } = await rank();

      expect(
        sim.runsByIterations.get(recorded.iterations) ?? 0
      ).toBeGreaterThanOrEqual(pool.length);
      // The structural half: any screening pass would show up as a second
      // key here (and would have thrown in RecordedSimRunner first).
      expect([...sim.runsByIterations.keys()]).toEqual([recorded.iterations]);
    });

    it("leaves no row unsimmed", async () => {
      const { ranking } = await rank();
      expect(ranking.items.filter((i) => i.simmed === false)).toEqual([]);
    });

    it("reproduces the recorded above-cutoff set", async () => {
      const { ranking } = await rank();
      const aboveCutoff = ranking.items
        .filter((i) => !i.belowCutoff)
        .map((i) => i.itemId)
        .sort((a, b) => a - b);

      expect(aboveCutoff).toEqual(recorded.aboveCutoffItemIds);
      expect(aboveCutoff).toHaveLength(recorded.aboveCutoffCount);
    });

    it("ranks every above-cutoff row", async () => {
      const { ranking } = await rank();
      const byItemId = new Map(ranking.items.map((i) => [i.itemId, i]));
      for (const itemId of recorded.aboveCutoffItemIds) {
        expect(typeof byItemId.get(itemId)?.rank).toBe("number");
      }
    });
  }
);
