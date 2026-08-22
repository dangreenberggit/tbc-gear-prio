import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { fromJson } from "@bufbuild/protobuf";
import { decodeShareLink, encodeShareLink } from "../src/share-link.js";
import {
  IndividualSimSettingsSchema,
  type IndividualSimSettings,
} from "../src/proto/ui_pb.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const BASE_URL = "https://www.wowsims.com/tbc/paladin/retribution/";

const deflate = (bytes: Uint8Array): Uint8Array =>
  new Uint8Array(deflateSync(bytes));
const inflate = (bytes: Uint8Array): Uint8Array =>
  new Uint8Array(inflateSync(bytes));

function committedPreset(): IndividualSimSettings {
  return fromJson(
    IndividualSimSettingsSchema,
    JSON.parse(
      readFileSync(
        join(root, "data/presets/ret/p2.individual-sim-settings.json"),
        "utf8"
      )
    ) as never
  );
}

describe("share link", () => {
  it("round trips the committed preset", () => {
    const settings = committedPreset();
    const url = encodeShareLink(settings, BASE_URL, deflate);
    expect(decodeShareLink(url, inflate)).toEqual(settings);
  });

  it("re-encoding a decoded link decodes back equal", () => {
    const settings = committedPreset();
    const once = encodeShareLink(settings, BASE_URL, deflate);
    const twice = encodeShareLink(
      decodeShareLink(once, inflate),
      BASE_URL,
      deflate
    );
    expect(decodeShareLink(twice, inflate)).toEqual(settings);
  });

  it("puts the payload in the hash, leaving the base path intact", () => {
    const url = new URL(encodeShareLink(committedPreset(), BASE_URL, deflate));
    expect(url.origin + url.pathname).toBe(BASE_URL);
    expect(url.hash.length).toBeGreaterThan(1);
  });

  it("preserves the equipment the link was built from", () => {
    const settings = committedPreset();
    const decoded = decodeShareLink(
      encodeShareLink(settings, BASE_URL, deflate),
      inflate
    );
    expect(decoded.player?.equipment).toEqual(settings.player?.equipment);
  });

  it("rejects a url with no hash payload", () => {
    expect(() => decodeShareLink(BASE_URL, inflate)).toThrow(/no hash payload/);
  });
});
