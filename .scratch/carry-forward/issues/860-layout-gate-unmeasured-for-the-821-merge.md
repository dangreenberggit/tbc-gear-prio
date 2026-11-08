Status: closed
Type: gap
Origin: `pnpm merge-to-dev fix/821-weapon-damage-order`, 2026-11-08 (dev `460e6b72`)
Blocks: none
Blocked by: none
Related: 401, 820, 856, 861

# The 821 merge put a changed tab on dev without a layout measurement

## What happens

The 821 branch changed the tab's layout source, so the merge ran the layout
gate. All 11 fixtures printed ok, then `test-layout.mjs` stopped while
building the workers bundle:

```
Error: listen EPERM: operation not permitted /tmp/claude-1000/tsx-1000/11977.pipe
LAYOUT_GATE_VERDICT {"outcome":"unmeasured","reason":"vite.build-workers exited 1 ..."}
layout gate: SKIPPED -- test-layout.mjs exited 1 before it measured the whole tab
```

The merge ran inside the Claude Code sandbox, which refuses the tsx CLI's
IPC pipe. `check_layout_gate.py` reports `unmeasured` as a skip and exits 0
(ticket 401), so the merge went ahead and `data/wowsims-fork-layout.lock.json`
on dev still records the tab source from before 821. The next merge that
reaches the gate tests the 821 tab change too.

`docs/reviews/feat-headless-run-no-orphans.md:78-88` records a way past the
pipe in the sandbox: run the makefile's `npx tsx vite.build-workers.mts`
step as `node --import <checkout>/node_modules/tsx/dist/loader.mjs
vite.build-workers.mts`.

## Done when

The layout gate gives a green verdict on dev's tab source (fork `68b2afacf`
or later) and the layout lock on dev records that digest; and either the
gate's workers build no longer needs the tsx IPC pipe, or this ticket names
the command an owner runs outside the sandbox to measure it.

## Closing note (2026-11-08)

Verified by:
`PLAYWRIGHT_BROWSERS_PATH=/home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/2026-11-03-p45-runs/pwshim python scripts/check_layout_gate.py`
in the pair `tbc-wt/gate-pipe` (branch `fix/860-layout-gate-tsx-pipe`, fork
`68b2afacf`), inside the Claude Code sandbox: verdict `measured`, pass, 496
checks passed and 0 failed at widths 375, 653, 768 and 1280 over the 11
fixtures. It advanced `data/wowsims-fork-layout.lock.json` to `5267aca2...`,
which this branch commits. Log:
`/home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/2026-11-08-860-gate-headless-shell.log`.

The workers build no longer needs the tsx IPC pipe:
`scripts/tab-harness/test-tab-harness.mjs` now runs
`node --import tsx vite.build-workers.mts`, and the same gate run without the
shim built the whole bundle in the sandbox
(`.scratch/agent-reports/2026-11-08-860-gate-normal-chromium.log`).

That run then stopped at a second sandbox block, ticket 861: the gate's
Chromium aborts with `socket() failed: Operation not permitted`. The green run
above therefore used the shim, whose `chromium-1200/chrome-linux64/chrome` is
a symlink to Playwright's headless-shell build of the same Chromium
(143.0.7499.4), as tickets 754 and 800
(`800-desktop-gate-goldens-for-more-specs.md`) did. The digest is the same either way,
because it hashes the browsers.json entry, not the binary:
`python scripts/check_layout_gate.py --print-hash` prints `5267aca2...` with
and without the shim. To measure the tab source on disk on the gate's own
Chromium, run this outside the sandbox (it writes no lock):

```
cd /home/daniel/Code/lulz/tbc-wt/gate-pipe && node scripts/tab-harness/test-layout.mjs
```
