import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  BackendTraffic,
  consoleLine,
  isBackendUrl,
  openRunEvidence,
  tracedSend,
} from "./run-evidence.mjs";

const B = "http://localhost:3333";
const S = 1000;
const STALL = 120 * S;

/** A run that started at t=0, with one sim posted and polled until `until`. */
function trafficWithSim(until, { pollEvery = 5 * S } = {}) {
  const t = new BackendTraffic({ stallMs: STALL });
  t.runStarted(0);
  t.sent("s:1", "POST", `${B}/raidSimAsync?requestId=raidSimAsync-a`, 0);
  t.answered("s:1", 200, 10);
  t.finished("s:1");
  let n = 2;
  for (let at = pollEvery; at <= until; at += pollEvery) {
    const key = `s:${n++}`;
    t.sent(key, "POST", `${B}/asyncProgress?requestId=raidSimAsync-a`, at);
    t.answered(key, 200, at + 5);
    t.finished(key);
  }
  return t;
}

describe("BackendTraffic.stallReason", () => {
  it("says nothing before the run starts", () => {
    const t = new BackendTraffic({ stallMs: STALL });
    t.sent("s:1", "POST", `${B}/computeStats?requestId=x`, 0);
    expect(t.stallReason(10 * STALL, null)).toBeNull();
  });

  it("names a request with no answer", () => {
    const t = new BackendTraffic({ stallMs: STALL });
    t.runStarted(0);
    t.sent("s:1", "POST", `${B}/raidSimAsync?requestId=raidSimAsync-a`, 0);
    expect(t.stallReason(STALL - 1, null)).toBeNull();
    expect(t.stallReason(STALL, null)).toMatch(
      /^backend request POST \/raidSimAsync\?requestId=raidSimAsync-a sent at .* has had no answer for 120 s$/
    );
  });

  it("counts a request sent before the run from the run's start", () => {
    const t = new BackendTraffic({ stallMs: STALL });
    t.sent("s:1", "POST", `${B}/computeStats?requestId=x`, 0);
    t.runStarted(60 * S);
    expect(t.stallReason(60 * S + STALL - 1, null)).toBeNull();
    expect(t.stallReason(60 * S + STALL, null)).toMatch(/no answer for 120 s/);
  });

  it("names a sim the page keeps polling with no final answer", () => {
    const t = trafficWithSim(STALL);
    expect(t.stallReason(STALL, null)).toMatch(
      /^sim raidSimAsync-a \(\/raidSimAsync\) started at .*; the page has polled \/asyncProgress for it for 120 s with no final answer/
    );
  });

  it("forgets a sim once its polls stop", () => {
    // Sim a is polled until 30 s, then sim b until 125 s. At 125 s sim a
    // would have run past the 120 s limit if it were still counted.
    const t = trafficWithSim(30 * S);
    t.sent(
      "s:99",
      "POST",
      `${B}/raidSimAsync?requestId=raidSimAsync-b`,
      60 * S
    );
    t.finished("s:99");
    for (let at = 65 * S; at <= 125 * S; at += 5 * S) {
      t.sent(
        `p:${at}`,
        "POST",
        `${B}/asyncProgress?requestId=raidSimAsync-b`,
        at
      );
      t.finished(`p:${at}`);
    }
    expect(t.stallReason(125 * S, null)).toBeNull();
  });

  it("names a request whose answer came but whose body never finished", () => {
    const t = new BackendTraffic({ stallMs: STALL });
    t.runStarted(0);
    t.sent("s:1", "POST", `${B}/raidSimAsync?requestId=raidSimAsync-a`, 0);
    t.answered("s:1", 200, 2 * S);
    expect(t.stallReason(STALL, null)).toMatch(
      /^backend request POST \/raidSimAsync\?requestId=raidSimAsync-a sent at .* was answered 200 at 1970-01-01T00:00:02\.000Z, but its body has not finished after 120 s$/
    );
  });

  it("drops the requests of a detached session only", () => {
    const t = new BackendTraffic({ stallMs: STALL });
    t.runStarted(0);
    t.sent("w1:1", "POST", `${B}/raidSimAsync?requestId=a`, 0);
    t.sent("w1:2", "POST", `${B}/asyncProgress?requestId=a`, 0);
    t.sent("w10:1", "POST", `${B}/raidSimAsync?requestId=b`, 0);
    expect(t.sessionDetached("w1")).toBe(2);
    expect([...t.inFlight.keys()]).toEqual(["w10:1"]);
    expect(t.counts.detached).toBe(2);
  });

  it("names a page that stopped asking, with the last console line and odd answer", () => {
    const t = trafficWithSim(20 * S);
    t.sent(
      "s:x",
      "POST",
      `${B}/asyncProgress?requestId=raidSimAsync-a`,
      25 * S
    );
    t.answered("s:x", 204, 25 * S);
    t.finished("s:x");
    expect(t.stallReason(25 * S + STALL - 1, "[page] log: hi")).toBeNull();
    expect(t.stallReason(25 * S + STALL, "[page] log: hi")).toMatch(
      /^the page sent no backend request for 120 s \(the last was POST \/asyncProgress at .*\); last console line: \[page\] log: hi; the last answer other than 200 was 204 for POST \/asyncProgress\?requestId=raidSimAsync-a at /
    );
  });

  it("does not apply the no-request rule to a page that never used the backend", () => {
    const t = new BackendTraffic({ stallMs: STALL });
    t.runStarted(0);
    expect(t.stallReason(10 * STALL, null)).toBeNull();
  });

  it("names a failed request in the no-request message", () => {
    const t = new BackendTraffic({ stallMs: STALL });
    t.runStarted(0);
    t.sent("s:1", "POST", `${B}/raidSimAsync?requestId=r`, 0);
    t.failed("s:1", "net::ERR_CONNECTION_REFUSED", S);
    expect(t.stallReason(STALL, null)).toMatch(
      /the last answer other than 200 was net::ERR_CONNECTION_REFUSED for POST \/raidSimAsync\?requestId=r/
    );
  });
});

// Stands in for the backend's pprof endpoint, so no test reaches a real
// backend on :3333.
const GOROUTINES = "stub goroutine dump";
let stub;
let backendOrigin;
beforeAll(async () => {
  stub = http.createServer((_, res) => res.end(GOROUTINES));
  await new Promise((resolve) => stub.listen(0, "127.0.0.1", resolve));
  backendOrigin = `http://127.0.0.1:${stub.address().port}`;
});
afterAll(() => new Promise((resolve) => stub.close(resolve)));

/** A temp checkout with a backend log that already holds an older run's line. */
function tempRun() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "run-evidence-"));
  const backendLog = path.join(root, "backend-3333.log");
  fs.writeFileSync(backendLog, "an older run\n");
  return { root, backendLog, backendOrigin };
}
const read = (dir, file) => fs.readFileSync(path.join(dir, file), "utf8");
const readSummary = (dir) => JSON.parse(read(dir, "summary.json"));

/** Opens evidence watching a fake CDP client; returns it and the event feed. */
async function watchedRun(run) {
  const ev = openRunEvidence({ ...run, label: "t", stallMs: STALL });
  let emit;
  await ev.watch(
    {
      onEvent: (fn) => {
        emit = fn;
      },
      send: async () => ({}),
    },
    async () => ({})
  );
  return { ev, emit };
}

describe("openRunEvidence", () => {
  it("says plainly when the backend wrote nothing to its log", async () => {
    const { ev } = await watchedRun(tempRun());
    await ev.close();
    expect(readSummary(ev.dir).backendLog).toMatch(
      /^the backend wrote nothing to .*backend-3333\.log during the run, so there is no backend\.log; the backend on :3333 may have been started from another checkout/
    );
    expect(read(ev.dir, "recorder.log")).toMatch(
      /backend log: the backend wrote nothing to /
    );
    expect(fs.existsSync(path.join(ev.dir, "backend.log"))).toBe(false);
  });

  it("copies only the backend's lines from this run", async () => {
    const run = tempRun();
    const { ev } = await watchedRun(run);
    fs.appendFileSync(run.backendLog, "this run\n");
    await ev.close();
    expect(read(ev.dir, "backend.log")).toBe("this run\n");
    expect(readSummary(ev.dir).backendLog).toMatch(
      /^backend\.log holds the 9 bytes the backend wrote to /
    );
  });

  it("appends a line noted after close", async () => {
    const { ev } = await watchedRun(tempRun());
    await ev.close();
    ev.note("evidence kept in somewhere");
    expect(read(ev.dir, "recorder.log").trim().split("\n").at(-1)).toMatch(
      /evidence kept in somewhere$/
    );
  });

  it("drops a detached worker's requests and names the worker", async () => {
    const { ev, emit } = await watchedRun(tempRun());
    emit({
      method: "Target.attachedToTarget",
      sessionId: "P",
      params: {
        sessionId: "W",
        targetInfo: { type: "worker", url: "blob:sim-worker" },
      },
    });
    emit({
      method: "Network.requestWillBeSent",
      sessionId: "W",
      params: {
        requestId: "7",
        request: { method: "POST", url: `${B}/raidSimAsync?requestId=a` },
      },
    });
    emit({
      method: "Target.detachedFromTarget",
      sessionId: "P",
      params: { sessionId: "W" },
    });
    await ev.close();
    expect(read(ev.dir, "recorder.log")).toMatch(
      /detached worker 1; it had 1 backend request in flight/
    );
    expect(readSummary(ev.dir).backendRequestsInFlight).toEqual([]);
  });

  it("keeps the error and the first failure when closed twice", async () => {
    const { ev } = await watchedRun(tempRun());
    await Promise.all([
      ev.close(new Error("first")),
      ev.close(new Error("second")),
    ]);
    const summary = readSummary(ev.dir);
    expect(summary.outcome).toBe("failed");
    expect(summary.error).toBe("first");
    expect(read(ev.dir, "backend-goroutines.txt")).toBe(
      `HTTP 200\n${GOROUTINES}`
    );
  }, 20000);

  it("logs each CDP command to cdp-commands.jsonl", async () => {
    const { ev } = await watchedRun(tempRun());
    const send = ev.traceCommands(async (method) => {
      if (method === "Page.navigate") throw new Error("no page");
      return { result: { value: 1 } };
    });
    await send("Runtime.evaluate", { expression: "x".repeat(500) }, "S");
    await expect(send("Page.navigate", { url: "u" })).rejects.toThrow(
      "no page"
    );
    await ev.close();
    const lines = read(ev.dir, "cdp-commands.jsonl")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(lines.map((l) => [l.ev, l.id, l.method])).toEqual([
      ["sent", 1, "Runtime.evaluate"],
      ["answered", 1, "Runtime.evaluate"],
      ["sent", 2, "Page.navigate"],
      ["failed", 2, "Page.navigate"],
    ]);
    expect(lines[0].session).toBe("S");
    expect(lines[0].expression).toBe("x".repeat(200));
    expect(lines[2]).not.toHaveProperty("url");
    expect(lines[3].error).toBe("no page");
  });
});

describe("tracedSend", () => {
  it("times each command and leaves out its params and result", async () => {
    let clock = 1000;
    const records = [];
    const send = tracedSend(
      async () => {
        clock += 250;
        return { big: "result" };
      },
      (t, fields) => records.push({ t, ...fields }),
      () => clock
    );
    expect(await send("DOM.getDocument", { depth: -1 })).toEqual({
      big: "result",
    });
    expect(records).toEqual([
      { t: 1000, ev: "sent", id: 1, method: "DOM.getDocument" },
      { t: 1250, ev: "answered", id: 1, method: "DOM.getDocument", ms: 250 },
    ]);
  });
});

// A recorder stand-in in its own process, so a signal or process.exit ends
// it the way it ends record.mjs.
const CHILD = `
import fs from "node:fs";
import { openRunEvidence } from ${JSON.stringify(new URL("./run-evidence.mjs", import.meta.url).href)};
import { armRunDeadline } from ${JSON.stringify(new URL("./run-guard.mjs", import.meta.url).href)};
const [root, backendLog, backendOrigin, mode] = process.argv.slice(1);
const ev = openRunEvidence({ root, label: "t", stallMs: 120000, backendLog, backendOrigin });
let emit;
await ev.watch({ onEvent: (fn) => { emit = fn; }, send: async () => ({}) }, async () => ({}));
emit({ method: "Network.requestWillBeSent", sessionId: "P", params: { requestId: "7", request: { method: "POST", url: "${B}/raidSimAsync?requestId=a" } } });
emit({ method: "Runtime.consoleAPICalled", params: { type: "log", args: [{ type: "string", value: "hello from the page" }] } });
fs.appendFileSync(backendLog, "this run\\n");
console.log(ev.dir);
if (mode === "deadline")
  armRunDeadline(50, () => {}, "t", { beforeExit: (err) => ev.close(err) });
if (mode === "hung-save")
  armRunDeadline(50, () => {}, "t", { beforeExit: () => new Promise(() => {}), beforeExitMs: 100 });
setInterval(() => {}, 1000);
`;

/** Runs CHILD; sends `signal` once it has opened its evidence. */
function runChild(mode, signal) {
  const run = tempRun();
  const child = spawn(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      CHILD,
      run.root,
      run.backendLog,
      run.backendOrigin,
      mode,
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );
  let dir = null;
  child.stdout.on("data", (chunk) => {
    if (dir !== null) return;
    dir = chunk.toString().split("\n")[0];
    if (signal) child.kill(signal);
  });
  return new Promise((resolve) =>
    child.on("exit", (code, killedBy) => resolve({ code, killedBy, dir }))
  );
}

const lastLines = (dir) => {
  const log = read(dir, "recorder.log");
  expect(log).toMatch(
    /last backend requests:\n.*"url":"\/raidSimAsync\?requestId=a"/
  );
  expect(log).toMatch(
    /last console lines:\n.*\[page\] log: hello from the page/
  );
};

describe("a run that ends without close()", () => {
  it.each([
    ["SIGINT", 130],
    ["SIGTERM", 143],
  ])(
    "keeps its evidence on %s and exits %i",
    async (signal, status) => {
      const { code, killedBy, dir } = await runChild("wait", signal);
      expect({ code, killedBy }).toEqual({ code: status, killedBy: null });
      const summary = readSummary(dir);
      expect(summary.outcome).toBe(`ended by ${signal}`);
      expect(summary.error).toBe(
        `the recorder got ${signal} and stopped the run`
      );
      expect(read(dir, "backend.log")).toBe("this run\n");
      lastLines(dir);
    },
    20000
  );

  it("keeps its evidence and goroutines on the run deadline", async () => {
    const { code, dir } = await runChild("deadline");
    expect(code).toBe(1);
    const summary = readSummary(dir);
    expect(summary.outcome).toBe("failed");
    expect(summary.error).toMatch(/limit \(the run deadline\)$/);
    expect(read(dir, "backend.log")).toBe("this run\n");
    expect(read(dir, "backend-goroutines.txt")).toBe(`HTTP 200\n${GOROUTINES}`);
    lastLines(dir);
  }, 30000);

  it("still exits on the deadline when saving the evidence hangs", async () => {
    const { code, dir } = await runChild("hung-save");
    expect(code).toBe(1);
    expect(readSummary(dir).outcome).toBe("exited before the run was closed");
    lastLines(dir);
  }, 20000);
});

describe("isBackendUrl", () => {
  it("matches the backend port on localhost only", () => {
    expect(isBackendUrl(`${B}/asyncProgress?requestId=a`)).toBe(true);
    expect(isBackendUrl("http://127.0.0.1:3333/raidSimAsync")).toBe(true);
    expect(isBackendUrl("http://localhost:5173/tbc/")).toBe(false);
    expect(isBackendUrl("data:text/plain,x")).toBe(false);
  });
});

describe("consoleLine", () => {
  it("joins console arguments on one line", () => {
    expect(
      consoleLine({
        method: "Runtime.consoleAPICalled",
        params: {
          type: "error",
          args: [
            { type: "string", value: "a\nb" },
            { type: "number", value: 3 },
          ],
        },
      })
    ).toBe("error: a | b 3");
  });

  it("cuts a long line and says how long it was", () => {
    const line = consoleLine({
      method: "Runtime.consoleAPICalled",
      params: {
        type: "log",
        args: [{ type: "string", value: "x".repeat(5000) }],
      },
    });
    expect(line).toMatch(/\.\.\. \(5005 chars\)$/);
    expect(line.length).toBeLessThan(2100);
  });

  it("reads uncaught exceptions and browser log entries", () => {
    expect(
      consoleLine({
        method: "Runtime.exceptionThrown",
        params: {
          exceptionDetails: {
            text: "Uncaught",
            exception: { description: "Error: boom" },
          },
        },
      })
    ).toBe("uncaught: Error: boom");
    expect(
      consoleLine({
        method: "Log.entryAdded",
        params: {
          entry: {
            level: "error",
            source: "network",
            text: "Failed to load",
            url: `${B}/x`,
          },
        },
      })
    ).toBe(`error (network): Failed to load ${B}/x`);
  });

  it("ignores other events", () => {
    expect(
      consoleLine({ method: "Network.loadingFinished", params: {} })
    ).toBeNull();
  });
});
