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
 *    `window.location.pathname` while initialising, and `proto_utils/utils.ts`
 *    builds a `new URL()` from `window.location.protocol`/`host` inside a static
 *    initialiser on the druid spec. Both run on import, before any test body.
 * 2. **`Database` is populated.** `getItem`/`getGem` call `Database.getSync()`,
 *    which throws unless `Database.get()` has resolved. `get()` only fills the
 *    singleton by `fetch`ing a page-relative URL, and there is no exported way
 *    to inject an instance — the field is a private static. So the fetch is
 *    stubbed to serve the fork's own committed `db.json` off disk.
 * 3. **`virtual:i18next-loader` resolves.** Handled by a `resolve.alias` in the
 *    root `vitest.config.ts`; see that alias and the stub it points at.
 *
 * The stubs are as small as the import graph allows and serve real committed
 * data, so nothing here fabricates engine behaviour — they only stand in for the
 * browser the engine expects to be running inside. Anything a stub returns that
 * a test then asserted on would be a test asserting on this file; no test does.
 *
 * The fork is gitignored (`vendor/`, main checkout only), so every caller must
 * skip when `forkPresent` is false.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

export const forkRoot = join(root, "vendor/tbc-new-fork");
export const forkUpgradesDir = join(
  forkRoot,
  "ui/core/components/individual_sim_ui/upgrades"
);

export const forkPresent =
  existsSync(join(forkUpgradesDir, "engine/rank.ts")) &&
  existsSync(join(forkRoot, "assets/database/db.json"));

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
      pathToFileURL(join(forkRoot, "ui/core/proto_utils/database.ts")).href
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
