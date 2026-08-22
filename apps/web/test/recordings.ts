/**
 * Offline adapters for the server tests: slamaltman's real logged gear behind
 * a `RecordedGearSource`, and a sim runner that answers every request the
 * ranker composes.
 *
 * The gear half is the recording the CLI replays, loaded through core's own
 * `offlineGearRecordings` so the server tests and `pnpm rank --offline`
 * resolve the same character from the same file.
 *
 * The sim half is not a recording. `RecordedSimRunner` throws on any request
 * absent from its map, and no committed fixture holds a full candidate sweep
 * for this pool — `slamaltman.raid-sim-result.json` is one baseline
 * observation. These tests are about the server's job plumbing, not about sim
 * numbers, so the runner below answers deterministically from the request
 * itself: same request in, same DPS out, no binary, no I/O.
 */

import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fromJson, toJson } from "@bufbuild/protobuf";
import {
  loadOfflineInputs,
  MemoryStore,
  offlineGearRecordings,
  poolFromUniverse,
  repoRoot,
  RecordedGearSource,
  simCacheKey,
  toIndividualSimSettings,
  type CharacterRef,
  type Deps,
  type PoolEntry,
  type RaidSimRequest,
  type Ranking,
  type RankInput,
  type SimObservation,
  type SimRunner,
  type SimRunOpts,
  type SpecId,
  type UniverseEntry,
} from "@tbc-gear-prio/core";
import { RaidSimRequestSchema } from "../../../packages/core/src/proto/api_pb.js";
import { IndividualSimSettingsSchema } from "../../../packages/core/src/proto/ui_pb.js";
import { createHttpServer } from "../server/http.js";
import { createApiRoutes } from "../server/routes.js";
import type { SettingsCodec } from "../server/exports.js";

const HERE = dirname(fileURLToPath(import.meta.url));

export const SLAMALTMAN: CharacterRef = {
  region: "US",
  realm: "dreamscythe",
  name: "slamaltman",
};

export const SIM_VERSION = "v0.0.119-test";

/**
 * A DPS that is a pure function of the composed request, so a run reproduces
 * and two different candidates land at two different deltas. Derived from
 * `simCacheKey`'s request hash rather than from the item id, which the runner
 * never sees.
 */
function dpsFor(req: RaidSimRequest, opts: SimRunOpts): number {
  const hash = simCacheKey(req, SIM_VERSION, { ...opts, seed: 0 });
  const nibble = parseInt(hash.slice(0, 6), 16);
  return 2000 + (nibble % 400) / 10;
}

/**
 * Answers every request. Records what it was asked, so a test can say how
 * many sims a run issued without reaching into `rankUpgrades`.
 */
export class SyntheticSimRunner implements SimRunner {
  readonly calls: Array<{ req: RaidSimRequest; opts: SimRunOpts }> = [];

  async version(): Promise<string> {
    return SIM_VERSION;
  }

  async run(req: RaidSimRequest, opts: SimRunOpts): Promise<SimObservation> {
    this.calls.push({ req, opts });
    return {
      dps: dpsFor(req, opts),
      stdev: 40,
      iterationsDone: opts.iterations,
      simVersion: SIM_VERSION,
    };
  }
}

/** Slamaltman's recorded fights and gear, as the CLI's offline path sees them. */
export function slamaltmanGearSource(): RecordedGearSource {
  const data = offlineGearRecordings(repoRoot(), "ret", SLAMALTMAN);
  if (!data) throw new Error("slamaltman is not a recorded character");
  return new RecordedGearSource(data);
}

/**
 * The real protojson → `IndividualSimSettings` conversion.
 *
 * Reaches `@bufbuild/protobuf` and the generated schema by relative path,
 * which the production server may not do — `apps/web` does not declare the
 * dependency and core does not export the protos (see
 * `server/settings-codec.ts`). Tests live in the same repo and may; what they
 * pin is that the *exporters* are right, so that when those two manifest
 * lines land the only change is which codec `main.ts` passes.
 */
export function realSettingsCodec(): SettingsCodec {
  return {
    fromRequestJson(request) {
      const message = toIndividualSimSettings(
        fromJson(RaidSimRequestSchema, request as never)
      );
      return {
        message,
        json: toJson(IndividualSimSettingsSchema, message),
      };
    },
  };
}

/** The 20-entry ret-p2 slice with every `bisTags` emptied (F2). */
export function poolWithoutBis(): PoolEntry[] {
  const raw = JSON.parse(
    readFileSync(join(HERE, "fixtures/pool-no-bis.json"), "utf8")
  ) as { entries: UniverseEntry[] };
  return poolFromUniverse(raw);
}

export type TestServer = {
  readonly base: string;
  get(path: string): Promise<{ status: number; body: unknown }>;
  getRaw(
    path: string
  ): Promise<{ status: number; text: string; headers: Headers }>;
  post(path: string, body: unknown): Promise<{ status: number; body: unknown }>;
  /** Polls `GET /api/jobs/:id` until it leaves queued/running. */
  poll(id: string): Promise<{ views: JobPoll[]; final: JobPoll }>;
  close(): Promise<void>;
};

export type JobPoll = {
  id: string;
  status: string;
  progress: {
    stage: string;
    done?: number;
    total?: number;
    candidates?: number;
    rows: Array<Record<string, unknown>>;
  };
  result?: Ranking;
  errorKind?: string;
  errorDetail?: string;
  simVersion: string;
  contentHash?: string;
  spec: SpecId;
};

export type StartServerOptions = {
  /** Overrides the universe the run ranks against (the pin-BiS-absent case). */
  readonly pool?: readonly PoolEntry[];
  /** Serves a built SPA from this directory, with the same fallback rules. */
  readonly staticDir?: string;
};

/**
 * The real server on an ephemeral port, with the recorded adapters in place of
 * the wowsimcli-backed ones.
 *
 * Driven over HTTP rather than by calling handlers: the routing, the status
 * codes and the JSON shape are what the UI slice consumes, and none of that is
 * exercised by calling a function directly.
 */
export async function startServer(
  options: StartServerOptions = {}
): Promise<TestServer> {
  const sim = new SyntheticSimRunner();
  const root = repoRoot();

  const depsFor = (
    input: RankInput
  ):
    | { ok: true; deps: Deps }
    | { ok: false; status: 400 | 404; message: string } => {
    if (
      input.spec !== "ret" ||
      input.character.name.toLowerCase() !== SLAMALTMAN.name
    ) {
      return {
        ok: false,
        status: 404,
        message: `${input.character.name} is not a recorded ${input.spec} character (offline build)`,
      };
    }
    const inputs = loadOfflineInputs(root, input.spec, input.maxPhase);
    if (!inputs.ok) {
      return { ok: false, status: 400, message: `missing ${inputs.missing}` };
    }
    return {
      ok: true,
      deps: {
        gear: slamaltmanGearSource(),
        sim,
        store: new MemoryStore(),
        clock: () => new Date("2026-08-22T00:00:00.000Z"),
        raidSimSkeleton: inputs.skeleton,
        epWeights: inputs.epWeights,
        pool: options.pool ?? inputs.pool,
        concurrency: 8,
      },
    };
  };

  const routes = createApiRoutes({
    store: new MemoryStore(),
    clock: () => new Date("2026-08-22T00:00:00.000Z"),
    simVersion: SIM_VERSION,
    depsFor,
    gearSourceFor: (ref, spec) =>
      spec === "ret" && ref.name.toLowerCase() === SLAMALTMAN.name
        ? slamaltmanGearSource()
        : undefined,
    codec: realSettingsCodec(),
  });

  const server = createHttpServer({
    routes,
    ...(options.staticDir === undefined
      ? {}
      : { staticDir: options.staticDir }),
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;

  return {
    base,
    async get(path) {
      const res = await fetch(base + path);
      return { status: res.status, body: await res.json() };
    },
    async getRaw(path) {
      const res = await fetch(base + path);
      return {
        status: res.status,
        text: await res.text(),
        headers: res.headers,
      };
    },
    async post(path, body) {
      const res = await fetch(base + path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      return { status: res.status, body: await res.json() };
    },
    /**
     * 20 ms between polls, not a tight loop. The server runs the ranking on
     * the same event loop that answers these requests, so polling without a
     * gap starves the run it is watching — a tight loop turned a 0.5 s run
     * into minutes. 20 ms is short enough to catch progress mid-run and long
     * enough to leave the ranker its turn.
     */
    async poll(id) {
      const views: JobPoll[] = [];
      for (let i = 0; i < 1500; i += 1) {
        const res = await fetch(`${base}/api/jobs/${id}`);
        const view = (await res.json()) as JobPoll;
        views.push(view);
        if (view.status !== "queued" && view.status !== "running") {
          return { views, final: view };
        }
        await new Promise((r) => setTimeout(r, 20));
      }
      throw new Error("job did not finish within the poll budget");
    },
    close() {
      return new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}
