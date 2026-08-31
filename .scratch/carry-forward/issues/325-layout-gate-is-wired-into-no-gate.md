Status: closed
Type: enhancement
Origin: pre-merge review round 5, Adversarial finding A1, 2026-08-28
Blocks: none
Blocked by: none

# The Upgrades-tab layout gate runs by hand, not as a gate

Ticket 322 shipped `test-layout.mjs` (fork), a DOM-geometry gate that renders
the Upgrades tab headless and asserts layout facts at 375/653/768/1280. It works
and it bites (proven by a deliberate-failure run). But it was invoked by
**nothing**: `grep test:layout` across the fork's `*.yml`, `package.json`, and
`*.mjs` returned a single hit — the `package.json` script definition itself.

`pnpm verify` does not see the fork (a documented fact, ticket 322 itself), and
no fork CI or aggregate script called `test:layout`. So ticket 322's own premise —
"a gate that runs and catches the next regression" — was only half met: the
script existed but had to be run **by hand**, exactly like the manual browser
checks it was meant to replace.

## Why it wasn't wired in the 322 round

The fork's gate set is its own `npm run` scripts; the natural home is the fork's
lint/CI path, not the main repo's `pnpm verify`. Wiring it there is a small but
real decision (does it run on every fork push? only pre-merge? is a headless
Chromium available in whatever CI the fork uses?) that was out of scope for the
322 build, which was told to build the gate, not re-architect the fork's CI.

## Resolution (2026-08-31, feat/layout-gate-merge-to-dev)

Wired into the **`pnpm merge-to-dev`** path — the owner's chosen placement, over
the options file's Option-B (`pnpm verify`) recommendation. `pnpm verify` runs on
every push and in CI, where the fork/dist/Chromium do not exist and the ~2m19s
cost would be paid every time; `pnpm merge-to-dev` runs on the main checkout, at
the moment a feature ships, only when asked — the right cadence for a slow,
prereq-heavy gate.

- **New:** `scripts/check_layout_gate.py`. Runs `npm run test:layout` in the fork
  under Node 22 (`fnm exec --using=22` when the ambient node is older).
- **Insertion point:** `scripts/merge_to_dev.py` calls `check_layout_gate.run()`
  after `pnpm verify` and the merge-ready check pass, before the `git merge`. It
  also runs under `--check-only`. A real failure calls `die(...)` and blocks.
- **Fork-aware change detection (content hash, not merge diff).** The fork is a
  separate, gitignored git repo whose history is not keyed to this repo's
  branches, so a "did this merge touch a tab file?" check against the main diff
  answers "no" every time (confirmed: even `feat/wowsims-tab-tickets` shows zero
  fork files in `git show --stat`). Instead the gate hashes the fork's layout
  source — `upgrades_tab.tsx`, `_upgrades_tab.scss`, `_sim_tab.scss`,
  `sim_tab.ts`, and `upgrades/engine/**/*.ts` (37 files) — into one sha256 and
  compares it to `data/wowsims-fork-layout.lock.json`'s `testedTabHash`, the
  digest recorded at the last green run. Equal → the tab source that last passed
  is unchanged → skip. Different → run. A green run advances the recorded digest
  (commit it). Same shape as `scripts/check_engine_port_drift.py`.
- **Skip-clean semantics** (exit 0, one-line reason), modelled on the port-drift /
  `_fork_gate.py` pattern and distinguished from "ran and failed": fork absent
  (fresh clone / CI), built `dist/` absent (no prior `make host`), Chromium /
  Node 22 absent, or digest unchanged. Only a real `test:layout` assertion
  failure returns nonzero.
- `pnpm layout-gate:check` runs it standalone.

### Proving commands (run 2026-08-31 against the main checkout's fork,
`vendor/tbc-new-fork` @ cab940c)

1. **Skip on unchanged source** — `python scripts/check_layout_gate.py` with the
   live digest equal to `testedTabHash` → `SKIPPED -- tab layout source
   unchanged`, exit 0.
2. **Skip on absent prereqs** — fork absent, `dist/tbc/lib.wasm` absent, and
   `test-layout.mjs` absent each → `SKIPPED`, exit 0 (never a fail).
3. **Block on broken layout** — set `_upgrades_tab.scss` `position: sticky` →
   `static`, run the gate: it RAN and reported `settings-outer-container
   position: static -- expected sticky` at all 4 widths, exit 1, baseline NOT
   advanced. Fork file restored to sticky (`git checkout --`), tree clean, digest
   back to `d4a986e9...`.
4. **Run + pass on changed source** — forced a digest mismatch, ran the gate on
   the real layout: `37 assertion(s) passed at widths 375, 653, 768, 1280`, exit
   0, baseline advanced to the live digest.

The gate itself is done; this ticket asked only for the "where", which is now
decided and wired. Closed.
