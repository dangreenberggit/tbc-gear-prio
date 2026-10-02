/**
 * Set potential on the recorded Upgrades-tab fixtures (ticket 502).
 *
 * fork-set-net checks the credit rule on a controlled additive sim. This suite
 * checks the shipped fork `view.ts` against every row of the five recorded
 * fixtures, so a wrong figure on a row no render captured, or one below the
 * popover's 0.1 DPS resolution, still fails. The reference walk below is
 * written from the rule's statement (design.md §1 of the 502 stage, ADR-0034),
 * not from `view.ts`. A step ranking (ticket 511: rows carry
 * `setContext.stepRanking`) is checked against `referenceStep`, written from
 * plan 511-512-set-credit's rule for one row, instead.
 *
 * `TAB_FIXTURE_DIR` points the suite at another folder with the same file
 * names, such as uncommitted stage recordings; the default is the committed
 * `data/tab-fixtures`. Skips when the fork clone is absent (`vendor/` is
 * gitignored), like the other fork-gated suites.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { forkPresent, importForkUpgrades } from "./fork-engine-harness.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const fixtureDir =
  process.env.TAB_FIXTURE_DIR ?? join(root, "data/tab-fixtures");

type Break = {
  setId: number;
  setName: string;
  threshold: number;
  dps?: number;
};
type Piece = { itemId: number; name: string; dps?: number };
type Future = {
  threshold: number;
  piecesNeeded: number;
  dps?: number;
  breaks?: Break[];
  pieces?: Piece[];
  sameGearDps?: number;
  sameGearSe?: number;
  belowGate?: true;
  stepGearDps?: number;
  partnerUnmeasured?: string;
};
type SetContext = {
  setId: number;
  setName: string;
  piecesWornBefore: number;
  piecesAfterSwap: number;
  crossesThreshold: boolean;
  stepRanking?: true;
  singleDeltaDps?: number;
  singleBreaks?: Break[];
  futureBonuses?: Future[];
  commitBreaks?: Break[];
};
type Row = {
  itemId: number;
  name: string;
  deltaDps: number;
  seMethod: string;
  bisTags: string[];
  owned?: boolean;
  setContext?: SetContext;
};
type SetBonus = {
  setId: number;
  threshold: number;
  packageItemIds: number[];
  packageDeltaDps: number;
  unmeasured?: string;
  selfConfound?: { threshold: number; dps?: number };
};
type Cutoff = { absDps: number; pct: number };
type Ranking = {
  cutoff: Cutoff;
  baseline: { dps: number };
  items: Row[];
  setBonuses?: SetBonus[];
};

type Term =
  | { kind: "bonus" | "piece" | "break"; dps: number }
  | { kind: "stop"; threshold: number; totalDps: number; isStop: boolean };
type ViewMod = {
  applyView: (
    r: Ranking,
    v: {
      hideOwned?: boolean;
      withSetPotential?: boolean;
      setCredit?: "full" | "split";
    }
  ) => { rows: Row[]; shortlist: Row[] };
  rankableSetPotential: (
    item: { setContext?: SetContext },
    noiseFloorDps: number,
    setCredit?: "full" | "split"
  ) => number;
  setCreditUnmeasured: (ctx: SetContext | undefined) => boolean;
  setPotentialTerms: (
    ctx: SetContext | undefined,
    noiseFloorDps: number
  ) => { credit: number; stopThreshold: number; terms: Term[] };
};
type CutoffMod = { setBonusNoiseFloorDps: (cutoff: Cutoff) => number };

function load(name: string): Ranking {
  const file = JSON.parse(
    readFileSync(join(fixtureDir, `${name}.json`), "utf8")
  ) as { ranking: Ranking };
  return file.ranking;
}

/**
 * R1 as the owner approved it: walk the futures in threshold order; each step
 * adds its floored bonus, the own stats of each path piece not yet counted,
 * and minus each path break not yet charged at its measured value. Only a step
 * whose floored bonus is above 0 can be the stop; the credit is the largest
 * running total at such a step, or 0. Any unmeasured figure gives 0.
 */
function referenceR1(
  ctx: SetContext | undefined,
  floor: number
): { credit: number; stop: number } {
  const futures = [...(ctx?.futureBonuses ?? [])].sort(
    (a, b) => a.threshold - b.threshold
  );
  if (futures.length === 0) return { credit: 0, stop: 0 };
  const unmeasured =
    futures.some(
      (f) =>
        f.dps === undefined ||
        (f.breaks ?? []).some((b) => b.dps === undefined) ||
        (f.pieces ?? []).some((p) => p.dps === undefined)
    ) || (ctx?.commitBreaks ?? []).some((b) => b.dps === undefined);
  if (unmeasured) return { credit: 0, stop: 0 };
  const counted = new Set<number>();
  const charged = new Set<string>();
  let running = 0;
  let best = { credit: 0, stop: 0 };
  for (const f of futures) {
    const bonus = f.dps! > floor ? f.dps! : 0;
    running += bonus;
    for (const p of f.pieces ?? []) {
      if (counted.has(p.itemId)) continue;
      counted.add(p.itemId);
      running += p.dps!;
    }
    for (const b of f.breaks ?? []) {
      const key = `${b.setId}:${b.threshold}`;
      if (charged.has(key)) continue;
      charged.add(key);
      running -= b.dps!;
    }
    if (bonus > 0 && running > best.credit)
      best = { credit: running, stop: f.threshold };
  }
  return best;
}

/**
 * The step rule for one row (ticket 511), from the plan's statement: a
 * future is eligible when its same-gear value clears the gate,
 * B' > max(floor, 2·se). The row is unmeasured, and credited 0, exactly when
 * a future lacks its same-gear value and is not below the gate, or an
 * eligible future lacks its step gear's sim or its partner choice. Otherwise
 * walk the eligible futures in count order with c = stepGearDps − d_r; the
 * stop is a future whose c is strictly greater than the best so far, which
 * starts at 0, and the credit is the best c.
 */
function referenceStep(
  ctx: SetContext,
  floor: number
): { credit: number; stop: number; stopTotal: number } {
  const none = { credit: 0, stop: 0, stopTotal: 0 };
  const futures = [...(ctx.futureBonuses ?? [])].sort(
    (a, b) => a.threshold - b.threshold
  );
  const eligible = (f: Future) =>
    !f.belowGate &&
    f.sameGearDps !== undefined &&
    f.sameGearDps > Math.max(floor, 2 * (f.sameGearSe ?? 0));
  const unmeasured = futures.some(
    (f) =>
      (f.sameGearDps === undefined && !f.belowGate) ||
      (eligible(f) &&
        (f.stepGearDps === undefined || f.partnerUnmeasured !== undefined))
  );
  if (unmeasured || ctx.singleDeltaDps === undefined) return none;
  let best = none;
  for (const f of futures.filter(eligible)) {
    const c = f.stepGearDps! - ctx.singleDeltaDps;
    if (c > best.credit)
      best = { credit: c, stop: f.threshold, stopTotal: f.stepGearDps! };
  }
  return best;
}

/**
 * A piece's own stats from its ranked row: its single delta, plus the worn
 * bonuses it breaks alone (inside that delta already), minus the bonus it
 * crosses alone at worn 1 (the 4pc `selfConfound`, ticket 492).
 */
function ownFromRow(row: Row, setBonuses: SetBonus[]): number | undefined {
  const ctx = row.setContext;
  let own = row.deltaDps;
  for (const b of ctx?.singleBreaks ?? []) {
    if (b.dps === undefined) return undefined;
    own += b.dps;
  }
  if (ctx?.crossesThreshold) {
    const confound = setBonuses.find(
      (b) =>
        b.setId === ctx.setId &&
        b.selfConfound !== undefined &&
        b.selfConfound.threshold > ctx.piecesWornBefore &&
        b.selfConfound.threshold <= ctx.piecesAfterSwap
    )?.selfConfound?.dps;
    if (confound === undefined) return undefined;
    own -= confound;
  }
  return own;
}

// ON top 16 of the tab's view, from the ticket 502 stage recordings (a stage
// tool's independent R1 walk over each file, printed at 4 decimals). The
// ret-p3-p2 entry was re-derived on the ticket 511 re-record (a stage tool's
// independent step-rule walk) and did not change: no ret row gets Set
// potential, because no ret bonus clears its same-gear gate and the screen
// drops Justicar.
const PINNED_ON_TOP16: Record<string, Array<[string, number]>> = {
  "feral-p3-nordrassil4": [
    ["Thunderheart Gauntlets", 179.1494],
    ["Thunderheart Chestguard", 179.1494],
    ["Thunderheart Leggings", 179.1494],
    ["Thunderheart Pauldrons", 179.1494],
    ["Vengeful Gladiator's Staff", 44.0914],
    ["Everbloom Idol", 38.2041],
    ["Breastplate of Malorne", 30.37],
    ["Gauntlets of Malorne", 30.37],
    ["Mantle of Malorne", 28.5432],
    ["Band of the Eternal Champion", 19.3488],
    ["Shadowmaster's Boots", 15.3138],
    ["Idol of the White Stag", 14.4712],
    ["Vindicator's Dragonhide Bracers", 12.5265],
    ["Greaves of Malorne", 11.89],
    ["Band of Eternity", 10.509],
    ["Unstoppable Aggressor's Ring", 8.7524],
  ],
  "ret-p3-p2": [
    ["Torch of the Damned", 45.7454],
    ["Cataclysm's Edge", 28.5611],
    ["Cursed Vision of Sargeras", 20.5819],
    ["Vengeful Gladiator's Greatsword", 17.0528],
    ["Bulwark of the Ancient Kings", 16.2207],
    ["Band of Devastation", 13.6834],
    ["Shadowmaster's Boots", 13.5273],
    ["Unstoppable Aggressor's Ring", 10.197],
    ["Bindings of Lightning Reflexes", 9.0242],
    ["Dreadboots of the Legion", 8.5774],
    ["Leggings of Divine Retribution", 7.7201],
    ["Band of the Eternal Champion", 7.0178],
    ["Bow-stitched Leggings", 5.8536],
    ["Swiftsteel Bracers", 5.257],
    ["Twinblade of the Phoenix", 4.1674],
    ["Lightbringer Breastplate", 3.948],
  ],
};

// Identity rows are counted on rankings without the step rule only. A step
// ranking (feral-p3-p2bis since the ticket 511 re-record) checks its credited
// rows against their stop gear's sim in check 4s instead.
const FIXTURES: Array<{ name: string; identityRows: number }> = [
  { name: "feral-p3-nordrassil4", identityRows: 6 },
  { name: "feral-p3-p2bis", identityRows: 0 },
  { name: "feral-p3-th-hands-legs", identityRows: 4 },
  { name: "feral-p2-malorne4", identityRows: 0 },
  { name: "ret-p3-p2", identityRows: 0 },
];

describe.skipIf(!forkPresent)("set potential on tab fixtures (502)", () => {
  for (const { name, identityRows } of FIXTURES) {
    it(name, async () => {
      const view = await importForkUpgrades<ViewMod>("engine/view.ts");
      const { setBonusNoiseFloorDps } =
        await importForkUpgrades<CutoffMod>("engine/cutoff.ts");
      const ranking = load(name);
      const floor = setBonusNoiseFloorDps(ranking.cutoff);
      const setBonuses = ranking.setBonuses ?? [];
      const byId = new Map(ranking.items.map((r) => [r.itemId, r]));

      let identities = 0;
      for (const row of ranking.items) {
        const ctx = row.setContext;
        const where = `${name} row ${row.itemId} ${row.name}`;

        if (ctx?.stepRanking) {
          // 3s. the shipped credit equals the step rule's reference walk
          const ref = referenceStep(ctx, floor);
          const credit = view.rankableSetPotential(row, floor, "full");
          expect(Math.abs(credit - ref.credit), `${where} credit`).toBeLessThan(
            1e-9
          );
          // 4s. a credited row that replication did not rewrite shows the sim
          // of its stop gear
          if (ref.stop !== 0 && row.seMethod !== "paired-replicate") {
            expect(
              Math.abs(row.deltaDps + credit - ref.stopTotal),
              `${where} stop gear`
            ).toBeLessThanOrEqual(1e-6);
          }
          continue;
        }

        for (const f of ctx?.futureBonuses ?? []) {
          // 1. every measured future has a path, and every piece a figure
          if (f.dps !== undefined)
            expect(f.pieces, `${where} ${f.threshold}pc pieces`).toBeDefined();
          for (const p of f.pieces ?? []) {
            expect(p.dps, `${where} piece ${p.itemId}`).toBeDefined();
            // 2. the engine's own stats match the piece's ranked row
            const pieceRow = byId.get(p.itemId);
            expect(pieceRow, `${where} piece ${p.itemId} row`).toBeDefined();
            if (pieceRow!.seMethod === "paired-replicate") continue;
            const own = ownFromRow(pieceRow!, setBonuses);
            expect(own, `${where} piece ${p.itemId} own`).toBeDefined();
            expect(
              Math.abs(p.dps! - own!),
              `${where} piece ${p.itemId} own`
            ).toBeLessThanOrEqual(1e-6);
          }
        }

        // 3. the shipped credit equals the reference walk, and the popover
        // terms add up to it
        const ref = referenceR1(ctx, floor);
        const credit = view.rankableSetPotential(row, floor, "full");
        expect(Math.abs(credit - ref.credit), `${where} credit`).toBeLessThan(
          1e-9
        );
        if (
          (ctx?.futureBonuses ?? []).length > 0 &&
          !view.setCreditUnmeasured(ctx)
        ) {
          const { terms } = view.setPotentialTerms(ctx, floor);
          const sum = terms.reduce((s, t) => s + ("dps" in t ? t.dps : 0), 0);
          expect(Math.abs(sum - credit), `${where} terms`).toBeLessThan(1e-9);
        }

        // 4. a row whose stop path is a measured package shows its delta
        if (ref.stop === 0 || !ctx) continue;
        const pkg = setBonuses.find(
          (b) =>
            b.setId === ctx.setId &&
            b.threshold === ref.stop &&
            b.unmeasured === undefined &&
            b.packageItemIds.includes(row.itemId)
        );
        if (!pkg) continue;
        identities += 1;
        if (row.seMethod === "paired-replicate") continue;
        expect(
          Math.abs(row.deltaDps + credit - pkg.packageDeltaDps),
          `${where} identity`
        ).toBeLessThanOrEqual(1e-6);
      }
      expect(identities, `${name} identity rows`).toBe(identityRows);

      // 5. the tab's ON order, and OFF sorted by deltaDps alone
      const pinned = PINNED_ON_TOP16[name];
      if (pinned) {
        const on = view.applyView(ranking, {
          hideOwned: false,
          withSetPotential: true,
          setCredit: "full",
        });
        const got = on.shortlist
          .slice(0, 16)
          .map(
            (r) =>
              [
                r.name,
                r.deltaDps + view.rankableSetPotential(r, floor, "full"),
              ] as const
          );
        expect(got.map((g) => g[0])).toEqual(pinned.map((p) => p[0]));
        got.forEach((g, i) =>
          expect(
            Math.abs(g[1] - pinned[i]![1]),
            `${name} ON ${g[0]}`
          ).toBeLessThanOrEqual(0.005)
        );
      }
      const off = view.applyView(ranking, {
        hideOwned: false,
        withSetPotential: false,
        setCredit: "full",
      });
      const byDelta = [...ranking.items].sort(
        (a, b) =>
          b.deltaDps - a.deltaDps ||
          b.bisTags.length - a.bisTags.length ||
          a.itemId - b.itemId
      );
      expect(off.rows.map((r) => r.itemId)).toEqual(
        byDelta.map((r) => r.itemId)
      );
    });
  }
});
