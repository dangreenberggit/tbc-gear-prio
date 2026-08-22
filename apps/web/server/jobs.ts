/**
 * The job manager: submit a `RankInput`, run `rankUpgrades` in this process,
 * and store progress a poller can render.
 *
 * ## Why the dedupe key is not the content hash
 *
 * PLAN.md §12 wants a resubmission to attach to the run already in flight
 * rather than start a second one. The obvious key is `contentHash`, but
 * `rankUpgrades` computes that *inside* the run, after it has read gear —
 * so at submit time it does not exist yet. The key here is therefore the
 * canonical JSON of the `RankInput`, which is what the client actually sent.
 *
 * The two keys answer different questions and both are wanted. `submitKey`
 * dedupes *in-flight* work: two browsers asking for the same character at the
 * same time share one run. `contentHash` dedupes *across* runs, and
 * `rankUpgrades` already does that itself through the ranking cache in the
 * `Store`. The job row carries the content hash once the run has produced it.
 */

import {
  compose,
  rankUpgrades,
  RankError,
  type Deps,
  type Progress,
  type RaidSimRequest,
  type RankedItem,
  type Ranking,
  type RankInput,
  type SpecId,
  type Store,
} from "@tbc-gear-prio/core";
import { equipmentFromLogged } from "./equipment.js";

export type JobStatus = "queued" | "running" | "done" | "error";

export type JobProgress = {
  readonly stage: string;
  readonly done?: number;
  readonly total?: number;
  /**
   * How many candidates this run will sim. Carried on the first `simming`
   * event only, so a UI can size a skeleton list once the cap has decided.
   */
  readonly candidates?: number;
  /** Rows in arrival order — the ranking order is applied at completion. */
  readonly rows: readonly RankedItem[];
};

export type JobView = {
  readonly id: string;
  readonly status: JobStatus;
  readonly progress: JobProgress;
  readonly result?: Ranking;
  readonly errorKind?: string;
  readonly errorDetail?: string;
  readonly simVersion: string;
  readonly contentHash?: string;
  /** Which spec was ranked — the exporters pick a wowsims page from it. */
  readonly spec: SpecId;
  /**
   * The worn-gear request this run measured everything against, kept so an
   * export ships the setup that was simmed rather than a re-derivation of it.
   * Present once the run has read gear.
   */
  readonly baselineRequest?: RaidSimRequest;
};

export type SubmitResult = {
  readonly id: string;
  /** True when this submission joined a run that was already going. */
  readonly attached: boolean;
};

/** Builds the adapters for one run, or explains why it cannot. */
export type DepsFor = (input: RankInput) =>
  | { readonly ok: true; readonly deps: Deps }
  | {
      readonly ok: false;
      readonly status: 400 | 404;
      readonly message: string;
    };

export type CreateJobManagerInput = {
  readonly store: Store;
  readonly depsFor: DepsFor;
  readonly clock: () => Date;
  readonly simVersion?: string;
};

export type SubmitOutcome =
  | { readonly ok: true; readonly result: SubmitResult }
  | { readonly ok: false; readonly status: number; readonly message: string };

type JobRecord = {
  id: string;
  status: JobStatus;
  progress: {
    stage: string;
    done?: number;
    total?: number;
    candidates?: number;
  };
  rows: RankedItem[];
  result?: Ranking;
  errorKind?: string;
  errorDetail?: string;
  contentHash?: string;
  simVersion: string;
  spec: SpecId;
  baselineRequest?: RaidSimRequest;
};

export type JobManager = {
  submit(input: RankInput): Promise<SubmitOutcome>;
  read(id: string): JobView | undefined;
  /** Resolves when no run is in flight — tests await this instead of sleeping. */
  idle(): Promise<void>;
};

export function createJobManager(input: CreateJobManagerInput): JobManager {
  const { store, depsFor, clock } = input;
  const simVersion = input.simVersion ?? "unknown";

  const jobs = new Map<string, JobRecord>();
  /**
   * submitKey → the job serving it. Kept after the run finishes, not only
   * while it is in flight: a browser that reloads and re-posts the same
   * request wants the ranking it already paid for, and re-running would spend
   * the sims again to reach the same numbers. The entry is dropped only when
   * the run failed, so a retry after an error is a real retry.
   */
  const byKey = new Map<string, string>();
  const running = new Set<Promise<void>>();
  let seq = 0;

  async function submit(rankInput: RankInput): Promise<SubmitOutcome> {
    const key = submitKey(rankInput);
    const attachedTo = byKey.get(key);
    if (attachedTo !== undefined) {
      return { ok: true, result: { id: attachedTo, attached: true } };
    }

    const built = depsFor(rankInput);
    if (!built.ok) {
      return { ok: false, status: built.status, message: built.message };
    }

    seq += 1;
    const id = `job_${seq}`;
    const record: JobRecord = {
      id,
      status: "queued",
      progress: { stage: "queued" },
      rows: [],
      simVersion,
      spec: rankInput.spec,
    };
    jobs.set(id, record);
    byKey.set(key, id);

    // The job row is the durable half; `jobs` above is what a poll reads.
    // `contentHash` is not known yet (see the module comment), so the row is
    // created with an empty one and patched when the run produces it.
    await store.job.create({ contentHash: "", input: rankInput });

    const run = execute(record, rankInput, built.deps).finally(() => {
      if (record.status === "error") byKey.delete(key);
    });
    running.add(run);
    void run.finally(() => running.delete(run));

    return { ok: true, result: { id, attached: false } };
  }

  async function execute(
    record: JobRecord,
    rankInput: RankInput,
    deps: Deps
  ): Promise<void> {
    record.status = "running";
    try {
      const ranking = await rankUpgrades(rankInput, deps, (p) => {
        applyProgress(record, p);
      });
      record.contentHash = ranking.contentHash;
      if (ranking.complete) {
        record.result = ranking;
        record.baselineRequest = await composeBaseline(
          deps,
          rankInput,
          ranking
        );
        record.status = "done";
      } else {
        // Only reachable once something passes `Deps.signal`; nothing here
        // does yet, so this is the branch that keeps a future Stop control
        // from silently storing a partial ranking as a finished one.
        record.status = "error";
        record.errorKind = "incomplete";
        record.errorDetail = "the run was stopped before it finished";
      }
    } catch (err: unknown) {
      record.status = "error";
      record.errorKind = err instanceof RankError ? err.kind : "internal";
      record.errorDetail = err instanceof Error ? err.message : String(err);
    }
    void clock();
  }

  function read(id: string): JobView | undefined {
    const record = jobs.get(id);
    if (!record) return undefined;
    return {
      id: record.id,
      status: record.status,
      progress: { ...record.progress, rows: [...record.rows] },
      simVersion: record.simVersion,
      spec: record.spec,
      ...(record.baselineRequest === undefined
        ? {}
        : { baselineRequest: record.baselineRequest }),
      ...(record.result === undefined ? {} : { result: record.result }),
      ...(record.errorKind === undefined
        ? {}
        : { errorKind: record.errorKind }),
      ...(record.errorDetail === undefined
        ? {}
        : { errorDetail: record.errorDetail }),
      ...(record.contentHash === undefined
        ? {}
        : { contentHash: record.contentHash }),
    };
  }

  async function idle(): Promise<void> {
    while (running.size > 0) {
      await Promise.all([...running]);
    }
  }

  return { submit, read, idle };
}

/**
 * The worn-gear request, re-composed from the fight the run actually resolved.
 *
 * The ranker does not hand its baseline request back — a `Ranking` carries
 * numbers and provenance, not protobuf — so the export rebuilds it from the
 * same three inputs the ranker used: this fight's logged gear, the spec's
 * skeleton, and the race the assumptions record. `readGear` is a cache hit by
 * this point, so no second fetch happens.
 */
async function composeBaseline(
  deps: Deps,
  rankInput: RankInput,
  ranking: Ranking
): Promise<RaidSimRequest> {
  const gear = await deps.gear.readGear({
    reportCode: ranking.fight.reportCode,
    fightId: ranking.fight.fightId,
  });
  return compose(deps.raidSimSkeleton, {
    name: rankInput.character.name,
    race: ranking.assumptions.race,
    equipment: equipmentFromLogged(gear),
  });
}

/**
 * `rank.ts` emits `simming` from three places and only the first carries
 * `candidates`, so a later event must not blank a count the UI has already
 * sized its skeleton list against.
 */
function applyProgress(record: JobRecord, p: Progress): void {
  if ("kind" in p) {
    record.rows.push(p.row);
    return;
  }
  if (p.stage === "simming") {
    record.progress = {
      stage: p.stage,
      done: p.done,
      total: p.total,
      ...(p.candidates === undefined
        ? record.progress.candidates === undefined
          ? {}
          : { candidates: record.progress.candidates }
        : { candidates: p.candidates }),
    };
    return;
  }
  record.progress = {
    stage: p.stage,
    ...(record.progress.candidates === undefined
      ? {}
      : { candidates: record.progress.candidates }),
  };
}

/**
 * Canonical JSON of the input — keys sorted, so two clients that serialise
 * the same request in a different field order still share one run.
 */
export function submitKey(input: RankInput): string {
  return JSON.stringify(sortKeys(input));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) out[k] = sortKeys(obj[k]);
    return out;
  }
  return value;
}
