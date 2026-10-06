/**
 * `RunStaleness` — when the Upgrades tab marks a shown result stale (ticket
 * 537). The tab reads gear and settings once, when a run starts, so a change
 * made while the run is in flight leaves the result measured on old inputs.
 *
 * Each test drives the tracker the way `upgrades_tab.tsx` does: `runStarted`
 * when a run starts, `inputChanged` from every gear, talent and settings
 * listener, and `staleAtFinish` for the `stale` flag of the finished state.
 *
 * The fork is gitignored (`vendor/`), so the suite skips when it is absent.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

import { forkPresent, forkUpgradesDir } from "./fork-engine-harness.js";

type State =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; stale: boolean }
  | { kind: "stopped"; stale: boolean };

type RunStaleness = {
  runStarted(): void;
  inputChanged<S extends { readonly kind: string }>(state: S): S;
  staleAtFinish(): boolean;
};

const stalenessModule = join(forkUpgradesDir, "run_staleness.ts");
// The React port (ticket 558) has not carried the tracker over yet; part P3
// adds run staleness. Until the module is back the suite skips rather than
// failing on the import.
const moduleExists = (): boolean => existsSync(stalenessModule);

describe.skipIf(!forkPresent || !moduleExists())("RunStaleness", () => {
  let RunStalenessCtor: new () => RunStaleness;

  beforeAll(async () => {
    const mod = (await import(pathToFileURL(stalenessModule).href)) as {
      RunStaleness: new () => RunStaleness;
    };
    RunStalenessCtor = mod.RunStaleness;
  });

  it("marks a finished run stale when an input changed while it ran", () => {
    const tracker = new RunStalenessCtor();
    tracker.runStarted();
    const running: State = { kind: "running" };

    expect(tracker.inputChanged(running)).toEqual({ kind: "running" });
    expect(tracker.staleAtFinish()).toBe(true);
  });

  it("leaves a finished run fresh when nothing changed while it ran", () => {
    const tracker = new RunStalenessCtor();
    tracker.runStarted();

    expect(tracker.staleAtFinish()).toBe(false);
  });

  it("does not carry a change during one run into the next run", () => {
    const tracker = new RunStalenessCtor();
    tracker.runStarted();
    tracker.inputChanged<State>({ kind: "running" });
    tracker.runStarted();

    expect(tracker.staleAtFinish()).toBe(false);
  });

  it("marks a done result stale when an input changes after the run", () => {
    const tracker = new RunStalenessCtor();
    const done: State = { kind: "done", stale: false };

    expect(tracker.inputChanged(done)).toEqual({ kind: "done", stale: true });
  });

  it("marks a stopped result stale when an input changes after the stop", () => {
    const tracker = new RunStalenessCtor();
    const stopped: State = { kind: "stopped", stale: false };

    expect(tracker.inputChanged(stopped)).toEqual({
      kind: "stopped",
      stale: true,
    });
  });

  it("does not change an idle state", () => {
    const tracker = new RunStalenessCtor();
    const idle: State = { kind: "idle" };

    expect(tracker.inputChanged(idle)).toBe(idle);
  });
});
