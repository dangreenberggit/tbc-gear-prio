import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getItem } from "../src/items.js";
import {
  gemColorCounts,
  gemColorMatchesSocket,
  isMetaConditionMet,
  metaStatus,
} from "../src/meta.js";
import { GemColor } from "../src/proto/common_pb.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function slamaltmanGemIds(): number[] {
  const raw = JSON.parse(
    readFileSync(join(root, "test/fixtures/slamaltman.raw.json"), "utf8")
  ) as {
    actors: Array<{ id: number; name: string }>;
    combatant_info_events: Array<{
      sourceID: number;
      gear: Array<{ gems?: Array<{ id?: number | null } | null> | null }>;
    }>;
  };
  const actors = new Map(raw.actors.map((a) => [a.id, a]));
  for (const ev of raw.combatant_info_events) {
    const actor = actors.get(ev.sourceID);
    if (actor?.name.toLowerCase() !== "slamaltman") continue;
    const ids: number[] = [];
    for (const slot of ev.gear) {
      for (const g of slot.gems ?? []) {
        if (g?.id) ids.push(g.id);
      }
    }
    return ids;
  }
  throw new Error("slamaltman not found");
}

describe("meta conditions", () => {
  it("activates Relentless Earthstorm Diamond at 2/2/2", () => {
    expect(isMetaConditionMet(32409, { red: 2, yellow: 2, blue: 2 })).toBe(
      true
    );
    expect(isMetaConditionMet(32409, { red: 1, yellow: 2, blue: 2 })).toBe(
      false
    );
  });

  it("handles compare-color metas (Bracing: more red than blue)", () => {
    expect(isMetaConditionMet(25897, { red: 3, yellow: 0, blue: 2 })).toBe(
      true
    );
    expect(isMetaConditionMet(25897, { red: 2, yellow: 0, blue: 2 })).toBe(
      false
    );
  });
});

describe("prismatic gems count toward all three meta colours (intentional divergence from upstream)", () => {
  // Void Sphere (22459) / Prismatic Sphere (22460) are the only two
  // Prismatic gems in TBC. Game rule: a Prismatic gem satisfies red, yellow,
  // AND blue meta-colour requirements at once — that is what "Prismatic"
  // means, not a bug to match against upstream's own `default: return 0,0,0`
  // (review-corrections.md item, overturning the previous comment's "highest-
  // confidence correctness bug" call).
  it("matches every primary socket colour, not just its own", () => {
    expect(
      gemColorMatchesSocket(GemColor.GemColorPrismatic, GemColor.GemColorRed)
    ).toBe(true);
    expect(
      gemColorMatchesSocket(GemColor.GemColorPrismatic, GemColor.GemColorYellow)
    ).toBe(true);
    expect(
      gemColorMatchesSocket(GemColor.GemColorPrismatic, GemColor.GemColorBlue)
    ).toBe(true);
    // But not the meta socket itself — only a genuine meta-colour gem seats there.
    expect(
      gemColorMatchesSocket(GemColor.GemColorPrismatic, GemColor.GemColorMeta)
    ).toBe(false);
  });

  it("credits a single Prismatic gem toward red, yellow, and blue simultaneously", () => {
    const VOID_SPHERE = 22459;
    expect(gemColorCounts([VOID_SPHERE])).toEqual({
      red: 1,
      yellow: 1,
      blue: 1,
    });
  });

  it("alone activates Relentless Earthstorm Diamond's 2/2/2 with two copies", () => {
    const VOID_SPHERE = 22459;
    const PRISMATIC_SPHERE = 22460;
    const counts = gemColorCounts([VOID_SPHERE, PRISMATIC_SPHERE]);
    expect(counts).toEqual({ red: 2, yellow: 2, blue: 2 });
    expect(isMetaConditionMet(32409, counts)).toBe(true);
  });
});

describe("slamaltman meta", () => {
  it("counts hybrid gems toward every matching primary colour", () => {
    // Measured: 4 red + 3 purple + 2 orange + 1 meta → red 9 / yellow 2 / blue 3
    expect(gemColorCounts(slamaltmanGemIds())).toEqual({
      red: 9,
      yellow: 2,
      blue: 3,
    });
  });

  it("has an active Relentless meta on Furious Gizmatic Goggles", () => {
    const head = getItem(32461);
    expect(head?.sockets[0]).toBe(1); // GemColorMeta
    const status = metaStatus(head?.sockets ?? [], slamaltmanGemIds());
    expect(status).toEqual({
      kind: "active",
      metaId: 32409,
      counts: { red: 9, yellow: 2, blue: 3 },
    });
  });
});
