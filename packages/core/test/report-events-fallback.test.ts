/**
 * The Stage 2 gate box owned by `.scratch/phase-2/issues/04-resolution-and-fallback.md`:
 *
 *   ☐ fallback route exercised on a character with no ranked kills
 *
 * Tested at the `rankUpgrades` interface through the recorded `GearSource`,
 * per AGENTS.md § Testing — the route is a seam behaviour, so a unit test of
 * the fixture builder alone would assert that a map was built, not that the
 * engine resolves through it.
 *
 * `resolveFight` is also unit-tested directly below: the preference order is
 * the whole behaviour and it is invisible from a `Ranking`, which only ever
 * holds the winner.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  REPORT_EVENTS_REF,
  reportEventsOfflineRecordings,
  type ReportEventsRawFixture,
} from "../src/fixtures/report-events-offline.js";
import { RankError, rankUpgrades, resolveFight } from "../src/rank.js";
import {
  characterFightKey,
  RecordedGearSource,
  type FightSummary,
} from "../src/seams/gear-source.js";
import type {
  RaidSimRequest,
  SimObservation,
  SimRunner,
} from "../src/seams/sim-runner.js";
import { MemoryStore } from "../src/seams/store.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function rawFixture(): ReportEventsRawFixture {
  return JSON.parse(
    readFileSync(
      join(root, "test/fixtures/slamaltman-report-events.raw.json"),
      "utf8"
    )
  ) as ReportEventsRawFixture;
}

const skeleton = JSON.parse(
  readFileSync(join(root, "data/presets/ret/p2.raid-sim-skeleton.json"), "utf8")
) as RaidSimRequest;

const epWeights = (
  JSON.parse(
    readFileSync(join(root, "data/presets/ret/p2.ep-weights.json"), "utf8")
  ) as { weights: Record<string, number> }
).weights;

/** Any request answers; this suite is about resolution, not about DPS. */
const sim: SimRunner = {
  version: async () => "v0.0.101",
  run: async (): Promise<SimObservation> => ({
    dps: 2000,
    stdev: 90,
    iterationsDone: 3000,
    simVersion: "v0.0.101",
  }),
};

describe("report-events fixture", () => {
  it("loads the captured payload into GearSource recordings", () => {
    const data = reportEventsOfflineRecordings(rawFixture());
    const fights = data.fights.get(characterFightKey(REPORT_EVENTS_REF, "ret"));
    expect(fights).toHaveLength(1);
    expect(fights![0]!.route).toBe("report-events");
    // 19 WCL client-order entries reconcile to 17 sim slots (R17).
    const gear = data.gear.get(
      `${fights![0]!.reportCode}|${fights![0]!.fightId}`
    );
    expect(gear?.items).toHaveLength(17);
    expect(gear?.items.filter((i) => i.id > 0).length).toBeGreaterThan(10);
  });

  /**
   * The distinction the gate box turns on. "No ranked kills" is about a
   * ranked parse, not about whether the boss died — this capture's own fight
   * is a kill, and the character still has zero `encounterRankings`.
   */
  it("is a kill that still resolves through the fallback route", () => {
    const raw = rawFixture();
    expect(raw.fight.kill).toBe(true);
    const data = reportEventsOfflineRecordings(raw);
    const fights = data.fights.get(
      characterFightKey(REPORT_EVENTS_REF, "ret")
    )!;
    expect(fights[0]!.route).toBe("report-events");
  });

  /**
   * The guard that would have caught a real mis-capture. The first capture
   * taken for this ticket was slamaltman's **protection** night — 0/44/17,
   * 17k armour, an off-hand shield — and nothing in the pipeline objected,
   * because the builder hardcoded ret's talent split instead of reading it.
   * Every number downstream is scored with ret EP weights and the ret P2
   * preset, so a non-ret capture makes the whole ranking meaningless while
   * still looking like a passing test.
   */
  it("captures a retribution build, which is what the ret preset scores", () => {
    const data = reportEventsOfflineRecordings(rawFixture());
    const fights = data.fights.get(
      characterFightKey(REPORT_EVENTS_REF, "ret")
    )!;
    const gear = data.gear.get(
      `${fights[0]!.reportCode}|${fights[0]!.fightId}`
    )!;

    // Points spent per tree (R18), Holy / Protection / Retribution.
    const [holy, prot, ret] = gear.talentPointsByTree;
    expect(ret).toBeGreaterThan(holy);
    expect(ret).toBeGreaterThan(prot);

    // A ret paladin swings a two-hander, so the off-hand slot is empty. The
    // protection capture had a shield here, which is the cheapest structural
    // tell that the set is not ret.
    const offHand = gear.items.find((i) => i.slot === "off-hand");
    expect(offHand?.id ?? 0).toBe(0);
  });

  it("reads talent points from the capture rather than assuming them", () => {
    const raw = rawFixture();
    raw.combatant_info_events = raw.combatant_info_events.map((ev) => ({
      ...ev,
      talents: [{ id: 9 }, { id: 9 }, { id: 43 }],
    }));
    const data = reportEventsOfflineRecordings(raw);
    const fights = data.fights.get(
      characterFightKey(REPORT_EVENTS_REF, "ret")
    )!;
    const gear = data.gear.get(
      `${fights[0]!.reportCode}|${fights[0]!.fightId}`
    )!;
    expect(gear.talentPointsByTree).toEqual([9, 9, 43]);
  });

  it("refuses a capture whose talent payload cannot classify a spec", () => {
    const raw = rawFixture();
    raw.combatant_info_events = raw.combatant_info_events.map((ev) => ({
      ...ev,
      talents: [],
    }));
    expect(() => reportEventsOfflineRecordings(raw)).toThrow(/expected 3/);
  });

  it("rejects a fixture that does not contain the character", () => {
    const raw = rawFixture();
    expect(() =>
      reportEventsOfflineRecordings(raw, {
        ...REPORT_EVENTS_REF,
        name: "nobodyhere",
      })
    ).toThrow(/not found in report-events fixture/);
  });
});

describe("rankUpgrades on a character with no ranked kills", () => {
  it("returns a Ranking through the report-events route", async () => {
    const ranking = await rankUpgrades(
      {
        character: REPORT_EVENTS_REF,
        spec: "ret",
        maxPhase: 2,
        iterations: 3000,
        seeds: [42],
        race: "RaceBloodElf",
      },
      {
        gear: new RecordedGearSource(
          reportEventsOfflineRecordings(rawFixture())
        ),
        sim,
        store: new MemoryStore(),
        clock: () => new Date("2026-08-05T12:00:00.000Z"),
        raidSimSkeleton: skeleton,
        epWeights,
      }
    );

    // A Ranking, where this character previously reached the throw below.
    expect(ranking.baseline.dps).toBe(2000);
    expect(ranking.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("reports which route answered", async () => {
    const ranking = await rankUpgrades(
      {
        character: REPORT_EVENTS_REF,
        spec: "ret",
        maxPhase: 2,
        iterations: 3000,
        seeds: [42],
        race: "RaceBloodElf",
      },
      {
        gear: new RecordedGearSource(
          reportEventsOfflineRecordings(rawFixture())
        ),
        sim,
        store: new MemoryStore(),
        clock: () => new Date("2026-08-05T12:00:00.000Z"),
        raidSimSkeleton: skeleton,
        epWeights,
      }
    );

    // The half of this ticket that was new work: nothing carried the route
    // out to a caller before.
    expect(ranking.fight.route).toBe("report-events");
    expect(ranking.fight.reportCode).toBe(rawFixture().report_code);
    expect(ranking.fight.fightId).toBe(rawFixture().fight.id);
    expect(ranking.fight.encounterName).toBe(rawFixture().fight.name);
  });

  it("still throws no-qualifying-fight when neither route has a fight", async () => {
    await expect(
      rankUpgrades(
        { character: REPORT_EVENTS_REF, spec: "ret", maxPhase: 2 },
        {
          gear: new RecordedGearSource({
            fights: new Map(),
            gear: new Map(),
          }),
          sim,
          store: new MemoryStore(),
          clock: () => new Date("2026-08-05T12:00:00.000Z"),
          raidSimSkeleton: skeleton,
          epWeights,
        }
      )
    ).rejects.toMatchObject({
      name: "RankError",
      kind: "no-qualifying-fight",
    } satisfies Partial<RankError>);
  });
});

describe("resolveFight", () => {
  const summary = (over: Partial<FightSummary>): FightSummary => ({
    reportCode: "abc123",
    fightId: 1,
    encounterName: "Hydross the Unstable",
    killedAt: "2026-07-01T00:00:00.000Z",
    route: "ranked",
    confidence: 1,
    ...over,
  });

  it("is undefined when there is nothing to resolve", () => {
    expect(resolveFight([])).toBeUndefined();
  });

  it("prefers a ranked kill over a report-events fight", () => {
    const chosen = resolveFight([
      summary({ fightId: 1, route: "report-events" }),
      summary({ fightId: 2, route: "ranked" }),
    ]);
    // Order in the list must not decide this — a ranked parse is the better
    // sample whether or not it happens to come first.
    expect(chosen).toMatchObject({ fightId: 2, route: "ranked" });
  });

  it("falls through to report-events when no fight is ranked", () => {
    const chosen = resolveFight([
      summary({ fightId: 4, route: "report-events" }),
      summary({ fightId: 5, route: "report-events" }),
    ]);
    expect(chosen).toMatchObject({ fightId: 4, route: "report-events" });
  });

  it("honours an explicit RankInput.fight and reports that fight's route", () => {
    const chosen = resolveFight(
      [
        summary({ fightId: 1, route: "ranked" }),
        summary({ fightId: 2, route: "report-events" }),
      ],
      { reportCode: "abc123", fightId: 2 }
    );
    expect(chosen).toMatchObject({ fightId: 2, route: "report-events" });
  });

  it("does not call a caller-named unknown fight 'ranked'", () => {
    const chosen = resolveFight([summary({ fightId: 1 })], {
      reportCode: "zzz999",
      fightId: 77,
    });
    expect(chosen).toMatchObject({
      reportCode: "zzz999",
      fightId: 77,
      route: "report-events",
    });
  });

  it("carries confidence and salvation through, so the caller can disclose them", () => {
    // Ticket 06: both were measured upstream and then dropped here, which is
    // why an off-tank fight reached the user looking like a clean parse.
    const chosen = resolveFight([
      summary({ confidence: 0.99, salvationUptime: 0 }),
    ]);
    expect(chosen).toMatchObject({ confidence: 0.99, salvationUptime: 0 });
  });

  it("leaves salvation absent when the source never measured it", () => {
    // Absent and zero mean different things — see FightSummary.salvationUptime.
    const chosen = resolveFight([summary({})]);
    expect(chosen?.salvationUptime).toBeUndefined();
  });
});
