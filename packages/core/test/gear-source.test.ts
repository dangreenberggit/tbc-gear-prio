import { describe, expect, it } from "vitest";
import {
  CachingGearSource,
  RecordedGearSource,
  type FightSummary,
  type GearSource,
  type LoggedGear,
} from "../src/seams/gear-source.js";
import { MemoryStore } from "../src/seams/store.js";
import type { CharacterRef, FightRef } from "../src/types.js";

const CHAR: CharacterRef = {
  region: "US",
  realm: "dreamscythe",
  name: "slamaltman",
};

const FIGHT: FightRef = { reportCode: "abc123", fightId: 7 };

const SUMMARY: FightSummary = {
  reportCode: "abc123",
  fightId: 7,
  encounterName: "Hydross the Unstable",
  killedAt: "2026-07-01T00:00:00.000Z",
  route: "ranked",
  confidence: 1,
};

const GEAR: LoggedGear = {
  items: [{ id: 32461, slot: "head", enchant: 3003, gems: [32409, 24054] }],
  talentPointsByTree: [0, 41, 20],
  specIdHint: 4,
  provenance: { reportCode: "abc123", fightId: 7, sourceID: 11 },
};

describe("RecordedGearSource", () => {
  it("lists recorded fights for a character", async () => {
    const gear = new RecordedGearSource({
      fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
      gear: new Map(),
    });
    expect(await gear.findFights(CHAR, "ret")).toEqual([SUMMARY]);
  });

  it("returns empty fights when the character has no recording", async () => {
    const gear = new RecordedGearSource({
      fights: new Map(),
      gear: new Map(),
    });
    expect(await gear.findFights(CHAR, "ret")).toEqual([]);
  });

  it("reads recorded gear for a fight", async () => {
    const gear = new RecordedGearSource({
      fights: new Map(),
      gear: new Map([["abc123|7", GEAR]]),
    });
    expect(await gear.readGear(FIGHT)).toEqual(GEAR);
  });

  it("throws when gear was never recorded", async () => {
    const gear = new RecordedGearSource({
      fights: new Map(),
      gear: new Map(),
    });
    await expect(gear.readGear(FIGHT)).rejects.toThrow(/no recording/i);
  });
});

describe("CachingGearSource", () => {
  /** Counts fetches so "no second WCL call" is asserted, not assumed. */
  class CountingGearSource implements GearSource {
    reads = 0;
    constructor(private readonly gear: ReadonlyMap<string, LoggedGear>) {}
    async findFights(): Promise<FightSummary[]> {
      return [SUMMARY];
    }
    async readGear(f: FightRef): Promise<LoggedGear> {
      this.reads += 1;
      const hit = this.gear.get(`${f.reportCode}|${f.fightId}`);
      if (!hit) throw new Error(`no recording for ${f.fightId}`);
      return hit;
    }
  }

  it("fetches a fight once and serves the rest from the store", async () => {
    const inner = new CountingGearSource(new Map([["abc123|7", GEAR]]));
    const gear = new CachingGearSource(inner, new MemoryStore());

    expect(await gear.readGear(FIGHT)).toEqual(GEAR);
    expect(await gear.readGear(FIGHT)).toEqual(GEAR);
    expect(inner.reads).toBe(1);
  });

  it("fetches each fight separately", async () => {
    const other: FightRef = { reportCode: "abc123", fightId: 9 };
    const inner = new CountingGearSource(
      new Map([
        ["abc123|7", GEAR],
        ["abc123|9", GEAR],
      ])
    );
    const gear = new CachingGearSource(inner, new MemoryStore());

    await gear.readGear(FIGHT);
    await gear.readGear(other);
    expect(inner.reads).toBe(2);
  });

  it("survives a new instance over the same store", async () => {
    // The point of caching into the Store rather than a field: with
    // SqliteStore behind it, yesterday's snapshot still costs no points.
    const store = new MemoryStore();
    const inner = new CountingGearSource(new Map([["abc123|7", GEAR]]));

    await new CachingGearSource(inner, store).readGear(FIGHT);
    expect(await new CachingGearSource(inner, store).readGear(FIGHT)).toEqual(
      GEAR
    );
    expect(inner.reads).toBe(1);
  });

  it("does not cache the fight list", async () => {
    // A fight list grows as a character raids, so it is not immutable the way
    // a completed fight's gear is (PLAN.md §12 gives it a TTL in Phase 3).
    const inner = new CountingGearSource(new Map());
    let calls = 0;
    const counted: GearSource = {
      findFights: async () => {
        calls += 1;
        return inner.findFights();
      },
      readGear: (f) => inner.readGear(f),
    };
    const gear = new CachingGearSource(counted, new MemoryStore());

    await gear.findFights(CHAR, "ret");
    await gear.findFights(CHAR, "ret");
    expect(calls).toBe(2);
  });
});
