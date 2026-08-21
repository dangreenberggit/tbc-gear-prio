# Review — `feat/engine-pin-backend-reforge`

Reviewed 2026-08-21. Scope: the engine pin move from `v0.0.101` to the upstream
branch `feature/backend-reforge` (`cbf6b75`), the proto refresh, the two gate
fixes that move forced, and the ticket-244 findings.

**This was a cheap review, not the full three-axis `pre-merge-review` skill.**
One Sonnet reviewer plus the authoring session's own checks. It did not run a
domain (SME) axis. Read the Limits section before treating it as sufficient.

## Verdict

**Merge.** `pnpm verify` passes. The branch is honest about what it did not
achieve, and the thing it set out to do — unblock the owner's feral APL — it
**did not achieve**. That is recorded in ticket 244 rather than papered over,
and is the main reason to read this file before building on the pin.

## What landed

- Pin moved to `feature/backend-reforge` (`cbf6b75`), re-resolved live rather
  than trusting the stale `watchedRefs` sha.
- `data/proto/` refreshed. `apl.proto:149` now declares
  `time_to_next_energy_tick = 89`, with `energy_time_to_target = 91` still
  separate on line 150 — direct confirmation of the ticket's field-89 analysis.
- wowsimcli built from source and proven byte-reproducible under `-trimpath`.
- The fork `feat/upgrades-tab` rebased onto the new base, independently audited.
- `watchedRefs` re-pointed from the stale `33970a8` to `cbf6b75`.
- Two gates re-aimed (see below).

## Findings

### 1. The branch does not unblock the APL — its stated purpose (recorded, not fixed)

The owner's APL uses **three** field groups the old pin lacked, not one. The pin
fixes `timeToNextEnergyTick` and still lacks `selectedPotion` / `selectedConjured`
(`potionId`), which upstream added in `3267f8dfa` on 2026-08-19 — after this
branch last took master. Verified with the repo's own `scripts/apl_schema.py`:

| schema                               | unknown fields in the owner's APL                |
| ------------------------------------ | ------------------------------------------------ |
| `feature/backend-reforge` (this pin) | `selectedConjured`, `selectedPotion`, `potionId` |
| `v0.0.119`                           | NONE                                             |

Same failure mode as the original bug: these sit inside `condition` trees, so
`DiscardUnknown: true` drops the leaves and the guards evaluate something other
than what was written. **Do not land the APL against this pin.**

Not a merge blocker because the branch does not claim to have landed the APL —
but anyone reading "the engine pin moved" and assuming the APL now works would
be wrong.

### 2. `pnpm fetch:wowsimcli` cannot fetch the binary on this pin (accepted, not fixed)

`scripts/fetch_wowsimcli.py:45-48` builds a release-download URL from
`lock["tag"]`. Releases exist for tags only, so a branch ref **404s** (verified).
The `/` in the branch name also splits path construction, so the binary lives at
the nested `vendor/wowsimcli-feature/backend-reforge-win32-x64/` — this is real,
not hypothetical, and is how the working binary was installed.

`vendor/` is gitignored, so nothing in the repo carries the binary. A fresh
clone or CI has only the lockfile and no working door to fetch it.

**Owner decision, recorded:** this repo is not intended to be cloned by others;
it exists for local work and for the fork to raise a PR against
`backend-reforge`. The pin deliberately matches the branch the fork targets, so
that engine and UI are the same codebase. On those terms this is a local
inconvenience rather than a blocker. **It is still an open gap** — the only
route to the binary today is a hand-run build. The reproducible recipe is in
ticket 244; it is not yet wired into any script.

### 3. Two gates were asserting stale premises (fixed, `fc1b13f`)

Both failed _because the pin move succeeded_:

- `cli-sim-runner.test.ts` asserted the literal `"v0.0.101"` while deriving its
  own binary path from `lock.tag`. Now asserts the reported version is one of
  `lock.tag` / `lock.commit` — stronger than before, since it catches a vendored
  binary that is not the one the lockfile claims, and it needs no edit on the
  next pin move.
- `check_build_feral_skeleton.py` fed `timeToNextEnergyTick` to the schema gate
  and required rejection. The field is now declared, so the gate correctly
  accepted it and the check failed for being right, then crashed in
  `relative_to()` on a temp path — a latent bug it only reached because it got
  further than intended. Its sibling check had predicted this exact staleness in
  its own failure message.

Both re-aimed at `selectedPotion`, a real current gap rather than a synthetic
field, so the gate still documents the live blocker.

### 4. `data/wowsims-fork.lock.json` was not updated (deferred — ticket filed)

Ticket 244's prose says "the fork was rebased" as settled fact. The rebase did
happen and was independently audited, but `data/wowsims-fork.lock.json` still
records `branchedFrom: 8aa378b` and the old tip. **The narrative overclaims
relative to the lockfile**, which is exactly what `AGENTS.md`'s durable-claims
rule exists to prevent. Caught by the reviewer, not by the author.

### 5. The lockfile `_comment` lost its watched-refs guidance (deferred — ticket filed)

`sync_wowsims.py --update` regenerates `_comment` from a template, so a
paragraph warning agents not to read `tag` and `watchedRefs` as independent
facts was dropped as a side effect. That paragraph was written _because_ the
mistake had happened twice.

Restoring it verbatim would be wrong: it also asserts that anything on a watched
branch is "reachable from our pin by fast-forward and is available to us" —
non-discriminating ancestry reasoning that was retracted on this branch
(`294d229`). It needs rewriting, not reinstating.

### 6. Claims spot-checked and confirmed

The reviewer independently re-verified the load-bearing factual claims — that
`v0.0.119` is `status: identical` to master, that PR #385 is open / unmerged /
`mergeable_state: dirty`, that `backend-reforge` is 20 ahead and 52 behind
master, that `apl.proto` declares the field, and that all sampled proto sha256s
match the lockfile. **All correct.** No claim was found stated as fact that
could not be verified.

## Standing facts worth knowing

- **wowsims.com/tbc is built from `master`.** `.github/workflows/deploy.yml`
  triggers on `push: branches: [master]` and publishes `dist/tbc` to
  `wowsims/pages-deploy`. `v0.0.119` is `status: identical` to master, so
  v0.0.119 _is_ the site.
- **This pin is therefore not the site.** It is 20 ahead / 52 behind master.
- **The engine change alone is nearly a no-op.** Ret's rotation is
  byte-identical across both pins, so ret isolates the engine: 1909.74 ->
  1909.09 at seed 42, **-0.03%**. Three seeds agree.
- **Feral's shift was the rotation, not the engine.** `feature/backend-reforge`
  ships a rewritten feral rotation (22 actions vs v0.0.101's 12). An earlier
  draft of this file called ~2.4% an engine-wide move; that was wrong, and ret
  is the measurement that shows it.
- **Upstream's new feral rotation is worse on this gear.** Old 12-action
  skeleton on the new engine: 740.67. New 22-action skeleton: 722.55, seed 42,
  20k iterations — about **-18 DPS**. Adopted anyway on the owner's rule that a
  changed upstream rotation is the one we take. **This deserves a domain look:**
  nobody with feral judgment has said whether a rotation regression of that size
  is expected from their rewrite or a sign something is mismatched.
- **Ranking moved further than DPS.** Feral's above-cutoff set went 15 -> 27
  rows, feral-p3's 36 -> 55. Which items read as upgrades changed, not just by
  how much.
- **Upstream PR #385 is open, unmerged and conflicted** (52 commits, 161 files,
  last updated 2026-08-13). If it lands rewritten, `cbf6b75` may have no
  descendant and this pin would reference a commit reachable from nothing.

## Limits of this review

- **Not the three-axis `pre-merge-review`.** No SME/domain axis was run. Nobody
  with game-domain judgment has looked at the -18 DPS feral rotation change to
  say whether it is plausible or a sign of a mismatch.
- **Re-baselining is done for the recorded fixtures** (`d41c46c`): all three
  rows re-recorded on the pinned binary, `simVersion` now the pinned commit.
  Other committed sim numbers in docs and experiment write-ups were **not**
  swept and still quote v0.0.101 figures.
- **No SME has reviewed the -18 DPS rotation regression.** That is the single
  most valuable follow-up on this branch.
- **The rebased fork has never been compiled on its new base** (154 upstream
  commits). Keep `backup/pre-reforge-rebase` in `vendor/tbc-new-fork` until a
  build passes there.
- **`vendor/wowsims` drifted back to `v0.0.101` content mid-session** and was
  restored with `sync_wowsims.py --restore`. Untracked working state, but it
  means a stale vendor tree is reachable in practice — worth a `--check` before
  trusting local sim output.

## Disposition

| ID  | Axis        | Disposition | Note                                                                                                                                                                                                                         |
| --- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | correctness | defer       | Pin does not unblock the APL; owner deferred the APL until an engine supports it. Recorded in `.scratch/carry-forward/issues/244-engine-pin-predates-timetonextenergytick.md`                                                |
| 2   | correctness | defer       | `fetch:wowsimcli` 404s on a branch pin; owner accepted for a local-only repo, gap tracked in `.scratch/carry-forward/issues/244-engine-pin-predates-timetonextenergytick.md`                                                 |
| 3   | correctness | fixed       | Two stale gates re-aimed at `selectedPotion` in `fc1b13f`                                                                                                                                                                    |
| 7   | correctness | fixed       | `record_synthetic_fixtures.mjs` hardcoded the v0.0.101 binary and recorded fixtures on the wrong engine while reporting the old `simVersion`; now reads the lockfile (`d41c46c`)                                             |
| 8   | correctness | fixed       | Full re-record carried the stale file header and tripped the recorder's own `simVersion` guard; a full re-record now starts a fresh file (`d41c46c`)                                                                         |
| 9   | domain      | defer       | Upstream's new feral rotation costs ~18 DPS and moves the above-cutoff set 15 to 27; adopted per owner rule but unreviewed by an SME - `.scratch/carry-forward/issues/250-feral-rotation-regression-unreviewed.md`           |
| 4   | standards   | fixed       | Fork lockfile updated to the post-rebase tip and new `branchedFrom`; should have been fixed during the review rather than filed - see `.scratch/carry-forward/issues/248-fork-lockfile-not-updated-after-rebase.md` (closed) |
| 5   | standards   | defer       | Lockfile `_comment` lost watched-refs guidance — `.scratch/carry-forward/issues/249-lockfile-comment-lost-watched-refs-guidance.md`                                                                                          |
| 6   | spec        | fixed       | Load-bearing claims independently re-verified; all correct, no action needed                                                                                                                                                 |
