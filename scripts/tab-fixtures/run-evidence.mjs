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
//   cdp-commands.jsonl      each CDP command the recorder sent: method, session,
//                           sent time, then answered in N ms or failed
//   recorder.log            the recorder's own lines and the tab's progress text
//   backend.log             the lines the backend logged during the run, when
//                           `dev-tab.mjs backend` keeps its log (backendLogPath);
//                           summary.json says when it wrote none
//   backend-goroutines.txt  the backend's goroutine dump, when the run failed
//   summary.json            outcome, error, times and request counts
//
// The sims run in the page's web workers, which post to the backend
// (`ui/worker/local_worker.ts` in the fork). A dedicated worker's requests
// reach CDP only on the worker's own session, so the recorder attaches to
// each worker as well as to the page.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { withTimeout } from "./run-guard.mjs";

/** Where `local_worker.ts` in the fork sends every sim call. */
export const BACKEND_ORIGIN = "http://localhost:3333";
export const DEFAULT_STALL_MS = 120 * 1000;
// A sim is still in flight while the page keeps asking for its progress.
const POLL_GAP_MS = 15 * 1000;
const CONSOLE_LINE_MAX = 2000;
const EXPRESSION_MAX = 200;
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
    this.counts = { sent: 0, finished: 0, failed: 0, detached: 0 };
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
    req.answeredAt = now;
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

  /**
   * Drops the requests of a CDP session that went away: an ended worker sends
   * no more events for them, so they would read as unanswered. Keys start
   * with the session id (`${sessionId}:${requestId}`). Returns how many.
   */
  sessionDetached(sessionId) {
    let dropped = 0;
    for (const key of [...this.inFlight.keys()])
      if (key.startsWith(`${sessionId}:`)) {
        this.inFlight.delete(key);
        dropped++;
      }
    this.counts.detached += dropped;
    return dropped;
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
      if (waited < this.stallMs) continue;
      const what = `backend request ${req.method} ${req.path}${req.requestId ? `?requestId=${req.requestId}` : ""} sent at ${iso(req.sentAt)}`;
      return req.status === undefined
        ? `${what} has had no answer for ${secs(waited)} s`
        : `${what} was answered ${req.status} at ${iso(req.answeredAt)}, but its body has not finished after ${secs(waited)} s`;
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
 * Wraps a CDP send so each command is logged when sent and when it is
 * answered or fails. Params and results are left out because they can be
 * large; a Runtime.evaluate keeps the start of its expression, enough to tell
 * which call it was. A command that never returns shows as a "sent" line with
 * no outcome.
 */
export function tracedSend(send, record, now = Date.now) {
  let n = 0;
  return (method, params, sessionId) => {
    const id = ++n;
    const sentAt = now();
    const expression =
      method === "Runtime.evaluate" ? params?.expression : undefined;
    record(sentAt, {
      ev: "sent",
      id,
      method,
      ...(sessionId ? { session: sessionId } : {}),
      ...(typeof expression === "string"
        ? { expression: expression.slice(0, EXPRESSION_MAX) }
        : {}),
    });
    return send(method, params, sessionId).then(
      (result) => {
        const t = now();
        record(t, { ev: "answered", id, method, ms: t - sentAt });
        return result;
      },
      (err) => {
        const t = now();
        record(t, {
          ev: "failed",
          id,
          method,
          ms: t - sentAt,
          error: String(err?.message ?? err),
        });
        throw err;
      }
    );
  };
}

/**
 * Opens the run's evidence folder. Lines are buffered and appended once a
 * second. Each way a run ends writes summary.json and backend.log, and on a
 * failure first notes the error and the last backend requests and console
 * lines in recorder.log:
 *
 * - close(), from record.mjs or from the run deadline (armRunDeadline waits
 *   a bounded time for it); on a failure it also keeps the goroutine dump.
 * - SIGINT or SIGTERM, synchronously, then exit with 128 + the signal number.
 * - any other process.exit, synchronously from the exit hook.
 *
 * A line noted after close() is appended at once.
 */
export function openRunEvidence({
  root,
  label,
  stallMs,
  backendLog,
  backendOrigin = BACKEND_ORIGIN,
}) {
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
  let failedWith = null;
  let closing = null;
  let closed = false;
  const backendLogStart = fs.existsSync(backendLog)
    ? fs.statSync(backendLog).size
    : null;

  const write = (file, line) => {
    // Nothing flushes after close, and record.mjs still notes where the
    // evidence went.
    if (closed) {
      fs.appendFileSync(path.join(dir, file), line + "\n");
      return;
    }
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

  const errorText = (error) => String(error?.message ?? error);
  const summary = (outcome, backendLogNote) => ({
    outcome,
    ...(failedWith ? { error: errorText(failedWith) } : {}),
    openedAt: iso(openedAt),
    runStartedAt: traffic.runStartedAt && iso(traffic.runStartedAt),
    closedAt: iso(Date.now()),
    backendRequests: traffic.counts,
    backendRequestsInFlight: [...traffic.inFlight.values()],
    answersOtherThan200: traffic.oddAnswers.slice(-20),
    lastConsoleLine,
    backendLog: backendLogNote,
  });

  const fail = (error) => {
    if (failedWith) return;
    failedWith = error;
    note(`failed: ${errorText(error)}`);
    write(
      "recorder.log",
      [
        "last backend requests:",
        ...tails.requests,
        "last console lines:",
        ...tails.console,
      ].join("\n")
    );
  };
  const finish = (outcome) => {
    if (closed) return;
    clearInterval(flushTimer);
    process.off("exit", onExit);
    for (const [signal, handler] of onSignal) process.off(signal, handler);
    const backendLogNote = copyBackendLog();
    note(`backend log: ${backendLogNote}`);
    flush();
    closed = true;
    fs.writeFileSync(
      path.join(dir, "summary.json"),
      JSON.stringify(summary(outcome, backendLogNote), null, 2) + "\n"
    );
  };

  const flushTimer = setInterval(flush, 1000);
  flushTimer.unref();
  const onExit = () => {
    fail(new Error("the process exited before the recorder closed the run"));
    finish("exited before the run was closed");
  };
  process.on("exit", onExit);
  // A handler replaces Node's default exit on these signals, so it must exit.
  const onSignal = ["SIGINT", "SIGTERM"].map((signal) => [
    signal,
    () => {
      fail(new Error(`the recorder got ${signal} and stopped the run`));
      finish(`ended by ${signal}`);
      process.exit(128 + os.constants.signals[signal]);
    },
  ]);
  for (const [signal, handler] of onSignal) process.on(signal, handler);

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
    if (msg.method === "Target.detachedFromTarget") {
      const name = sessions.get(p.sessionId) ?? `session ${p.sessionId}`;
      const dropped = traffic.sessionDetached(p.sessionId);
      note(
        `detached ${name}; it had ${dropped} backend request${dropped === 1 ? "" : "s"} in flight`
      );
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
        fetch(`${backendOrigin}/debug/pprof/goroutine?debug=2`).then(
          async (res) => `HTTP ${res.status}\n${await res.text()}`
        ),
        10000,
        "the backend's goroutine dump"
      );
    } catch (err) {
      return `could not read the backend's goroutines: ${err.message}`;
    }
  }

  /** Copies the run's part of the backend log; returns what summary.json says of it. */
  function copyBackendLog() {
    if (backendLogStart === null) return `not found: ${backendLog}`;
    if (!fs.existsSync(backendLog))
      return `${backendLog} was removed during the run`;
    const size = fs.statSync(backendLog).size;
    // A smaller file was replaced during the run; keep all of the new one.
    const from = size < backendLogStart ? 0 : backendLogStart;
    if (size === from)
      return (
        `the backend wrote nothing to ${backendLog} during the run, so there is no backend.log; ` +
        "the backend on :3333 may have been started from another checkout or without `node scripts/dev-tab.mjs backend`"
      );
    const fd = fs.openSync(backendLog, "r");
    try {
      const buf = Buffer.alloc(size - from);
      fs.readSync(fd, buf, 0, buf.length, from);
      fs.writeFileSync(path.join(dir, "backend.log"), buf);
    } finally {
      fs.closeSync(fd);
    }
    return `backend.log holds the ${size - from} bytes the backend wrote to ${backendLog} during the run`;
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
    /** Logs each command `send` sends to cdp-commands.jsonl. */
    traceCommands(send) {
      return tracedSend(send, (t, fields) =>
        write(
          "cdp-commands.jsonl",
          JSON.stringify({
            t: iso(t),
            ...fields,
            ...(fields.session
              ? { session: sessions.get(fields.session) ?? fields.session }
              : {}),
          })
        )
      );
    },
    // The deadline and record.mjs's finally can both close a failed run; the
    // first error is the one the summary keeps.
    close(error) {
      closing ??= (async () => {
        if (error) {
          fail(error);
          const goroutines = await backendGoroutines();
          if (closed) return;
          fs.writeFileSync(
            path.join(dir, "backend-goroutines.txt"),
            goroutines
          );
        }
        finish(failedWith ? "failed" : "settled");
      })();
      return closing;
    },
  };
}
