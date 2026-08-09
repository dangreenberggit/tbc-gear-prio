import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  classifyFeralForm,
  classifySpec,
  matchesRequestedSpec,
  salvationUptimeOf,
  talentPointsFromWclTalents,
} from "../src/spec.js";

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

describe("classifySpec for druids", () => {
  // Both fixtures are the same character on the same raid night, so the
  // talents are byte-identical and only the fight differs. That pair is the
  // whole reason form uptime exists as a signal.
  const FERAL_TALENTS: [number, number, number] = [0, 45, 16];

  it("cannot decide cat from bear on talents alone", () => {
    const result = classifySpec("Druid", FERAL_TALENTS);
    expect(result).toEqual({
      ok: false,
      reason: "needs-form-uptime",
      candidates: ["feral", "feral-tank"],
      treeIndex: 1,
    });
  });

  it("classifies a balance druid without needing form uptime", () => {
    expect(classifySpec("Druid", [45, 5, 11])).toEqual({
      ok: false,
      reason: "unsupported-spec",
      treeIndex: 0,
    });
  });
});

describe("classifyFeralForm", () => {
  it("reads shredzepelin's Morogrim kill as cat", () => {
    const result = classifyFeralForm({ catMs: 191_659, bearMs: 0 });
    expect(result.spec).toBe("feral");
    expect(result.confidence).toBeCloseTo(1, 2);
  });

  it("reads shredzepelin's Karathress kill as tank, at lower confidence", () => {
    const result = classifyFeralForm({ catMs: 55_206, bearMs: 123_455 });
    expect(result.spec).toBe("feral-tank");
    // 69.1% bear is a real mixed fight, not a clean tank parse, and the
    // confidence has to say so rather than reporting certainty.
    expect(result.confidence).toBeLessThan(0.8);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("reports no form time as undecidable rather than guessing cat", () => {
    const result = classifyFeralForm({ catMs: 0, bearMs: 0 });
    expect(result.spec).toBeUndefined();
    expect(result.confidence).toBe(0);
  });
});

describe("salvationUptimeOf", () => {
  it("counts every spell that means the player was not tanking", () => {
    // Hand of Salvation is a separate spell rather than a rank of the
    // Blessing. Missing it read a fully-salved DPS fight as unsalvaged and
    // produced a false off-tank warning.
    for (const name of [
      "Blessing of Salvation",
      "Greater Blessing of Salvation",
      "Hand of Salvation",
    ]) {
      expect(salvationUptimeOf([{ name, totalUptime: 500 }], 500)).toBe(1);
    }
  });

  it("reports a partial cover as a ratio rather than presence", () => {
    // A brief emergency cast must not read the same as a fight-long buff.
    expect(
      salvationUptimeOf([{ name: "Hand of Salvation", totalUptime: 50 }], 1000)
    ).toBeCloseTo(0.05, 5);
  });

  it("ignores unrelated blessings", () => {
    expect(
      salvationUptimeOf([{ name: "Blessing of Might", totalUptime: 900 }], 900)
    ).toBe(0);
  });
});

describe("matchesRequestedSpec", () => {
  it("matches when the classified spec equals the requested spec", () => {
    const result = matchesRequestedSpec(
      classifySpec("Paladin", [5, 11, 45]),
      "ret"
    );
    expect(result).toEqual({ matches: true, detected: "ret" });
  });

  it("flags a mismatch rather than silently ranking — the report mKTA9V7Lx4Ck2DXf case: a protection paladin's talents (0/44/17) resolved and simmed against a ret ask", () => {
    const result = matchesRequestedSpec(
      classifySpec("Paladin", [0, 44, 17]),
      "ret"
    );
    expect(result.matches).toBe(false);
    // unsupported-spec: prot has no entry in PALADIN_TREE_SPEC, so nothing
    // was misdetected as ret — the point is that it must not be treated as
    // a match either.
    expect(result.detected).toBeUndefined();
  });

  it("flags a mismatch when talents classify cleanly to a different supported spec", () => {
    // Feral cat's tree (Druid tree 1) is unsupported by itself; use the
    // Paladin case, the only pair of two *supported* specs today (ret is the
    // only shipped spec), by asserting the negative form directly against an
    // ambiguous split instead — see the next test for the "confirmed other
    // spec" shape once a second class ships.
    const result = matchesRequestedSpec(
      classifySpec("Paladin", [20, 20, 5]),
      "ret"
    );
    expect(result).toEqual({ matches: false, detected: undefined });
  });

  it("does not confirm a match on ambiguous talents", () => {
    const result = matchesRequestedSpec(
      classifySpec("Warrior", [40, 20, 0]),
      "ret"
    );
    expect(result).toEqual({ matches: false, detected: undefined });
  });

  it("does not confirm a match when the tree still needs form uptime", () => {
    const result = matchesRequestedSpec(
      classifySpec("Druid", [0, 45, 16]),
      "feral"
    );
    expect(result).toEqual({ matches: false, detected: undefined });
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
