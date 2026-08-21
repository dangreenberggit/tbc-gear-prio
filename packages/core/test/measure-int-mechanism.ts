/**
 * PROVENANCE DISCLAIMER — read before trusting any number this produces.
 *
 * Written during the 2026-08-20 session on ticket 241. In that session the
 * orchestrating agent stated at least five facts that were false, three of
 * them by relaying a subagent's claim without checking it, two by reading
 * part of an artifact and asserting a conclusion about the rest. Two plan
 * reviews were fed those false inputs, so the reviews that vetted this
 * script's design are themselves suspect.
 *
 * This file is committed for its MECHANICS, not its CONCLUSIONS:
 *
 *   - the two output-parsing traps documented below, which silently return
 *     zero rather than erroring, and
 *   - the ablation harness (clone the request, drop one priority entry,
 *     re-measure), which is reusable.
 *
 * Every headline number this prints is UNCONFIRMED. Re-derive before citing.
 * See `.scratch/carry-forward/issues/241-*.md` for the failure record.
 */

/**
 * Why does a cat druid spend mana? — the int-mechanism diagnosis.
 *
 * Adding 25 intellect through `bonusStats` to the committed feral-P3 baseline
 * is worth roughly +29 DPS at 180s. For a druid in cat form that should be
 * close to zero: the engine routes Intellect only to SpellCritPercent and to
 * Mana, and cat attacks are physical. This script measures where the mana
 * goes.
 *
 * **The discriminator this script is built around.** The owner's proposed
 * mechanism is: extra int buys one extra powershift, a powershift is a FIXED
 * burst of energy, so it is a fixed chunk of damage. A fixed numerator over a
 * longer fight must yield a FALLING DPS contribution. The measured slope
 * RISES with duration (+27.40 at 180s, +32.10 at 600s). Those cannot both
 * hold. So the measurement that settles it is shift count as a function of
 * BOTH duration and intellect: if int buys proportionally more shifts in a
 * longer fight, the contribution is not a fixed burst and the owner's
 * mechanism needs amending.
 *
 * **What this script does NOT measure, deliberately.** Shift *frequency* is
 * the suboptimal-versus-optimal axis, which the owner has ruled is not the
 * defect axis (brief, SCOPE CORRECTION 2026-08-20). A druid that shifts more
 * than an expert would but still values every stat correctly is not a defect.
 * The defect axis is whether the mechanism CORRUPTS STAT VALUATION. So the
 * arms below are chosen to answer "does relieving the mana constraint change
 * what gear looks good", not "does the druid shift a lot".
 *
 * **Requires the pinned binary, which is gitignored** (`vendor/`):
 *
 *   pnpm fetch:wowsimcli      # must report v0.0.101
 *
 * Run with:
 *
 *   npx tsx packages/core/test/measure-int-mechanism.ts --smoke
 *   npx tsx packages/core/test/measure-int-mechanism.ts
 *
 * `--smoke` is one short sim that proves the harness parses a result. The
 * full run is several minutes.
 */
import { captureFeralP3, equippedIds } from "./direct-sim-support.js";
import {
  castTable,
  manaOf,
  simFull,
  spellCasts,
  withBonusStat,
  withDuration,
  playerOf,
  priorityListOf,
  STAT_INTELLECT,
  STAT_MP5,
  SEED,
  type FullSimResult,
} from "./int-mechanism-support.js";
import type { RaidSimRequest } from "../src/seams/sim-runner.js";

/** Cat Form. The spell whose cast count is the shift count. */
const CAT_FORM = 768;

const SMOKE_ITERATIONS = 3_000;
const FULL_ITERATIONS = 10_000;

function fmt(n: number, digits = 2): string {
  return n.toFixed(digits);
}

function padLeft(s: string, w: number): string {
  return s.length >= w ? s : " ".repeat(w - s.length) + s;
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + " ".repeat(w - s.length);
}

/** Standard error of a difference between two independent arms. */
function seOfDelta(a: FullSimResult, b: FullSimResult): number {
  return Math.sqrt(a.se * a.se + b.se * b.se);
}

function describe(label: string, r: FullSimResult): void {
  const mana = manaOf(r.player);
  console.log(
    `${pad(label, 34)} dps=${padLeft(fmt(r.dps), 9)} SE=${padLeft(fmt(r.se), 5)}` +
      `  oom=${padLeft(fmt(r.player.secondsOomAvg ?? 0), 7)}s` +
      `  shifts=${padLeft(fmt(spellCasts(r.player, CAT_FORM, r.iterationsDone)), 7)}` +
      (mana
        ? `  manaGain=${padLeft(fmt(mana.actualGain ?? 0, 0), 12)}`
        : "  manaGain=n/a")
  );
}

async function smoke(baselineReq: RaidSimRequest): Promise<void> {
  console.log(`\n=== SMOKE (${SMOKE_ITERATIONS} iterations) ===`);
  const r = await simFull(baselineReq, { iterations: SMOKE_ITERATIONS });
  describe("baseline", r);
  console.log("\ntop actions by casts/iteration:");
  for (const row of castTable(r.player, r.iterationsDone).slice(0, 12)) {
    console.log(`  ${pad(row.key, 26)} ${padLeft(fmt(row.perIteration), 8)}`);
  }
  const mana = manaOf(r.player);
  console.log(
    `\nmana resource: events=${mana?.events} gain=${fmt(mana?.gain ?? 0, 0)} ` +
      `actualGain=${fmt(mana?.actualGain ?? 0, 0)}`
  );
}

/**
 * H4 — what is the ranker's baseline character wearing?
 *
 * Prints populated equipment slots from the request the ranker itself built.
 * The settings file ships all 17 slots empty; `compose()` is supposed to
 * overwrite them with the character's logged gear before the baseline request
 * is built. This is the runtime check of that.
 */
function reportGear(baselineReq: RaidSimRequest): number {
  console.log("\n=== STEP: H4 — baseline gear ===");
  const ids = equippedIds(baselineReq);
  const populated = ids.filter((id) => id !== undefined && id > 0).length;
  console.log(`slots in request: ${ids.length}`);
  console.log(`populated slots:  ${populated}`);
  console.log(
    `item ids: ${ids.map((id) => (id === undefined ? "-" : String(id))).join(",")}`
  );
  const player = playerOf(baselineReq);
  console.log(`bonusStats: ${JSON.stringify(player["bonusStats"] ?? {})}`);
  return populated;
}

/**
 * The duration x intellect grid — the discriminator.
 *
 * A fixed-burst mechanism predicts shifts gained from int stays constant as
 * the fight lengthens, so its DPS contribution falls. A proportional
 * mechanism predicts shifts gained scales with duration, so the contribution
 * holds or rises.
 */
async function durationGrid(
  baselineReq: RaidSimRequest,
  iterations: number
): Promise<void> {
  console.log(`\n=== STEP: duration x intellect grid (${iterations} iter) ===`);
  console.log(
    "duration  baseDPS   intDPS    delta    SE     baseShift intShift  dShift   baseOOM   intOOM"
  );
  for (const duration of [120, 180, 300, 600]) {
    const base = withDuration(baselineReq, duration);
    const withInt = withBonusStat(base, STAT_INTELLECT, 25);
    const [b, i] = await Promise.all([
      simFull(base, { iterations }),
      simFull(withInt, { iterations }),
    ]);
    const bShift = spellCasts(b.player, CAT_FORM, b.iterationsDone);
    const iShift = spellCasts(i.player, CAT_FORM, i.iterationsDone);
    console.log(
      `${padLeft(String(duration) + "s", 8)} ` +
        `${padLeft(fmt(b.dps), 9)} ${padLeft(fmt(i.dps), 9)} ` +
        `${padLeft(fmt(i.dps - b.dps), 8)} ${padLeft(fmt(seOfDelta(b, i)), 5)} ` +
        `${padLeft(fmt(bShift), 9)} ${padLeft(fmt(iShift), 9)} ` +
        `${padLeft(fmt(iShift - bShift), 8)} ` +
        `${padLeft(fmt(b.player.secondsOomAvg ?? 0), 9)} ` +
        `${padLeft(fmt(i.player.secondsOomAvg ?? 0), 9)}`
    );
  }
}

/**
 * Does relieving the mana constraint kill the int slope?
 *
 * If saturating mp5 drives the marginal int gain to within noise of zero,
 * intellect acts through mana and nothing else — which is what the engine
 * source predicts. If the slope survives, int reaches DPS by another route
 * and the engine reading is wrong.
 */
async function manaSaturation(
  baselineReq: RaidSimRequest,
  iterations: number
): Promise<void> {
  console.log(`\n=== STEP: does mana saturation kill the int slope? ===`);
  const arms: [string, RaidSimRequest][] = [
    ["baseline", baselineReq],
    ["+25 int", withBonusStat(baselineReq, STAT_INTELLECT, 25)],
    ["+2000 mp5", withBonusStat(baselineReq, STAT_MP5, 2000)],
    [
      "+2000 mp5, +25 int",
      withBonusStat(
        withBonusStat(baselineReq, STAT_MP5, 2000),
        STAT_INTELLECT,
        25
      ),
    ],
  ];
  const out: Record<string, FullSimResult> = {};
  for (const [label, req] of arms) {
    const r = await simFull(req, { iterations });
    out[label] = r;
    describe(label, r);
  }
  const dry = out["+25 int"]!.dps - out["baseline"]!.dps;
  const wet = out["+2000 mp5, +25 int"]!.dps - out["+2000 mp5"]!.dps;
  console.log(
    `\nint slope with normal mana : ${fmt(dry)} ` +
      `(SE ${fmt(seOfDelta(out["baseline"]!, out["+25 int"]!))})`
  );
  console.log(
    `int slope with mana saturated: ${fmt(wet)} ` +
      `(SE ${fmt(seOfDelta(out["+2000 mp5"]!, out["+2000 mp5, +25 int"]!))})`
  );
}

/**
 * Which priority entry is spending the mana?
 *
 * Three surgical variants on clones of the request, never on the file:
 * drop the Cat Form entry (index 11), drop the conjured-item entry (index 10,
 * `itemId 12662` — a Demonic Rune, which trades HEALTH for mana), and drop
 * the potion entry (index 9, `OtherActionPotion`). Whichever removal moves
 * shifts, out-of-mana time and the int slope is the spender.
 */
async function entryAblation(
  baselineReq: RaidSimRequest,
  iterations: number
): Promise<void> {
  console.log(`\n=== STEP: priority-entry ablation ===`);
  const variants: [string, number][] = [
    ["drop 11 castSpell(768) CatForm", 11],
    ["drop 10 castSpell(item 12662)", 10],
    ["drop 9 OtherActionPotion", 9],
  ];
  const base = await simFull(baselineReq, { iterations });
  describe("baseline", base);
  const baseInt = await simFull(
    withBonusStat(baselineReq, STAT_INTELLECT, 25),
    { iterations }
  );
  console.log(
    `  baseline int slope: ${fmt(baseInt.dps - base.dps)} (SE ${fmt(seOfDelta(base, baseInt))})`
  );

  for (const [label, index] of variants) {
    const clone = structuredClone(baselineReq);
    const list = priorityListOf(clone);
    const removed = JSON.stringify(list[index]).slice(0, 90);
    list.splice(index, 1);
    const r = await simFull(clone, { iterations });
    describe(label, r);
    console.log(`  removed: ${removed}`);
    const rInt = await simFull(withBonusStat(clone, STAT_INTELLECT, 25), {
      iterations,
    });
    console.log(
      `  int slope without it: ${fmt(rInt.dps - r.dps)} (SE ${fmt(seOfDelta(r, rInt))})`
    );
  }
}

/**
 * Stat-valuation corruption check — the axis the owner actually cares about.
 *
 * Ranks a fixed set of stat deltas at equal magnitude under normal mana and
 * again under saturated mana. If the ORDER of the physical stats changes when
 * the mana constraint is relieved, mana pressure is distorting which gear
 * looks good. If the order is stable and only the mana stats lose their
 * value, the rotation costs DPS without corrupting the ranking.
 */
async function statValuation(
  baselineReq: RaidSimRequest,
  iterations: number
): Promise<void> {
  console.log(`\n=== STEP: is stat VALUATION corrupted? ===`);
  /**
   * Stat indices from `data/proto/common.proto:170-217`.
   *
   * Verified against the enum, not guessed. An earlier pass used 8/9/10 for
   * attack power / melee hit / melee crit; those indices are unused in the
   * enum, so all three arms moved DPS by exactly 0.00 and read as a finding
   * about the sim rather than as the indexing bug they were.
   */
  const stats: [string, number, number][] = [
    ["strength +30", 0, 30],
    ["agility +30", 1, 30],
    ["intellect +30", 3, 30],
    ["spirit +30", 16, 30],
    ["attack power +60", 17, 60],
    ["melee hit rating +30", 20, 30],
    ["melee crit rating +30", 21, 30],
    ["mp5 +30", 35, 30],
  ];
  for (const [label, saturate] of [
    ["normal mana", 0],
    ["mana saturated", 2000],
  ] as [string, number][]) {
    const root =
      saturate > 0
        ? withBonusStat(baselineReq, STAT_MP5, saturate)
        : baselineReq;
    const base = await simFull(root, { iterations });
    console.log(
      `\n-- ${label} -- base dps ${fmt(base.dps)} SE ${fmt(base.se)}`
    );
    const rows = await Promise.all(
      stats.map(async ([statLabel, index, value]) => {
        const r = await simFull(withBonusStat(root, index, value), {
          iterations,
        });
        return {
          label: statLabel,
          delta: r.dps - base.dps,
          se: seOfDelta(base, r),
        };
      })
    );
    rows.sort((a, b) => b.delta - a.delta);
    for (const row of rows) {
      console.log(
        `  ${pad(row.label, 24)} ${padLeft(fmt(row.delta), 8)}  SE ${fmt(row.se)}`
      );
    }
  }
}

async function main(): Promise<void> {
  const smokeOnly = process.argv.includes("--smoke");
  const cap = await captureFeralP3();
  const baselineReq = cap.baselineReq;

  if (smokeOnly) {
    reportGear(baselineReq);
    await smoke(baselineReq);
    return;
  }

  reportGear(baselineReq);
  await durationGrid(baselineReq, FULL_ITERATIONS);
  await manaSaturation(baselineReq, FULL_ITERATIONS);
  await entryAblation(baselineReq, FULL_ITERATIONS);
  await statValuation(baselineReq, FULL_ITERATIONS);
  console.log(`\nseed=${SEED}, durationVariation pinned to 0 in the grid.`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
