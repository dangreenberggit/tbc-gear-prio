/**
 * When the Upgrades tab marks a shown result stale (tickets 537 and 560). The
 * tab reads the page and its settings once, when a run starts, so a change made
 * while the run is in flight leaves the result measured on old inputs.
 *
 * The React tab keeps no tracker object. A run records `inputsSignature` (built
 * from `liveInputsKey` and the settings, `model/run_inputs.ts`) in its
 * `measuredOn` when it starts; `selectSettledSignature` (`model/upgrades_store.ts`)
 * reads it back once the run is done or stopped; and `useRunStale` calls the
 * result stale when the signature built from the page now differs. These tests
 * drive those pure pieces through the real `runReducer`, as the tab's store
 * does. The hook itself is React and is tested in the fork
 * (`hooks/useRunStale.test.tsx`).
 *
 * The fork is gitignored (`vendor/`), so the suite skips when it is absent.
 */

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

import {
  forkPresent,
  forkRoot,
  importForkUpgrades,
  loadForkEngineEnvironment,
} from "./fork-engine-harness.js";

type RunSettings = { iterations: number };
type MeasuredOn = { inputsSignature?: string };
type RunState =
  | { status: "idle" }
  | { status: "running"; runId: number; measuredOn?: MeasuredOn }
  | { status: "done"; runId: number; measuredOn?: MeasuredOn }
  | { status: "stopped"; runId: number; measuredOn?: MeasuredOn }
  | { status: "error"; runId: number; message: string };
type RunAction =
  | {
      type: "started";
      runId: number;
      startedAt: number;
      measuredOn?: MeasuredOn;
    }
  | { type: "finished"; runId: number; result: object }
  | { type: "stopped"; runId: number; result: object };

type ProtoMessage = { create(init?: object): object };
type LiveInputsSource = {
  raid: { toProto(forExport?: boolean): object };
  encounter: { toProto(): object };
  getPhase(): number;
};

const SETTINGS: RunSettings = { iterations: 3000 };
/** Not read by the reducer: a ranking's contents do not decide staleness. */
const RESULT = { items: [], complete: true };

const importProto = async <T>(file: string): Promise<T> =>
  (await import(
    pathToFileURL(join(forkRoot, "ui/generated/proto", file)).href
  )) as T;

describe.skipIf(!forkPresent)("Upgrades run staleness", () => {
  let runReducer: (state: RunState, action: RunAction) => RunState;
  let idle: RunState;
  let settledSignature: (state: { run: RunState }) => string | undefined;
  let signatureAtPhase: (phase: number) => string;

  beforeAll(async () => {
    await loadForkEngineEnvironment();
    const reducer = await importForkUpgrades<{
      runReducer: typeof runReducer;
      IDLE_RUN: RunState;
    }>("run_reducer.ts");
    runReducer = reducer.runReducer;
    idle = reducer.IDLE_RUN;
    settledSignature = (
      await importForkUpgrades<{
        selectSettledSignature: typeof settledSignature;
      }>("upgrades_store.ts")
    ).selectSettledSignature;

    const { inputsSignature, liveInputsKey } = await importForkUpgrades<{
      inputsSignature(input: {
        liveKey: string;
        settings: RunSettings;
      }): string;
      liveInputsKey(sim: LiveInputsSource): string;
    }>("run_inputs.ts");
    const { Raid } = await importProto<{ Raid: ProtoMessage }>("api.ts");
    const { Encounter } = await importProto<{ Encounter: ProtoMessage }>(
      "common.ts"
    );
    // The page as the run reads it. Only the phase differs between calls, so
    // "an input changed" here is the phase selector moving.
    signatureAtPhase = (phase) =>
      inputsSignature({
        liveKey: liveInputsKey({
          raid: { toProto: () => Raid.create() },
          encounter: { toProto: () => Encounter.create({ duration: 180 }) },
          getPhase: () => phase,
        }),
        settings: SETTINGS,
      });
    // 30s, matching `testTimeout`, not the 10s default hookTimeout: loading
    // db.json and the fork modules took 3.4-4.7s in review round 2 and can
    // pass 10s under CPU contention (hypothesis, untested).
  }, 30_000);

  const start = (state: RunState, runId: number, signature: string) =>
    runReducer(state, {
      type: "started",
      runId,
      startedAt: 0,
      measuredOn: { inputsSignature: signature },
    });
  const finish = (state: RunState, runId: number) =>
    runReducer(state, { type: "finished", runId, result: RESULT });
  const stop = (state: RunState, runId: number) =>
    runReducer(state, { type: "stopped", runId, result: RESULT });
  const settled = (run: RunState) => settledSignature({ run });

  it("marks a finished run stale when an input changed while it ran", () => {
    const atStart = signatureAtPhase(3);
    const running = start(idle, 1, atStart);
    // The phase moves while the run is in flight. The run keeps the inputs it
    // started on, so the finished result is measured on phase 3.
    const now = signatureAtPhase(4);
    const done = finish(running, 1);

    expect(done.status).toBe("done");
    expect(settled(done)).toBe(atStart);
    expect(now).not.toBe(atStart);
  });

  it("leaves a finished run fresh when nothing changed while it ran", () => {
    const done = finish(start(idle, 1, signatureAtPhase(3)), 1);

    expect(settled(done)).toBe(signatureAtPhase(3));
  });

  it("does not carry a change during one run into the next run", () => {
    const first = start(idle, 1, signatureAtPhase(3));
    const second = start(first, 2, signatureAtPhase(4));

    expect(settled(finish(second, 2))).toBe(signatureAtPhase(4));
  });

  it("marks a done result stale when an input changes after the run", () => {
    const done = finish(start(idle, 1, signatureAtPhase(3)), 1);

    // A defined signature that differs from the page's: `undefined` would also
    // differ, but the hook reads it as "nothing to compare", not stale.
    expect(settled(done)).toBe(signatureAtPhase(3));
    expect(signatureAtPhase(4)).not.toBe(signatureAtPhase(3));
  });

  it("marks a stopped result stale when an input changes after the stop", () => {
    const stopped = stop(start(idle, 1, signatureAtPhase(3)), 1);

    expect(stopped.status).toBe("stopped");
    expect(settled(stopped)).toBe(signatureAtPhase(3));
    expect(settled(stopped)).not.toBe(signatureAtPhase(4));
  });

  it("never marks an idle state or a run in flight stale", () => {
    // No settled signature means `useRunStale` has nothing to compare and
    // returns false, whatever the page holds.
    expect(settled(idle)).toBeUndefined();
    expect(settled(start(idle, 1, signatureAtPhase(3)))).toBeUndefined();
  });
});
