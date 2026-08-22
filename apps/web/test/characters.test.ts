/**
 * `GET /api/characters/:region/:realm/:name` — what the character page reads
 * before anything is ranked.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { startServer, type TestServer } from "./recordings.js";

type CharacterBody = {
  spec: string;
  character: { region: string; realm: string; name: string };
  fights: Array<{ reportCode: string; fightId: number; encounterName: string }>;
  gear?: { items: Array<{ slot: string; id: number }> };
};

let server: TestServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe("GET /api/characters/:region/:realm/:name", () => {
  it("resolves a recorded character with its fights and worn gear", async () => {
    server = await startServer();
    const res = await server.get("/api/characters/US/dreamscythe/slamaltman");

    expect(res.status).toBe(200);
    const body = res.body as CharacterBody;
    expect(body.spec).toBe("ret");
    expect(body.fights.length).toBeGreaterThan(0);
    expect(body.gear?.items).toHaveLength(17);
  });

  it("404s a character this offline build has no recording for", async () => {
    server = await startServer();
    const res = await server.get("/api/characters/US/dreamscythe/nobodyhere");

    expect(res.status).toBe(404);
    expect((res.body as { detail: string }).detail).toContain("not a recorded");
  });

  it("404s an unknown region rather than guessing one", async () => {
    server = await startServer();
    const res = await server.get("/api/characters/XX/dreamscythe/slamaltman");
    expect(res.status).toBe(404);
  });

  it("matches the name and realm case-insensitively", async () => {
    // A player types their name the way it renders in game; the recordings key
    // on lowercase. Rejecting "Slamaltman" would be a 404 that reads as
    // "you have never raided".
    server = await startServer();
    const res = await server.get("/api/characters/US/Dreamscythe/Slamaltman");
    expect(res.status).toBe(200);
  });
});

describe("api 404s", () => {
  it("answers an unknown /api path with JSON, never the SPA", async () => {
    server = await startServer();
    const res = await server.getRaw("/api/jobs/anything/nope");

    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(JSON.parse(res.text)).toMatchObject({ error: "not-found" });
  });
});

describe("static serving", () => {
  /**
   * A stand-in for `apps/web/dist`, so this suite does not need `vite build`
   * to have run. What is under test is the fallback policy, not vite's output.
   */
  let staticDir: string;

  beforeAll(() => {
    staticDir = mkdtempSync(join(tmpdir(), "tbc-web-static-"));
    writeFileSync(
      join(staticDir, "index.html"),
      "<!doctype html><div id=root>"
    );
    mkdirSync(join(staticDir, "assets"));
    writeFileSync(join(staticDir, "assets", "app.js"), "export default 1;\n");
  });

  afterAll(() => {
    rmSync(staticDir, { recursive: true, force: true });
  });

  it("serves a client route from index.html so a deep link works", async () => {
    server = await startServer({ staticDir });
    const res = await server.getRaw("/run/anything");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.text).toContain("id=root");
  });

  it("serves a real asset with its own content type", async () => {
    server = await startServer({ staticDir });
    const res = await server.getRaw("/assets/app.js");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/javascript");
  });

  it("404s a missing asset instead of answering it with the page", async () => {
    // The fallback is for client routes. Answering a missing bundle with an
    // HTML 200 turns a stale build into a MIME-type error in the console
    // rather than the 404 that names the problem.
    server = await startServer({ staticDir });
    const res = await server.getRaw("/assets/gone.js");
    expect(res.status).toBe(404);
  });

  it("refuses a path that climbs out of the static root", async () => {
    server = await startServer({ staticDir });
    const res = await server.getRaw("/../../package.json");
    expect(res.text).not.toContain('"name"');
  });

  it("keeps answering /api with JSON even when a SPA is served", async () => {
    server = await startServer({ staticDir });
    const res = await server.getRaw("/api/jobs/anything");

    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
  });
});
