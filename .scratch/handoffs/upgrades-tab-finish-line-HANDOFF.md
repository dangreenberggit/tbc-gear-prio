# Handoff — upgrades-tab finish line

Written 2026-09-13 by the orchestrating session. For the next overseer, and for
the orchestrator who hands them their brief.

Plan: `.scratch/plans/upgrades-tab-finish-line.md` (revision 1, post-verification).

## State right now

| Thing | Value |
| --- | --- |
| Core repo branch | `feat/tab-scope-truth`, 5 commits, **merged to `dev` 2026-09-13** |
| Core commits | `23c5256` scope doc · `7411727` review + tickets · `e5c2e13` this handoff · `a53d5c2` rows 314/330 fixed + ticket 389 · `53282f9` handoff corrections |
| Fork clone HEAD | `5e9013b78`, branch `feat/upgrades-tab`, tree clean — **untouched by Chunk 0** |
| Fork remote | matched `5e9013b78` **as measured on 2026-09-13** — re-run `ls-remote` before trusting this row (see below) |
| `pnpm merge-to-dev --check-only` | **rc=0**, 9/9 disposition rows parsed |
| Chunk 0 | done, reviewed, merged |
| Chunks 1-5 | not started. **Chunk 1 is next**, and branches off `dev` |

That fork-remote row is a **measurement with a date, not current state**. Any
fork commit made after 2026-09-13 moves the clone ahead of the remote and this
row silently becomes false — the same way `pushed` in the lockfile goes stale.
Re-run it yourself:

```
git -C vendor/tbc-new-fork ls-remote origin refs/heads/feat/upgrades-tab
git -C vendor/tbc-new-fork rev-parse HEAD
```

Chunk 0 is merged. Every merge from here is still the owner's call, asked for
separately after the review file is written and they have seen the summary.

### Worktree hazard — 15 of them

`git worktree list` shows **15 registered worktrees**, not one. That is ticket
149 (worktree sprawl), and it is a live hazard for this plan rather than
housekeeping, because the plan serialises every fork chunk through a single
clone.

`tbc-gear-prio-wt-layout-gate` holds a **symlink** at `vendor/tbc-new-fork`
pointing to the one real clone (`tbc-new-fork -> /c/Users/dgree/…
/vendor/tbc-new-fork/`). Anything run there shares the fork's working tree,
index and HEAD with the main checkout.

**Cleared for Chunk 1 as of 2026-09-13:** the owner confirmed nothing is running
in any worktree, and that symlinked worktree measured clean and 0 commits ahead
of `dev`. Re-confirm before a later fork chunk — dormancy is not permanent, and
registration alone never tells you whether a session is live.

Not all of them are dormant leftovers, so do not bulk-remove them. Five carry
commits not in `dev` (`claude/dps-naming-audit-d26eb7` 2,
`claude/ticket-225-orchestration-b2cd20` 4,
`claude/orchestration-ticket-290-7e899e` 7, `feat/fan-out-retro` 49, plus three
detached-HEAD worktrees at 5) and four carry uncommitted edits
(`phase-1/w-salvage-docs`, `claude/dps-naming-audit-d26eb7`,
`claude/terminology-cleanup-plan-82f471`, `claude/vigilant-chaum-76705a` at 29
files, `feat/fan-out-retro` at 14). `feat/fan-out-retro` has both and is the one
to be careful with. A per-worktree safety assessment was commissioned; if its
findings are not attached below, re-run it before removing anything.

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

The review filed three tickets. Two were investigated and closed in the same
session rather than carried — both turned out to describe stale rows, not
defects — and the investigation turned up one genuinely new item.

**Open:**

- **386** — the scope doc's done-condition 3 is unsatisfiable today. **Chunk 1
  makes it satisfiable as written**; do not reword it to match today's state.
- **389** — the set-bonus string on disk
  (`{{threshold}}pc bonus ({{worn}}/{{threshold}}) (+{{dps}})`) is not the string
  ticket 330 records as landed (`toward {{set}} {{threshold}}pc (+{{dps}})`).
  Found independently twice. Label/number agreement is unaffected, but the owner
  is being asked to sign off on 330 against wording the product does not use, and
  the shipped text drops the set name and the "toward" framing. **Needs an owner
  decision**, not engineering. Also asks whether `package_disclosure` duplicates
  `prospective`, which would make ticket 336's disclosure indistinguishable from
  a row's own bonus line.

**Closed, with the measurement that closed them:**

- **387** — not a defect. The tab's TMB export does substitute token ids
  (`exportIdForRow`, `upgrades_tab.tsx:2160`; 15 `tokenId` fields in the bundled
  `ret-p3.universe.json`). Craftable/pattern ids remain gear ids by documented
  deferral. Row 314 rewritten.
- **388** — the finding was wrong. One `nextThreshold` (`rank.ts:1846`) feeds both
  the set-bonus label and its figure, so they cannot disagree; ticket 330's own
  August investigation had already concluded this. Row 330 rewritten, since its
  title still asserted the disproved mislabelling.

The lesson worth carrying: two of three tickets restated questions the tracker
had already answered. Check a ticket's own resolution notes before filing against
it.

Two findings accepted as `wontfix` that later chunks should carry:

- The scope doc has **no enforcement**. Its acceptance loop is real and
  re-runnable, but nothing runs it — not the hooks, not CI, not any of the 30
  checks in `pnpm verify`. Chunk 4's ticket-close discipline is where that lands.
- Done-condition 2 names `pnpm desktop-gate:check`, which **Chunk 2 creates**.
