/**
 * The bulk screening branch in the fork's `rankUpgrades` (batch-sim plan Step 8,
 * round-2 condition N1).
 *
 * Dead code cover: nothing here is reachable from the upgrades tab at runtime.
 * The tab's only runner, `WorkerPoolSimRunner`, has no `runBulkScreen`, and the
 * fork's bulk adapters are deleted (fork `02cca7b70`). This suite covers the
 * engine's bulk branch that is still there (`engine/bulk/partition.ts`,
 * `rank.ts`'s screening pass, the seam's bulk types); ticket 567 deletes that
 * branch and this suite with it. Re-check with
 * `git -C vendor/tbc-new-fork grep -n runBulkScreen -- ui ':!ui/features/upgrades/model/engine'`,
 * which prints only a doc comment in `worker_pool_sim_runner.ts`.
 *
 * Two layers, and the first is the one that matters.
 *
 * **`rankUpgrades` through recorded adapters.** The same fixture is ranked
 * twice — once with a bulk-capable recorded runner, once with a runner that has
 * no bulk capability at all — and the two rankings must agree on row set,
 * ordering, and deltas. That is the property N1 asks for: taking the bulk route
 * changes WHERE a screening DPS comes from and nothing else.
 *
 * The comparison is only meaningful because the bulk fixture's baseline is
 * deliberately OFFSET from the loop's. The screening pass probes its own
 * baseline inside the batch at a seed it picks itself, and the local HTTP
 * measurement in
 * `.scratch/stage-gate/batch-sim-web-local/execution-ledger-local.md` put that
 * probe 65.3 DPS away from the loop's seed-11 baseline (2181.67 vs 2246.99)
 * against a 3.4 DPS cutoff. (That gap is a seed artifact rather than an engine
 * one — the same ledger has the loop at seed 777 giving 2181.37, within 0.3 DPS
 * of the bulk probe — but its size is what the engine has to handle correctly
 * either way.) A fixture whose two baselines agreed would pass whether or not
 * the engine differenced each observation against the right one, which is
 * exactly the hole the previous version of this file left open: it promised a
 * `rankUpgrades` test in its header and never called `rankUpgrades`. The offset
 * is what makes this test able to fail.
 *
 * The set-bonus assertions cover the second way a baseline can leak. Row deltas
 * only ever compare against each other, so a shared offset cancels; but
 * `computeSynergy` subtracts summed per-item deltas from a package delta simmed
 * through the loop, so a screened delta that had been re-scaled would corrupt
 * `bonusDps` once per added piece and compound into the 4-piece result.
 *
 * **The seam's recorded runner.** The smaller tests below pin the capability
 * check and the batch key scheme that the first layer relies on.
 *
 * Fixtures are synthetic where the numbers are arbitrary — the per-candidate
 * DPS values are computed from the request, not measured — because what is under
 * test is which baseline the engine subtracts and which rows survive, not the
 * sim's arithmetic. The one number taken from a real measurement is the
 * baseline gap between the two routes, which is the thing the synthetic data
 * cannot invent honestly. Gear, EP weights, the raid-sim skeleton and the
 * candidate universe are the repo's real committed feral fixtures.
 *
 * The fork is gitignored (`vendor/`), so the suite skips when it is absent.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { forkPresent, importForkUpgrades } from "./fork-engine-harness.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

type SimObservation = {
  dps: number;
  stdev: number;
  iterationsDone: number;
  simVersion: string;
};

type RaidSimRequest = Readonly<Record<string, unknown>>;

type BulkScreenCandidate = {
  index: number;
  gear: Readonly<Record<string, unknown>>;
};

type BulkScreenRequest = {
  baseRequest: RaidSimRequest;
  candidates: readonly BulkScreenCandidate[];
  iterations: number;
  seed: number;
};

type BulkScreenResult = {
  baseline: SimObservation;
  rows: ReadonlyArray<{ index: number; observation: SimObservation }>;
};

type SimRunOpts = { seed: number; iterations: number };

type SeamModule = {
  bulkScreenCacheKey: (req: BulkScreenRequest, simVersion: string) => string;
  simCacheKey: (
    req: RaidSimRequest,
    simVersion: string,
    opts: SimRunOpts
  ) => string;
  RecordedSimRunner: new (
    simVersion: string,
    recordings: ReadonlyMap<string, SimObservation>,
    bulkRecordings?: ReadonlyMap<string, BulkScreenResult>
  ) => {
    version(): Promise<string>;
    run(req: RaidSimRequest, opts: SimRunOpts): Promise<SimObservation>;
    runBulkScreen?: (req: BulkScreenRequest) => Promise<BulkScreenResult>;
  };
};

const loadSeam = () =>
  importForkUpgrades<SeamModule>("engine/seams/sim-runner.ts");

/* ------------------------------------------------------------------ *
 * The `rankUpgrades` comparison
 * ------------------------------------------------------------------ */

const SIM_VERSION = "v0.0.101";
const ITERATIONS = 5000;

/**
 * The measured baseline gap, applied to the synthetic fixture so the two routes
 * disagree about the baseline exactly the way the real ones did. Loop baseline
 * 2246.99, screening probe 2181.67 (execution-ledger-local.md).
 */
const LOOP_BASELINE_DPS = 2246.99;
const BULK_BASELINE_DPS = 2181.67;
const BASELINE_OFFSET = LOOP_BASELINE_DPS - BULK_BASELINE_DPS;

type FightSummary = {
  reportCode: string;
  fightId: number;
  encounterName: string;
  killedAt?: string;
  route: "ranked" | "report-events";
  confidence: number;
};

const FERAL_CHAR = {
  region: "US" as const,
  realm: "dreamscythe",
  name: "shredzepelin",
};

const FERAL_SUMMARY: FightSummary = {
  reportCode: "def456",
  fightId: 3,
  encounterName: "Hydross the Unstable",
  killedAt: "2026-07-01T00:00:00.000Z",
  route: "ranked",
  confidence: 1,
};

const feralWeights = (
  JSON.parse(
    readFileSync(join(root, "data/presets/feral/p1.ep-weights.json"), "utf8")
  ) as { weights: Record<string, number> }
).weights;

const feralSkeleton = JSON.parse(
  readFileSync(
    join(root, "data/presets/feral/p2.raid-sim-skeleton.json"),
    "utf8"
  )
) as RaidSimRequest;

/**
 * The gear a request equips, as a stable string.
 *
 * DPS in this fixture is a function of the GEAR, not of the whole request,
 * because that is the only way the two routes can be compared at all: the loop
 * hands its runner a fully composed `RaidSimRequest`, while the bulk route hands
 * its runner an `EquipmentSpec` per candidate against one shared base request.
 * Hashing each runner's own argument would price the same gear differently on
 * the two routes and the comparison would fail for a reason that has nothing to
 * do with the engine. Reducing both to the equipped items makes "same gear,
 * same DPS" true by construction, which is the property a real simulator has.
 */
function gearFingerprint(items: unknown): string {
  const list = Array.isArray(items) ? items : [];
  return JSON.stringify(
    list.map((item) => {
      const spec = (item ?? {}) as {
        id?: number;
        gems?: number[];
        enchant?: number;
      };
      return [spec.id ?? 0, spec.enchant ?? 0, [...(spec.gems ?? [])]];
    })
  );
}

/** Pulls the equipped items out of a composed raid-sim request. */
function equipmentOf(req: RaidSimRequest): unknown {
  const raid = (req as { raid?: { parties?: unknown[] } }).raid;
  const party = raid?.parties?.[0] as { players?: unknown[] } | undefined;
  const player = party?.players?.[0] as
    { equipment?: { items?: unknown[] } } | undefined;
  return player?.equipment?.items ?? [];
}

/**
 * A deterministic stand-in for the simulator: the same gear always prices the
 * same, so two runs of the same fixture are comparable by construction. Spread
 * is wide enough that rows land on both sides of the cutoff, which is what makes
 * the ordering and `belowCutoff` assertions mean something.
 */
function syntheticDps(items: unknown, baseline: number): number {
  const canonical = gearFingerprint(items);
  let hash = 0;
  for (let i = 0; i < canonical.length; i++) {
    hash = (hash * 31 + canonical.charCodeAt(i)) | 0;
  }
  return baseline + ((hash >>> 0) % 20_000) / 100 - 40;
}

describe.skipIf(!forkPresent)("rankUpgrades bulk screening branch", () => {
  it("ranks a fixture identically with and without the bulk route", async () => {
    const { simCacheKey } = await loadSeam();

    const rankMod = await importForkUpgrades<{
      rankUpgrades: (
        input: Record<string, unknown>,
        deps: Record<string, unknown>
      ) => Promise<{
        items: Array<{
          itemId: number;
          rank: number | null;
          deltaDps: number;
          belowCutoff: boolean;
          setContext?: { rankableSetPotential?: number };
        }>;
        baseline: { dps: number };
        setBonuses?: Array<{
          setId: number;
          setName: string;
          threshold: number;
          packageItemIds: number[];
          packageDeltaDps: number;
          bonusDps?: number;
          unmeasured?: string;
        }>;
      }>;
    }>("engine/rank.ts");
    const storeMod = await importForkUpgrades<{
      MemoryStore: new () => Record<string, unknown>;
    }>("engine/seams/store.ts");
    const gearMod = await importForkUpgrades<{
      RecordedGearSource: new (data: {
        fights: ReadonlyMap<string, FightSummary[]>;
        gear: ReadonlyMap<string, unknown>;
      }) => unknown;
      characterFightKey: (c: unknown, spec: string) => string;
      fightGearKey: (f: unknown) => string;
    }>("engine/seams/gear-source.ts");
    // The WCL mapping comes from `packages/core`, not the fork: the fork's
    // engine reads the page rather than a log, so its `slots.ts` carries
    // `SIM_ORDER` but no WCL mapper. Both sides share the same slot order, and
    // this is fixture construction — the mapper is not under test.
    const slotsMod = await import("../src/slots.js");
    const poolMod = await import("../src/pool.js");

    // The real committed feral P2 universe. `deps.pool` defaults to empty, so
    // without this the run completes honestly with zero rows and the comparison
    // asserts nothing.
    const pool = poolMod.poolFromUniverse(
      JSON.parse(
        readFileSync(join(root, "data/universes/feral-p2.json"), "utf8")
      ) as Parameters<typeof poolMod.poolFromUniverse>[0]
    );

    const raw = JSON.parse(
      readFileSync(
        join(root, "test/fixtures/shredzepelin-cat.raw.json"),
        "utf8"
      )
    ) as {
      actors: Array<{ id: number; name: string }>;
      combatant_info_events: Array<{ sourceID: number; gear: unknown[] }>;
    };
    const actors = new Map(raw.actors.map((a) => [a.id, a]));
    const event = raw.combatant_info_events.find(
      (ev) => actors.get(ev.sourceID)?.name.toLowerCase() === "shredzepelin"
    );
    if (!event) throw new Error("shredzepelin not found in fixture");
    const mapped = slotsMod.mapWclGearToSim(
      event.gear as Parameters<typeof slotsMod.mapWclGearToSim>[0]
    );
    const loggedGear = {
      items: mapped.map((spec, i) => {
        const item: Record<string, unknown> = {
          id: spec.id ?? 0,
          slot: slotsMod.SIM_ORDER[i]!,
          gems: spec.gems,
        };
        if (spec.enchant) item.enchant = spec.enchant;
        return item;
      }),
      talentPointsByTree: [0, 45, 16] as [number, number, number],
      provenance: {
        reportCode: FERAL_SUMMARY.reportCode,
        fightId: FERAL_SUMMARY.fightId,
        sourceID: event.sourceID,
      },
    };

    const fightRef = {
      reportCode: FERAL_SUMMARY.reportCode,
      fightId: FERAL_SUMMARY.fightId,
    };
    const makeGearSource = () =>
      new gearMod.RecordedGearSource({
        fights: new Map([
          [gearMod.characterFightKey(FERAL_CHAR, "feral"), [FERAL_SUMMARY]],
        ]),
        gear: new Map([[gearMod.fightGearKey(fightRef), loggedGear]]),
      });

    const input = {
      character: FERAL_CHAR,
      spec: "feral",
      maxPhase: 2,
      fight: fightRef,
      iterations: ITERATIONS,
      // One seed: paired replication re-sims through `deps.sim.run`, and this
      // test is about the screening route, not the final pass.
      seeds: [11],
      // Wide enough that the set pieces reach the candidate set. Below roughly
      // this, package selection reports `insufficient-pieces`, `computeSynergy`
      // never runs, and the set-potential assertions below cannot fail.
      candidateCap: 60,
    };

    // Pass 1 — no bulk capability. A capturing runner prices every request the
    // loop asks for, against the loop's baseline, and records what it answered.
    const loopRecordings = new Map<string, SimObservation>();
    class ComputingRunner {
      async version(): Promise<string> {
        return SIM_VERSION;
      }
      async run(
        req: RaidSimRequest,
        opts: SimRunOpts
      ): Promise<SimObservation> {
        const observation: SimObservation = {
          dps: syntheticDps(equipmentOf(req), LOOP_BASELINE_DPS),
          stdev: 30,
          iterationsDone: opts.iterations,
          simVersion: SIM_VERSION,
        };
        loopRecordings.set(simCacheKey(req, SIM_VERSION, opts), observation);
        return observation;
      }
    }

    const loopRanking = await rankMod.rankUpgrades(input, {
      gear: makeGearSource(),
      sim: new ComputingRunner(),
      store: new storeMod.MemoryStore(),
      clock: () => new Date("2026-07-26T12:00:00.000Z"),
      raidSimSkeleton: feralSkeleton,
      epWeights: feralWeights,
      pool,
    });

    expect(loopRanking.items.length).toBeGreaterThan(0);

    // The baseline the loop actually measured, which is the synthetic DPS of the
    // worn gear rather than a constant. The bulk fixture is built relative to
    // this so the two routes differ by the offset and by nothing else.
    const loopBaselineDps = loopRanking.baseline.dps;

    // Pass 2 — the bulk route. Every candidate observation is the SAME
    // measurement as pass 1, shifted down by the measured baseline gap,
    // and served alongside a baseline shifted by the same amount. Differencing
    // each row against the bulk baseline must therefore reproduce pass 1's
    // deltas exactly; differencing against the loop's baseline (the defect this
    // test exists for) shifts every screened delta by 65.32 DPS, which is ~19x
    // the 3.4 DPS cutoff and reorders nothing but reclassifies everything.
    let capturedBulkRequest: BulkScreenRequest | undefined;
    const bulkObservationFor = (gear: unknown, iterations: number) => ({
      // The gear the loop would have priced, priced the same way, then moved
      // onto the bulk engine's scale.
      dps: syntheticDps(gear, LOOP_BASELINE_DPS) - BASELINE_OFFSET,
      stdev: 30,
      iterationsDone: iterations,
      simVersion: SIM_VERSION,
    });
    class CapturingBulkRunner {
      async version(): Promise<string> {
        return SIM_VERSION;
      }
      async runBulkScreen(req: BulkScreenRequest): Promise<BulkScreenResult> {
        capturedBulkRequest = req;
        return {
          baseline: {
            dps: loopBaselineDps - BASELINE_OFFSET,
            stdev: 30,
            iterationsDone: req.iterations,
            simVersion: SIM_VERSION,
          },
          rows: req.candidates.map((candidate) => ({
            index: candidate.index,
            observation: bulkObservationFor(
              (candidate.gear as { items?: unknown }).items,
              req.iterations
            ),
          })),
        };
      }
    }

    // The loop pass must be able to answer any request the bulk pass does not
    // cover (the baseline sim, and replication), so it keeps the same
    // recordings; only screening changes route.
    const bulkRunner = new CapturingBulkRunner();
    const bulkRanking = await rankMod.rankUpgrades(input, {
      gear: makeGearSource(),
      sim: {
        version: () => bulkRunner.version(),
        run: (req: RaidSimRequest, opts: SimRunOpts) => {
          const hit = loopRecordings.get(simCacheKey(req, SIM_VERSION, opts));
          if (hit) return Promise.resolve(hit);
          // A request the loop pass never made: price it the same way rather
          // than failing, so the comparison is not hostage to dispatch order.
          return Promise.resolve({
            dps: syntheticDps(equipmentOf(req), LOOP_BASELINE_DPS),
            stdev: 30,
            iterationsDone: opts.iterations,
            simVersion: SIM_VERSION,
          });
        },
        runBulkScreen: (req: BulkScreenRequest) =>
          bulkRunner.runBulkScreen(req),
      },
      store: new storeMod.MemoryStore(),
      clock: () => new Date("2026-07-26T12:00:00.000Z"),
      raidSimSkeleton: feralSkeleton,
      epWeights: feralWeights,
      pool,
    });

    // The branch was actually taken — otherwise this whole test is comparing
    // the loop against itself and asserts nothing.
    expect(capturedBulkRequest).toBeDefined();
    expect(capturedBulkRequest!.candidates.length).toBeGreaterThan(0);
    // Threaded from `runOpts.seed`, not hardcoded in the request builder.
    expect(capturedBulkRequest!.seed).toBe(11);
    expect(capturedBulkRequest!.iterations).toBe(ITERATIONS);

    // Reached the end of the flow: a `RankError` anywhere (including
    // replication's "no recorded request" internal error) would have rejected.
    expect(bulkRanking.items.length).toBe(loopRanking.items.length);

    // Set-bonus arithmetic agrees between the routes.
    //
    // This is a separate obligation from the row assertions below, and the one
    // place a screened delta stops being compared only against other screened
    // deltas. `computeSynergy` (set-value.ts) computes `bonusDps =
    // (packageDps - baseline) - sum(addedPieceDeltas)`, where the package is
    // always simmed through `deps.sim.run` while the summed pieces may have been
    // screened. If a screened delta were ever re-scaled — or if screening left
    // one on a different footing than the loop — the difference would land in
    // `bonusDps` once PER ADDED PIECE and compound through `twoPieceBonus` into
    // the 4-piece result, rather than cancelling the way a shared offset does in
    // a sort or a per-row cutoff.
    const measuredBonuses = (r: typeof loopRanking) =>
      (r.setBonuses ?? [])
        .filter((b) => b.unmeasured === undefined)
        .map((b) => ({
          setId: b.setId,
          threshold: b.threshold,
          packageItemIds: b.packageItemIds,
          packageDeltaDps: b.packageDeltaDps,
          bonusDps: b.bonusDps,
        }));
    const loopBonuses = measuredBonuses(loopRanking);
    const bulkBonuses = measuredBonuses(bulkRanking);

    // The fixture has to actually reach `computeSynergy`, with a package whose
    // pieces were screened. Every bonus coming back `unmeasured` would make the
    // comparison below vacuous — which is exactly what a too-small
    // `candidateCap` produces (`insufficient-pieces`).
    expect(loopBonuses.length).toBeGreaterThan(0);
    const screenedPieceIds = new Set(
      (capturedBulkRequest?.candidates ?? []).flatMap((c) =>
        (
          ((c.gear as { items?: unknown[] }).items ?? []) as Array<{
            id?: number;
          }>
        ).map((i) => i.id ?? 0)
      )
    );
    expect(
      loopBonuses.some((b) =>
        b.packageItemIds.some((id) => screenedPieceIds.has(id))
      )
    ).toBe(true);

    expect(bulkBonuses).toEqual(loopBonuses);

    // And the per-row set potential those bonuses feed, which is what the view
    // actually sorts on when set-potential is enabled.
    const setPotentials = (r: typeof loopRanking) =>
      r.items.map((i) => i.setContext?.rankableSetPotential ?? null);
    expect(setPotentials(bulkRanking)).toEqual(setPotentials(loopRanking));

    // The reported baseline is the loop's on both routes — screening never
    // replaces the ranking's own baseline, only the DPS of the screened rows.
    expect(bulkRanking.baseline.dps).toBeCloseTo(loopRanking.baseline.dps, 6);

    // Row set and ordering agree.
    expect(bulkRanking.items.map((i) => i.itemId)).toEqual(
      loopRanking.items.map((i) => i.itemId)
    );
    expect(bulkRanking.items.map((i) => i.rank)).toEqual(
      loopRanking.items.map((i) => i.rank)
    );
    expect(bulkRanking.items.map((i) => i.belowCutoff)).toEqual(
      loopRanking.items.map((i) => i.belowCutoff)
    );

    // Deltas agree. The fixture is deterministic, so this is exact rather than
    // within noise — any drift here is the baseline bug, not sampling.
    for (const [i, bulkItem] of bulkRanking.items.entries()) {
      const loopItem = loopRanking.items[i]!;
      expect(bulkItem.deltaDps).toBeCloseTo(loopItem.deltaDps, 6);
    }

    // The assertions above have to be able to fail, so pin the two things that
    // would quietly make them vacuous.
    //
    // First, the offset is genuinely in the fixture. A future edit that made the
    // two baselines equal would leave every assertion green while testing
    // nothing — it is the offset that separates "differenced against the right
    // baseline" from "differenced against either".
    expect(BASELINE_OFFSET).toBeCloseTo(65.32, 2);
    expect(BASELINE_OFFSET).toBeGreaterThan(3.4);

    // Second, the fixture straddles the cutoff. Comparing `rank`/`belowCutoff`
    // across the routes says nothing if every row falls on the same side: the
    // offset is ~19x the cutoff, so getting the baseline wrong reclassifies
    // rows, and that is only observable when both classes are populated.
    const rankedCount = loopRanking.items.filter((i) => i.rank !== null).length;
    expect(rankedCount).toBeGreaterThan(0);
    expect(rankedCount).toBeLessThan(loopRanking.items.length);
  }, 120_000);
});

/* ------------------------------------------------------------------ *
 * The seam's recorded runner
 * ------------------------------------------------------------------ */

describe.skipIf(!forkPresent)("bulk screening capability (seam)", () => {
  it("is absent unless the runner was given bulk recordings", async () => {
    const { RecordedSimRunner } = await loadSeam();
    const withoutBulk = new RecordedSimRunner("v1", new Map());
    // `rank.ts` branches on the member's presence, so a fixture with no bulk
    // recordings must be indistinguishable from a runner that never had the
    // capability -- otherwise every existing fixture would silently take the
    // bulk path and fail on a missing recording.
    expect(withoutBulk.runBulkScreen).toBeUndefined();
    expect("runBulkScreen" in withoutBulk).toBe(false);

    const withBulk = new RecordedSimRunner("v1", new Map(), new Map());
    expect(typeof withBulk.runBulkScreen).toBe("function");
  });

  it("replays a recorded batch by its key", async () => {
    const { RecordedSimRunner, bulkScreenCacheKey } = await loadSeam();
    const req: BulkScreenRequest = {
      baseRequest: { raid: { parties: [] } },
      candidates: [
        { index: 0, gear: { items: [{ id: 1 }] } },
        { index: 1, gear: { items: [{ id: 2 }] } },
      ],
      iterations: 5000,
      seed: 11,
    };
    const expected: BulkScreenResult = {
      baseline: {
        dps: 1000,
        stdev: 10,
        iterationsDone: 5000,
        simVersion: "v1",
      },
      rows: [
        {
          index: 0,
          observation: {
            dps: 1100,
            stdev: 11,
            iterationsDone: 5000,
            simVersion: "v1",
          },
        },
        {
          index: 1,
          observation: {
            dps: 900,
            stdev: 9,
            iterationsDone: 5000,
            simVersion: "v1",
          },
        },
      ],
    };
    const runner = new RecordedSimRunner(
      "v1",
      new Map(),
      new Map([[bulkScreenCacheKey(req, "v1"), expected]])
    );
    await expect(runner.runBulkScreen!(req)).resolves.toEqual(expected);
  });

  it("throws rather than inventing numbers for an unrecorded batch", async () => {
    const { RecordedSimRunner } = await loadSeam();
    const runner = new RecordedSimRunner("v1", new Map(), new Map());
    await expect(
      runner.runBulkScreen!({
        baseRequest: {},
        candidates: [{ index: 0, gear: {} }],
        iterations: 5000,
        seed: 11,
      })
    ).rejects.toThrow(/no recording for bulk screen key/);
  });

  it("keys on the batch, so a different candidate set or seed is a different key", async () => {
    const { bulkScreenCacheKey } = await loadSeam();
    const base = { raid: {} };
    const one = bulkScreenCacheKey(
      {
        baseRequest: base,
        candidates: [{ index: 0, gear: { id: 1 } }],
        iterations: 5000,
        seed: 11,
      },
      "v1"
    );
    const two = bulkScreenCacheKey(
      {
        baseRequest: base,
        candidates: [{ index: 0, gear: { id: 2 } }],
        iterations: 5000,
        seed: 11,
      },
      "v1"
    );
    const differentIterations = bulkScreenCacheKey(
      {
        baseRequest: base,
        candidates: [{ index: 0, gear: { id: 1 } }],
        iterations: 3000,
        seed: 11,
      },
      "v1"
    );
    // The same batch at a different seed is a different measurement, so it must
    // not collide with this one's recording.
    const differentSeed = bulkScreenCacheKey(
      {
        baseRequest: base,
        candidates: [{ index: 0, gear: { id: 1 } }],
        iterations: 5000,
        seed: 22,
      },
      "v1"
    );
    expect(one).not.toBe(two);
    expect(one).not.toBe(differentIterations);
    expect(one).not.toBe(differentSeed);
    // Stable for the same inputs, so a recording made once replays forever.
    expect(one).toBe(
      bulkScreenCacheKey(
        {
          baseRequest: base,
          candidates: [{ index: 0, gear: { id: 1 } }],
          iterations: 5000,
          seed: 11,
        },
        "v1"
      )
    );
  });
});
