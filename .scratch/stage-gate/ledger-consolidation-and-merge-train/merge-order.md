# Merge order — ledger-consolidation-and-merge-train

Written by the Phase A executor, 2026-09-12, against `dev` at `a2a4295`.

**The executor has run no merge.** Every row below is prepared and proven with
`pnpm merge-to-dev --check-only`, and waits for the owner. `pnpm merge-to-dev`
is the only supported door; it is run by the owner, or by an agent only on the
owner's explicit ask after the owner has seen the review summary.

## The three merges, in order

| # | Branch | `dev` pin before | `dev` pin after | Clone position that branch's `--check-only` needs | Conflicts its `dev`-merge already resolved | `NEXT` on `dev` after |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `docs/fork-upstream-touchpoints` | `bbad1b8a4` | `bbad1b8a4` (unchanged) | `bbad1b8a4` | ticket 369 | 381 + k |
| 2 | `feat/spec-registry` | `bbad1b8a4` | `bbad1b8a4` (unchanged) | `bbad1b8a4` | `NEXT`, `map.md` | max(381 + k, 379) = 381 + k |
| 3 | `fix/sim-header-null-assertion` | `bbad1b8a4` | **`5e9013b78`** | `5e9013b78` | `NEXT`, `data/sim-implemented-effects.json`, `data/wowsims-fork.lock.json` | max(381 + k, 381) = 381 + k |

`k` is the number of tickets the touchpoints branch's own pre-merge review
deferred. See `execution-report.md` for the measured value.

**Only merge 3 moves the fork pin.** Merges 1 and 2 leave
`data/wowsims-fork.lock.json` exactly as it is.

### The `NEXT` conflict rule

Every one of these branches edits `.scratch/carry-forward/issues/NEXT`, so any
two of them conflict on it. The resolution is one line and deterministic:

> **`NEXT` = the larger of the two sides.**

Nothing else is ever correct: a lower `NEXT` hands out a number some branch has
already used.

## Why the order is what it is

Order is **free with respect to the fork pin** — the thing the brief assumed
would force it. `feat/spec-registry` **does not modify the lockfile at all**:

```
git diff --stat dev...feat/spec-registry -- data/wowsims-fork.lock.json data/sim-implemented-effects.json
# -> empty
```

So there is no transient red to avoid and no lockfile conflict to resolve for
that branch; merging it changes nothing about the pin.

**Corrected 2026-09-12** (independent process review, finding 2). This section
previously said the branch's lockfile "reads `f90b12a7b`, which is older than
`dev`'s pin". That went stale: `dev` was merged into the branch at `a17b418`,
so its merge-base with `dev` is `a2a4295` and its lockfile now reads
`bbad1b8a4` — the same pin `dev` carries. The conclusion above was re-measured
and stands; only the evidence cited for it was out of date.

The order is chosen for **ticket dependencies** instead:

1. **`docs/fork-upstream-touchpoints` first** — it carries `NEXT` = 381 and the
   `map.md` reservation line, so the 376–380 reservation becomes visible from
   `dev` as early as possible.
2. **`feat/spec-registry` second** — it carries ticket 377 (formerly 372),
   closed as an inverted diagnosis.
3. **`fix/sim-header-null-assertion` third** — its ticket 379 can only be closed
   once 377's correction is on `dev`, and it is the branch that moves the pin.

**If the owner merges 3 before 2:** pin-wise nothing changes — the pin move is
correct in either order. The only cost is that ticket 379 stays open until
377's correction lands on `dev`.

## Q1 — how `feat/spec-registry` lands without moving the pin backwards

| Candidate | Would win if | Measured | Result |
| --- | --- | --- | --- |
| (a) merge it first, accept a transient red | the lockfile is not a conflict in this order and the four fork gates stay green with the clone at `bbad1b8a4` | `git merge-tree --write-tree --name-only dev feat/spec-registry` conflicts only on `.scratch/carry-forward/issues/NEXT` and `.scratch/carry-forward/map.md`. `scripts/_fork_gate.py:103-110` reds only when clone HEAD != lockfile `commit`; after this merge `dev`'s lockfile still says `bbad1b8a4` and the clone is at `bbad1b8a4` | **No transient red exists.** Ordering is free with respect to the pin. |
| (b) merge it last, resolve the lockfile conflict toward the newer pin | there is a lockfile conflict to resolve | There is none for this branch. The lockfile conflict that does exist is `dev` vs `fix/sim-header-null-assertion`, and it is resolved on that branch, not on `dev` | Dropped: nothing to resolve. Its one real idea — resolve toward the newer pin — is applied on the sim-header branch. |
| (c) rebase or fast-forward its lockfile onto the current pin | the branch carried a lockfile change to move | It carries none. Rebasing would also rewrite the SHAs `docs/reviews/feat-spec-registry.md` reviewed | Dropped: nothing to rebase, and it destroys the reviewed range. |

## Q2 — when the fork clone moves, and by whom

The clone `vendor/tbc-new-fork` is **one shared checkout**, gitignored, not a
worktree. No branch can carry its state, so it is moved by hand.

Four `pnpm verify` gates exit 2 when the clone's HEAD does not equal the
lockfile's `commit` — `equip-eligibility:check`, `ep-presets:check`,
`meta-conditions:check`, `fork-lint:check` (`scripts/_fork_gate.py:103-110`,
called from `check_equip_eligibility.py:261`, `check_ep_presets.py:138`,
`check_meta_conditions.py:104`, `check_fork_lint.py:140`).

| Clone at | `dev` | `feat/spec-registry` | `fix/sim-header-null-assertion` |
| --- | --- | --- | --- |
| `bbad1b8a4` | green | green | **red** |
| `5e9013b78` | **red** | **red** | green |

So the clone follows whatever branch is being verified, and returns to `dev`'s
pin at every handoff. It moves permanently only after merge 3.

Commands:

```
# forward, after merge 3 lands
git -C vendor/tbc-new-fork checkout feat/upgrades-tab      # HEAD -> 5e9013b78

# back to dev's pin
git -C vendor/tbc-new-fork checkout --detach bbad1b8a4325d8168758a909a520cf4dced875f6
```

Neither deletes anything. `5e9013b78` is the tip of the clone's local
`feat/upgrades-tab` branch and is **not on the fork remote** — the remote tip is
`bbad1b8a4`.

**Rule: the clone matches `dev`'s lockfile `commit` at every handoff.**

**Whoever runs merge 3's `pnpm merge-to-dev` runs the forward checkout
immediately after it.** Until they do, `dev` is red on those four gates.

## Q3 — the inbound anchor

`docs/fork-phase-seams.md:51` linked to the deleted document with the anchor
`#item-3-the-simts-iterations-parameter--reverted`. That line had to change
regardless, because the filename changed. It now points at
`fork-upstream-touchpoints.md#uicoresimts--resolved-the-iterations-parameter-reverted`,
whose slug was checked against the folded heading before the commit landed.
Nothing in `pnpm verify` checks markdown links or anchors, so a broken anchor
would have been silent.

## Ticket renumber map

| Branch | Old | New | Note |
| --- | --- | --- | --- |
| `feat/spec-registry` | 371 | **376** | two stale ret/feral spec allow-lists |
| `feat/spec-registry` | 372 | **377** | fork clone head is behind the lockfile pin — **closed, inverted diagnosis** |
| `feat/spec-registry` | 373 | **378** | spec-registry shape review smells |
| `fix/sim-header-null-assertion` | 371 | **379** | ticket 377's diagnosis is inverted |
| `fix/sim-header-null-assertion` | 373 | **380** | fork-upstream-touchpoints sim_header entry stale |

`NEXT` after each branch: `feat/spec-registry` 379;
`fix/sim-header-null-assertion` 381; `docs/fork-upstream-touchpoints` 381 + k.

**Commit messages on both branches name the old numbers and are knowingly left
stale; resolve them through this table.** They cannot be edited without
rebasing ranges that `docs/reviews/feat-spec-registry.md` and
`docs/reviews/fix-sim-header-null-assertion.md` already reviewed, which would
invalidate both review files. A reader of `git log` who meets "ticket 372"
resolves it here, or through the `Formerly:` line in each renumbered ticket's
header block.

## Residual risk until the first merge

**Until `docs/fork-upstream-touchpoints` is merged, `dev`'s `NEXT` is 376 and
nothing on `dev` records the 376–380 reservation.** A session filing a
carry-forward ticket from `dev` in that window would legitimately take 376 — a
number `feat/spec-registry` has already used.

The collision would not be silent: that session also edits `NEXT`, so its merge
and `feat/spec-registry`'s would conflict on `NEXT` and the loser renumbers. But
it costs a renumber, and renumbering means re-resolving every `defer` row path
in a review file, which is the step `merge-ready` fails hard on.

Two ways to close the window: file nothing from `dev` until merge 1 lands, or
merge the touchpoints branch first. Nothing in Phase A could close it, because
Phase A cannot write to `dev`.

## Owner action after the last merge

`5e9013b78` exists only in the local clone. After merge 3:

1. Push it to the fork remote (`feat/upgrades-tab`).
2. Flip `pushed` to `true` in `data/wowsims-fork.lock.json`.

This is an owner action — ticket 355 is the precedent — and is out of this
stage's scope. Until it happens the lockfile on `dev` will read
`"pushed": false`, which is accurate rather than broken.
