/**
 * The protojson → `IndividualSimSettings` conversion the exporters need.
 *
 * Everything in this repo carries a `RaidSimRequest` as protojson rather than
 * as a message: `compose` returns a plain record, the committed skeletons are
 * JSON, and `CliSimRunner` writes that JSON straight to a file. But
 * `toIndividualSimSettings` and `encodeShareLink` work on messages, because
 * the share link is the message's binary encoding. `fromJson` bridges the two,
 * and it is the step that turns enum names like `"PowerWordFortitude"` into
 * the numbers `toBinary` requires — passing raw protojson to the encoder fails
 * with `invalid int32: NaN`.
 */

import { fromJson, toJson } from "@bufbuild/protobuf";
import {
  IndividualSimSettingsSchema,
  RaidSimRequestSchema,
  toIndividualSimSettings,
  type RaidSimRequest,
} from "@tbc-gear-prio/core";
import type { SettingsCodec } from "./exports.js";

export function settingsCodec(): SettingsCodec {
  return {
    fromRequestJson(request: RaidSimRequest) {
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
