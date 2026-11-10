// The evidence record.mjs keeps for every run, and the stall watchdog that
// reads it (ticket 703).
//
// Two feral recordings once logged "run started" and then nothing until the
// 25-minute limit, while a retry settled in about 5 minutes. The backend's log
// of the failed run was gone when the servers restarted, so nothing showed
// whether the backend stopped answering or the page stopped asking. Each run
// now keeps, in its own folder under .scratch/tab-recordings/logs/:
//
//   console.log             the page's and its workers' console, one line each
//   backend-requests.jsonl  each request to the sim backend: sent, answered,
//                           finished or failed, with times
//   recorder.log            the recorder's own lines and the tab's progress text
//   backend.log             the lines the backend logged during the run, when
//                           `dev-tab.mjs backend` keeps its log (backendLogPath)
//   backend-goroutines.txt  the backend's goroutine dump, when the run failed
//   summary.json            outcome, error, times and request counts
//
// The sims run in the page's web workers, which post to the backend
// (`ui/worker/local_worker.ts` in the fork). A dedicated worker's requests
// reach CDP only on the worker's own session, so the recorder attaches to
// each worker as well as to the page.

import fs from "node:fs";
import path from "node:path";

import { withTimeout } from "./run-guard.mjs";

/** Where `local_worker.ts` in the fork sends every sim call. */
export const BACKEND_ORIGIN = "http://localhost:3333";
export const DEFAULT_STALL_MS = 120 * 1000;
// A sim is still in flight while the page keeps asking for its progress.
const POLL_GAP_MS = 15 * 1000;
const CONSOLE_LINE_MAX = 2000;
const TAIL_LINES = 40;

/** The log `dev-tab.mjs backend` appends to, one per checkout and port. */
export const backendLogPath = (root, port = 3333) =>
  path.join(root, ".scratch", "dev-tab", `backend-${port}.log`);

export function isBackendUrl(url) {
  try {
    const u = new URL(url);
    const backend = new URL(BACKEND_ORIGIN);
    return (
      u.port === backend.port &&
      (u.hostname === "localhost" || u.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

const iso = (ms) => new Date(ms).toISOString();
const secs = (ms) => Math.round(ms / 1000);

/**
 * The backend requests one run made, and the rule that says when the run has
 * stopped. Pure: the caller passes each CDP event's time.
 */
export class BackendTraffic {
  constructor({ stallMs = DEFAULT_STALL_MS } = {}) {
    this.stallMs = stallMs;
    this.inFlight = new Map();
    // requestId (the query parameter the worker adds) -> one async sim.
    this.sims = new Map();
    this.lastSent = null;
    this.oddAnswers = [];
    this.counts = { sent: 0, finished: 0, failed: 0 };
    this.runStartedAt = null;
  }

  sent(key, method, url, now) {
    const { pathname, searchParams } = new URL(url);
    const requestId = searchParams.get("requestId");
    const req = { method, path: pathname, requestId, sentAt: now };
    this.inFlight.set(key, req);
    this.lastSent = req;
    this.counts.sent++;
    if (!requestId) return;
    if (pathname.endsWith("Async") && method === "POST")
      this.sims.set(requestId, {
        path: pathname,
        startedAt: now,
        lastPollAt: now,
      });
    else if (pathname === "/asyncProgress") {
      const sim = this.sims.get(requestId);
      if (sim) sim.lastPollAt = now;
    }
  }

  /** Records an answer other than 200; returns it when it is one. */
  answered(key, status, now) {
    const req = this.inFlight.get(key);
    if (!req) return null;
    req.status = status;
    if (status === 200) return null;
    const odd = { ...req, status, at: now };
    this.oddAnswers.push(odd);
    return odd;
  }

  finished(key) {
    if (this.inFlight.delete(key)) this.counts.finished++;
  }

  failed(key, errorText, now) {
    const req = this.inFlight.get(key);
    if (!req) return null;
    this.inFlight.delete(key);
    this.counts.failed++;
    const odd = { ...req, error: errorText, at: now };
    this.oddAnswers.push(odd);
    return odd;
  }

  runStarted(now) {
    this.runStartedAt = now;
  }

  /**
   * Why the run has stopped, naming what stopped, or null while it moves.
   * Counts only from the Run click; and the "no request" rule applies only
   * once the page has sent the backend anything, because a WASM_WORKER page
   * never does.
   */
  stallReason(now, lastConsoleLine) {
    if (this.runStartedAt === null) return null;
    const since = (t) => Math.max(t, this.runStartedAt);
    for (const req of this.inFlight.values()) {
      const waited = now - since(req.sentAt);
      if (waited >= this.stallMs)
        return `backend request ${req.method} ${req.path}${req.requestId ? `?requestId=${req.requestId}` : ""} sent at ${iso(req.sentAt)} has had no answer for ${secs(waited)} s`;
    }
    for (const [requestId, sim] of this.sims) {
      if (now - sim.lastPollAt > POLL_GAP_MS) {
        this.sims.delete(requestId);
        continue;
      }
      const running = now - since(sim.startedAt);
      if (running >= this.stallMs)
        return `sim ${requestId} (${sim.path}) started at ${iso(sim.startedAt)}; the page has polled /asyncProgress for it for ${secs(running)} s with no final answer (last poll at ${iso(sim.lastPollAt)})`;
    }
    if (this.lastSent === null) return null;
    const quiet = now - since(this.lastSent.sentAt);
    if (quiet < this.stallMs) return null;
    const odd = this.oddAnswers.at(-1);
    return (
      `the page sent no backend request for ${secs(quiet)} s (the last was ${this.lastSent.method} ${this.lastSent.path} at ${iso(this.lastSent.sentAt)}); ` +
      `last console line: ${lastConsoleLine ?? "(none)"}` +
      (odd
        ? `; the last answer other than 200 was ${odd.status ?? odd.error} for ${odd.method} ${odd.path}${odd.requestId ? `?requestId=${odd.requestId}` : ""} at ${iso(odd.at)}`
        : "")
    );
  }
}

/** One console line from a Runtime or Log event, or null for other events. */
export function consoleLine(msg) {
  const p = msg.params;
  let text;
  if (msg.method === "Runtime.consoleAPICalled")
    text = `${p.type}: ${p.args
      .map((a) =>
        a.value !== undefined
          ? typeof a.value === "string"
            ? a.value
            : JSON.stringify(a.value)
          : (a.unserializableValue ?? a.description ?? `[${a.type}]`)
      )
      .join(" ")}`;
  else if (msg.method === "Runtime.exceptionThrown")
    text = `uncaught: ${p.exceptionDetails.exception?.description ?? p.exceptionDetails.text}`;
  else if (msg.method === "Log.entryAdded")
    text = `${p.entry.level} (${p.entry.source}): ${p.entry.text}${p.entry.url ? ` ${p.entry.url}` : ""}`;
  else return null;
  text = text.replace(/\s*\n\s*/g, " | ");
  return text.length > CONSOLE_LINE_MAX
    ? `${text.slice(0, CONSOLE_LINE_MAX)}... (${text.length} chars)`
    : text;
}

/**
 * Opens the run's evidence folder. Lines are buffered and appended once a
 * second, and synchronously when the process exits, so a run that the
 * deadline ends with process.exit still leaves its files.
 */
export function openRunEvidence({ root, label, stallMs, backendLog }) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(
    root,
    ".scratch",
    "tab-recordings",
    "logs",
    `${stamp}-${label}`
  );
  fs.mkdirSync(dir, { recursive: true });
  const openedAt = Date.now();
  const traffic = new BackendTraffic({ stallMs });
  const buffers = new Map();
  const tails = { console: [], requests: [] };
  let lastConsoleLine = null;
  let closed = false;
  const backendLogStart = fs.existsSync(backendLog)
    ? fs.statSync(backendLog).size
    : null;

  const write = (file, line) => {
    if (!buffers.has(file)) buffers.set(file, []);
    buffers.get(file).push(line);
  };
  const flush = () => {
    for (const [file, lines] of buffers) {
      if (!lines.length) continue;
      fs.appendFileSync(path.join(dir, file), lines.join("\n") + "\n");
      lines.length = 0;
    }
  };
  const tail = (list, line) => {
    list.push(line);
    if (list.length > TAIL_LINES) list.shift();
  };
  const stamped = (now, text) =>
    `${iso(now)} +${((now - openedAt) / 1000).toFixed(1)}s ${text}`;
  const note = (text) => write("recorder.log", stamped(Date.now(), text));
  const request = (now, fields) => {
    const line = JSON.stringify({ t: iso(now), ...fields });
    write("backend-requests.jsonl", line);
    tail(tails.requests, line);
  };

  const summary = (outcome, error) => ({
    outcome,
    ...(error ? { error: String(error?.message ?? error) } : {}),
    openedAt: iso(openedAt),
    runStartedAt: traffic.runStartedAt && iso(traffic.runStartedAt),
    closedAt: iso(Date.now()),
    backendRequests: traffic.counts,
    backendRequestsInFlight: [...traffic.inFlight.values()],
    answersOtherThan200: traffic.oddAnswers.slice(-20),
    lastConsoleLine,
    backendLog:
      backendLogStart === null ? `not found: ${backendLog}` : backendLog,
  });

  const flushTimer = setInterval(flush, 1000);
  flushTimer.unref();
  const onExit = () => {
    if (closed) return;
    flush();
    fs.writeFileSync(
      path.join(dir, "summary.json"),
      JSON.stringify(summary("exited before the run was closed"), null, 2) +
        "\n"
    );
  };
  process.on("exit", onExit);

  const sessions = new Map();
  const onEvent = (client) => (msg) => {
    const now = Date.now();
    const p = msg.params ?? {};
    const source = sessions.get(msg.sessionId) ?? "page";
    if (msg.method === "Target.attachedToTarget") {
      const { sessionId, targetInfo } = p;
      if (targetInfo.type !== "worker") return;
      const name = `worker ${sessions.size + 1}`;
      sessions.set(sessionId, name);
      note(`attached ${name}: ${targetInfo.url}`);
      for (const method of ["Network.enable", "Runtime.enable"])
        client
          .send(method, {}, sessionId)
          .catch((err) => note(`${name}: ${method} failed: ${err.message}`));
      return;
    }
    const line = consoleLine(msg);
    if (line !== null) {
      lastConsoleLine = `[${source}] ${line}`;
      write("console.log", stamped(now, lastConsoleLine));
      tail(tails.console, stamped(now, lastConsoleLine));
      return;
    }
    const key = `${msg.sessionId}:${p.requestId}`;
    if (msg.method === "Network.requestWillBeSent") {
      if (!isBackendUrl(p.request.url)) return;
      traffic.sent(key, p.request.method, p.request.url, now);
      const { pathname, search } = new URL(p.request.url);
      request(now, {
        ev: "sent",
        from: source,
        id: p.requestId,
        method: p.request.method,
        url: pathname + search,
      });
    } else if (msg.method === "Network.responseReceived") {
      if (!traffic.inFlight.has(key)) return;
      const odd = traffic.answered(key, p.response.status, now);
      request(now, {
        ev: "answered",
        id: p.requestId,
        status: p.response.status,
      });
      if (odd)
        note(
          `backend answered ${odd.status} to ${odd.method} ${odd.path}${odd.requestId ? `?requestId=${odd.requestId}` : ""}`
        );
    } else if (msg.method === "Network.loadingFinished") {
      if (!traffic.inFlight.has(key)) return;
      traffic.finished(key);
      request(now, { ev: "finished", id: p.requestId });
    } else if (msg.method === "Network.loadingFailed") {
      const odd = traffic.failed(key, p.errorText, now);
      if (!odd) return;
      request(now, { ev: "failed", id: p.requestId, error: p.errorText });
      note(`backend request failed: ${odd.method} ${odd.path}: ${p.errorText}`);
    }
  };

  async function backendGoroutines() {
    try {
      // The backend imports net/http/pprof (sim/web/main.go in the fork).
      return await withTimeout(
        fetch(`${BACKEND_ORIGIN}/debug/pprof/goroutine?debug=2`).then(
          async (res) => `HTTP ${res.status}\n${await res.text()}`
        ),
        10000,
        "the backend's goroutine dump"
      );
    } catch (err) {
      return `could not read the backend's goroutines: ${err.message}`;
    }
  }

  function copyBackendLog() {
    if (backendLogStart === null || !fs.existsSync(backendLog)) return;
    const size = fs.statSync(backendLog).size;
    // A smaller file was replaced during the run; keep all of the new one.
    const from = size < backendLogStart ? 0 : backendLogStart;
    const fd = fs.openSync(backendLog, "r");
    try {
      const buf = Buffer.alloc(size - from);
      fs.readSync(fd, buf, 0, buf.length, from);
      fs.writeFileSync(path.join(dir, "backend.log"), buf);
    } finally {
      fs.closeSync(fd);
    }
  }

  return {
    dir,
    note,
    /** Starts the console and backend-request trace on the page and its workers. */
    async watch(client, send) {
      client.onEvent(onEvent(client));
      await send("Network.enable", {});
      await send("Log.enable", {});
      await send("Target.setAutoAttach", {
        autoAttach: true,
        // Waiting would hold each worker until the recorder resumes it: a
        // stall the recorder itself could cause.
        waitForDebuggerOnStart: false,
        flatten: true,
      });
    },
    runStarted() {
      traffic.runStarted(Date.now());
    },
    stallReason() {
      return traffic.stallReason(Date.now(), lastConsoleLine);
    },
    /** Writes the summary and the backend's side; on failure, its goroutines too. */
    async close(error) {
      if (closed) return;
      if (error) {
        note(`failed: ${error.message ?? error}`);
        fs.writeFileSync(
          path.join(dir, "backend-goroutines.txt"),
          await backendGoroutines()
        );
        write(
          "recorder.log",
          [
            "last backend requests:",
            ...tails.requests,
            "last console lines:",
            ...tails.console,
          ].join("\n")
        );
      }
      closed = true;
      clearInterval(flushTimer);
      process.off("exit", onExit);
      flush();
      copyBackendLog();
      fs.writeFileSync(
        path.join(dir, "summary.json"),
        JSON.stringify(summary(error ? "failed" : "settled", error), null, 2) +
          "\n"
      );
    },
  };
}
