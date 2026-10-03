// Keeps Windows out of idle standby while a recording runs.
//
// This machine is a Modern Standby (S0 low power idle) system: it enters
// standby when the display idles off. The Claude app's keep-awake does not
// stop that. It calls Electron's powerSaveBlocker.start("prevent-app-
// suspension"), which Chromium turns into PowerRequestExecutionRequired, and
// Microsoft's PowerSetRequest page says that request implies
// PowerRequestSystemRequired only on Traditional Sleep (S3) systems. A
// recording hung ~47 min after an idle-timeout standby entry.
//
// So the recorder holds its own request: a child PowerShell calls
// SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED |
// ES_DISPLAY_REQUIRED) and blocks on stdin. The display flag is there
// because, on battery, Windows ends system-required requests 5 minutes after
// the sleep timeout on Modern Standby (same page); a lit display stops the
// standby entry itself. The hold ends when the child ends: on release(), on
// this process's exit, or, if this process dies without running its exit
// handlers, when Windows closes the child's stdin pipe.

import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";

const HOLD_SCRIPT = `
Add-Type -Namespace TbcKeepAwake -Name Native -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint flags);'
if ([TbcKeepAwake.Native]::SetThreadExecutionState([uint32]'0x80000003') -eq 0) { exit 3 }
[Console]::Out.WriteLine('held')
[void][Console]::In.ReadToEnd()
`;

/**
 * Starts the hold. Resolves to a release function once Windows has accepted
 * the request, or to a no-op with a warning printed when it could not be
 * taken (not Windows, or PowerShell failed). A missing hold does not stop the
 * recording: the run watchdog still ends a stalled run.
 */
export function holdKeepAwake(label) {
  if (process.platform !== "win32") return Promise.resolve(() => {});
  const child = spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-EncodedCommand",
      Buffer.from(HOLD_SCRIPT, "utf16le").toString("base64"),
    ],
    { stdio: ["pipe", "pipe", "ignore"], windowsHide: true }
  );
  const release = () => {
    if (child.exitCode === null && child.signalCode === null) child.kill();
  };
  process.on("exit", release);
  return new Promise((resolve) => {
    let settled = false;
    const giveUp = (why) => {
      if (settled) return;
      settled = true;
      console.warn(
        `${label}: could not hold keep-awake (${why}); an idle standby can still interrupt this recording`
      );
      release();
      resolve(() => {});
    };
    child.on("error", (err) => giveUp(err.message));
    child.on("exit", (code) => giveUp(`PowerShell exited ${code}`));
    child.stdout.on("data", (d) => {
      if (settled || !String(d).includes("held")) return;
      settled = true;
      resolve(release);
    });
  });
}
