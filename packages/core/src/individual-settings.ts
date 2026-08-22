/**
 * Lowering a `RaidSimRequest` to the `IndividualSimSettings` that wowsims'
 * individual sim UI reads.
 *
 * This is the export direction. Ticket 72 wants the opposite lift
 * (`IndividualSimSettings` → `RaidSimRequest`) so a user can bring their own
 * setup in; the two share the field correspondence below and nothing else.
 */

import { getOption } from "@bufbuild/protobuf";
import {
  ProtoVersionSchema,
  current_version_number,
} from "./proto/common_pb.js";
import type { UnitStats } from "./proto/common_pb.js";
import type { RaidSimRequest } from "./proto/api_pb.js";
import {
  IndividualSimSettingsSchema,
  type IndividualSimSettings,
} from "./proto/ui_pb.js";
import { create } from "@bufbuild/protobuf";

/**
 * The proto version wowsims' importer compares against.
 *
 * Read from the `current_version_number` option on `proto.ProtoVersion`, the
 * same declaration wowsims reads, rather than restated as a literal — a
 * settings message that arrives with a lower `apiVersion` is run through the
 * site's migration chain (`individual_sim_ui.tsx`, the
 * `apiVersion < CURRENT_API_VERSION` gate), which silently rewrites it. The
 * proto default of 0 would take every export down that path.
 */
export const CURRENT_API_VERSION: number = getOption(
  ProtoVersionSchema,
  current_version_number
);

export type ToIndividualSimSettingsOptions = {
  /** Defaults to `CURRENT_API_VERSION`. */
  readonly apiVersion?: number;
  readonly epWeights?: UnitStats;
};

/**
 * The first player of the first party is the individual sim's subject; the
 * raid-level buffs, debuffs and tanks become the individual message's
 * top-level fields.
 *
 * `SimSettings` and `SimOptions` are different messages that overlap only on
 * `iterations`, so only that field is carried across. Everything else in
 * `SimSettings` is UI state the sim request never held.
 */
export function toIndividualSimSettings(
  req: RaidSimRequest,
  opts: ToIndividualSimSettingsOptions = {}
): IndividualSimSettings {
  const raid = req.raid;
  const party = raid?.parties[0];
  const player = party?.players[0];

  return create(IndividualSimSettingsSchema, {
    apiVersion: opts.apiVersion ?? CURRENT_API_VERSION,
    player,
    encounter: req.encounter,
    raidBuffs: raid?.buffs,
    debuffs: raid?.debuffs,
    partyBuffs: party?.buffs,
    tanks: raid?.tanks ?? [],
    targetDummies: raid?.targetDummies ?? 0,
    settings: {
      iterations: req.simOptions?.iterations ?? 0,
    },
    ...(opts.epWeights ? { epWeightsStats: opts.epWeights } : {}),
  });
}
