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
 * Full-result probe support for the int-mechanism diagnosis.
 *
 * `CliSimRunner` spawns the pinned binary as
 * `sim --infile req.json --outfile res.json` and then keeps only
 * `raidMetrics.dps.{avg,stdev}` and `iterationsDone`
 * (`packages/core/src/seams/cli-sim-runner.ts:36-88`). Everything the result
 * proto carries about *why* a number came out that way — per-action cast
 * counts, per-resource gain/spend, `secondsOomAvg` — is discarded at the
 * `SimObservation` boundary (`seams/sim-runner.ts:20-25`).
 *
 * This module spawns the same binary the same way and keeps the whole
 * `res.json`. It changes no seam and no committed data: the settings file is
 * read through `captureFeralP3()` and every request variant is a
 * `structuredClone` held in memory.
 *
 * **TWO METHODOLOGY TRAPS — both produce a confident zero.**
 *
 * 1. An action entry's top-level `casts` field is EMPTY in this binary's
 *    output. The real counts live in the per-target breakdown,
 *    `action.targets[].casts`. Summing the top-level field reports 0 casts
 *    for every action and looks like a real finding.
 * 2. The action's identity field is `id`, NOT `actionId`. Reading `actionId`
 *    yields `undefined` everywhere, so every filter by spell id matches
 *    nothing and reports 0 casts.
 *
 * Both traps were hit during this diagnosis and both looked like evidence
 * that the druid never shifts. Verify the shape against a real result before
 * trusting a zero:
 *   python -c "import json;d=json.load(open('.scratch/phase0-close/p2-smoke-res.json'));print(json.dumps(d['raidMetrics']['parties'][0]['players'][0]['actions'][0])[:300])"
 * Use `castsOf()` / `spellCasts()` below rather than reaching into raw JSON.
 *
 * **Requires the pinned binary, which is gitignored** (`vendor/`):
 *
 *   pnpm fetch:wowsimcli      # must report v0.0.101
 *
 * Not a vitest test — support code for `measure-int-mechanism.ts`.
 */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { binaryPath } from "./direct-sim-support.js";
import type { RaidSimRequest } from "../src/seams/sim-runner.js";

export const STAT_INTELLECT = 3;
export const STAT_MP5 = 35;
export const SEED = 42;

type Obj = Record<string, unknown>;

/** One action in the result's per-player breakdown. */
export type ActionMetrics = {
  /**
   * The action's identity. The field is `id`, NOT `actionId` — reading
   * `actionId` yields `undefined` for every entry, which silently reports
   * "unknown" actions and zero casts for every spell.
   */
  id?: { spellId?: number; itemId?: number; otherId?: string; tag?: number };
  isMelee?: boolean;
  targets?: { casts?: number; damage?: number }[];
};

export type ResourceMetrics = {
  type?: string;
  events?: number;
  gain?: number;
  actualGain?: number;
};

export type PlayerMetrics = {
  dps?: { avg?: number; stdev?: number };
  secondsOomAvg?: number;
  actions?: ActionMetrics[];
  resources?: ResourceMetrics[];
};

export type FullSimResult = {
  dps: number;
  stdev: number;
  se: number;
  iterationsDone: number;
  player: PlayerMetrics;
  raw: Obj;
  logs?: string;
};

/**
 * Sums an action's per-target cast count.
 *
 * The top-level `casts` field is empty in this binary's output; the counts are
 * per-target. See the methodology warning at the top of this file.
 */
export function castsOf(action: ActionMetrics): number {
  return (action.targets ?? []).reduce((sum, t) => sum + (t.casts ?? 0), 0);
}

/** Human-readable key for an action id, for cast tables. */
export function actionKey(action: ActionMetrics): string {
  const id = action.id ?? {};
  if (id.spellId !== undefined) return `spell:${id.spellId}`;
  if (id.itemId !== undefined) return `item:${id.itemId}`;
  if (id.otherId !== undefined) return `other:${id.otherId}`;
  return "unknown";
}

/** Casts per iteration for one spell id, summed across targets. */
export function spellCasts(
  player: PlayerMetrics,
  spellId: number,
  iterations: number
): number {
  const total = (player.actions ?? [])
    .filter((a) => a.id?.spellId === spellId)
    .reduce((sum, a) => sum + castsOf(a), 0);
  return total / iterations;
}

/** Casts per iteration keyed by action, sorted descending. */
export function castTable(
  player: PlayerMetrics,
  iterations: number
): { key: string; perIteration: number }[] {
  return (player.actions ?? [])
    .map((a) => ({ key: actionKey(a), perIteration: castsOf(a) / iterations }))
    .filter((r) => r.perIteration > 0)
    .sort((a, b) => b.perIteration - a.perIteration);
}

/** The mana resource entry, if the player has one. */
export function manaOf(player: PlayerMetrics): ResourceMetrics | undefined {
  return (player.resources ?? []).find((r) => r.type === "ResourceTypeMana");
}

function firstPlayer(raw: Obj): PlayerMetrics {
  const raid = raw["raidMetrics"] as Obj | undefined;
  const parties = raid?.["parties"] as Obj[] | undefined;
  const players = parties?.[0]?.["players"] as PlayerMetrics[] | undefined;
  const player = players?.[0];
  if (!player) throw new Error("result has no raidMetrics player");
  return player;
}

/**
 * Runs one request against the pinned binary and keeps the whole result.
 *
 * Mirrors `CliSimRunner.run`'s invocation exactly (same argv, same
 * `simOptions` injection) so what this measures is what the pipeline runs.
 */
export async function simFull(
  req: RaidSimRequest,
  opts: { iterations: number; seed?: number; debugFirstIteration?: boolean }
): Promise<FullSimResult> {
  const injected = {
    ...req,
    simOptions: {
      iterations: opts.iterations,
      randomSeed: String(opts.seed ?? SEED),
      debugFirstIteration: opts.debugFirstIteration ?? false,
    },
  } as RaidSimRequest;

  const dir = await mkdtemp(join(tmpdir(), "tbc-int-mech-"));
  const infile = join(dir, "req.json");
  const outfile = join(dir, "res.json");
  try {
    await writeFile(infile, `${JSON.stringify(injected)}\n`, "utf8");
    await runProcess(binaryPath(), [
      "sim",
      "--infile",
      infile,
      "--outfile",
      outfile,
    ]);
    const raw = JSON.parse(await readFile(outfile, "utf8")) as Obj;
    const err = raw["error"] as { type?: string } | null | undefined;
    if (err && err.type && err.type !== "ErrorOutcomeNone") {
      throw new Error(`sim error: ${JSON.stringify(err)}`);
    }
    const iterationsDone = raw["iterationsDone"] as number | undefined;
    if (iterationsDone !== opts.iterations) {
      throw new Error(
        `iterationsDone=${iterationsDone}, expected ${opts.iterations}`
      );
    }
    const player = firstPlayer(raw);
    const dps = player.dps?.avg;
    const stdev = player.dps?.stdev;
    if (typeof dps !== "number" || typeof stdev !== "number") {
      throw new Error("missing player dps avg/stdev");
    }
    const logs = raw["logs"];
    return {
      dps,
      stdev,
      se: stdev / Math.sqrt(iterationsDone),
      iterationsDone,
      player,
      raw,
      ...(typeof logs === "string" ? { logs } : {}),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function runProcess(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`timeout running ${command}`));
    }, 600_000);
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`exit ${code}: ${stderr.slice(0, 500)}`));
    });
  });
}

/** Deep-clones a request and adds one flat stat through `bonusStats`. */
export function withBonusStat(
  req: RaidSimRequest,
  statIndex: number,
  value: number
): RaidSimRequest {
  const clone = structuredClone(req);
  const player = playerOf(clone);
  const bonus = (player["bonusStats"] ??= {}) as Obj;
  const stats = ((bonus["stats"] ??= []) as number[]).slice();
  while (stats.length <= statIndex) stats.push(0);
  stats[statIndex] = (stats[statIndex] ?? 0) + value;
  bonus["stats"] = stats;
  return clone;
}

/** Deep-clones a request and sets the encounter duration, variation pinned to 0. */
export function withDuration(
  req: RaidSimRequest,
  seconds: number
): RaidSimRequest {
  const clone = structuredClone(req) as Obj;
  const enc = (clone["encounter"] as Obj | undefined) ?? {};
  enc["duration"] = seconds;
  enc["durationVariation"] = 0;
  clone["encounter"] = enc;
  return clone as RaidSimRequest;
}

export function playerOf(req: RaidSimRequest): Obj {
  const raid = req["raid"] as Obj | undefined;
  const parties = raid?.["parties"] as Obj[] | undefined;
  const players = parties?.[0]?.["players"] as Obj[] | undefined;
  const player = players?.[0];
  if (!player) throw new Error("request has no player");
  return player;
}

/** The player's APL priority list, for variant surgery on a clone. */
export function priorityListOf(req: RaidSimRequest): Obj[] {
  const rotation = playerOf(req)["rotation"] as Obj | undefined;
  const list = rotation?.["priorityList"] as Obj[] | undefined;
  if (!list) throw new Error("request has no rotation.priorityList");
  return list;
}
