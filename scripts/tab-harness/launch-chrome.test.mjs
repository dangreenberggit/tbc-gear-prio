import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { launchChrome } from "./test-tab-harness.mjs";

// Stand-in browsers: shell scripts that behave like a Chromium that cannot
// start. Ticket 901: the sandbox's seccomp filter made the real one abort with
// this message, and the gate reported only its own timeout.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tbc-fake-chrome-"));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
function fakeChrome(name, body) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
  return file;
}
const FATAL =
  "FATAL:chrome/browser/process_singleton_posix.cc:292] Check failed: . socket() failed: Operation not permitted (1)";

describe.skipIf(process.platform === "win32")("launchChrome", () => {
  it("fails at once with the browser's stderr when it exits at startup", async () => {
    const exe = fakeChrome("dies", `echo '${FATAL}' >&2; exit 134`);
    const t0 = Date.now();
    const err = await launchChrome({ exe, timeoutMs: 15000 }).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain("exited with code 134");
    expect(err.message).toContain(FATAL);
    expect(Date.now() - t0).toBeLessThan(5000);
  });

  it("names the browser's stderr when its endpoint never comes up", async () => {
    const exe = fakeChrome(
      "hangs",
      "echo 'stuck before DevTools listened' >&2; exec sleep 30"
    );
    const err = await launchChrome({ exe, timeoutMs: 800 }).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain("did not come up");
    expect(err.message).toContain("stuck before DevTools listened");
  });
});
