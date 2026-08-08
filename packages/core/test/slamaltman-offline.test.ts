import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  slamaltmanOfflineRecordings,
  SLAMALTMAN_REF,
  type SlamaltmanRawFixture,
} from "../src/fixtures/slamaltman-offline.js";
import { characterFightKey, fightGearKey } from "../src/seams/gear-source.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("slamaltmanOfflineRecordings", () => {
  it("loads the Phase 0 raw fixture into GearSource recordings", () => {
    const raw = JSON.parse(
      readFileSync(join(root, "test/fixtures/slamaltman.raw.json"), "utf8")
    ) as SlamaltmanRawFixture;
    const data = slamaltmanOfflineRecordings(raw);
    const fights = data.fights.get(characterFightKey(SLAMALTMAN_REF, "ret"));
    expect(fights).toHaveLength(1);
    expect(fights![0]?.encounterName).toBe("Hydross the Unstable");
    const gear = data.gear.get(fightGearKey(fights![0]!));
    expect(gear?.items).toHaveLength(17);
    expect(gear?.items[0]?.id).toBe(32461);
  });

  it("reads talent points from the capture rather than assuming them", () => {
    const raw = JSON.parse(
      readFileSync(join(root, "test/fixtures/slamaltman.raw.json"), "utf8")
    ) as SlamaltmanRawFixture;
    raw.combatant_info_events = raw.combatant_info_events.map((ev) => ({
      ...ev,
      talents: [{ id: 9 }, { id: 9 }, { id: 43 }],
    }));
    const data = slamaltmanOfflineRecordings(raw);
    const fights = data.fights.get(characterFightKey(SLAMALTMAN_REF, "ret"));
    const gear = data.gear.get(fightGearKey(fights![0]!));
    expect(gear?.talentPointsByTree).toEqual([9, 9, 43]);
  });

  it("carries the actor's class through the seam, since classifySpec needs it", () => {
    // carry-forward 61: talent plurality alone cannot name a spec — 45 points
    // in tree 2 is ret on a paladin and something else entirely elsewhere.
    // WCL's actors[].subType is class-level only (phase0-findings.md), which
    // is exactly what classifySpec wants.
    const raw = JSON.parse(
      readFileSync(join(root, "test/fixtures/slamaltman.raw.json"), "utf8")
    ) as SlamaltmanRawFixture;
    const data = slamaltmanOfflineRecordings(raw);
    const fights = data.fights.get(characterFightKey(SLAMALTMAN_REF, "ret"));
    const gear = data.gear.get(fightGearKey(fights![0]!));
    expect(gear?.className).toBe("Paladin");
  });
});
