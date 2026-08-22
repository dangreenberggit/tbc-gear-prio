/**
 * The process: read the environment, compose the adapters, serve the API and
 * the built SPA on one port.
 *
 * Every path is built with `node:path.join` from this module's own location,
 * never from a string the environment supplied and never through a shell.
 */

import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  RECORDED_CHARACTERS,
  defaultMaxPhase,
  repoRoot,
  offlineGearRecordings,
  RecordedGearSource,
  resolveWowsimcli,
  type CharacterRef,
  type GearSource,
  type RankInput,
  type SpecId,
} from "@tbc-gear-prio/core";
import { createHttpServer } from "./http.js";
import { createApiRoutes } from "./routes.js";
import { createDeps, createStore } from "./wiring.js";
import { settingsCodec } from "./settings-codec.js";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * `dist` next to the built server when running `pnpm start`, and one level up
 * when running the TypeScript directly with `tsx` — the same `apps/web/dist`
 * either way, which is where `vite build` writes.
 */
export function staticDirFor(moduleDir: string): string {
  return join(moduleDir, "..", "dist");
}

export type ServerOptions = {
  readonly env?: NodeJS.ProcessEnv;
  readonly root?: string;
};

export function buildServer(options: ServerOptions = {}) {
  const env = options.env ?? process.env;
  const root = options.root ?? repoRoot();
  const clock = () => new Date();
  const store = createStore(env, root, clock);
  const concurrency = positiveInt(env.SIM_CONCURRENCY) ?? 4;

  const depsFor = (input: RankInput) =>
    createDeps({
      root,
      spec: input.spec,
      maxPhase: input.maxPhase,
      character: input.character,
      concurrency,
      store,
    });

  const gearSourceFor = (
    ref: CharacterRef,
    spec: SpecId
  ): GearSource | undefined => {
    const data = offlineGearRecordings(root, spec, ref);
    return data ? new RecordedGearSource(data) : undefined;
  };

  const phase = defaultMaxPhase(root);
  const routes = createApiRoutes({
    store,
    clock,
    simVersion: simVersionLabel(root),
    depsFor,
    gearSourceFor,
    codec: settingsCodec(),
    ...(phase === undefined ? {} : { defaultMaxPhase: phase }),
  });

  return createHttpServer({ routes, staticDir: staticDirFor(here) });
}

/**
 * The pinned binary's own path carries its version tag, which is the version
 * the footer must attribute. Asking the binary would mean spawning it on
 * every start; the tag is the same fact from the same lock file.
 */
function simVersionLabel(root: string): string {
  const binary = resolveWowsimcli(root);
  return /wowsimcli-(v[\d.]+)-/.exec(binary)?.[1] ?? "unknown";
}

function positiveInt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

/** Exported so a deployment check can list what this build can resolve. */
export function recordedCharacters(): ReadonlyArray<{
  ref: CharacterRef;
  spec: SpecId;
}> {
  return RECORDED_CHARACTERS;
}

export function start(): void {
  const port = positiveInt(process.env.PORT) ?? 3000;
  buildServer().listen(port, () => {
    console.log(`tbc gear prio web on http://localhost:${port}`);
  });
}

// Started when this module is the entry point, whether that is `tsx
// server/main.ts` in dev or `node dist-server/main.js` in production.
// Comparing resolved URLs rather than matching a filename, so the two spellings
// of the same entry do not need two rules.
if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  start();
}
