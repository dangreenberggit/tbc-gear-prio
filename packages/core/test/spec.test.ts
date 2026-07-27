import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { classifySpec, talentPointsFromWclTalents } from "../src/spec.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("classifySpec", () => {
  it("classifies slamaltman's talent split (5/11/45) as ret", () => {
    const result = classifySpec("Paladin", [5, 11, 45]);
    expect(result).toEqual({ ok: true, spec: "ret", treeIndex: 2 });
  });

  it("returns unsupported-class for non-paladin classes", () => {
    const result = classifySpec("Warrior", [40, 20, 0]);
    expect(result).toEqual({ ok: false, reason: "unsupported-class" });
  });

  it("returns ambiguous when two trees tie for the top", () => {
    const result = classifySpec("Paladin", [20, 20, 5]);
    expect(result).toEqual({ ok: false, reason: "ambiguous" });
  });
});

describe("talentPointsFromWclTalents", () => {
  it("reads slamaltman's raw combatantinfo talents as points-spent per tree", () => {
    const raw = JSON.parse(
      readFileSync(join(root, "test/fixtures/slamaltman.raw.json"), "utf8")
    ) as {
      actors: Array<{ id: number; name: string }>;
      combatant_info_events: Array<{
        sourceID: number;
        talents: Array<{ id: number }>;
      }>;
    };
    const actors = new Map(raw.actors.map((a) => [a.id, a]));
    const event = raw.combatant_info_events.find(
      (ev) => actors.get(ev.sourceID)?.name.toLowerCase() === "slamaltman"
    );
    if (!event) throw new Error("slamaltman not found in fixture");

    expect(talentPointsFromWclTalents(event.talents)).toEqual([5, 11, 45]);
  });
});
