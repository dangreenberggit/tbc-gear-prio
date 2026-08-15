## Status
partial — content complete on both tickets, but `pnpm verify` could not be
run to green because this worktree has no `node_modules` (harness/infra gap,
pre-existing, out of scope for me to fix)

## Branch
w/b3-sync-docs

## Base
- spawned at `55b5a51db1516d349a209ea2831bb5b1f8a28265` · expected
  `cffaee096da40275e0026a1f52bc71db9ace8aed` · corrected: yes (checked out
  `w/b3-sync-docs` from the expected SHA per the prompt's instruction)

## What I did

Ticket 160 (`scripts/check_sync_wowsims.py`, commit `71a35a7`):
- Added a `_PerFilePinHarness` that monkeypatches `sync_wowsims.VENDOR`,
  `LOCKFILE`, `TRACKED`, `PER_FILE_PIN`, `fetch`, and `tag_sha` so
  `do_update()`/`do_restore()` run offline against a temp dir, with a fake
  `fetch()` that encodes the sha it was called with into the returned bytes.
- Added four checks covering all four cases in the ticket's Done when:
  1. `check_update_at_main_pin_leaves_override_untouched` — a plain
     `--update` at the main pin leaves the override's `commit` and vendor
     bytes unchanged, and does NOT add a spurious `commit` key to a
     non-overridden file.
  2. `check_restore_fetches_override_not_main_pin` — `do_restore()` reads
     the per-entry `commit` back and fetches from it.
  3. `check_second_override_entry_round_trips` — a second `PER_FILE_PIN`
     entry round-trips independently of the first, through both
     `do_update()` and `do_restore()`. This was the case flagged
     **untested** in `.scratch/handoffs/wowsims-tab/slice-6/HANDOFF.md:382-384`.
  4. `check_promoting_file_out_of_per_file_pin_is_noop_diff` — once the
     override's commit equals the main pin, removing the file from
     `PER_FILE_PIN` produces an identical lock entry (no `commit` key
     appears either way, and `path`/`sha256`/`bytes` are unchanged).
- All four pass against the current mechanism. This confirms the
  adversarial reviewer's finding: `PER_FILE_PIN` was missing regression
  cover, not carrying a live bug — including the previously-untested
  second-override round-trip, which round-trips cleanly.

Ticket 161 (`PLAN.md`, `.scratch/handoffs/wowsims-tab/slice-6/HANDOFF.md`,
commits `c267b24`, `f15216d`):
- Confirmed `p2.ep-weights.json['pseudoWeights']` is `{'0': 5.34}` (not
  missing) and that `2fdad02` ("Score weapon damage, the term ret cares
  about most", 2026-08-02) is the fixing commit.
- Rewrote `PLAN.md:975-988` (§16 item 3) to record the fix instead of
  describing the defect, with the verify command.
- Confirmed `859eab5` ("File the SME judgment on the refreshed ret P3
  data") exists and contains
  `.scratch/handoffs/sme-rank-judgment-ret-p3-refresh.md` with verdict
  trust-with-caveats.
- Rewrote `.scratch/handoffs/wowsims-tab/slice-6/HANDOFF.md:664-665` to
  point at that filed verdict instead of asserting the review "still has
  not been run".
- Updated both ticket files' `Status` to `resolved` with dated `## Comments`
  sections naming the landing commit and a re-run command.

## Paths touched
- scripts/check_sync_wowsims.py
- PLAN.md (§16 item 3 only)
- .scratch/handoffs/wowsims-tab/slice-6/HANDOFF.md (line 664-665 only)
- .scratch/carry-forward/issues/160-per-file-pin-has-no-check-sync-wowsims-case.md
- .scratch/carry-forward/issues/161-plan-16-item-3-and-slice-6-handoff-are-stale.md
- .scratch/handoffs/ticket-sweep/b3/HANDOFF.md (this file)

## Verification
- `python scripts/check_sync_wowsims.py` → `sync_wowsims.py guard rails ok (10 checks)`
- `python -c "import json;print(json.load(open('data/presets/ret/p2.ep-weights.json'))['pseudoWeights'])"` → `{'0': 5.34}`
- `git log -1 --format=%H 859eab5` → resolves; commit message confirmed via `git show --stat 2fdad02`
- `pnpm run sync-wowsims:unit:check` (via pnpm, same script) → same 10-checks-ok output
- `pnpm verify` → **could not complete**: fails immediately at `typecheck`
  with `'tsc' is not recognized` / `WARN Local package.json exists, but
  node_modules missing, did you mean to install?`. `node_modules/` does not
  exist in this worktree (`ls node_modules` → No such file or directory).
  This is a pre-existing environment gap, not caused by anything in my
  diff — I never touched `package.json`, the lockfile, or any TypeScript
  source, and my forbidden-paths list explicitly excludes
  `package.json`/`pnpm-lock.yaml`. I did not run `pnpm install` because
  that is outside my scoped paths and outside what a docs/test-only slice
  should need to touch.

## Notes / concerns
- **`pnpm verify` cannot go green in this worktree without a `pnpm install`
  first.** I did not run it since installing dependencies is not among my
  allowed paths and could touch files (`node_modules/`, possibly the
  lockfile if versions drifted) outside my slice. Someone with authority
  over the shared environment should run `pnpm install` at the worktree
  root before this branch's `pnpm verify` is treated as a real gate result.
  My own scoped check (`python scripts/check_sync_wowsims.py`, which is
  what `sync-wowsims:unit:check` runs) is green.
- `docs/plans/wowsims-tab/plan.md:322` has the same stale EP-weights claim
  as PLAN.md §16 item 3 had. Per the prompt, this file belongs to worker A3
  this round on a different branch — I did not touch it. Flagging so the
  orchestrator can confirm A3 covers it (or it needs a follow-up ticket if
  A3's branch doesn't touch that line).
- No bugs found in `scripts/sync_wowsims.py` itself — the mechanism is
  correct per all four new checks. Nothing to report under
  pathsForbidden's "if you find a real bug" clause.
- Did not touch `package.json` / `pnpm-lock.yaml` / `packages/*/src/index.ts`.
  No line needed in any of them for this slice.

## Suggested follow-ups
- None beyond the `pnpm install` / environment note above.
