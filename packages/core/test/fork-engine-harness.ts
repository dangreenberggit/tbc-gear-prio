/**
 * Loads the fork's ported engine into a Node test process.
 *
 * `engine/rank.ts` is written for the browser, and importing it pulls in the
 * fork's UI-adjacent layer (`items.ts` and `enchants.ts` reach
 * `proto_utils/database.ts`, which reaches the spec/class registry and the i18n
 * config). Three things have to be true before the module graph will even
 * evaluate, and none of them is a property of the engine itself:
 *
 * 1. **`window` exists at module scope.** `constants/other.ts` reads
 *    `window.location.pathname` while initializing, and `proto_utils/utils.ts`
 *    builds a `new URL()` from `window.location.protocol`/`host` inside a static
 *    initializer on the druid spec. Both run on import, before any test body.
 * 2. **`Database` is populated.** `getItem`/`getGem` call `Database.getSync()`,
 *    which throws unless `Database.get()` has resolved. `get()` only fills the
 *    singleton by `fetch`ing a page-relative URL, and there is no exported way
 *    to inject an instance — the field is a private static. So the fetch is
 *    stubbed to serve the fork's own committed `db.json` off disk.
 * 3. **`virtual:i18next-loader` resolves.** Handled by a `resolve.alias` in the
 *    root `vitest.config.ts`; see that alias and the stub it points at.
 *
 * The stubs are as small as the import graph allows and serve real committed
 * data, so nothing here fabricates engine behavior — they only stand in for the
 * browser the engine expects to be running inside. Anything a stub returns that
 * a test then asserted on would be a test asserting on this file; no test does.
 *
 * The fork is gitignored (`vendor/`, main checkout only), so every caller must
 * skip when `forkPresent` is false.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { expect } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

export const forkRoot = join(root, "vendor/tbc-new-fork");
// The engine, its adapters and its data, which the fork keeps under its
// upgrades feature's DOM-free `model/` folder (ticket 558).
export const forkUpgradesDir = join(forkRoot, "ui/features/upgrades/model");

// The generated protos are gitignored in the fork; without them every engine
// import fails, so a fork with no `make proto` run skips like an absent fork.
export const forkPresent =
  existsSync(join(forkUpgradesDir, "engine/rank.ts")) &&
  existsSync(join(forkRoot, "ui/generated/proto/common.ts")) &&
  existsSync(join(forkRoot, "assets/database/db.json"));

if (
  existsSync(join(forkUpgradesDir, "engine/rank.ts")) &&
  !existsSync(join(forkRoot, "ui/generated/proto/common.ts"))
) {
  console.warn(
    "fork engine tests skipped: vendor/tbc-new-fork has no generated protos; " +
      "run `make proto` in the fork"
  );
}

let loaded: Promise<void> | undefined;

/**
 * Installs the browser stubs and populates `Database`, once per process.
 * Idempotent: the fork caches its own load promise, and re-running the globals
 * would be harmless but pointless.
 */
export async function loadForkEngineEnvironment(): Promise<void> {
  loaded ??= (async () => {
    const g = globalThis as Record<string, unknown>;

    const dbJson: unknown = JSON.parse(
      readFileSync(join(forkRoot, "assets/database/db.json"), "utf8")
    );
    // Only ever asked for the database URL; anything else is a bug in a caller
    // rather than something to serve silently.
    g.fetch = async (input: unknown) => {
      const url = String(input);
      if (!url.includes("db.json")) {
        throw new Error(`fork test harness: unexpected fetch for ${url}`);
      }
      return { json: async () => dbJson };
    };

    g.window = {
      location: {
        pathname: "/tbc/feral_druid/",
        href: "http://localhost/tbc/feral_druid/",
        protocol: "http:",
        host: "localhost",
        hostname: "localhost",
        origin: "http://localhost",
        search: "",
        hash: "",
      },
      addEventListener: () => {},
      matchMedia: () => ({ matches: false, addEventListener: () => {} }),
    };
    g.document = {
      addEventListener: () => {},
      createElement: () => ({
        style: {},
        setAttribute: () => {},
        appendChild: () => {},
      }),
      documentElement: {
        style: {},
        classList: { add: () => {}, remove: () => {} },
      },
      body: { appendChild: () => {} },
      querySelector: () => null,
    };
    g.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
    // `navigator` is deliberately left alone: Node 22 defines it as a
    // getter-only global, and assigning to it throws.

    const database = (await import(
      pathToFileURL(join(forkRoot, "ui/sim/proto/database.ts")).href
    )) as { Database: { get(): Promise<unknown> } };
    await database.Database.get();
  })();
  await loaded;
}

/** Imports a module from the fork's upgrades tree by path relative to it. */
export async function importForkUpgrades<T>(relativePath: string): Promise<T> {
  await loadForkEngineEnvironment();
  return (await import(
    pathToFileURL(join(forkUpgradesDir, relativePath)).href
  )) as T;
}

/**
 * A candidate-order score for the fork's required `Deps.itemEp`: item stats
 * times `weights`, with no credit for weapon damage. The tab passes wowsims'
 * weapon-aware score instead (fork `model/item_ep.ts`); suites that pass this
 * one keep the order they were written against, which is what the fork used
 * before it made `itemEp` required.
 */
export async function statsOnlyItemEp(
  weights: Readonly<Record<string, number>>
): Promise<(itemId: number) => number> {
  const [{ epScore }, { getItem }] = await Promise.all([
    importForkUpgrades<{
      epScore: (
        stats: readonly number[],
        weights: Readonly<Record<string, number>>
      ) => number;
    }>("engine/stats.ts"),
    importForkUpgrades<{
      getItem: (itemId: number) => { stats: readonly number[] } | undefined;
    }>("engine/items.ts"),
  ]);
  return (itemId) => epScore(getItem(itemId)?.stats ?? [], weights);
}

/**
 * A stats read for fakes whose runs need no hit cap: every hit slot reads 0%,
 * so a hit-budget spec gets the whole cap as its budget. The fork's
 * `SimRunner.computeStats` is required (ticket 830).
 */
export function zeroHitStats(): Promise<{
  stats: number[];
  pseudoStats: number[];
}> {
  return Promise.resolve({
    stats: [],
    pseudoStats: new Array<number>(25).fill(0),
  });
}

/** The sim methods `tracedRank` records; the rest of the runner passes through. */
const TRACED_SIM_METHODS = new Set(["run", "computeStats", "activeSetBonuses"]);

/** `JSON.stringify` that keeps bigints, which some proto fields hold. */
function jsonWithBigints(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    typeof v === "bigint" ? `${v}n` : v
  );
}

const traceCalls = new Map<string, number>();

/**
 * The warnings list of the traced run whose async context is current. Some
 * suites run several rankings at once (`fork-set-net.test.ts` uses
 * `Promise.all`), so one `console.warn` hook is shared while any traced run is
 * in flight, and each warning goes to the run that issued it.
 */
const warningsOfRun = new AsyncLocalStorage<unknown[]>();
let runsInFlight = 0;
let warnBeforeTrace: typeof console.warn | undefined;

function hookWarn(): void {
  if (runsInFlight++ > 0) return;
  const warn = console.warn;
  warnBeforeTrace = warn;
  console.warn = (...args: unknown[]) => {
    warningsOfRun.getStore()?.push(args[0]);
    warn(...args);
  };
}

function unhookWarn(): void {
  if (--runsInFlight > 0) return;
  console.warn = warnBeforeTrace!;
  warnBeforeTrace = undefined;
}

/**
 * `rank` itself unless `TBC_RANK_TRACE_DIR` is set. When it is, the returned
 * function records one JSON line per call in `<dir>/<test file>.jsonl`: the
 * test's name, its call number within that test, the ranking or the error,
 * each sim call in the order it was sent (method and a sha256 of request plus
 * options), and the first argument of each `console.warn`. The readability
 * refactor's K2 check diffs these files between chunks
 * (`.scratch/agent-reports/2026-11-21-design-task-upgrades-readability-plan.md`
 * § Checks). The recorders return the runner's own promise, so the trace adds
 * no await and cannot change the order of sims. Empty the directory before a
 * run: lines are appended.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any engine's rankUpgrades, typed by its caller
export function tracedRank<F extends (...args: any[]) => Promise<unknown>>(
  rank: F
): F {
  const dir = process.env.TBC_RANK_TRACE_DIR;
  if (!dir) return rank;
  const traced = async (
    input: unknown,
    deps: { sim: object },
    ...rest: unknown[]
  ): Promise<unknown> => {
    const state = expect.getState();
    const test = state.currentTestName ?? "(outside a test)";
    const call = (traceCalls.get(test) ?? 0) + 1;
    traceCalls.set(test, call);
    const sims: Array<[string, string]> = [];
    const warnings: unknown[] = [];
    const sim = new Proxy(deps.sim, {
      get(target, prop, receiver) {
        const value: unknown = Reflect.get(target, prop, receiver);
        if (typeof prop !== "string" || !TRACED_SIM_METHODS.has(prop)) {
          return typeof value === "function" ? value.bind(target) : value;
        }
        if (typeof value !== "function") return value;
        return (...args: unknown[]): unknown => {
          const hash = createHash("sha256")
            .update(jsonWithBigints(args))
            .digest("hex");
          sims.push([prop, hash]);
          return (value as (...a: unknown[]) => unknown).apply(target, args);
        };
      },
    });
    hookWarn();
    const line: Record<string, unknown> = { test, call };
    try {
      const ranking = await warningsOfRun.run(warnings, () =>
        rank(input, { ...deps, sim }, ...rest)
      );
      line.ranking = ranking;
      return ranking;
    } catch (err) {
      // `kind` is how the fork's RankError says which failure it is.
      const e = err as { name?: unknown; message?: unknown; kind?: unknown };
      line.error = { name: e?.name, message: e?.message, kind: e?.kind };
      throw err;
    } finally {
      unhookWarn();
      line.sims = sims;
      line.warnings = warnings;
      mkdirSync(dir, { recursive: true });
      const file = basename(state.testPath ?? "unknown-test-file");
      appendFileSync(join(dir, `${file}.jsonl`), `${jsonWithBigints(line)}\n`);
    }
  };
  return traced as F;
}
