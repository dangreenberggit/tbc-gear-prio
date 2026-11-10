/**
 * The page's default shadow priest, simmed by the real pinned wowsimcli, prices
 * spell hit only up to its Shadow cap (ticket 831). The request is the
 * page's defaults (`ui/specs/priest/dps/presets.ts`: Troll, the standard
 * talents, the P1 gear set, the default APL) on the ret P2 skeleton's raid
 * and encounter. The damage by school comes from the sim's own action
 * metrics through the fork's `spellDamageBySchool`, as the tab's runner reads
 * it. Skips when the fork or the binary is absent (`vendor/` is gitignored).
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  forkPresent,
  forkRoot,
  importForkUpgrades,
} from "./fork-engine-harness.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const lock = JSON.parse(
  readFileSync(join(root, "data/wowsims.lock.json"), "utf8")
) as { tag: string };
const platform = process.platform.startsWith("win") ? "win32-x64" : "linux-x64";
const binaryPath = join(
  root,
  "vendor",
  `wowsimcli-${lock.tag}-${platform}`,
  platform === "win32-x64" ? "wowsimcli-windows.exe" : "wowsimcli"
);

/** Damage by the sim's `SpellSchool` bit, the fork's `SpellDamageBySchool`. */
type SpellDamageBySchool = Readonly<Record<number, number>>;

type Action = {
  isMelee?: boolean;
  spellSchool?: number;
  targets?: Array<{ damage?: number }>;
};
type SimMod = {
  spellDamageBySchool: (
    actions: ReadonlyArray<{
      isMelee: boolean;
      spellSchool: number;
      targets: ReadonlyArray<{ damage: number }>;
    }>
  ) => SpellDamageBySchool;
};
type CapMod = {
  capProfileFor: (spec: string) => unknown;
  hitCapBudgetFrom: (
    profile: unknown,
    request: unknown,
    pseudoStats: readonly number[],
    spellDamageBySchool?: SpellDamageBySchool
  ) => { groups?: Array<{ offset: number; share: number }> } | undefined;
};

const SHADOW = 32;
const ARCANE = 64;
const SPELL_HIT_RATING_PER_PERCENT = 12.615385;

/** The page's default shadow priest as a raid sim request, with `race`. */
function defaultShadowPriest(race: string): Record<string, unknown> {
  const skeleton = JSON.parse(
    readFileSync(
      join(root, "data/presets/ret/p2.raid-sim-skeleton.json"),
      "utf8"
    )
  ) as {
    raid: { parties: Array<{ players: Array<Record<string, unknown>> }> };
    requestId?: string;
    simOptions?: unknown;
  };
  const priest = join(forkRoot, "ui/specs/priest/dps");
  const player = skeleton.raid.parties[0]!.players[0]!;
  delete player.retributionPaladin;
  Object.assign(player, {
    race,
    class: "ClassPriest",
    talentsString: "500230013--503250510240103051451",
    profession1: "Enchanting",
    profession2: "Tailoring",
    dpsPriest: { options: { classOptions: { preShadowform: true } } },
    equipment: JSON.parse(
      readFileSync(join(priest, "gear_sets/p1.gear.json"), "utf8")
    ) as unknown,
    rotation: JSON.parse(
      readFileSync(join(priest, "apls/default.apl.json"), "utf8")
    ) as unknown,
    consumables: {},
  });
  delete skeleton.requestId;
  skeleton.simOptions = { iterations: 50, randomSeed: "7" };
  return skeleton;
}

/** The first player's damage by school from one real sim of `request`. */
async function simmedDamage(
  request: Record<string, unknown>
): Promise<SpellDamageBySchool> {
  const dir = mkdtempSync(join(tmpdir(), "caster-hit-"));
  const infile = join(dir, "in.json");
  const outfile = join(dir, "out.json");
  writeFileSync(infile, JSON.stringify(request));
  execFileSync(binaryPath, ["sim", "--infile", infile, "--outfile", outfile], {
    stdio: "ignore",
  });
  const result = JSON.parse(readFileSync(outfile, "utf8")) as {
    raidMetrics: { parties: Array<{ players: Array<{ actions?: Action[] }> }> };
  };
  const actions = result.raidMetrics.parties[0]!.players[0]!.actions ?? [];
  const sim = await importForkUpgrades<SimMod>("engine/seams/sim-runner.ts");
  return sim.spellDamageBySchool(
    actions.map((a) => ({
      isMelee: a.isMelee ?? false,
      spellSchool: a.spellSchool ?? 0,
      targets: (a.targets ?? []).map((t) => ({ damage: t.damage ?? 0 })),
    }))
  );
}

/** A slot-13 read of 5% whose Shadow slot, 11, has Shadow Focus's 10%. */
function shadowFocusRead(): number[] {
  const pseudo = new Array<number>(25).fill(5);
  pseudo[11] = 15;
  return pseudo;
}

describe.skipIf(!forkPresent || !existsSync(binaryPath))(
  "the default shadow priest's hit, from a real sim (831)",
  () => {
    it("831-T1: the default Troll deals only Shadow damage, so its whole hit value stops at the Shadow cap", async () => {
      const request = defaultShadowPriest("RaceTroll");
      const damage = await simmedDamage(request);
      expect(Object.keys(damage)).toEqual([String(SHADOW)]);
      const cap = await importForkUpgrades<CapMod>("engine/cap-profile.ts");
      const budget = cap.hitCapBudgetFrom(
        cap.capProfileFor("shadow"),
        request,
        shadowFocusRead(),
        damage
      );
      expect(budget?.groups).toEqual([
        {
          offset: expect.closeTo(10 * SPELL_HIT_RATING_PER_PERCENT, 6),
          share: 1,
        },
      ]);
    }, 120_000);

    it("831-T2: a Night Elf also casts Starshards, so hit past the Shadow cap keeps Starshards' share", async () => {
      const damage = await simmedDamage(defaultShadowPriest("RaceNightElf"));
      expect(Object.keys(damage).sort()).toEqual(
        [String(SHADOW), String(ARCANE)].sort()
      );
      const share = damage[ARCANE]! / (damage[ARCANE]! + damage[SHADOW]!);
      expect(share).toBeGreaterThan(0);
      expect(share).toBeLessThan(0.2);
    }, 120_000);
  }
);
