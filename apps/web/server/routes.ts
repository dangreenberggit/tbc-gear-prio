/**
 * The five API routes, assembled over the job manager, the character resolver
 * and the exporters.
 *
 * Kept apart from `http.ts` (which knows about sockets and files but nothing
 * about ranking) and from `main.ts` (which reads the environment): a test can
 * build the routes with its own adapters and never touch either.
 */

import {
  type CharacterRef,
  type ContentPhase,
  type GearSource,
  type Region,
  type RankInput,
  type SpecId,
  type Store,
} from "@tbc-gear-prio/core";
import { createCharacterResolver, type GearSourceFor } from "./characters.js";
import { createExporters, type SettingsCodec } from "./exports.js";
import { createJobManager, type DepsFor, type JobManager } from "./jobs.js";
import type { Route } from "./http.js";

export type CreateApiRoutesInput = {
  readonly store: Store;
  readonly clock: () => Date;
  readonly simVersion: string;
  readonly depsFor: DepsFor;
  readonly gearSourceFor: GearSourceFor;
  readonly codec: SettingsCodec;
};

const REGIONS: readonly string[] = ["US", "EU", "KR", "TW", "CN"];
const SPECS: readonly SpecId[] = ["ret", "feral"];

export function createApiRoutes(input: CreateApiRoutesInput): Route[] {
  const jobs = createJobManager({
    store: input.store,
    depsFor: input.depsFor,
    clock: input.clock,
    simVersion: input.simVersion,
  });
  const characters = createCharacterResolver(input.gearSourceFor);
  const exports = createExporters({ jobs, codec: input.codec });

  return [
    {
      method: "POST",
      pattern: "/api/jobs",
      async handle({ body }) {
        const parsed = parseRankInput(body);
        if (!parsed.ok) {
          return {
            status: 400,
            json: { error: "bad-request", detail: parsed.message },
          };
        }
        const outcome = await jobs.submit(parsed.input);
        if (!outcome.ok) {
          return {
            status: outcome.status,
            json: { error: "cannot-rank", detail: outcome.message },
          };
        }
        return { status: 202, json: outcome.result };
      },
    },
    {
      method: "GET",
      pattern: "/api/jobs/:id",
      handle({ params }) {
        const view = jobs.read(params.id!);
        if (!view) {
          return {
            status: 404,
            json: { error: "not-found", detail: `no job ${params.id!}` },
          };
        }
        return { status: 200, json: view };
      },
    },
    {
      method: "GET",
      pattern: "/api/characters/:region/:realm/:name",
      async handle({ params }) {
        const ref = parseCharacterRef(params);
        if (!ref) {
          return {
            status: 404,
            json: { error: "not-found", detail: "unknown region" },
          };
        }
        const view = await characters.resolve(ref);
        if (!view) {
          return {
            status: 404,
            json: {
              error: "not-recorded",
              detail: `${ref.name}@${ref.realm}-${ref.region} is not a recorded character (offline build)`,
            },
          };
        }
        return { status: 200, json: view };
      },
    },
    {
      method: "GET",
      pattern: "/api/jobs/:id/export.json",
      handle({ params, query }) {
        return exports.exportJson(params.id!, query.get("item") ?? undefined);
      },
    },
    {
      method: "GET",
      pattern: "/api/jobs/:id/share",
      handle({ params, query }) {
        return exports.shareLink(params.id!, query.get("item") ?? undefined);
      },
    },
  ];
}

export type ParseResult =
  | { readonly ok: true; readonly input: RankInput }
  | { readonly ok: false; readonly message: string };

/**
 * The POST body is client input, so every field is checked before it reaches
 * `rankUpgrades` — an unvalidated `maxPhase` would read a universe path built
 * from whatever string arrived.
 */
export function parseRankInput(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "expected a JSON object" };
  }
  const b = body as Record<string, unknown>;

  const character = b.character;
  if (typeof character !== "object" || character === null) {
    return { ok: false, message: "character is required" };
  }
  const c = character as Record<string, unknown>;
  if (
    typeof c.region !== "string" ||
    typeof c.realm !== "string" ||
    typeof c.name !== "string"
  ) {
    return { ok: false, message: "character needs region, realm and name" };
  }
  if (!REGIONS.includes(c.region)) {
    return { ok: false, message: `unknown region ${c.region}` };
  }

  const spec = b.spec;
  if (typeof spec !== "string" || !SPECS.includes(spec as SpecId)) {
    return { ok: false, message: `spec must be one of ${SPECS.join(", ")}` };
  }

  const maxPhase = b.maxPhase;
  if (
    typeof maxPhase !== "number" ||
    !Number.isInteger(maxPhase) ||
    maxPhase < 1 ||
    maxPhase > 5
  ) {
    return { ok: false, message: "maxPhase must be an integer 1-5" };
  }

  const input: RankInput = {
    character: {
      region: c.region as Region,
      realm: c.realm,
      name: c.name,
    },
    spec: spec as SpecId,
    maxPhase: maxPhase as ContentPhase,
    ...(isFightRef(b.fight) ? { fight: b.fight } : {}),
  };
  return { ok: true, input };
}

function isFightRef(
  value: unknown
): value is { reportCode: string; fightId: number } {
  if (typeof value !== "object" || value === null) return false;
  const f = value as Record<string, unknown>;
  return typeof f.reportCode === "string" && typeof f.fightId === "number";
}

function parseCharacterRef(
  params: Readonly<Record<string, string>>
): CharacterRef | undefined {
  const region = params.region!.toUpperCase();
  if (!REGIONS.includes(region)) return undefined;
  return {
    region: region as Region,
    realm: params.realm!,
    name: params.name!,
  };
}

export type { GearSource, JobManager };
