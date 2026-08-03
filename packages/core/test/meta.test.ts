import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getItem } from "../src/items.js";
import { gemColorCounts, isMetaConditionMet, metaStatus } from "../src/meta.js";

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
