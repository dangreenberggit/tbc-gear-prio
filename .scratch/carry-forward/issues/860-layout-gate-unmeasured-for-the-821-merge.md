Status: open
Type: gap
Origin: `pnpm merge-to-dev fix/821-weapon-damage-order`, 2026-11-08 (dev `460e6b72`)
Blocks: none
Blocked by: none
Related: 401, 820, 856

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
