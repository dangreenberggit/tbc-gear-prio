# Brief — consolidate the ticket-369 ledger, then land the merge train

Opened 2026-09-12. Base SHA at stage open: `a2a42954311e08b252070cad4a667d3da9c15355` (`dev`).
Tree clean at open (`git status --porcelain` empty).

## Background: two sessions ran concurrently

Two agent sessions worked this repo at the same time. Session B has **already
merged** its branch (`feat/tickets-369-370`) to `dev` at `a2a4295`. Session A
(this one) has three unmerged branches. Both sessions independently answered
ticket 369, producing **two tracked documents for one ticket**, and both
allocated overlapping ticket numbers before renumbering.

This stage cleans that up and lands the remaining work.

## Goal

1. One ledger for ticket 369, not two.
2. Session A's three unmerged branches landed on `dev` in an order that never
   moves the fork pin backwards.
3. The fork clone left in sync with the final lockfile pin.

## Verified current state — measured 2026-09-12, re-verify before acting

All commands run from the repo root. **Use PowerShell for git**: the Bash tool
emits an fnm stderr line that corrupts output and breaks `&&` chains, and it has
already produced one false "empty range" reading in this work.

```
git rev-parse --short dev                     # a2a4295
git -C vendor/tbc-new-fork rev-parse --short HEAD   # bbad1b8a4
git show dev:data/wowsims-fork.lock.json      # commit bbad1b8a4..., pushed: true
git show dev:.scratch/carry-forward/issues/NEXT     # 376
```

Branch positions against `dev` (`git rev-list --count dev..<branch>`):

| Branch | Ahead | State |
| --- | --- | --- |
| `fix/sim-header-null-assertion` | 3 | reviewed green, `--check-only` ok; pins fork `5e9013b78` |
| `feat/spec-registry` | 14 | reviewed green; pins fork `f90b12a7` (OLDER than dev's pin) |
| `docs/fork-upstream-touchpoints` | 1 | docs-only; holds session A's ledger |
| `feat/reforge-catchup-leftovers` | 0 | **already contained in dev** — nothing to do |
| `docs/reconciliation-design` | 0 | **empty, failed run — delete it** |

Fork pin ancestry (all verified with `merge-base --is-ancestor`, rc=0):
`f90b12a7b` → `bbad1b8a4` → `5e9013b78`, strictly linear.

## The ledger duplication — and a correction to session B's read

Two documents answer ticket 369:

- `docs/fork-upstream-divergence.md` — session B's, **on `dev` now**. 15 rows,
  framed on merge-conflict risk. Linked from `docs/fork-phase-seams.md` (two
  links, one with an `#item-3-...` anchor).
- `docs/fork-upstream-touchpoints.md` — session A's, on its own unmerged branch.
  13 rows, framed on upstream-PR impact, carrying the owner's constraint quote.

**Session B recommended folding theirs into session A's, and claimed session A's
13 was an undercount. The undercount claim is wrong, and session B's own document
contains the proof.** The two counts answer different questions:

- Session A counts files **upstream already had** that we modified:
  `diff --name-status -M ec5c5f2..bbad1b8a4`, partitioned added-vs-modified. 13.
- Session B counts what a pathspec excluding `*upgrades*` returns: 15. But their
  own table marks `test-layout.mjs` as "**not upstream divergence** … listed here
  only because the diff command above returns it", and `ui/core/sim.ts` as "None
  remaining … zero diff vs upstream" after their revert.

15 − those two = 13. **The documents agree.** Session A's 13 is a deliberate
scope, not a miscount. Do not "correct" it upward.

This reconciliation is itself a load-bearing claim: **re-derive both counts
before folding** and record the commands. If they do not reconcile to the same
set, stop and report — do not paper over it.

## What must survive the fold

From session B's document, into session A's:

1. **The load-bearing `sim_header.tsx` analysis.** The `.sim-header-container-wrap`
   div (`sim_header.tsx:268`) is required by `wireTabStripScrollAffordance`
   (`:67`). This file **already conflicted once**, in merge `ab59127d9`, whose
   commit body records the reasoning; that body is currently the only place this
   is written down. Read it with
   `git -C vendor/tbc-new-fork show ab59127d9 --no-patch --format=%B`.
2. **`test-layout.mjs` as an explicitly-marked non-divergence row.** It is our
   tooling living in the fork tree, and session A's avoidability note for
   `package.json` ("if the layout gate moves") depends on it.
3. **`ui/core/sim.ts` as a resolved row**, not a silent deletion — session A's
   inventory is measured at `bbad1b8a4` where the diff was live, and session B's
   revert took it to zero. The history is worth keeping.
4. Session B's merge-conflict framing as a **section** inside session A's
   document, which is scoped on PR impact.

**One correction the fold must make:** session B's document says the non-null
assertion at `sim_header.tsx:67` "throws at runtime if the div is ever merged
away". That is no longer true — `fix/sim-header-null-assertion` guards it, so it
now degrades to a lost scroll-fade. Any wording taken from session B on this
point must be updated, and this is exactly the kind of stale-by-merge claim the
fold exists to catch.

## Constraints

- **Never merge without an explicit owner ask.** `pnpm merge-to-dev` is the only
  supported door. Never `git merge` into `dev`, never `TBC_ALLOW_DEV_MERGE=1`.
  The plan may sequence the merges; **executing them is gated on the owner.**
- **Merge order is forced by the fork pin.** Each step must move the pin strictly
  forward. `feat/spec-registry` pins `f90b12a7`, which is BEHIND `dev`'s current
  `bbad1b8a4` — merging it without handling that reds `equip-eligibility:check`,
  which compares the lockfile pin against the fork clone HEAD. **How to handle
  that is an open question below, not a settled step.**
- **The fork clone is one shared checkout**, gitignored, not a worktree. Never
  two writers. Pre-commit runs `lint-staged` against `*` with `--no-stash`, so a
  commit sweeps in anything else dirty.
- **Ticket numbering:** allocate from `.scratch/carry-forward/issues/NEXT` and
  commit the increment in the same commit (`docs/agents/issue-tracker.md:22`).
  `NEXT` on `dev` is 376. Session A's branches carry tickets 371/372/373 that are
  NOT on `dev`; session B's 374/375 ARE. Verify no collision before filing.
- **Ticket 372 (on `feat/spec-registry`) is inverted and dangerous.** It says the
  clone is behind the pin and instructs "reset the clone to the pin". Ancestry
  proves the opposite. Following it would move the clone backwards and silently
  delete committed work while verify stays green. It describes the transient
  mid-state of session B's branch, which session B has since resolved by moving
  the pin forward. **It should be closed as resolved, not acted on.**
- `pnpm` needs Node ≥ 22.13; the tool shell defaults to Node 20.
- Do not touch session B's merged work beyond deleting the superseded document
  and repointing its inbound links.

## Open questions — each needs a candidate, a stated win condition, and a measurement

**Q1. How does `feat/spec-registry` land without moving the fork pin backwards?**
It pins `f90b12a7`; `dev` is at `bbad1b8a4`; `fix/sim-header-null-assertion`
takes it to `5e9013b78`. Candidates that are genuinely different, not the same
approach with different constants:
  (a) merge it first, before sim-header, accepting a transient red;
  (b) merge it last and resolve the lockfile conflict in favour of the newer pin;
  (c) rebase or fast-forward its lockfile onto the current pin before merging.
State what would make each win, then measure — at minimum, whether the lockfile
is even a textual conflict in each order, and whether `equip-eligibility:check`
actually reds in the transient case. A candidate the plan drops carries a reason.

**Q2. When does the fork clone get moved, and by whom?** It currently sits at
`bbad1b8a4`, matching `dev`'s pin. After the sim-header merge the pin is
`5e9013b78` and the clone must follow (`git -C vendor/tbc-new-fork checkout
5e9013b78...`). Candidates: move it as part of each merge step; move it once at
the end; or leave it and document the required command. Note it is gitignored, so
no branch can carry its state — and that moving it mid-train may red a later
branch's gate. Measure which orderings actually red.

**Q3. Does the consolidated document need `docs/fork-phase-seams.md`'s anchor
link to keep working?** One inbound link uses
`#item-3-the-simts-iterations-parameter--reverted`. If that section moves into
session A's document under a different heading, the anchor breaks silently.
Candidates: preserve the heading text verbatim; repoint to a new anchor; or drop
the anchor. Measure by grepping every inbound link to both documents across the
repo — not just `fork-phase-seams.md`.

## What done looks like

- One document answers ticket 369. The other is deleted in the same commit that
  folds its content in. Every inbound link repointed and verified by grep.
- The reconciliation of 13-vs-15 is re-derived and recorded with its commands.
- Session B's four items above are carried across, with the stale
  "throws at runtime" wording corrected.
- `docs/reconciliation-design` (empty) deleted; `feat/reforge-catchup-leftovers`
  confirmed already-merged and its stale mentions dropped.
- A written, measured merge order with the pin state at each step, ready for the
  owner's ask. **The merges themselves are NOT executed by this stage** unless
  the owner explicitly asks during it.
- Ticket 372's disposition decided and written.
- `pnpm verify` green on the consolidated branch tip.
