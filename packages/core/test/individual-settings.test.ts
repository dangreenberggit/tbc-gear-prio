import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fromJson } from "@bufbuild/protobuf";
import {
  CURRENT_API_VERSION,
  toIndividualSimSettings,
} from "../src/individual-settings.js";
import { RaidSimRequestSchema } from "../src/proto/api_pb.js";
import type { RaidSimRequest } from "../src/proto/api_pb.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function loadJson(rel: string): unknown {
  return JSON.parse(readFileSync(join(root, rel), "utf8"));
}

function retSkeleton(): RaidSimRequest {
  return fromJson(
    RaidSimRequestSchema,
    loadJson("data/presets/ret/p2.raid-sim-skeleton.json") as never
  );
}

describe("CURRENT_API_VERSION", () => {
  it("matches the apiVersion the committed preset carries", () => {
    const preset = loadJson(
      "data/presets/ret/p2.individual-sim-settings.json"
    ) as { apiVersion: number };
    expect(CURRENT_API_VERSION).toBe(preset.apiVersion);
  });

  it("is not the proto default, which would trigger wowsims' migrations", () => {
    expect(CURRENT_API_VERSION).toBeGreaterThan(0);
  });
});

describe("toIndividualSimSettings", () => {
  it("takes the player from the first party of the raid", () => {
    const req = retSkeleton();
    const settings = toIndividualSimSettings(req);
    expect(settings.player).toEqual(req.raid?.parties[0]?.players[0]);
    expect(settings.player).toBeDefined();
  });

  it("carries the encounter, raid buffs, debuffs, party buffs and tanks", () => {
    const req = retSkeleton();
    const settings = toIndividualSimSettings(req);
    expect(settings.encounter).toEqual(req.encounter);
    expect(settings.raidBuffs).toEqual(req.raid?.buffs);
    expect(settings.debuffs).toEqual(req.raid?.debuffs);
    expect(settings.partyBuffs).toEqual(req.raid?.parties[0]?.buffs);
    expect(settings.tanks).toEqual(req.raid?.tanks ?? []);
  });

  it("stamps the current api version so the site does not migrate the import", () => {
    expect(toIndividualSimSettings(retSkeleton()).apiVersion).toBe(
      CURRENT_API_VERSION
    );
  });

  it("honours an explicit apiVersion override", () => {
    expect(
      toIndividualSimSettings(retSkeleton(), { apiVersion: 7 }).apiVersion
    ).toBe(7);
  });

  it("carries iterations across, the only field SimOptions and SimSettings share", () => {
    const req = retSkeleton();
    expect(settingsIterations(req)).toBe(req.simOptions?.iterations ?? 0);
  });
});

function settingsIterations(req: RaidSimRequest): number {
  return toIndividualSimSettings(req).settings?.iterations ?? -1;
}
