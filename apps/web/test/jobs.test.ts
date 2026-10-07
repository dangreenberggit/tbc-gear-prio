/**
 * The job API, driven over HTTP against the recorded adapters.
 *
 * Everything here is asserted at the module interface — submit, poll, export —
 * never against `rankUpgrades`' internals or its eight stages, which must stay
 * reorganisable without touching a test.
 */

import { inflateSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyView,
  CURRENT_API_VERSION,
  decodeShareLink,
} from "@tbc-gear-prio/core";
import { createExporters } from "../server/exports.js";
import { MAX_JSON_BODY_BYTES } from "../server/http.js";
import type { JobManager, JobView } from "../server/jobs.js";
import {
  poolWithoutBis,
  realSettingsCodec,
  startServer,
  type JobPoll,
  type TestServer,
} from "./recordings.js";

/** A job manager holding exactly one job in the state a test names. */
function stubJobs(
  view: Partial<JobView> & { status: JobView["status"] }
): JobManager {
  const full: JobView = {
    id: "job_1",
    progress: { stage: view.status, rows: [] },
    simVersion: "v0.0.119-test",
    spec: "ret",
    ...view,
  };
  return {
    submit: () => Promise.reject(new Error("not used")),
    read: (id) => (id === full.id ? full : undefined),
    idle: () => Promise.resolve(),
  };
}

const RET_P2 = {
  character: { region: "US", realm: "dreamscythe", name: "slamaltman" },
  spec: "ret",
  maxPhase: 2,
};

let server: TestServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

async function submit(
  s: TestServer,
  body: unknown = RET_P2
): Promise<{ id: string; attached: boolean }> {
  const res = await s.post("/api/jobs", body);
  expect(res.status).toBe(202);
  return res.body as { id: string; attached: boolean };
}

describe("POST /api/jobs", () => {
  it("accepts a run and answers 202 with a fresh id", async () => {
    server = await startServer();
    const { id, attached } = await submit(server);
    expect(id).toMatch(/^job_/);
    expect(attached).toBe(false);
  });

  it("attaches a second identical submission to the run already in flight", async () => {
    // The sim is held open for the whole test so the window dedupe covers is
    // a state the test controls, not a race against a ~500 ms run.
    server = await startServer();
    server.sim.hold();
    const first = await submit(server);
    const second = await submit(server);

    expect(second.id).toBe(first.id);
    expect(second.attached).toBe(true);
    expect(first.attached).toBe(false);

    server.sim.open();
  });

  it("starts a fresh job for a resubmission after the run has finished", async () => {
    // Dedupe is in-flight only. Holding the key past completion would hand a
    // later client the id of a run it never asked for; the repeat is cheap
    // anyway because `rankUpgrades` answers it from the ranking cache.
    server = await startServer();
    const first = await submit(server);
    const { final } = await server.poll(first.id);
    expect(final.status).toBe("done");

    const again = await submit(server);
    expect(again.id).not.toBe(first.id);
    expect(again.attached).toBe(false);
  });

  it("starts a separate run for a different request", async () => {
    server = await startServer();
    const first = await submit(server);
    const other = await submit(server, { ...RET_P2, maxPhase: 3 });
    expect(other.id).not.toBe(first.id);
    expect(other.attached).toBe(false);
  });

  it("refuses a body that is not a rankable request", async () => {
    server = await startServer();
    const res = await server.post("/api/jobs", { spec: "ret" });
    expect(res.status).toBe(400);
  });

  it("refuses a body past the size cap with 413", async () => {
    // The cap is on the stream, so the assertion is that an oversized body is
    // rejected as oversized rather than parsed and then found invalid — a
    // 400 here would mean the whole thing was buffered first.
    server = await startServer();
    const res = await server.post("/api/jobs", {
      ...RET_P2,
      padding: "x".repeat(MAX_JSON_BODY_BYTES + 1),
    });

    expect(res.status).toBe(413);
    expect((res.body as { error: string }).error).toBe("body-too-large");
  });

  it("answers 404 for a character this build cannot resolve", async () => {
    server = await startServer();
    const res = await server.post("/api/jobs", {
      ...RET_P2,
      character: { ...RET_P2.character, name: "nobodyhere" },
    });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/jobs/:id", () => {
  it("404s an id that was never submitted", async () => {
    server = await startServer();
    const res = await server.get("/api/jobs/job_nope");
    expect(res.status).toBe(404);
  });

  it("reaches done, carrying the ranking and its content hash", async () => {
    server = await startServer();
    const { id } = await submit(server);
    const { final } = await server.poll(id);

    expect(final.status).toBe("done");
    expect(final.result?.items.length).toBeGreaterThan(0);
    expect(final.contentHash).toMatch(/^[0-9a-f]{8,}$/);
    expect(final.simVersion).toBe("v0.0.119-test");
  });

  it("never shrinks the row list while the run progresses", async () => {
    server = await startServer();
    const { id } = await submit(server);
    const { views } = await server.poll(id);

    const counts = views.map((v) => v.progress.rows.length);
    for (let i = 1; i < counts.length; i += 1) {
      expect(counts[i]!).toBeGreaterThanOrEqual(counts[i - 1]!);
    }
    expect(counts.at(-1)).toBeGreaterThan(0);
  });

  it("carries a positive candidate count on the first poll that has one", async () => {
    server = await startServer();
    const { id } = await submit(server);
    const { views } = await server.poll(id);

    const withCandidates = views.find(
      (v) => v.progress.candidates !== undefined
    );
    expect(withCandidates).toBeDefined();
    expect(withCandidates!.progress.candidates).toBeGreaterThan(0);
  });

  it("keeps the candidate count once it is known", async () => {
    // rank.ts emits `simming` from four sites and only one carries
    // `candidates`; a later event must not blank a count the UI already sized
    // its skeleton list against.
    server = await startServer();
    const { id } = await submit(server);
    const { views } = await server.poll(id);

    const firstKnown = views.findIndex(
      (v) => v.progress.candidates !== undefined
    );
    expect(firstKnown).toBeGreaterThanOrEqual(0);
    for (const view of views.slice(firstKnown)) {
      expect(view.progress.candidates).toBeGreaterThan(0);
    }
  });
});

describe("pin-BiS availability", () => {
  it("is true for the committed ret-p2 universe", async () => {
    server = await startServer();
    const { id } = await submit(server);
    const { final } = await server.poll(id);
    expect(applyView(final.result!).pinBisAvailable).toBe(true);
  });

  it("is false for a pool whose entries carry no BiS tag", async () => {
    // No committed universe produces this state — every one of them carries
    // BiS tags — so the reproducible input is a pool injected through Deps,
    // ranked through the same server path as any other run.
    server = await startServer({ pool: poolWithoutBis() });
    const { id } = await submit(server);
    const { final } = await server.poll(id);

    expect(final.status).toBe("done");
    expect(final.result!.items.length).toBeGreaterThan(0);
    expect(applyView(final.result!).pinBisAvailable).toBe(false);
  });
});

describe("exports", () => {
  async function finished(): Promise<{ s: TestServer; view: JobPoll }> {
    const s = await startServer();
    server = s;
    const { id } = await submit(s);
    const { final } = await s.poll(id);
    expect(final.status).toBe("done");
    return { s, view: final };
  }

  it("serves the baseline settings as a JSON attachment", async () => {
    const { s, view } = await finished();
    const res = await s.getRaw(`/api/jobs/${view.id}/export.json`);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/^attachment;/);
    const parsed = JSON.parse(res.text) as {
      apiVersion: number;
      player: { equipment: { items: unknown[] } };
    };
    expect(parsed.apiVersion).toBe(CURRENT_API_VERSION);
    expect(parsed.player.equipment.items).toHaveLength(17);
  });

  it("equips the chosen candidate in the slot its row names", async () => {
    const { s, view } = await finished();
    const row = view.result!.items[0]!;
    const res = await s.getRaw(
      `/api/jobs/${view.id}/export.json?item=${row.itemId}`
    );

    expect(res.status).toBe(200);
    const parsed = JSON.parse(res.text) as {
      player: { equipment: { items: Array<{ id?: number }> } };
    };
    expect(parsed.player.equipment.items.map((i) => i.id)).toContain(
      row.itemId
    );
  });

  it("404s an item that is not a row of this run", async () => {
    const { s, view } = await finished();
    const res = await s.get(`/api/jobs/${view.id}/export.json?item=1`);
    expect(res.status).toBe(404);
  });

  it("builds a share link that decodes back to the chosen item", async () => {
    const { s, view } = await finished();
    const row = view.result!.items[0]!;
    const res = await s.get(`/api/jobs/${view.id}/share?item=${row.itemId}`);

    expect(res.status).toBe(200);
    const { url } = res.body as { url: string };
    expect(url).toContain("wowsims.com/tbc/paladin/retribution/");

    const decoded = decodeShareLink(url, inflateSync);
    expect(decoded.apiVersion).toBe(CURRENT_API_VERSION);
    expect(decoded.player?.equipment?.items.map((i) => i.id)).toContain(
      row.itemId
    );
  });

  it("carries gems and the enchant onto the exported candidate", async () => {
    // D1: the per-item export used to write `{ id }` into the slot, dropping
    // the worn enchant and every gem, so the link did not open the setup the
    // ranker measured. The head slot is the one asserted because slamaltman's
    // recorded helm is both enchanted and gemmed, so a bare swap is visible
    // in two independent fields.
    const { s, view } = await finished();
    const decode = (url: string) =>
      decodeShareLink(url, inflateSync).player!.equipment!.items;
    const shareUrl = async (query = "") =>
      (
        (await s.get(`/api/jobs/${view.id}/share${query}`)).body as {
          url: string;
        }
      ).url;

    const worn = decode(await shareUrl());
    const head = view.result!.items.find((r) => r.slot === "head");
    expect(head).toBeDefined();

    const swapped = decode(await shareUrl(`?item=${head!.itemId}`));
    const index = swapped.findIndex((i) => i.id === head!.itemId);
    expect(index).toBeGreaterThanOrEqual(0);

    // The worn helm is the ranker's starting point for this swap, so what it
    // had is what the export must not silently drop.
    expect(worn[index]!.enchant).toBeGreaterThan(0);
    expect(worn[index]!.gems.length).toBeGreaterThan(0);

    expect(swapped[index]!.enchant).toBe(worn[index]!.enchant);
    expect(swapped[index]!.gems.length).toBeGreaterThan(0);
  });

  it("404s an export for a job id that does not exist", async () => {
    server = await startServer();
    const res = await server.get("/api/jobs/job_nope/export.json");
    expect(res.status).toBe(404);
    expect((res.body as { error: string }).error).toBe("not-found");
  });

  it("refuses an export while a job is still running", async () => {
    // Asserted against a job that *is* running rather than by racing a real
    // one to the finish: a 500 ms run either side of a fetch is a coin toss,
    // and a test that accepts both answers asserts nothing.
    const exporters = createExporters({
      jobs: stubJobs({ status: "running" }),
      codec: realSettingsCodec(),
    });
    const result = exporters.exportJson("job_1");

    expect(result.status).toBe(409);
    expect((result as { json: { error: string } }).json.error).toBe(
      "not-ready"
    );
  });
});
