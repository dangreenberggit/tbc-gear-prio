/**
 * Build RecordedGearSourceData from the Stage 0 slamaltman raw fixture, via
 * the **ranked** route.
 *
 * The shared walk — actors, gear mapping, talent reading — lives in
 * `buildOfflineRecordings` in `report-events-offline.ts`; this module supplies
 * only what actually differs for the ranked route: `route` itself,
 * `confidence: 1` (a ranked parse is the strongest signal, PLAN.md §5.4), and
 * a fixed `killedAt` the report-events fixture cannot supply (see that
 * module's summary construction). Pure — callers load the JSON (CLI / tests).
 */

import {
  buildOfflineRecordings,
  type ReportEventsRawFixture,
} from "./report-events-offline.js";
import type { RecordedGearSourceData } from "../seams/gear-source.js";
import type { CharacterRef } from "../types.js";

export type SlamaltmanRawFixture = ReportEventsRawFixture;

export const SLAMALTMAN_REF: CharacterRef = {
  region: "US",
  realm: "dreamscythe",
  name: "slamaltman",
};

export function slamaltmanOfflineRecordings(
  raw: SlamaltmanRawFixture
): RecordedGearSourceData {
  return buildOfflineRecordings(
    raw,
    SLAMALTMAN_REF,
    "ret",
    "ranked",
    1,
    () => "slamaltman not found in raw fixture",
    "2026-07-01T00:00:00.000Z"
  );
}
