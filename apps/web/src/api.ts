/**
 * Typed fetchers over the server contract (plan steps 7 and 8).
 *
 * The types here restate that contract rather than importing it: the server
 * lives in a sibling slice compiled under a different tsconfig, and the UI
 * must build against the JSON shape it receives, not against a server module.
 */
import type { Ranking, SpecId } from "@tbc-gear-prio/core";
import type { JobProgress } from "./run-state.js";

export type JobStatus = "queued" | "running" | "done" | "error";

export type JobView = {
  id: string;
  status: JobStatus;
  progress: JobProgress;
  result?: Ranking;
  errorKind?: string;
  errorDetail?: string;
  simVersion: string;
  contentHash?: string;
};

export type FightOption = {
  reportCode: string;
  fightId: number;
  encounterName: string;
  killedAt?: string;
  route: "ranked" | "report-events";
  confidence: number;
  salvationUptime?: number;
};

export type LoggedItemView = {
  id: number;
  slot: string;
  name?: string;
  enchant?: number;
  gems?: number[];
};

export type CharacterView = {
  spec: SpecId;
  fights: FightOption[];
  gear: { items: LoggedItemView[] };
};

export type SubmitJob = {
  region: string;
  realm: string;
  name: string;
  spec: SpecId;
  maxPhase?: number;
  reportCode?: string;
  fightId?: number;
};

/**
 * A failed request carries the server's status so a caller can tell "this
 * character is not in the offline build" (404) from "the server broke" —
 * the two need different copy and only one is the user's problem.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.body === undefined
        ? {}
        : { "content-type": "application/json" }),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, await errorMessage(res));
  }
  return (await res.json()) as T;
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
    ) {
      return (body as { message: string }).message;
    }
  } catch {
    // A non-JSON error body is not itself worth reporting; the status is.
  }
  return `request failed (${String(res.status)})`;
}

export function fetchCharacter(
  region: string,
  realm: string,
  name: string
): Promise<CharacterView> {
  const path = [region, realm, name].map(encodeURIComponent).join("/");
  return request<CharacterView>(`/api/characters/${path}`);
}

export function fetchJob(id: string): Promise<JobView> {
  return request<JobView>(`/api/jobs/${encodeURIComponent(id)}`);
}

export function submitJob(
  input: SubmitJob
): Promise<{ id: string; attached: boolean }> {
  return request<{ id: string; attached: boolean }>("/api/jobs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Export URLs are hrefs rather than fetches: the browser's own download of an
 * `attachment` response is what the user wants, and routing the bytes through
 * JS to rebuild that adds a blob URL and nothing else.
 */
export function exportJsonUrl(id: string, itemId?: number): string {
  const q = itemId === undefined ? "" : `?item=${String(itemId)}`;
  return `/api/jobs/${encodeURIComponent(id)}/export.json${q}`;
}

export function shareUrl(id: string, itemId?: number): string {
  const q = itemId === undefined ? "" : `?item=${String(itemId)}`;
  return `/api/jobs/${encodeURIComponent(id)}/share${q}`;
}

export async function fetchShareLink(
  id: string,
  itemId?: number
): Promise<string> {
  const { url } = await request<{ url: string }>(shareUrl(id, itemId));
  return url;
}
