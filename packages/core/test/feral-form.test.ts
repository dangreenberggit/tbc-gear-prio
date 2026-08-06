import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  classifyFeralForm,
  classifySpec,
  talentPointsFromWclTalents,
} from "../src/spec.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

type RawFixture = {
  actors: Array<{ id: number; name: string; subType: string }>;
  combatant_info_events: Array<{
    sourceID: number;
    talents: Array<{ id: number }>;
  }>;
  buffs_table: {
    data: {
      totalTime: number;
      auras: Array<{ name: string; totalUptime: number }>;
    };
  };
};

const CAT_FORMS = new Set(["Cat Form"]);
const BEAR_FORMS = new Set(["Dire Bear Form", "Bear Form"]);

function load(name: string, character: string) {
  const raw = JSON.parse(
    readFileSync(join(root, "test/fixtures", name), "utf8")
  ) as RawFixture;
  const actor = raw.actors.find(
    (a) => a.name.toLowerCase() === character.toLowerCase()
  );
  if (!actor) throw new Error(`${character} not in ${name}`);
  const event = raw.combatant_info_events.find(
    (ev) => ev.sourceID === actor.id
  );
  if (!event) throw new Error(`no combatantinfo for ${character} in ${name}`);

  let catMs = 0;
  let bearMs = 0;
  for (const aura of raw.buffs_table.data.auras) {
    if (CAT_FORMS.has(aura.name)) catMs += aura.totalUptime;
    if (BEAR_FORMS.has(aura.name)) bearMs += aura.totalUptime;
  }
  return {
    className: actor.subType,
    talents: talentPointsFromWclTalents(event.talents),
    uptime: { catMs, bearMs },
  };
}

describe("feral disambiguation on real captures", () => {
  const cat = load("shredzepelin.raw.json", "shredzepelin");
  const bear = load("shredzepelin-bear.raw.json", "shredzepelin");
  const nexess = load("nexess.raw.json", "nexess");

  it("sees identical talents on the cat and the bear night", () => {
    // The whole reason form uptime exists. If this ever fails, talents became
    // a usable signal and the second step could be dropped.
    expect(cat.talents).toEqual(bear.talents);
    expect(cat.className).toBe("Druid");
  });

  it("refuses to pick a feral spec from talents alone", () => {
    for (const fixture of [cat, bear, nexess]) {
      expect(classifySpec(fixture.className, fixture.talents)).toMatchObject({
        ok: false,
        reason: "needs-form-uptime",
        candidates: ["feral", "feral-tank"],
      });
    }
  });

  it("resolves the same character to opposite specs on different fights", () => {
    expect(classifyFeralForm(cat.uptime).spec).toBe("feral");
    expect(classifyFeralForm(bear.uptime).spec).toBe("feral-tank");
  });

  it("reports the mixed bear fight at lower confidence than the clean cat one", () => {
    const catResult = classifyFeralForm(cat.uptime);
    const bearResult = classifyFeralForm(bear.uptime);
    expect(catResult.confidence).toBeGreaterThan(0.95);
    expect(bearResult.confidence).toBeLessThan(catResult.confidence);
  });

  it("classifies nexess as cat", () => {
    const result = classifyFeralForm(nexess.uptime);
    expect(result.spec).toBe("feral");
    expect(result.confidence).toBeGreaterThan(0.9);
  });
});
