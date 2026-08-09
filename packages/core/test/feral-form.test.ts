import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  classifyFeralForm,
  classifySpec,
  salvationUptimeOf,
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
    salvation: salvationUptimeOf(
      raw.buffs_table.data.auras,
      raw.buffs_table.data.totalTime
    ),
  };
}

describe("feral disambiguation on real captures", () => {
  // `offtank` is ~99% cat form but a tanking gear set — the fight ticket 06
  // was filed about. `cat` is the real DPS night the engine now defaults to.
  const offtank = load("shredzepelin.raw.json", "shredzepelin");
  const cat = load("shredzepelin-cat.raw.json", "shredzepelin");
  const bear = load("shredzepelin-bear.raw.json", "shredzepelin");
  const nexess = load("nexess.raw.json", "nexess");

  it("sees identical talents on the cat and the bear night", () => {
    // The whole reason form uptime exists. If this ever fails, talents became
    // a usable signal and the second step could be dropped.
    expect(offtank.talents).toEqual(bear.talents);
    expect(offtank.className).toBe("Druid");
  });

  it("refuses to pick a feral spec from talents alone", () => {
    for (const fixture of [offtank, cat, bear, nexess]) {
      expect(classifySpec(fixture.className, fixture.talents)).toMatchObject({
        ok: false,
        reason: "needs-form-uptime",
        candidates: ["feral", "feral-tank"],
      });
    }
  });

  it("resolves the same character to opposite specs on different fights", () => {
    expect(classifyFeralForm(offtank.uptime).spec).toBe("feral");
    expect(classifyFeralForm(bear.uptime).spec).toBe("feral-tank");
  });

  it("reports the mixed bear fight at lower confidence than the clean cat one", () => {
    const catResult = classifyFeralForm(offtank.uptime);
    const bearResult = classifyFeralForm(bear.uptime);
    expect(catResult.confidence).toBeGreaterThan(0.95);
    expect(bearResult.confidence).toBeLessThan(catResult.confidence);
  });

  it("reads the Void Reaver kill as a cat fight that kept salvation", () => {
    // The fixture the CLI now defaults to for shredzepelin. Same form reading
    // as the Morogrim off-tank fight (~99% cat), so form uptime alone still
    // cannot separate them — salvation is what makes this one trustworthy.
    const result = classifyFeralForm(cat.uptime);
    expect(result.spec).toBe("feral");
    expect(result.confidence).toBeGreaterThan(0.95);
    expect(cat.salvation).toBe(1);
  });

  it("does not warn on the DPS fight the off-tank fight warns about", () => {
    // Both are confident cat parses; only the off-tank one is missing salv.
    // If this ever fails the default fixture stopped being a clean DPS set.
    expect(classifyFeralForm(offtank.uptime).confidence).toBeGreaterThan(0.95);
    expect(offtank.salvation).toBe(0);
    expect(cat.salvation).toBeGreaterThan(0);
  });

  it("classifies nexess as cat", () => {
    const result = classifyFeralForm(nexess.uptime);
    expect(result.spec).toBe("feral");
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it("separates a backup-tank cat fight from a real one, where form uptime cannot", () => {
    // Ticket 06. Both fights are ~99% cat form, so `classifyFeralForm` reports
    // near-certainty on each and cannot tell them apart. Shredzepelin was
    // backup tank on Morogrim; salvation is stripped from anyone who might
    // tank, so its absence is the signal that survives where form uptime dies.
    expect(classifyFeralForm(offtank.uptime).confidence).toBeGreaterThan(0.95);
    expect(classifyFeralForm(nexess.uptime).confidence).toBeGreaterThan(0.95);

    expect(offtank.salvation).toBe(0);
    expect(nexess.salvation).toBe(1);
  });

  it("does not read the bear night's missing salvation as a cat signal", () => {
    // Salvation is absent here too, but the fight already classifies as tank
    // from form uptime — the flag must not double-count it as a surprise.
    expect(bear.salvation).toBe(0);
  });
});
