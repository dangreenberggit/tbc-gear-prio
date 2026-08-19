/**
 * Direct-sim support for the ticket 226 / 227 diagnostics.
 *
 * Both tickets ask questions the committed recordings cannot answer: whether
 * a DPS gap is real (the fork's arithmetic) or an artifact of what this repo
 * sends over the wall. The recordings store only `{dps, stdev,
 * iterationsDone}` keyed by `simCacheKey` — the request bodies are not kept
 * (`fixtures/synthetic-roster-recordings.json`), so the requests have to be
 * re-captured by running the ranker and intercepting what it builds.
 *
 * The approach is therefore: wrap the recorded `SimRunner` in
 * `CapturingSimRunner` to keep every `RaidSimRequest` the ranker produced,
 * then replay chosen requests through `CliSimRunner` against the real pinned
 * binary at higher iteration counts. That keeps the comparison honest —
 * hand-built character JSON (the ticket 106 style) can differ from what
 * `rank.ts` actually sends in gems and buffs, which is precisely the thing
 * ticket 226 is trying to rule in or out.
 *
 * **Requires the pinned binary, which is gitignored.** `vendor/` is not
 * committed and CI fetches nothing, so anything calling `simDirect` needs:
 *
 *   pnpm fetch:wowsimcli
 *
 * and it must report `v0.0.101`. `binaryPath()` throws with that instruction
 * rather than failing deep inside a spawn.
 *
 * Not a vitest test — support code for the `measure-ticket-22*.ts` scripts.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CliSimRunner } from "../src/seams/cli-sim-runner.js";
import { filterPoolByPhase, poolFromUniverse } from "../src/pool.js";
import {
  rankUpgrades,
  type PartialRanking,
  type Ranking,
} from "../src/rank.js";
import { RecordedGearSource } from "../src/seams/gear-source.js";
import {
  RecordedSimRunner,
  simCacheKey,
  type RaidSimRequest,
  type SimObservation,
  type SimRunner,
  type SimRunOpts,
} from "../src/seams/sim-runner.js";
import { MemoryStore } from "../src/seams/store.js";
import {
  syntheticOfflineRecordings,
  FERAL_SYNTHETIC_REF,
  FERAL_SYNTHETIC_FIGHT,
  FERAL_P3_SYNTHETIC_ROW,
  type PresetGearFile,
} from "../src/fixtures/synthetic-offline.js";
import { loadJson, type RosterRecordingsFile } from "./racing-support.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

/** One captured call: the request the ranker built, and how it was run. */
export type CapturedCall = {
  key: string;
  req: RaidSimRequest;
  opts: SimRunOpts;
};

/**
 * Records every request passing through, then delegates.
 *
 * Keyed by `simCacheKey` so a captured request can be matched back to the
 * recording that answered it, using the same identity the recorder used.
 */
export class CapturingSimRunner implements SimRunner {
  readonly calls: CapturedCall[] = [];
  readonly byKey = new Map<string, CapturedCall>();

  constructor(
    private readonly inner: SimRunner,
    private readonly simVersion: string
  ) {}

  version(): Promise<string> {
    return this.inner.version();
  }

  async run(req: RaidSimRequest, opts: SimRunOpts): Promise<SimObservation> {
    const call = { key: simCacheKey(req, this.simVersion, opts), req, opts };
    this.calls.push(call);
    this.byKey.set(call.key, call);
    return this.inner.run(req, opts);
  }
}

/**
 * Absolute path to the pinned wowsimcli, or a thrown instruction to fetch it.
 *
 * Resolved from `data/wowsims.lock.json` the same way
 * `cli-sim-runner.test.ts` does, so the pin has one source.
 */
export function binaryPath(): string {
  const lock = loadJson<{ tag: string }>("data/wowsims.lock.json");
  const platform = process.platform.startsWith("win")
    ? "win32-x64"
    : "linux-x64";
  const binaryName =
    platform === "win32-x64" ? "wowsimcli-windows.exe" : "wowsimcli";
  const path = join(
    root,
    "vendor",
    `wowsimcli-${lock.tag}-${platform}`,
    binaryName
  );
  if (!existsSync(path)) {
    throw new Error(
      `pinned wowsimcli not found at ${path}\n` +
        `vendor/ is gitignored — fetch it with:  pnpm fetch:wowsimcli`
    );
  }
  return path;
}

/** Runs one request against the real binary at the given seed/iterations. */
export async function simDirect(
  req: RaidSimRequest,
  opts: { iterations: number; seed: number }
): Promise<SimObservation & { wallMs: number }> {
  const sim = new CliSimRunner(binaryPath(), 600_000);
  const started = Date.now();
  const obs = await sim.run(req, {
    iterations: opts.iterations,
    seed: opts.seed,
  });
  return { ...obs, wallMs: Date.now() - started };
}

export type FeralP3Capture = {
  ranking: Ranking | PartialRanking;
  recorded: RosterRecordingsFile["rows"][string];
  /** Every request the ranker issued, keyed by `simCacheKey`. */
  byKey: Map<string, CapturedCall>;
  calls: CapturedCall[];
  /** The unmodified worn-gear request — the baseline every delta is against. */
  baselineReq: RaidSimRequest;
  /** Candidate item id → the request that swapped it in, at full iterations. */
  requestByItemId: Map<number, RaidSimRequest>;
};

/**
 * Replays the feral P3 full sweep offline and keeps every request built.
 *
 * `fullPool: true` so every eligible candidate is simmed and therefore
 * captured; racing would only build requests for the promoted subset.
 */
export async function captureFeralP3(): Promise<FeralP3Capture> {
  const recordingsFile = loadJson<RosterRecordingsFile>(
    "packages/core/test/fixtures/synthetic-roster-recordings.json"
  );
  const recorded = recordingsFile.rows["feral-p3"]!;

  const epWeights = loadJson<{ weights: Record<string, number> }>(
    "data/presets/feral/p1.ep-weights.json"
  ).weights;
  const skeleton = loadJson<RaidSimRequest>(
    "data/presets/feral/p2.raid-sim-skeleton.json"
  );
  const presetGear = loadJson<PresetGearFile>(
    "vendor/wowsims/feral_preraid.gear.json"
  );
  const maxPhase = FERAL_P3_SYNTHETIC_ROW.maxPhase;
  const pool = filterPoolByPhase(
    poolFromUniverse(
      loadJson<Parameters<typeof poolFromUniverse>[0]>(
        "data/universes/feral-p3.json"
      )
    ),
    maxPhase
  );

  const inner = new RecordedSimRunner(
    recorded.simVersion,
    new Map(Object.entries(recorded.recordings))
  );
  const sim = new CapturingSimRunner(inner, recorded.simVersion);

  const ranking = await rankUpgrades(
    {
      character: FERAL_SYNTHETIC_REF,
      spec: "feral" as const,
      maxPhase,
      iterations: recorded.iterations,
      seeds: [recorded.seed],
      race: "RaceTauren" as const,
      fullPool: true,
    },
    {
      gear: new RecordedGearSource(
        syntheticOfflineRecordings({
          ref: FERAL_SYNTHETIC_REF,
          spec: "feral",
          presetGear,
          fight: FERAL_SYNTHETIC_FIGHT,
        })
      ),
      sim: sim as never,
      store: new MemoryStore(),
      clock: () => new Date("2026-08-15T12:00:00.000Z"),
      raidSimSkeleton: skeleton,
      epWeights,
      pool,
    }
  );

  return {
    ranking,
    recorded,
    byKey: sim.byKey,
    calls: sim.calls,
    baselineReq: findBaselineRequest(sim.calls),
    requestByItemId: indexByCandidateItem(sim.calls),
  };
}

/**
 * The baseline is the one request whose equipment matches the worn set.
 *
 * Identified positionally rather than by content: `rank.ts` sims the
 * unmodified worn gear first, before any candidate swap, so the first
 * captured call at full iterations is the baseline.
 */
function findBaselineRequest(calls: readonly CapturedCall[]): RaidSimRequest {
  const first = calls[0];
  if (!first) throw new Error("no sim calls captured");
  return first.req;
}

/** Item ids in a request's equipment, by slot index. */
export function equippedIds(req: RaidSimRequest): (number | undefined)[] {
  const items = equipmentOf(req).items ?? [];
  return items.map((it) => it["id"] as number | undefined);
}

type Obj = Record<string, unknown>;

export function equipmentOf(req: RaidSimRequest): {
  items?: Obj[];
} {
  const raid = req["raid"] as Obj | undefined;
  const parties = raid?.["parties"] as Obj[] | undefined;
  const players = parties?.[0]?.["players"] as Obj[] | undefined;
  const equipment = players?.[0]?.["equipment"] as
    { items?: Obj[] } | undefined;
  if (!equipment) throw new Error("request has no player equipment");
  return equipment;
}

/**
 * Maps each candidate item id to the request that swapped it in.
 *
 * A swap request differs from the baseline in exactly the slot it fills, so
 * the candidate is the id present here and absent from the baseline. Ids that
 * appear in more than one request (paired slots try both sides) keep the
 * first, which is the one the ranking's delta was computed from.
 */
function indexByCandidateItem(
  calls: readonly CapturedCall[]
): Map<number, RaidSimRequest> {
  const out = new Map<number, RaidSimRequest>();
  const first = calls[0];
  if (!first) return out;
  const baseIds = new Set(
    equippedIds(first.req).filter((v) => v !== undefined)
  );
  for (const call of calls.slice(1)) {
    for (const id of equippedIds(call.req)) {
      if (id === undefined || baseIds.has(id)) continue;
      if (!out.has(id)) out.set(id, call.req);
    }
  }
  return out;
}

/** Deep-clones a request and empties one equipment slot (`{}` in-skeleton). */
export function withSlotEmptied(
  req: RaidSimRequest,
  slotIndex: number
): RaidSimRequest {
  const clone = structuredClone(req);
  const items = equipmentOf(clone).items;
  if (!items) throw new Error("request has no equipment.items");
  items[slotIndex] = {};
  return clone;
}
