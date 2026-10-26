// Stop a server together with every process it started.
//
// A server leaves children of its own (vite's type checker runs `tsc
// --watch`), and killing only the server orphans them. On Windows taskkill /T
// ends the tree; elsewhere start the server with `detached: true` so it leads
// its own process group, and signal the whole group.
import { spawnSync } from "node:child_process";

// True where a server should be started with `detached: true` so that
// killTree can signal its group.
export const GROUPS = process.platform !== "win32";

export function killTree(child, group = false) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32")
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  else if (group) killGroup(child.pid);
  else child.kill("SIGTERM");
}

// The group outlives its leader: when the server exits on its own, its
// children (tsc --watch) are still running in it.
export function killGroup(pgid) {
  try {
    process.kill(-pgid, "SIGTERM");
  } catch (err) {
    if (err.code !== "ESRCH") throw err;
  }
}
