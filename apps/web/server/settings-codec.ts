/**
 * The protojson → `IndividualSimSettings` conversion the exporters need.
 *
 * ## Why this is a stub, and exactly what unblocks it
 *
 * `toIndividualSimSettings` takes the **generated** `RaidSimRequest` class.
 * Everything in this repo that produces a request produces **protojson**
 * instead: `compose` returns `Readonly<Record<string, unknown>>`, the
 * committed skeletons are JSON, and `CliSimRunner` writes that JSON straight
 * to a file without ever building a message. Converting between the two is
 * `fromJson(RaidSimRequestSchema, json)` from `@bufbuild/protobuf` — enum
 * fields arrive as names (`"PowerWordFortitude"`) and must be numbers before
 * `toBinary` will encode them, so passing raw protojson through fails with
 * `invalid int32: NaN`.
 *
 * Two things are missing, and both are single lines in files this slice does
 * not own:
 *
 *   1. `packages/core/package.json` `exports` has no entry for the generated
 *      protos. Add:
 *
 *          "./proto": { "types": "./dist/proto/index.d.ts",
 *                       "default": "./dist/proto/index.js" }
 *
 *      (or re-export `RaidSimRequestSchema` and `IndividualSimSettingsSchema`
 *      from `packages/core/src/index.ts`, which needs no manifest change and
 *      is the smaller move).
 *
 *   2. `apps/web/package.json` `dependencies` has no `@bufbuild/protobuf`.
 *      Add: `"@bufbuild/protobuf": "^2.13.0"`. It resolves today only because
 *      pnpm hoists it for the root workspace, which is not a dependency this
 *      package may rely on.
 *
 * Verified on this worktree: with both in place the round trip works —
 * `fromJson` → `toIndividualSimSettings` → `encodeShareLink` → 1,529-character
 * URL → `decodeShareLink` returns all 17 equipment items with
 * `apiVersion` 13, which is `CURRENT_API_VERSION`.
 *
 * Until then this factory throws when a request actually reaches it. It is a
 * parameter rather than a direct import precisely so the throw is confined to
 * one place and every test supplies a working codec instead.
 */

import type { SettingsCodec } from "./exports.js";

export const MISSING_CODEC_MESSAGE =
  "the export codec needs core to export RaidSimRequestSchema / " +
  "IndividualSimSettingsSchema and apps/web to depend on @bufbuild/protobuf; " +
  "see apps/web/server/settings-codec.ts";

export function settingsCodec(): SettingsCodec {
  return {
    fromRequestJson() {
      throw new Error(MISSING_CODEC_MESSAGE);
    },
  };
}
