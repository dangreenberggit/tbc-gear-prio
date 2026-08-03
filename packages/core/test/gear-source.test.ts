import { describe, expect, it } from "vitest";
import {
  RecordedGearSource,
  type FightSummary,
  type LoggedGear,
} from "../src/seams/gear-source.js";
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
