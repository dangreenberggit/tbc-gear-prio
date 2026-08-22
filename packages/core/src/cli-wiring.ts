/**
 * Offline adapter wiring shared by `pnpm rank` (cli.ts) and the web server
 * (apps/web/server/wiring.ts). Extracted from cli.ts so the two callers
 * compose the same recorded sources instead of drifting copies.
 *
 * Nothing here writes to the console or exits the process: a missing input is
 * a returned result the caller renders its own way (the CLI prints and exits
 * 2; the server answers 400/404).
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";
import {
  resolveEpWeightsPath,
  type EpWeightsByPhaseFile,
} from "./ep-weights.js";
import {
  slamaltmanOfflineRecordings,
  SLAMALTMAN_REF,
  type SlamaltmanRawFixture,
} from "./fixtures/slamaltman-offline.js";
import {
  reportEventsOfflineRecordings,
  type ReportEventsRawFixture,
} from "./fixtures/report-events-offline.js";
import {
  feralOfflineRecordings,
  NEXESS_REF,
  SHREDZEPELIN_REF,
  type FeralRawFixture,
} from "./fixtures/feral-offline.js";
import {
  poolFromUniverse,
  type PoolEntry,
  type UniverseEntry,
} from "./pool.js";
import type { RecordedGearSourceData } from "./seams/gear-source.js";
import type { RaidSimRequest } from "./seams/sim-runner.js";
import type { CharacterRef, ContentPhase, SpecId } from "./types.js";

/** A load that failed because a required input file is not on disk. */
export type MissingInput = {
  readonly ok: false;
  /** Repo-relative path of the file that is not there. */
  readonly missing: string;
  /** The command that produces it. */
  readonly generate: string;
};

export type LoadUniversePoolResult =
  { readonly ok: true; readonly pool: PoolEntry[] } | MissingInput;

export type OfflineInputs = {
  readonly ok: true;
  readonly skeleton: RaidSimRequest;
  readonly epWeights: Record<string, number>;
  readonly pool: PoolEntry[];
};

export type LoadOfflineInputsResult = OfflineInputs | MissingInput;

/** Repo root, resolved from this module's own location. */
export function repoRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "../../..");
}

function loadJson<T>(root: string, rel: string): T {
  return JSON.parse(readFileSync(join(root, rel), "utf8")) as T;
}

/**
 * Path to the pinned wowsimcli binary. Existence is the caller's check —
 * the CLI prints a fetch hint, the server answers 400.
 */
export function resolveWowsimcli(root: string): string {
  const tag = loadJson<{ tag: string }>(root, "data/wowsims.lock.json").tag;
  const plat = platform().startsWith("win") ? "win32-x64" : "linux-x64";
  const binary = plat === "win32-x64" ? "wowsimcli-windows.exe" : "wowsimcli";
  return join(root, "vendor", `wowsimcli-${tag}-${plat}`, binary);
}

export function loadUniversePool(
  root: string,
  spec: SpecId,
  maxPhase: ContentPhase
): LoadUniversePoolResult {
  const rel = `data/universes/${spec}-p${maxPhase}.json`;
  if (!existsSync(join(root, rel))) {
    return {
      ok: false,
      missing: rel,
      generate: `python scripts/assemble_universe.py --max-phase ${maxPhase} --spec ${spec}`,
    };
  }
  const data = loadJson<{ entries: UniverseEntry[] }>(root, rel);
  return { ok: true, pool: poolFromUniverse(data) };
}

/**
 * Skeleton, EP weights and universe pool for one offline run.
 *
 * Feral's EP preset is named p1 because upstream ships no p2 one for it;
 * data/presets/feral/p1.ep-weights.json records why.
 */
export function loadOfflineInputs(
  root: string,
  spec: SpecId,
  maxPhase: ContentPhase
): LoadOfflineInputsResult {
  const skeleton = loadJson<RaidSimRequest>(
    root,
    `data/presets/${spec}/p2.raid-sim-skeleton.json`
  );
  // Resolved by maxPhase (ticket 159), not hardcoded to p2 — the assembler
  // scores universes with the same phase-resolved file via
  // ep_weights_path_for(), and the two paths disagreeing was ticket 159's
  // bug. Only `.weights` is read here, never `.pseudoWeights` — the ticket
  // flags that as a pre-existing observation, not something to silently fix
  // in this change.
  const epWeightsPath = resolveEpWeightsPath(
    loadJson<EpWeightsByPhaseFile>(
      root,
      "data/presets/ep-weights-by-phase.json"
    ),
    spec,
    maxPhase
  );
  const epWeights = loadJson<{ weights: Record<string, number> }>(
    root,
    epWeightsPath
  ).weights;
  const poolResult = loadUniversePool(root, spec, maxPhase);
  if (!poolResult.ok) return poolResult;
  return { ok: true, skeleton, epWeights, pool: poolResult.pool };
}

/**
 * The characters the offline build can resolve. `nexess` has a committed
 * `.raw.json` but no `.raid-sim-result.json`, so it resolves gear offline
 * while a recorded-sim replay of it does not exist.
 */
export const RECORDED_CHARACTERS: ReadonlyArray<{
  readonly ref: CharacterRef;
  readonly spec: SpecId;
}> = [
  { ref: SLAMALTMAN_REF, spec: "ret" },
  { ref: SHREDZEPELIN_REF, spec: "feral" },
  { ref: NEXESS_REF, spec: "feral" },
];

// Two recordings of the same character, differing in the route that reached
// his gear. Slamaltman has ten SSC kills and zero encounterRankings, so the
// fallback capture is a real resolve rather than a simulated one — see
// docs/verification-log.md, 2026-08-05.
// Feral captures, keyed by character. Each is one kill from one raid night;
// `confidence` is measured from form uptime by feralOfflineRecordings rather
// than assumed, because cat and bear are the same talents.
const FERAL_FIXTURES: ReadonlyArray<readonly [CharacterRef, string]> = [
  // Void Reaver, not the Morogrim kill: on Morogrim he was backup tank and
  // wore tank gear in cat form, so form uptime read 99.1% cat while nine of
  // seventeen slots were a tanking set (ticket 06). Void Reaver is 98.8% cat
  // with 100% Blessing of Salvation — same form, never on a tank assignment.
  [SHREDZEPELIN_REF, "test/fixtures/shredzepelin-cat.raw.json"],
  [NEXESS_REF, "test/fixtures/nexess.raw.json"],
];

function matches(ref: CharacterRef, character: CharacterRef): boolean {
  return (
    character.region === ref.region &&
    character.realm.toLowerCase() === ref.realm &&
    character.name.toLowerCase() === ref.name
  );
}

/**
 * Recorded fights and gear for one character, or `undefined` when the
 * character is not one of `RECORDED_CHARACTERS`.
 *
 * `reportEvents` selects slamaltman's `report.events(CombatantInfo)` capture
 * over his `encounterRankings` one; it has no effect on the feral refs.
 */
export function offlineGearRecordings(
  root: string,
  spec: SpecId,
  character: CharacterRef,
  reportEvents = false
): RecordedGearSourceData | undefined {
  if (spec === "ret" && matches(SLAMALTMAN_REF, character)) {
    return reportEvents
      ? reportEventsOfflineRecordings(
          loadJson<ReportEventsRawFixture>(
            root,
            "test/fixtures/slamaltman-report-events.raw.json"
          )
        )
      : slamaltmanOfflineRecordings(
          loadJson<SlamaltmanRawFixture>(
            root,
            "test/fixtures/slamaltman.raw.json"
          )
        );
  }
  if (spec === "feral") {
    const match = FERAL_FIXTURES.find(([ref]) => matches(ref, character));
    if (match) {
      return feralOfflineRecordings(
        loadJson<FeralRawFixture>(root, match[1]),
        match[0]
      );
    }
  }
  return undefined;
}
