// Stop a server together with every process it started.
//
// A server leaves children of its own (vite's type checker runs `tsc
// --watch`), and killing only the server orphans them. On Windows taskkill /T
// ends the tree; elsewhere start the server with
// `detached: USE_PROCESS_GROUPS` so it leads its own process group, and stop
// it with killTree, which signals the whole group.
import { spawnSync } from "node:child_process";

export const USE_PROCESS_GROUPS = process.platform !== "win32";

// The group is signalled even after the server has exited: its children
// (tsc --watch) are still running in it. A child that was not started
// detached leads no group, so it falls back to a plain kill.
export function killTree(child, group = USE_PROCESS_GROUPS) {
  // A child that failed to spawn has no pid and nothing to stop.
  if (child.pid === undefined) return;
  if (process.platform !== "win32" && group && killGroup(child.pid)) return;
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32")
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  else child.kill("SIGTERM");
}

// Returns false when no such group exists.
export function killGroup(pgid) {
  try {
    process.kill(-pgid, "SIGTERM");
    return true;
  } catch (err) {
    if (err.code !== "ESRCH") throw err;
    return false;
  }
}
