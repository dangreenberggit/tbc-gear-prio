Status: blocked
Type: defect (a recorded design decision is no longer true)
Origin: review of fix/fork-lockfile-after-rebase, 2026-08-21
Blocks: 263 (deferred until this is settled — see below)
Blocked by: owner decision at push or PR time (see Owner ruling below)

# The fork sits on `cbf6b75` while the engine pin is v0.0.119

## Downstream: ticket 263 waits on this

Ticket 263 (derive the meta-preference table from wowsims presets) was
deferred by the owner on 2026-08-22 specifically because of this split:
*"we'll kick this down the road until we're only looking at one wowsims code
repo on one branch"*. Cat and ret presets come from the engine pin, bear's
from the fork clone, so "read it from upstream" has no single referent while
the two disagree. Settling this ticket is 263's trigger — when it moves, say
so there.

## The finding

`data/wowsims-fork.lock.json` records `branchedFrom: cbf6b75a889e…`
(`feature/backend-reforge`). `data/wowsims.lock.json` pins
`3267f8dfa4a2` (v0.0.119). They no longer agree.

The data is **accurate** — the fork's `feat/upgrades-tab` really is on
`cbf6b75`, confirmed with `merge-base --is-ancestor`, and really is *not* on
v0.0.119. What broke is the design intent.

**Plan decision D2 keeps the fork on the pin** so every verified fact and
committed datum traces to one commit. That is now false. Worse, the file's own
`_comment` asserts `branchedFrom is whatever wowsims.lock.json currently pins`,
which was written on 2026-08-21 when the pin *was* the branch and is wrong as of
the same day's move to v0.0.119.

Nothing in code reads `branchedFrom` — `grep` over `scripts/` and
`packages/core/src/` returns nothing. This is documentation, so nothing is
broken at runtime; what is broken is the guarantee a reader is given.

## Why this is not a two-field edit

The previous fix (ticket 248) was, because the fork had genuinely been rebased
and only the record lagged. This is the reverse: the record is right and the
fork is in the wrong place.

The two bases have **diverged**, not fast-forwarded:

```
curl -s "https://api.github.com/repos/wowsims/tbc-new/compare/cbf6b75a889e52c4106351976db66efd914ea349...3267f8dfa4a2"
```

→ `status: diverged, ahead_by: 20, behind_by: 52`

So moving the fork onto v0.0.119 means a second rebase of 25 commits across a
divergence, not a replay onto a descendant.

## The decision this needs

It interacts with why the fork exists. `feat/upgrades-tab` is intended to become
a PR against `feature/backend-reforge`. Rebasing it onto v0.0.119 aligns it with
the engine we sim against and moves it away from the branch it targets.

1. **Rebase the fork onto v0.0.119.** Restores D2. Costs a second rebase across
   a divergence, and the PR would then be against a base its target branch does
   not contain.
2. **Leave the fork on `cbf6b75` and amend D2.** The fork tracks its PR target;
   the engine tracks accuracy. Two refs on purpose, which is defensible now that
   they serve different jobs — but D2 has to be rewritten to say so, and the
   `_comment` corrected, or the next reader is misled exactly as this ticket
   describes.
3. **Both, later.** Leave it until `backend-reforge` absorbs master (it must
   eventually; PR #385 is open and conflicted), at which point the divergence
   collapses on its own.

Option 2 looks right on the merits — the fork and the engine now genuinely have
different jobs — but D2 is a recorded plan decision and changing it is not a
reviewer's call.

## Do not

Do not "fix" this by editing `branchedFrom` to `3267f8dfa4a2`. The fork is not
on that commit; that would make an accurate file inaccurate and hide the real
question.

## Acceptance

- [ ] An option chosen and recorded here with its reason.
- [ ] If D2 is amended, the amendment is written where D2 lives, not only here.
- [ ] `data/wowsims-fork.lock.json`'s `_comment` no longer claims
      `branchedFrom` equals the current engine pin unless that is true again.
- [ ] `pnpm verify` green.

## Owner ruling, 2026-08-22

This is an upstream issue. We keep building on the fork's current base.
Whether and how to reconcile the fork branch with the engine pin is decided
when it is time to push or open a PR, if at all. Until then, nothing waits on
this ticket. Status set to blocked because only the owner can move it, at
that time. See ADR-0027 and `.scratch/handoffs/wowsims-tab/STATUS-2026-08-22.md`.
