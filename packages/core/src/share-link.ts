/**
 * The wowsims share link: a whole `IndividualSimSettings` packed into a URL
 * hash, so a link opens the site with the exact setup that produced a run.
 *
 * The format is wowsims' own — `toBinary` → deflate → base64 → hash — and the
 * decoder is its exact inverse. Upstream uses `pako` and the browser's
 * `btoa`; the compressor is injected here instead so this module stays free
 * of both a dependency and a platform (the server passes `node:zlib`'s
 * `deflateSync`/`inflateSync`).
 */

import { fromBinary, toBinary } from "@bufbuild/protobuf";
import {
  IndividualSimSettingsSchema,
  type IndividualSimSettings,
} from "./proto/ui_pb.js";

/** A deflate or inflate over raw bytes. */
export type ByteCodec = (bytes: Uint8Array) => Uint8Array;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * `baseUrl` is the spec's page on wowsims, e.g.
 * `https://www.wowsims.com/tbc/paladin/retribution/`.
 */
export function encodeShareLink(
  settings: IndividualSimSettings,
  baseUrl: string,
  deflate: ByteCodec
): string {
  const packed = toBase64(
    deflate(toBinary(IndividualSimSettingsSchema, settings))
  );
  const url = new URL(baseUrl);
  url.hash = packed;
  return url.toString();
}

/** Throws if the hash is absent or does not decode. */
export function decodeShareLink(
  url: string,
  inflate: ByteCodec
): IndividualSimSettings {
  const hash = new URL(url).hash.replace(/^#/, "");
  if (hash === "") throw new Error("share link has no hash payload");
  return fromBinary(IndividualSimSettingsSchema, inflate(fromBase64(hash)));
}
