# Ticket sweep 154–164 — process state

Disk-canonical orchestration state. Owner: the Opus orchestrator. Updated at
every transition. If the session dies, resume from this file.

Companion docs: [`plan.md`](plan.md), [`orchestration.md`](orchestration.md).

## Bases (resolved by `git rev-parse`, never hand-typed)

| Branch | Base SHA | How created |
| --- | --- | --- |
| `feat/sweep-tab-tickets` (A) | `dcec568f1f790ee2224d33fec1a82ea4c0f33676` (this file's own commit, on top of `a48594a`) | `git checkout -b feat/sweep-tab-tickets a48594a…` in the main checkout `C:/Users/dgree/Code/lulz/tbc-gear-prio`, then the PROCESS.md commit |
| `feat/sweep-ret-tickets` (B) | `cffaee096da40275e0026a1f52bc71db9ace8aed` | `git worktree add C:/Users/dgree/Code/lulz/tbc-gear-prio-wt-sweep-ret -b feat/sweep-ret-tickets cffaee0` |

Note: `orchestration.md` names `e1f460c` as branch A's base. The actual tip of
`feat/shopping-list-wowsims-tab` at spawn time was `a48594a` (the plan commit,
a descendant of `e1f460c`). `a48594a` is authoritative — confirmed by
`git -C C:/Users/dgree/Code/lulz/tbc-gear-prio rev-parse HEAD`.

Branch B's `node_modules` confirmed present, not merely exit-code-0:
`ls C:/Users/dgree/Code/lulz/tbc-gear-prio-wt-sweep-ret/node_modules` → 11 entries,
`node_modules/.bin/vitest` present.

The pre-existing worktree `C:/Users/dgree/Code/lulz/tbc-gear-prio-wt-ret-p3-data`
(`feat/ret-p3-data` @ `cffaee0`) is **not** touched by this sweep.

## Fan-in brief

### Partition

Round 1, five workers in parallel:

| Worker | Base | Worker branch | Tickets |
| --- | --- | --- | --- |
| A1 | `a48594a` | `w/a1-155-parity` | 155 |
| A2 | `a48594a` | `w/a2-162-v1` | 162 (v1 half only) |
| A3 | `a48594a` | `w/a3-156-ew2` | 156 (measurement) |
| B1 | `cffaee0` | `w/b1-ep-weights` | 159 → 158 → 154, in that order |
| B3 | `cffaee0` | `w/b3-sync-docs` | 160, 161 |

Round 2, one worker, after fan-in 1:

| Worker | Base | Worker branch | Tickets |
| --- | --- | --- | --- |
| B2 | tip of `feat/sweep-ret-tickets` after fan-in 1 | `w/b2-relic-pool` | 157, 163, 164 |

B2 runs in round 2 because it shares `scripts/assemble_universe.py` and
`data/universes/**` with B1. That is a sequencing problem, not a fan-out.

### Path ownership

| Worker | Owns |
| --- | --- |
| A1 | `packages/core/test/wowsims-fork-parity.test.ts` and its fixtures; `.scratch/handoffs/wowsims-tab/slice-2/HANDOFF.md` |
| A2 | the Upgrades tab assumptions drawer (`upgrades/**`) and one test |
| A3 | `docs/plans/wowsims-tab/plan.md` (§5 and the serving recipe) |
| B1 | `scripts/assemble_universe.py`, `data/presets/**`, the new EP-weights index (JSON + generated TS), `packages/core/src/cli.ts`, `data/universes/**` |
| B3 | `scripts/check_sync_wowsims.py`, `PLAN.md` §16 item 3, `.scratch/handoffs/wowsims-tab/slice-6/HANDOFF.md` |
| B2 (round 2) | `scripts/assemble_universe.py` (pool admission), `packages/core/src/rank.ts`, `packages/core/src/dead-slots.ts`, rank-report / HTML renderer, `data/universes/ret-*.json`, `.scratch/handoffs/wowsims-tab/ret-p3-ranking/**` |

Owned by **no worker**: `package.json`, `pnpm-lock.yaml`,
`packages/*/src/index.ts`. A worker needing a line there writes it verbatim in
its handoff; the orchestrator applies it at fan-in.

Disjointness check across round 1: A1/A2/A3 touch three different trees
(`packages/core/test`, `upgrades/`, `docs/plans/`). B1 and B3 share no file —
B1 owns the assembler and universes, B3 owns the sync checker and two docs. No
path appears in two round-1 slices.

### Conflict policy

No `-X ours`, no `-X theirs`. Every conflict is read and resolved by the
orchestrator by hand. The fan-in is **editorial**, not mechanical (A3 and B1
make measurement claims that must be re-run), so the delegator merges.

### Claims to re-check at fan-in

| Claim | Command the orchestrator re-runs |
| --- | --- |
| A1: perturbing `pairedReplicateSe` now fails E-W3 | the worker's stated mutation command, then revert |
| A3: any E-W2 wall-clock number | inspect the recorded method; numbers that cannot be reproduced must be labelled untested by the worker |
| B1: regenerated universes are byte-stable | re-run `python scripts/assemble_universe.py` for one spec and diff against the committed tree |
| B1: 253 vs 256 feral entry count | read the worker's stated evidence |
| B2: 27484 present in fixture and in the regenerated ranking | the ticket-163 python one-liner |
| B2: ranged section carries a local note | read the ranged section of the regenerated HTML report |

### Per-slice acceptance

Each ticket's own "Done when" section, as narrowed by `plan.md`'s per-ticket
table. `pnpm verify` green in the worker's worktree before handoff.

## Out of scope (all workers)

- Any merge to `dev`; `pnpm merge-to-dev`; `TBC_ALLOW_DEV_MERGE`.
- Ticket 162 v2 (opt-in toggle, fork shim, `epScore` pseudo channel).
- Implementing libram proc effects in the fork (163 layer 3).
- Editing `AGENTS.md`, `CLAUDE.md`, or any file under `.claude/skills/`.
- Merging `feat/ret-p3-data` into anything.

## Status log

- 2026-08-14 — Preconditions done. Main checkout clean; branch A created at
  `a48594a`; branch B worktree created at `cffaee0` with deps installed and
  `node_modules` confirmed. PROCESS.md written. Next: spawn round 1 (A1, A2,
  A3, B1, B3).
- 2026-08-14 — **Round 1 spawned**, five workers, `model: sonnet`,
  `isolation: worktree`. Post-spawn `git worktree list` confirmed every worker
  at its named base, but only after the workers ran their own assertions:
  every worktree was created on `origin/main` (`55b5a51`) by default, and each
  worker checked out its correct base itself. B3 was still sitting at
  `55b5a51` on the auto-named branch at the first check and had corrected to
  `cffaee0` on `w/b3-sync-docs` by the second. This re-confirms the Claude
  Code adapter's note: worktree basing ignores the delegator's branch, and the
  prompt-level assertion is the only thing that makes the fan-out usable.

  Confirmed bases: `w/a1-155-parity` `dcec568`, `w/a2-162-v1` `dcec568`,
  `w/a3-156-ew2` `dcec568`, `w/b1-ep-weights` `cffaee0`, `w/b3-sync-docs`
  `cffaee0`.

  In flight: all five. Next transition: collect handoffs, then fan-in 1
  (A1/A2/A3 → `feat/sweep-tab-tickets`; B1/B3 → `feat/sweep-ret-tickets`).

- 2026-08-14 — **Structural discovery: the wowsims fork is invisible to
  isolated worktrees.** Workers A2 and A3 both returned blocked, independently
  and for the same underlying reason.

  The Upgrades tab and the fork engine are not in this repository. They live in
  a **nested, separately-versioned clone** at
  `C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork`, which is its
  own git repo on branch `feat/upgrades-tab` at `adb0d1353`, and which the main
  repo **gitignores**. `git worktree add` does not carry gitignored paths, so a
  worktree-isolated worker cannot see it.

  Verified:
  - `git -C vendor/tbc-new-fork rev-parse HEAD` → `adb0d135336a26eab613215fa85b1265d7ce2e5d`, branch `feat/upgrades-tab`.
  - `ui/core/components/individual_sim_ui/upgrades/data/data.ts:88` defines `epWeightsFor` — ticket 162 names this as `upgrades/data/data.ts`, a path relative to the fork, not to this repo.
  - `git grep -l epWeightsFor feat/sweep-tab-tickets` matches only the ticket and a slice-3 handoff — no source file in this repo.

  Consequence for path ownership: **fork-side commits land in
  `vendor/tbc-new-fork`'s own history, not on `feat/sweep-tab-tickets`.** The
  branch-A review must say so, or a reader will look for tab changes in this
  repo's log and conclude nothing shipped.

  Per-worker effect:
  - **A2** (ticket 162) — blocked, committed `1b601d5`. Needs the fork. Respawned without isolation.
  - **A3** (ticket 156) — blocked, committed `86de068`. Its worktree has no `vendor/` directory at all. Needs the fork (`vite.build-workers.mts`, `dist/tbc`). Respawned without isolation.
  - **A1** (ticket 155) — **not** blocked. Its worktree does contain a `vendor/tbc-new-fork` directory carrying the engine sources, so it can read them. Note that directory is a plain copy, not the nested repo: `git -C .claude/worktrees/agent-abd559c4ed6de1152/vendor/tbc-new-fork rev-parse HEAD` returns the *main* repo's SHA. A1 may therefore read fork sources and run temporary mutations, but cannot commit fork-side changes — which its slice does not require, since the test it edits lives in `packages/core`.
  - **B1, B3** — unaffected; their tickets are Python and docs in this repo. B3 has committed `71a35a7`.

  **Respawn policy for A2 and A3.** Both run *without* worktree isolation,
  sharing the main checkout. That breaks the isolation rule deliberately, so
  strict path ownership is the compensating control and is non-negotiable:
  A2 writes only `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/**`
  plus ticket 162; A3 writes only `docs/plans/wowsims-tab/plan.md` plus ticket
  156 (and may run, not commit, fork builds). Their main-repo file sets are
  disjoint, and each commits only its own paths. This is tolerable only
  because the main-repo edits are few and file-disjoint.

  Correction to the A1 bullet above, from A1's own handoff: A1's worktree did
  **not** ship with `vendor/`. A1 copied `vendor/tbc-new-fork` and
  `vendor/wowsims` in from the main checkout itself, and ran `pnpm install`,
  so that E-W3 and the full suite would run instead of silently skipping.
  Nothing was added to git (both paths are gitignored). Every worker spawned
  this way hits the same gap; A1 worked around it, A2 and A3 could not.

- 2026-08-14 — **Round 1 results.** All five workers returned.

  **A1 — success.** `ea6f46b`, `59f5d70`, merged to branch A as `f443445`.
  Ticket 155 `resolved`. Broadened E-W3 to two seeds (`[11, 22]`) and three
  candidates, adding two socketed Lightbringer pieces that cross the 2pc
  threshold, so gem-fill/meta-repair and set-bonus completion are exercised
  together. **Fixture extended, not regenerated** — the ticket's open question,
  measured rather than assumed. Mutation table re-run: `meetsCutoff` ×1000
  fails, `pairedReplicateSe` `+0.001` **now fails** (it passed before this
  ticket — the defect 155 was filed for), and `computeSynergy` `+0.001` fails.
  A1 found and fixed a trap of its own: a single shared DPS offset cancels out
  of `candidate − baseline`, which would have hidden the very mutation it was
  adding. Honest residual: mutating `fillEmptyCandidateGems` to return `[]`
  still does **not** fail E-W3, because observations are canned by request
  hash — recorded in the handoff, not omitted.

  **A2 — success, with a gap I closed at fan-in.** Fork commit `57a84f1e4`;
  main-repo commit `b79fe16`. Ticket 162 stays `open` by design (v2 unbuilt).
  A2 could not reach `upgrades_tab.tsx` (one directory above its scope), so
  the disclosure existed in data and tests but rendered nowhere — ticket 162's
  first criterion was not met end to end. **Fixed by the orchestrator**, fork
  commit `179de35a4`: passes `epWeightsSourceFor(specId)` into the `Deps`
  literal, renders the `ep-weights-source` standing assumption in the drawer,
  adds the `ep_weights` i18n key. Verified `npx tsc --noEmit -p tsconfig.json`
  exit 0 and A2's own 3 tests still pass.

  **A3 — partial, honestly.** Worktree run `063f69a` established the fork is
  unrecoverable from a fresh worktree: the pinned commit was never pushed
  (`git ls-remote` finds neither the branch nor `adb0d13`; the lockfile's
  `"pushed": false` agrees). The respawn then produced `25d341d` + `5c481f4`,
  which **answers ticket 156's leading hypothesis**: served the production
  build instead of the vite dev server and measured single-candidate baselines
  of 5.3 s / 13.4 s / 12.1 s at 4 workers, against the dev server's "93 s, did
  not finish". Two to three orders of magnitude. A3 flagged rather than
  smoothed that those three runs are mutually inconsistent (3,000 iterations
  slower than 5,000), labelled the polling-interference explanation
  **hypothesis, untested**, and recorded that the Browser pane is
  non-displayed so visibility throttling is not ruled out. The 20-candidate
  table was not attempted. Ticket 156 correctly stays `open`.

  **B1 — success, and it corrected the plan.** `c37b8e7`, `217d62f` on
  `w/b1-ep-weights`. **Tickets 158 and 159 were already resolved on base
  `cffaee0` before this sweep began** — verified independently:
  `git show cffaee0:.scratch/carry-forward/issues/158-*.md` and `159-*.md` both
  read `Status: resolved`, and `git show cffaee0:packages/core/src/ep-weights.ts`
  exists. `plan.md` was written against a stale reading of `feat/ret-p3-data`.
  Ticket 154's file **did not exist** on `cffaee0` — it was filed on the
  branch-A side — so B1 filed it fresh on B. Root cause found: `curatedSets` is
  deliberately unscoped full-provenance since `d1da985`, but `02f2f85` wrongly
  predicted `feral-p2.json` would stay byte-identical, which holds only for the
  phase-scoped `bisTags`/`bisSets`. Regenerated `feral-p2`; `feral-p3` and all
  four `ret-p*` were already byte-identical. The plan's 256-vs-253 figure
  **did not reproduce** (253 both sides; pure field drift) — carried over from
  the branch-A filing, unreconciled.

  **B3 — partial (content complete).** `c267b24`, `f15216d`, `71a35a7`,
  `f6bab9c`. Tickets 160 and 161 both `resolved`. Four offline cases added to
  `check_sync_wowsims.py`; the previously untested second-`PER_FILE_PIN`-entry
  round-trip does round-trip cleanly. Its `pnpm verify` failed only for want of
  `node_modules` in its worktree — an environment gap, not its diff, and gated
  on the integrated tip instead.

- 2026-08-14 — **Fan-in 1, branch A. Complete and green.**

  Merged `w/a1-155-parity` as `f443445`. A2 and A3 had committed directly to
  the branch (they ran unisolated), so no merge was needed for them.

  **Integration failure found and fixed:** A2's fork commits changed two
  *ported* engine files, so `check_engine_port_drift.py` failed — the
  silent-drift case it exists to catch. Per that checker's own instruction, I
  re-ran E-W3 **first** (`npx vitest run
  packages/core/test/wowsims-fork-parity.test.ts --testTimeout=60000` → green,
  so the port is still behaviour-equivalent), and only then updated the two
  `PROVENANCE.md` hashes, recording *why* each file changed rather than just
  bumping a number. Fork commit `3bd0cd997`. `pnpm engine-port-drift:check` →
  30 files match.

  Round-1 worktrees torn down **before** verifying, per SKILL.md step 6. Three
  needed `rm -rf` after `git worktree remove` because they held copied
  `vendor/` and `node_modules`.

  `pnpm verify` on branch A tip → **exit 0**, 41 files, 760 passed, 1 skipped,
  2 todo. (The single skip is a deliberate placeholder that reports *why* the
  fork is unavailable when it is; the real E-W3 case ran and passed.)

  Branch A tip after fan-in: see the next entry's recorded SHA.

  **Fork-side commits do not appear in this repo's log.** Branch A's review
  must state that ticket 162's implementation lives in
  `vendor/tbc-new-fork` at `57a84f1e4`, `3bd0cd997`, `179de35a4` on fork branch
  `w/a2-162-v1`.

  Next: fan-in 1 for branch B (merge `w/b1-ep-weights`, `w/b3-sync-docs` into
  `feat/sweep-ret-tickets`), then round 2 (B2).

- 2026-08-14 — **Branch A complete.** Tip `6796bd0`, `pnpm verify` exit 0 (41
  files, 760 passed), review at `docs/reviews/feat-sweep-tab-tickets.md`,
  `pnpm merge-to-dev --check-only` → `merge-ready: ok` (17 disposition rows).

  Review found two adversarial blockers, both proven by mutation rather than
  argued. The first indicts a judgment I made at fan-in: I re-blessed the
  `PROVENANCE.md` hashes for `disclosure.ts` and `rank.ts` after seeing E-W3
  pass, and the reviewer then showed E-W3 could not have failed on those files
  — gutting every standing assumption still passed. Fixed at `5cb013c` with a
  standing-assumption parity assertion, verified to fail that exact mutation
  and pass unmutated. The general case (the fixture is self-keying, so request
  composition is structurally invisible) is ticket 165.

  Also fixed: the EP-weights disclosure understated that EP weights drive
  within-slot ordering (fork `63494ce7b`, E-W3 re-run before re-hashing).
  Filed 165, 166, 167, 168.

  **Ticket 167 is worth carrying forward:** the drift gate hashes raw bytes
  against LF-computed hashes, so an ordinary Windows `git checkout` of a ported
  file fails it on line endings alone, indistinguishably from real drift. It
  fired twice during fan-in. Normalizing back to LF restored the recorded hash
  byte-exact, which is the proof the content never changed.

- 2026-08-14 — **Round 2 (B2) complete and verified.** B2 ran unisolated in the
  branch B worktree (the fork-invisibility problem does not apply to it, but a
  worktree-of-a-worktree is not a thing this harness does well, and B2 was the
  only writer). Commits `c718d38` (157), `ea9b33f` (163), `79aecf2` (164),
  `9844b28` (handoff).

  **Ticket-number collision caught at fan-in:** B2 minted a new ticket 165 on
  branch B while branch A's review minted a different 165. Both branches are
  unmerged, so the two would have collided. Renumbered B2's to 169 at `952fdc6`,
  updating the references in ticket 164 and B2's handoff.

  Orchestrator re-ran both claim checks it committed to:
  - Ticket 163: item 27484 now appears in the regenerated ranking as
    `owned: True, deltaDps: 0, slot: ranged` — the "owned row at 0.00" the
    ticket asked for. The ranged slot went from 4 candidates to 7.
  - Ticket 164: the ranged section now reads "7 candidates / 1 BiS candidate"
    with Libram of Avengement shown as owned and p3 BiS, against the old
    "4 candidates / 0 BiS candidates" with the worn relic absent entirely.

  Note the three librams still tie at exactly -13.8069, as expected — those
  three exist only as commented-out stubs in the pinned fork, and implementing
  them was explicitly out of scope (163 layer 3).

  Branch B `pnpm verify` → exit 0, 40 files, 773 passed. No worker worktrees
  remain (`git worktree list | grep -c agent-` → 0).

  Next: branch B's three review axes are dispatched; then its review file and
  the final handoff.

## Final state — sweep complete, 2026-08-14

Both branches are reviewed, green, and merge-ready. **Neither is merged.** The
merge ask is the user's.

| | Branch A | Branch B |
| --- | --- | --- |
| Branch | `feat/sweep-tab-tickets` | `feat/sweep-ret-tickets` |
| Tip | `730a5694` | `01bbf125` |
| `pnpm verify` | exit 0 — 41 files, 760 passed | exit 0 — 40 files, 773 passed |
| Review | `docs/reviews/feat-sweep-tab-tickets.md` | `docs/reviews/feat-sweep-ret-tickets.md` |
| `merge-to-dev --check-only` | `merge-ready: ok` (17 rows) | `merge-ready: ok` (21 rows) |

`dev` is unmoved at `5be6a814`. No worker worktrees remain.

**Branch B supersedes `feat/ret-p3-data`** — `git merge-base --is-ancestor
cffaee0 01bbf125` succeeds, so merging B carries that branch and it needs no
separate merge.

### What each branch is worth reading for

Branch A's review found that E-W3 could not fail on the two ported files whose
`PROVENANCE.md` hashes I had just re-blessed on the strength of it passing.
Fixed at `5cb013c`; the general case is ticket 165.

Branch B's review found the one blocker of the sweep: ticket 157's
force-include had no spec gate, so a ret-only fix leaked into the feral
universes two commits after ticket 154 fixed that exact class of drift, with
every gate green throughout. Fixed at `b2da640`. The missing gate — nothing
compares a committed universe against a regen — is ticket 172 and is the
highest-value follow-up in the sweep.

### New tickets filed

165, 166, 167, 168 (branch A) · 169, 170, 171, 172, 173, 174 (branch B).

Note the numbering collision caught at fan-in: worker B2 minted a 165 on branch
B while branch A's review minted a different 165. B2's was renumbered to 169 at
`952fdc6`. Any future parallel sweep across two unmerged branches needs a
number range assigned per branch up front.

### Left undone, deliberately

- **Ticket 162 v2** — not built, per the plan. Ticket stays `open`.
- **Ticket 156's 20-candidate table** — not measured. The production-build
  question it turned on *was* answered; the rest stays `open`.
- **Libram proc effects (163 layer 3)** — upstream sim work at this pin, out of
  scope, and now ticket 171 for the reporting half.
- **The SME §9.6 gate** — ticket 157 landing re-opens the "would a ret trust
  this?" question. Not reopened here; no verdict file was edited. The domain
  axis's read is that relic-slot *membership* is now met and *presentation* is
  not.
