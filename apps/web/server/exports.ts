/**
 * The two ways a run leaves this app for wowsims: a downloadable
 * `IndividualSimSettings` JSON, and a share link that opens the site with the
 * setup already loaded.
 *
 * Both are built from the same composed `RaidSimRequest` the ranker simmed —
 * the worn gear with, optionally, one candidate swapped into the slot its
 * `RankedItem` names — so what a player opens on wowsims is what this app
 * measured, not a reconstruction of it.
 *
 * ## Why the protojson → proto bridge is injected
 *
 * Everything in this repo carries a `RaidSimRequest` as protojson: `compose`
 * returns one, the committed skeletons are ones, and `CliSimRunner` writes one
 * straight to a file. `toIndividualSimSettings` takes the *generated class*
 * instead, and `@bufbuild/protobuf`'s `fromJson` with `RaidSimRequestSchema`
 * is the only thing that converts between them — enum fields arrive as names
 * in JSON and must be numbers before `toBinary` will encode them.
 *
 * Core exports neither the schema nor a bridging helper, and `apps/web`
 * cannot add `@bufbuild/protobuf` as a dependency from this slice (see the
 * handoff's notes). So the conversion is a parameter: `main.ts` supplies the
 * real one, and a test supplies it too. When core grows the export, the
 * parameter's default can point at it and every caller stays unchanged.
 */

import { deflateSync } from "node:zlib";
import {
  CURRENT_API_VERSION,
  encodeShareLink,
  simSlotsForPoolSlot,
  SIM_ORDER,
  type RaidSimRequest,
  type RankedItem,
  type Ranking,
  type SpecId,
} from "@tbc-gear-prio/core";
import type { HandlerResult } from "./http.js";
import type { JobManager } from "./jobs.js";

/** Where a share link opens. One page per spec on wowsims' TBC site. */
export const SPEC_PAGE: Readonly<Record<SpecId, string>> = {
  ret: "https://www.wowsims.com/tbc/paladin/retribution/",
  feral: "https://www.wowsims.com/tbc/druid/feral/",
};

/**
 * Protojson in, the two shapes an export needs out: the generated
 * `IndividualSimSettings` message (which `encodeShareLink` packs to binary)
 * and its JSON form (which the download serves).
 */
export type SettingsCodec = {
  fromRequestJson(request: RaidSimRequest): {
    readonly message: Parameters<typeof encodeShareLink>[0];
    readonly json: unknown;
  };
};

export type CreateExportersInput = {
  readonly jobs: JobManager;
  readonly codec: SettingsCodec;
};

export type Exporters = {
  exportJson(id: string, itemId?: string): HandlerResult;
  shareLink(id: string, itemId?: string): HandlerResult;
};

export function createExporters(input: CreateExportersInput): Exporters {
  return {
    exportJson(id, itemId) {
      const built = buildRequest(input.jobs, id, itemId);
      if (!built.ok) return { status: built.status, json: built.json };
      const { json } = input.codec.fromRequestJson(built.request);
      return {
        status: 200,
        text: JSON.stringify(json, null, 2),
        contentType: "application/json; charset=utf-8",
        filename: built.filename,
      };
    },

    shareLink(id, itemId) {
      const built = buildRequest(input.jobs, id, itemId);
      if (!built.ok) return { status: built.status, json: built.json };
      const { message } = input.codec.fromRequestJson(built.request);
      return {
        status: 200,
        json: {
          url: encodeShareLink(message, SPEC_PAGE[built.spec], deflateSync),
          apiVersion: CURRENT_API_VERSION,
        },
      };
    },
  };
}

type BuiltRequest =
  | {
      ok: true;
      request: RaidSimRequest;
      spec: SpecId;
      filename: string;
    }
  | { ok: false; status: number; json: unknown };

/** The baseline request, or the baseline with one candidate swapped in. */
function buildRequest(
  jobs: JobManager,
  id: string,
  itemId: string | undefined
): BuiltRequest {
  const view = jobs.read(id);
  if (!view) {
    return {
      ok: false,
      status: 404,
      json: { error: "not-found", detail: `no job ${id}` },
    };
  }
  if (view.status !== "done" || !view.result || !view.baselineRequest) {
    return {
      ok: false,
      status: 409,
      json: {
        error: "not-ready",
        detail: `job ${id} is ${view.status}; an export needs a finished run`,
      },
    };
  }

  const ranking: Ranking = view.result;
  const request = view.baselineRequest;
  const spec = view.spec;
  const base = `${ranking.fight.reportCode}-${ranking.fight.fightId}`;

  if (itemId === undefined) {
    return { ok: true, request, spec, filename: `${base}-baseline.json` };
  }

  const wanted = Number(itemId);
  const row = Number.isFinite(wanted)
    ? ranking.items.find((i) => i.itemId === wanted)
    : undefined;
  if (!row) {
    return {
      ok: false,
      status: 404,
      json: {
        error: "not-in-ranking",
        detail: `item ${itemId} is not a row of job ${id}`,
      },
    };
  }

  return {
    ok: true,
    request: withCandidate(request, row),
    spec,
    filename: `${base}-${row.itemId}.json`,
  };
}

/**
 * `slotChoice` when the row has one — a ring or a trinket names which of the
 * two placements produced its delta, and swapping into the other one would
 * export a setup the app never measured.
 *
 * A plain slot replacement, not the ranker's `equipmentForCandidateSwap`,
 * which also migrates gems and repairs the meta and is not exported from
 * core's index. What ships is the item in its slot with empty sockets; the
 * player re-gems on the site.
 */
export function withCandidate(
  request: RaidSimRequest,
  row: RankedItem
): RaidSimRequest {
  const slot = row.slotChoice ?? simSlotsForPoolSlot(row.slot)[0];
  const index = SIM_ORDER.indexOf(slot as (typeof SIM_ORDER)[number]);
  if (index < 0) {
    throw new Error(
      `row ${row.itemId} names an unknown sim slot ${String(slot)}`
    );
  }

  const next = structuredClone(request) as Record<string, unknown>;
  const raid = next.raid as {
    parties: Array<{ players: Array<Record<string, unknown>> }>;
  };
  const player = raid.parties[0]?.players[0];
  if (!player) throw new Error("composed request has no player");
  const equipment = player.equipment as {
    items: Array<Record<string, unknown>>;
  };
  equipment.items[index] = { id: row.itemId };
  return next;
}
