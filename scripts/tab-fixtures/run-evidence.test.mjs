import { describe, expect, it } from "vitest";

import { BackendTraffic, consoleLine, isBackendUrl } from "./run-evidence.mjs";

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
    const t = trafficWithSim(30 * S);
    t.sent(
      "s:99",
      "POST",
      `${B}/raidSimAsync?requestId=raidSimAsync-b`,
      60 * S
    );
    t.finished("s:99");
    for (let at = 65 * S; at <= 100 * S; at += 5 * S) {
      t.sent(
        `p:${at}`,
        "POST",
        `${B}/asyncProgress?requestId=raidSimAsync-b`,
        at
      );
      t.finished(`p:${at}`);
    }
    expect(t.stallReason(100 * S + 1, null)).toBeNull();
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
