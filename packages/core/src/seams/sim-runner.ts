/**
 * SimRunner seam — spawn wowsimcli or replay fixtures (PLAN.md §5.3).
 *
 * Hash the request *before* injecting seed/iterations (PLAN.md §7 / R6).
 */

import { createHash } from "node:crypto";

/**
 * Opaque protojson RaidSimRequest until §8.1 generated types land.
 * Callers must not rely on ad-hoc fields beyond what compose produces.
 */
export type RaidSimRequest = Readonly<Record<string, unknown>>;

export type SimRunOpts = {
  seed: number;
  iterations: number;
};

export type SimObservation = {
  dps: number;
  stdev: number;
  iterationsDone: number;
  simVersion: string;
};

export interface SimRunner {
  version(): Promise<string>;
  run(req: RaidSimRequest, opts: SimRunOpts): Promise<SimObservation>;
}

/** Stable key: hash(request) + version + seed + iterations. */
export function simCacheKey(
  req: RaidSimRequest,
  simVersion: string,
  opts: SimRunOpts
): string {
  const body = createHash("sha256").update(stableStringify(req)).digest("hex");
  return `${body}:${simVersion}:${opts.seed}:${opts.iterations}`;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortKeys(obj[key]);
    }
    return out;
  }
  return value;
}

export class RecordedSimRunner implements SimRunner {
  constructor(
    private readonly simVersion: string,
    private readonly recordings: ReadonlyMap<string, SimObservation>
  ) {}

  async version(): Promise<string> {
    return this.simVersion;
  }

  async run(req: RaidSimRequest, opts: SimRunOpts): Promise<SimObservation> {
    const key = simCacheKey(req, this.simVersion, opts);
    const hit = this.recordings.get(key);
    if (!hit) {
      throw new Error(`no recording for sim key ${key}`);
    }
    return hit;
  }
}
