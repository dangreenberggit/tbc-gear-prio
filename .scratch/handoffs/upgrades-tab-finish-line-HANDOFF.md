# Handoff — upgrades-tab finish line

Written 2026-09-13 by the orchestrating session. For the next overseer, and for
the orchestrator who hands them their brief.

Plan: `.scratch/plans/upgrades-tab-finish-line.md` (revision 1, post-verification).

## State right now

| Thing | Value |
| --- | --- |
| Core repo branch | `feat/tab-scope-truth`, 3 commits ahead of `dev` |
| Core commits | `23c5256` (scope doc), `7411727` (review + tickets 386-388), `e5c2e13` (this handoff) |
| `dev` tip | `9e86ebc` |
| Fork clone HEAD | `5e9013b78`, branch `feat/upgrades-tab`, tree clean |
| Fork remote | matched `5e9013b78` **as measured on 2026-09-13** — re-run `ls-remote` before trusting this row (see below) |
| `pnpm merge-to-dev --check-only` | **rc=0**, 9/9 disposition rows parsed |
| Chunk 0 | done, reviewed, **not merged** |
| Chunks 1-5 | not started |

That fork-remote row is a **measurement with a date, not current state**. Any
fork commit made after 2026-09-13 moves the clone ahead of the remote and this
row silently becomes false — the same way `pushed` in the lockfile goes stale.
Re-run it yourself:

```
git -C vendor/tbc-new-fork ls-remote origin refs/heads/feat/upgrades-tab
git -C vendor/tbc-new-fork rev-parse HEAD
```

**Nothing has been merged to `dev`.** The merge is the owner's call and has not
been asked for.

### Worktree hazard — 15 of them

`git worktree list` shows **15 registered worktrees**, not one. That is ticket
149 (worktree sprawl), and it is a live hazard for this plan rather than
housekeeping, because the plan serialises every fork chunk through a single
clone. Two that matter:

- `tbc-gear-prio-wt-layout-gate` holds a **symlink** at `vendor/tbc-new-fork`
  pointing to the one real clone (confirmed: `tbc-new-fork -> /c/Users/dgree/…
  /vendor/tbc-new-fork/`). Anything run there shares the fork's working tree,
  index and HEAD with the main checkout.
- `.scratch/wt-fan-out-retro` sits on `feat/fan-out-retro`, the one branch with
  real unmerged work (49 commits).

Before any fork chunk starts, confirm no session is live in a worktree that can
reach the fork. Registration alone does not tell you that — ask the owner.

## Which repo gets which merge — read this before Chunk 1

There are **two repos**, and only one of them has a gate.

**Repo A — core (`tbc-gear-prio`, this one).** Feature branch → `dev` via
`pnpm merge-to-dev`. That door checks: branch is not `dev`/`main`; tree clean;
`pnpm verify` passes; a review file exists at `docs/reviews/<branch>.md` whose
Disposition table parses and whose every `defer` row links a carry-forward
ticket that is still open; then `git merge --no-ff` with `TBC_ALLOW_DEV_MERGE=1`.

**Repo B — the wowsims fork (`vendor/tbc-new-fork/`).** Its own git, branch
`feat/upgrades-tab`, `origin` = `dangreenberggit/tbc-new`,
`upstream` = `wowsims/tbc-new`. It is **gitignored** by repo A. Its commits are
its own; `pnpm merge-to-dev` never touches it and never pushes it.

### How A is bound to B

`data/wowsims-fork.lock.json` field `commit` pins the fork commit that repo A's
state pairs with. Enforcement is real but narrow — `scripts/_fork_gate.py`
`require_pinned_fork()` raises when the clone's HEAD differs from the pin, and
four gates call it, all inside `pnpm verify`:

- `equip-eligibility:check`
- `fork-lint:check`
- `ep-presets:check`
- `meta-conditions:check`

A fifth, `sim-implemented-effects:check`, reads the fork tree *at the pinned sha*
rather than the working tree, so a clone ahead of the pin is tolerated there by
design.

Each of those gates **skips with exit 0 when the clone is absent**. So
`pnpm verify` passes on a fresh clone with no fork, and CI never clones the fork
at all — the pin is unenforced in CI.

### The gap that matters

**No gate checks whether the fork commit was pushed.** `git ls-remote` appears in
zero executable files. The lockfile's `pushed` boolean has **no code readers** —
it is documentation, hand-maintained, and its own `_comment` warns it goes stale
the moment a later fork commit lands.

Consequence, stated plainly: a core branch **can** merge to `dev` while its pin
names a fork commit that exists on one disk only. ADR-0030 Consequence 4 records
this as an accepted, tracked risk. It has bitten before — ticket 355 was filed
because committed artifacts embedded a pin nobody else could fetch.

### The order to use when a change touches both repos

The re-pin cycle is documented (`docs/agents/known-traps.md:45-66`); the push
step is **not documented anywhere**. Use this order:

1. Fork commit in `vendor/tbc-new-fork/`.
2. **Push the fork branch** (owner-authorised; historically an explicit ask).
3. Verify with
   `git -C vendor/tbc-new-fork ls-remote origin refs/heads/feat/upgrades-tab`
   returning the same sha — do not trust `pushed`.
4. Re-pin `data/wowsims-fork.lock.json` to the new fork tip; set `pushed`.
5. Regenerate the five pin-derived artifacts:
   `data/sim-implemented-effects.json`, `data/equip-eligibility.json`,
   `data/gems/meta-conditions.json`, the EP presets, and the fork universes.
6. `pnpm verify` in repo A.
7. Review, then ask the owner before `pnpm merge-to-dev`.

Between step 1 and step 4 the four fork gates are **red by design**. Read the
message before chasing it.

A fresh clone has no bootstrap script for the fork — unlike `vendor/wowsims/`,
which `pnpm sync:wowsims:restore` restores at its pin. Getting fork commit X by
hand means cloning `dangreenberggit/tbc-new` to `vendor/tbc-new-fork` and
checking out X, and that only works **if X was pushed**.

## Note for the next overseer

You oversee one chunk. The orchestrator handles merges — in both repos. Do not
run `pnpm merge-to-dev`, do not `git merge` into `dev`, do not set
`TBC_ALLOW_DEV_MERGE=1`, and do not push the fork. Stop with your branch ready
and report.

**Chunk 1 is next** and it is the risky one. Before you touch anything:

- Both trees clean, fork HEAD equal to the lock, and **ask** whether any worktree
  session is using the fork symlink. One worktree
  (`tbc-gear-prio-wt-layout-gate`) reaches the fork through a symlink to the one
  real clone — same working tree, same index, same HEAD. Two sessions in there at
  once corrupt each other.
- Upstream moved on 2026-09-13: `feature/backend-reforge` merged to `master` as
  PR #385 and the branch was deleted. `sync_wowsims.py --check` exits 1 today on
  the dead watched ref. That is the condition Chunk 1 fixes, not a fault to
  diagnose.
- Re-measure the conflict surface against the sha you actually pick. The plan's
  file list was measured against a moving target.

Environment traps that cost this session time:

- **`cd X && git ...` fails** (fnm emits an error that breaks the chain). Run git
  standalone with `git -C <abs path>`. Heredocs into git break the same way — use
  `commit -F <file>`.
- `git add <paths>` does **not** scope the commit; lint-staged runs against
  everything. Check `git status` before each commit.
- A pipe reports the last command's status. Use `; echo "rc=${PIPESTATUS[0]}"`.
- **`.scratch/carry-forward/issues/NEXT` was stale** — it said 383 while
  `383-body-cap-vs-record-commits.md` already existed. Check for a collision with
  `ls .scratch/carry-forward/issues/ | grep -E '^<n>-'` before writing a ticket,
  and bump `NEXT` when you finish. It is now 389.

## Chunk 0's residue

Three tickets, all open, all deferred from the review:

- **386** — the scope doc's done-condition 3 is unsatisfiable today. **Chunk 1
  makes it satisfiable as written**; do not reword it to match today's state.
- **387** — row 314 lost the ticket-126 half of its reason and now calls itself a
  correctness concern while listing only styling. Settle whether the tab's TMB
  export emits token/pattern ids or gear ids; if gear ids, that is a live defect.
- **388** — ticket 330 is filed as awaiting sign-off, but its own text asks what
  the displayed figure represents. A 4pc-sized number labelled as a 2pc step is a
  data question, not a sign-off.

Two findings accepted as `wontfix` that later chunks should carry:

- The scope doc has **no enforcement**. Its acceptance loop is real and
  re-runnable, but nothing runs it — not the hooks, not CI, not any of the 30
  checks in `pnpm verify`. Chunk 4's ticket-close discipline is where that lands.
- Done-condition 2 names `pnpm desktop-gate:check`, which **Chunk 2 creates**.
