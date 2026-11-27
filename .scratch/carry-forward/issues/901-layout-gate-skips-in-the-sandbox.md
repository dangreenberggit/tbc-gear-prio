Status: closed
Type: bug (tooling)
Origin: .scratch/agent-reports/2026-11-26-general-task-900-layout-gate.md
Blocks: none
Blocked by: none
Related: 861, 900, 902

# The layout gate silently skips when `pnpm merge-to-dev` runs in the sandbox

## What happens

During the 900 merge (`dev` `acddaca3`), the layout gate's fixture checks
passed and `test-layout.mjs` then stopped with `Chromium CDP endpoint did
not come up`. The verdict was `unmeasured`, which the merge treats as a
skip, so the change merged without a layout measurement.

## Cause

The sandbox's seccomp filter refuses `socket(AF_UNIX)` (`[Errno 1]
Operation not permitted`). Full Playwright Chromium needs one at startup
and aborts: `FATAL:chrome/browser/process_singleton_posix.cc:292] Check
failed: . socket() failed: Operation not permitted (1)`, exit 134. The
harness starts Chromium with `stdio: "ignore"`
(`scripts/tab-harness/test-tab-harness.mjs:205-255`), so that message is
lost and the gate only sees its 20 s timeout.

Earlier in-sandbox passes worked because their agents set
`PLAYWRIGHT_BROWSERS_PATH` to the shim
`.scratch/agent-reports/2026-11-03-p45-runs/pwshim`, whose `chrome` is a
symlink to `chrome-headless-shell`, which needs no such socket. Nothing
in `docs/` or `scripts/` names the shim, and it lives in a gitignored
folder.

The pass recorded after the merge (`dev` `8cb2f52c`) used the shim:

```
PLAYWRIGHT_BROWSERS_PATH=/home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/2026-11-03-p45-runs/pwshim pnpm layout-gate:check
```

## Done when

`pnpm merge-to-dev` run inside the sandbox measures the layout with no
environment variable set, and a Chromium that fails to start shows its
own stderr in the gate's output in place of only the timeout.

Untested: whether the headless shell lays the page out exactly like full
Chromium. Every in-sandbox pass so far has used it.

## Closed (2026-11-26, branch `fix/901-layout-gate-sandbox`)

Every tab harness now launches Playwright's headless shell, and
`launchChrome` quotes the browser's stderr when it fails to start.
`pnpm merge-to-dev --check-only` in the sandbox, with no environment
variable set, measured the layout and passed.

The "Untested" question is answered: the two do not lay text out alike.
Both pass every check, but 9301 of 21405 element boxes moved by more than
2 px (`.scratch/agent-reports/2026-11-26-901-layout-compare/README.md`).
Whether the desktop runs should change browser too was put to the user
before the merge.

Verified by: docs/reviews/fix-901-layout-gate-sandbox.md
