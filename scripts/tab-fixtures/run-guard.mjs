// Watchdogs for record.mjs's CDP session.
//
// A recording once hung ~47 min after Windows entered Modern Standby: an
// awaited Runtime.evaluate never returned, so the recorder's own time check,
// which runs only between calls, never ran again. Each guard here ends the
// recording with a message instead of waiting on a call that cannot answer.

import { clearTimeout, setTimeout } from "node:timers";

/**
 * Rejects with a message naming `what` if `promise` has not settled in `ms`.
 */
export function withTimeout(promise, ms, what) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${what} got no answer in ${ms / 1000}s`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Watches a CDP client for events that mean the page cannot finish the run,
 * and wraps send functions so every call fails at once when that happens, or
 * fails after `callTimeoutMs` with no answer.
 *
 * A crash counts from the start. A main-frame navigation or a cleared
 * JavaScript context counts only after `armNavigation()`, because the
 * recorder's own Page.navigate causes both before the run starts. The page
 * session must have sent `Inspector.enable` for crash events to arrive.
 */
export function guardPage(client, { callTimeoutMs }) {
  let lost = null;
  let rejectLost;
  const lostPromise = new Promise((_, reject) => {
    rejectLost = reject;
  });
  // Only calls raced against it observe this rejection.
  lostPromise.catch(() => {});
  let navigationArmed = false;
  const fail = (why) => {
    if (lost) return;
    lost = new Error(why);
    rejectLost(lost);
  };
  const stop = client.onEvent((msg) => {
    if (msg.method === "Inspector.targetCrashed")
      fail("the page crashed (Inspector.targetCrashed)");
    else if (msg.method === "Inspector.detached")
      fail(`the page detached (Inspector.detached: ${msg.params?.reason})`);
    else if (!navigationArmed) return;
    else if (msg.method === "Page.frameNavigated" && !msg.params.frame.parentId)
      fail(
        `the page navigated to ${msg.params.frame.url} during the run (Page.frameNavigated)`
      );
    else if (msg.method === "Runtime.executionContextsCleared")
      fail(
        "the page lost its JavaScript context during the run (Runtime.executionContextsCleared)"
      );
  });
  const wrap = (send) => (method, params) =>
    lost
      ? Promise.reject(lost)
      : withTimeout(
          Promise.race([send(method, params), lostPromise]),
          callTimeoutMs,
          `CDP ${method}`
        );
  return {
    wrap,
    armNavigation: () => {
      navigationArmed = true;
    },
    stop,
  };
}

/**
 * Kills Chrome and exits 1 once `ms` pass, whatever the recorder is awaiting.
 * The backstop for a hang no per-call timeout covers. Returns a disarm
 * function.
 */
export function armRunDeadline(ms, killChrome, label) {
  const timer = setTimeout(() => {
    console.error(
      `${label}: watchdog: the run passed its ${ms / 60000} min limit; killing Chrome and exiting`
    );
    killChrome();
    process.exit(1);
  }, ms);
  return () => clearTimeout(timer);
}
