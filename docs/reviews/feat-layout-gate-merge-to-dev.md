# Pre-merge review — feat/layout-gate-merge-to-dev

Reviewed range: `dc83b5542cd00146e7f2f2d697b15aefbbb51977..8975d9d9fec4e71c7bf11c64d00307413257ad88`

Dispatch: three axes, fresh-context subagents on the review lane (Opus). The working tree
was on `feat/tab-bucket2-loose-ends` (not the reviewed branch) during review; all axes
reviewed the committed content at `8975d9d` via `git show`, so the review is valid — the
fork under `vendor/` is gitignored and shared across branches regardless.

## Adversarial

Two findings; the gate's spine (exit-code propagation, fail-closed behaviour) is sound.

**A1 — HIGH — False green: the digest omits the shared breakpoint map the tab's layout is keyed to.**
`check_layout_gate.py` hashes `upgrades_tab.tsx`, `_upgrades_tab.scss`, `_sim_tab.scss`,
`sim_tab.ts`, `upgrades/engine/**/*.ts`. But `_upgrades_tab.scss` drives its width-conditional
layout through Bootstrap `media-breakpoint-*` mixins that resolve against `$grid-breakpoints`
in `ui/scss/shared/_variables.scss` (confirmed present: `$grid-breakpoints: map-merge(...)`),
which is **not hashed**. Concrete trigger: editing `xl: 1200px → 1100px` in that shared file
re-lays the tab at the exact 1280/768/653 widths the gate asserts on, yet `testedTabHash` is
unchanged, so `run()` skips (exit 0) and a broken tab merges untested. Same gap for
`--sim-header-height` (defined in `ui/scss/core/sim_ui/_shared.scss`, drives the sticky
`top:` the gate asserts). The lock `_comment` and ticket assert the hashed set _is_ "the
layout contract"; it demonstrably is not. Both the adversarial and domain axes found this
independently.

**A2 — MEDIUM — Baseline advance is written but never committed.**
On a green run, `check_layout_gate.run()` calls `write_baseline()`, rewriting
`data/wowsims-fork-layout.lock.json` _after_ `merge_to_dev.py`'s clean-tree check (step 2)
has already passed. Control then falls to `git checkout dev` / `git merge` with the write
uncommitted — so the advanced digest never enters the merge (contradicting the script's own
printed "commit it" instruction), every qualifying merge re-pays the full ~2m19s, and the
dirty lock file rides `git checkout dev` onto dev or trips a checkout conflict. Not a
false-green, but it defeats the skip-caching the whole design rests on.

**Cleared:** exit propagation is sound (`test-layout.mjs` `process.exit(1)` on assertion
failure _and_ on crash → `die()` before `git merge`); infra crashes fail **closed** (block,
not swallowed as skip); a missing shell file exits 2 → `die` (blocks); all prereq-absence
skips are genuine absences; all eight asserted CSS classes resolve to the two hashed SCSS
files (the gap is the transitive breakpoint dependency, not a missing named file).

## Domain

**D1 — MEDIUM (same root as A1) — hashed set is narrower than "the tab's rendered layout."**
The digest answers "did the tab's _own_ files move," not "did the tab's _rendered layout_
move." Shared partials (`_shared.scss` for `--sim-header-height`) and the Bootstrap
breakpoint config are transitive layout dependencies outside the set. The two SCSS files
carrying every currently-asserted selector _are_ hashed and shared partials change rarely, so
it is not catastrophic — but the lock `_comment`/docstring overstate completeness. Fix:
widen the digest to the shared SCSS + breakpoint config, or hash the built CSS bundle, or
soften the claim. No false TBC/WCL/wowsims factual claims in the diff.

## Standards + Spec

**Clean — no blocking standards findings.** The script closely models its siblings
(`_fork_gate.py`, `check_engine_port_drift.py`): documented 0/1/2 exit contract, no bare
excepts (every catch names its type), subprocess exit code propagated, Windows path handling
via `pathlib` + `npm.cmd`, comments carry _why_ not _what_. Lock file well-formed and
self-documenting. Spec delivers ticket 325 exactly (wired after merge-ready before `git merge`,
runs under `--check-only`, blocks via `die()`, skips on named prereq absence, content-hash
gate). Two non-blocking notes:

- **S1 — `_layout_command()` trusts `fnm exec --using=22` blindly** (`check_layout_gate.py:189`).
  If fnm has no v22 installed, its error surfaces as `die("... layout is broken")` — a prereq
  gap misreported as a layout break. Low likelihood on the main checkout; worth a probe or comment.
- **S2 — durable-claims:** the ticket/commit "Proven 2026-08-31 … 37 assertions" name commands
  and fork commit `cab940c`, satisfying policy, but can't be re-verified in a fork-absent context.

## Summary

The gate's core mechanism is sound and its fail-direction is correct (infra failures block,
they don't silently skip). But two findings undercut its promise and should be **fixed before
merge, not deferred**: **A1 (HIGH)** — a layout regression via a _shared_ SCSS breakpoint file
leaves the digest unchanged and the gate skips, passing a broken tab; **A2 (MEDIUM)** — the
baseline advance is never committed, so the caching the design depends on doesn't actually work
and a dirty lock file rides onto `dev`. A layout gate that can pass a broken layout is worse
than no gate, so A1 blocks; A2 breaks the "cheap on non-tab merges" property that made
merge-to-dev the right home. Ticket 325 should stay **open** until both land.

## Disposition

| ID  | Axis        | Disposition             | Ticket / note                                                                                                                                                                                                                                       |
| --- | ----------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed (proven, round 2) | HIGH false-green — hashed set widened to the shared SCSS the asserted geometry compiles against (`shared/_variables.scss`, `shared/_global.scss`, `core/sim_ui/_shared.scss`); `_comment`/docstring corrected. Commit `592afc2`. See Round 2 below. |
| A2  | Adversarial | fixed (proven, round 2) | MEDIUM — `run()` gained `on_baseline_advanced`; `merge_to_dev` commits the lock onto the feature branch before `git checkout dev`, tree clean at checkout. Commit `592afc2`. See Round 2 below.                                                     |
| D1  | Domain      | fixed (proven, round 2) | Same root as A1; the widened digest + corrected `_comment`/docstring resolve the overstated-completeness claim. Commit `592afc2`.                                                                                                                   |
| S1  | Standards   | defer                   | `.scratch/carry-forward/issues/338-layout-gate-fnm-node-22-not-verified.md` — fnm-yields-v22 not verified; low likelihood on main checkout.                                                                                                         |
| S2  | Standards   | wontfix                 | Durable-claims satisfied (commands + fork sha named); unre-verifiable only because the fork is gitignored.                                                                                                                                          |

## Round 2 — fixes applied

Both blocking findings fixed on-branch (commit `592afc2`); the corrected baseline
was recorded by a genuine green gate run (commit `dc1c588`). S1 deferred to ticket 338. Fixes and proofs below were run against the shared fork
(`vendor/tbc-new-fork` @ `cab940c`, branch `feat/upgrades-tab`) on Node v22.17.1.

### A1 — widened the hashed set to the shared layout source

`check_layout_gate.py` now hashes, beyond the tab's own files:
`ui/scss/shared/_variables.scss` (`$grid-breakpoints` + the layout tokens the
asserted rules read: `--gap-width`, `--container-padding`, `--section-spacer`,
`--spacer-3`, `--border-default`), `ui/scss/shared/_global.scss` (the `:root`
font-size and the `lg`/`xxl` `!important` spacer overrides), and
`ui/scss/core/sim_ui/_shared.scss` (`--sim-header-height` + the `.sim-content`
host). These are the transitive deps the two tab SCSS files resolve through —
they declare no `@use`/`@import` and consume globally-injected variables, which is
why a shared-file edit re-lays the tab without touching a hashed file.

**Option chosen: (a) hash the source files, not (b) the built CSS bundle.** The
layout test rebuilds the CSS bundle itself as the first step of every run
(`test-layout.mjs` `build()` → `vite build` → `dist/`). The digest's job is to
decide _whether to run the gate at all_, before paying the build, so hashing
`dist/` would hash the _previous_ run's output — stale w.r.t. the current source,
and unable to answer "did the source move?". The digest must be source-derived.
The import graph is small and enumerable (three shared files feed the asserted
geometry), so (a) is both correct and complete for what the gate measures.

**Stated boundary** (now in the lock `_comment` and the script docstring): the
Bootstrap `media-breakpoint-*` mixins themselves live in `node_modules`, pinned by
the fork's lockfile, not in the fork's own source — a Bootstrap bump is governed by
the lockfile, not this digest. The digest covers the fork's own layout source.

Proving commands (run 2026-08-31):

1. **Digest reacts to a shared-file breakpoint edit.** `--print-hash` = `b4456f71…`.
   Added `xl: 1100px` to `$custom-breakpoints` in `ui/scss/shared/_variables.scss`
   (the A1 scenario); `--print-hash` → `07c0dc24…` (changed → the gate would RUN,
   not skip). Reverted the fork edit (`git checkout --`); fork tree clean,
   `--print-hash` back to `b4456f71…`.
2. **Skip regression intact.** With the baseline advanced to `b4456f71…`, a full
   `python scripts/check_layout_gate.py` on unchanged source → `SKIPPED — tab
layout source unchanged`, exit 0 (no ~2m19s run).
3. **Runs + passes on a real change.** The lock held the pre-widening baseline
   (`d4a986e9…`), so the digest differed and the gate RAN the real headless build:
   `37 assertion(s) passed at widths 375, 653, 768, 1280`, exit 0, baseline
   advanced to `b4456f71…`.

### A2 — commit the baseline advance before `git checkout dev`

`check_layout_gate.run()` gained `on_baseline_advanced(lock_path, digest)`, invoked
only after a green run rewrites the lock to a new digest. `merge_to_dev.py` passes
`_commit_layout_baseline`, which `git add`s and commits _only_ the lock onto the
feature branch — so the tree is clean when `git checkout dev` runs and the advanced
digest enters the `--no-ff` merge. Under `--check-only` no callback is passed (no
surprise commit; the dirty lock is tolerated as `--check-only` already tolerates a
dirty tree). Standalone `layout-gate:check`/`main()` pass no callback and keep the
"commit it" print. Skip-clean and fail-closed paths never touch git.

Proving commands (run 2026-08-31):

4. **Decision + callback ordering** (in-process, stubbed gate to avoid the 2m19s):
   digest == baseline → SKIP, gate not entered; digest ≠ baseline + green → events
   `run_gate`, `write_baseline`, `callback` in that order, callback fired exactly
   once with `(LOCK_PATH, digest)` _after_ `write_baseline`; gate FAIL → no
   `write_baseline`, no callback (fail-closed).
5. **End-to-end commit path** (real green run through `_commit_layout_baseline`):
   the callback committed the lock as `dc1c588` "Advance Upgrades-tab layout
   baseline to b4456f71e07a"; `git status --porcelain` clean of the gate's work
   afterward; `git diff --stat HEAD~1 HEAD` on the lock = `2 insertions(+), 2
deletions(-)` (a value change, not an ending flip). `git checkout dev` would
   carry no dirty lock.
