/**
 * Composes the adapters one run needs, from the same offline wiring
 * `pnpm rank --offline` uses (`packages/core/src/cli-wiring.ts`). The web
 * shell is a second caller of that wiring, never a second copy of it.
 *
 * A missing input is a returned status, not a thrown error and not an exit:
 * the CLI prints and returns 2 where the server answers 400 or 404, and both
 * read the same `{ ok: false, missing, generate }` from core.
 */

import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  CliSimRunner,
  loadOfflineInputs,
  MemoryStore,
  offlineGearRecordings,
  RecordedGearSource,
  resolveWowsimcli,
  SqliteStore,
  type ContentPhase,
  type CharacterRef,
  type Deps,
  type PoolEntry,
  type SpecId,
  type Store,
} from "@tbc-gear-prio/core";

/** Everything `rankUpgrades` needs, minus the parts a caller may override. */
export type CreateDepsInput = {
  readonly root: string;
  readonly spec: SpecId;
  readonly maxPhase: ContentPhase;
  readonly character: CharacterRef;
  readonly concurrency?: number;
  readonly store: Store;
  /**
   * Overrides the universe the run ranks against. The pin-BiS-absent state
   * has no committed universe that produces it, so its test supplies one
   * here rather than through `maxPhase`.
   */
  readonly pool?: readonly PoolEntry[];
};

export type CreateDepsFailure = {
  readonly ok: false;
  /** 400 when the deployment is missing a file; 404 when the request names something unknown. */
  readonly status: 400 | 404;
  readonly message: string;
};

export type CreateDepsResult =
  { readonly ok: true; readonly deps: Deps } | CreateDepsFailure;

export function createDeps(input: CreateDepsInput): CreateDepsResult {
  const { root, spec, maxPhase, character, store } = input;

  const inputs = loadOfflineInputs(root, spec, maxPhase);
  if (!inputs.ok) {
    return {
      ok: false,
      status: 400,
      message: `missing universe file ${inputs.missing}; generate: ${inputs.generate}`,
    };
  }

  const gearData = offlineGearRecordings(root, spec, character);
  if (!gearData) {
    return {
      ok: false,
      status: 404,
      message: `${character.name}@${character.realm}-${character.region} is not a recorded ${spec} character (offline build)`,
    };
  }

  const binary = resolveSimBinary(root);
  if (!binary.ok) return binary;

  const clock = () => new Date();
  return {
    ok: true,
    deps: {
      gear: new RecordedGearSource(gearData),
      sim: new CliSimRunner(binary.path),
      store,
      clock,
      raidSimSkeleton: inputs.skeleton,
      epWeights: inputs.epWeights,
      pool: input.pool ?? inputs.pool,
      ...(input.concurrency === undefined
        ? {}
        : { concurrency: input.concurrency }),
    },
  };
}

/**
 * 400 rather than 404: an absent binary is this deployment missing a fetch
 * step, not the client asking for something that does not exist.
 */
function resolveSimBinary(
  root: string
): { ok: true; path: string } | CreateDepsFailure {
  const path = resolveWowsimcli(root);
  if (!existsSync(path)) {
    return {
      ok: false,
      status: 400,
      message: `missing wowsimcli at ${path}; fetch: pnpm fetch:wowsimcli`,
    };
  }
  return { ok: true, path };
}

/**
 * `MemoryStore` unless `DATABASE_URL` asks for the file-backed one. Nothing in
 * Stage 3's gate needs state to survive a restart, so persistence is a
 * non-default that gives `SqliteStore` a real call site.
 *
 * Only the *persistence* is a choice — the Node floor is not. `seams/store.ts`
 * imports `node:sqlite` at module scope, so the runtime must supply it whether
 * or not `DATABASE_URL` is set; leaving the variable unset does not buy an
 * older Node. Ticket 264 covers declaring that floor in an `engines` field.
 */
export function createStore(
  env: NodeJS.ProcessEnv,
  root: string,
  clock: () => Date = () => new Date()
): Store {
  if (!env.DATABASE_URL) return new MemoryStore(clock);
  const path = join(root, ".data", "app.db");
  mkdirSync(dirname(path), { recursive: true });
  return new SqliteStore(path, clock);
}
