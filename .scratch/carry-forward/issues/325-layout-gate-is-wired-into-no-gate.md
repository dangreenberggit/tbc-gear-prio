Status: closed
Type: enhancement
Origin: pre-merge review round 5, Adversarial finding A1, 2026-08-28
Blocks: none
Blocked by: none

## Investigated 2026-08-30 (bucket-2 pass) — the constraint decides against CI wiring; left open for an owner placement ruling

Researched how the fork's other gates are invoked, as the ticket directs. The
finding rules out the ticket's assumed home ("the fork's own lint/CI path"):

- **The fork's CI runs almost none of its own npm gates.** The only fork
  workflow that runs tests is `.github/workflows/run_tests.yml`, and it invokes
  exactly one npm script — `npm run test:locales` (line 54) — plus the Go sim
  tests. `npm run lint`, `npm run type-check`, and `npm run test:layout` are
  invoked by **nothing** in `.github/` (grep over `.github/` for `npm run`
  returns only `test:locales` in a workflow; the two other hits are handoff
  SKILL.md docs). So there is no existing fork "lint/CI aggregate" to hook the
  layout gate into — the premise doesn't exist.
- **That CI never fires for this project anyway.** `run_tests.yml` triggers on
  `pull_request` to `master` (upstream wowsims' branch). This fork opens no such
  PRs: `data/wowsims-fork.lock.json` records `"pushed": false`, and the plan (§1)
  keeps any push behind a separate explicit ask. The fork's `.github/` is
  upstream's CI for upstream's PRs, dormant for our work.
- **No headless Chromium in that CI, and the ticket says that decides it.**
  `run_tests.yml` runs on `ubuntu-latest` with Go + Node 22 + protoc and **no**
  Playwright/Chromium install. `test-layout.mjs` drives an on-disk Playwright
  Chromium (`findChromium()` under `~/…/ms-playwright`). Even if the workflow
  fired, the gate could not run there without adding a browser-install step.
- **`pnpm verify` can't be the hard gate either.** It runs on machines where the
  fork is absent (CI, fresh clones) — the engine-port-drift and fork-universe
  checks all *skip* when `vendor/` is missing. A gate that renders the fork's
  built `dist/` can only run from the main checkout, which has the fork + a
  built `dist/tbc` + Chromium.

So the layout gate can only run automatically from **the main checkout, as a
local/pre-merge step**, never in either repo's CI.

## Decision-ready options written 2026-08-30 — awaiting an owner pick

A full plain-English options write-up is at
[`.scratch/carry-forward/325-options.md`](../325-options.md). It lays out four
distinct homes (A: documented pre-merge-review step; B: a warn-only self-skipping
check chained onto `pnpm verify`, modeled on `upstream-drift:warn`; C: just
document the test's existence; D: run it in CI — ruled out, blocked on the
fork's environment and the deferred split-repo thread). Each option has its
cost, what it protects, what it leaves exposed, and its blockers, with every
claim grounded in a file path.

**Recommendation (write-up's):** do **Option B** — wire the layout test onto
`pnpm verify` as a warn-only check that self-skips when the fork / its `dist/` /
Chromium is absent (the `warn_upstream_drift.py` + `_fork_gate.py` pattern this
repo already uses), so it runs unprompted on every push and merge from the main
checkout — and fold in Option A's one useful half (a pre-merge-review line so a
tab-touching branch records the `test:layout` result in `docs/reviews/<branch>.md`).
B is the only option that makes the test run without a human remembering; A and C
keep it a reminder. **Not blocked on the 251/263 split-repo thread** — that thread
is about which upstream source supplies gear presets, which the layout test does
not read. Only Option D (CI) is entangled with it, and D is ruled out.

The gate itself is done and biting (ticket 322, closed); this ticket is only the
"where does it run" decision. On the human-inspection checklist.

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

## Round-2 review fixes (2026-08-31, still closed)

The pre-merge review of `feat/layout-gate-merge-to-dev`
(`docs/reviews/feat-layout-gate-merge-to-dev.md`) found two defects in the gate
wired above. Both are fixed on-branch (commit `592afc2`); this ticket stays
closed because the gate is still wired where it was decided — the fixes harden
the wiring, they do not reopen the "where" question.

- **A1 (HIGH) false green — fixed.** The digest hashed only the tab's own files,
  but the two tab SCSS files import nothing and resolve their asserted geometry
  through globally-injected Sass variables / CSS custom properties, so a
  breakpoint or token edit in a shared file (e.g. `xl: 1200px → 1100px` in
  `ui/scss/shared/_variables.scss`) re-laid the tab at the asserted widths while
  `testedTabHash` stayed put → the gate SKIPPED a broken tab. Fix: the hashed set
  now also covers `shared/_variables.scss` (breakpoints + layout tokens),
  `shared/_global.scss` (root font-size + lg/xxl spacer overrides), and
  `core/sim_ui/_shared.scss` (`--sim-header-height` + the sim-content host). The
  lock `_comment` and script docstring now state what the digest covers and its
  boundary (Bootstrap's own mixins live in `node_modules`, pinned by the
  lockfile, not hashed). Proven: editing `xl` moved the digest `b4456f71 →
  07c0dc24`; revert restored it and left the fork tree clean.
- **A2 (MEDIUM) stranded baseline advance — fixed.** A green run rewrote the lock
  after `merge_to_dev`'s clean-tree check, so the advance never entered the merge
  and the dirty lock rode onto dev. Fix: `check_layout_gate.run()` gained
  `on_baseline_advanced`, which `merge_to_dev` uses to commit the lock onto the
  feature branch before `git checkout dev`. Proven: the callback fires once with
  `(LOCK_PATH, digest)` after `write_baseline` only on the green-advance path; a
  real green run committed the advanced baseline and left the tree clean.

One finding was deferred, not fixed:
`.scratch/carry-forward/issues/338-layout-gate-fnm-node-22-not-verified.md`
(Standards S1 — the `fnm exec --using=22` fallback is not verified to yield a
v22; low likelihood on the main checkout).
