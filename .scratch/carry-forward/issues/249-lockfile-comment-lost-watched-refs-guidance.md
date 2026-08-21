Status: open
Type: defect (institutional memory lost by regeneration)
Origin: review of feat/engine-pin-backend-reforge, 2026-08-21
Blocks: none
Blocked by: none

# The lockfile `_comment` lost its watched-refs guidance, and the lost text was partly wrong

## The finding

`data/wowsims.lock.json`'s `_comment` carried a paragraph headed
`|| WATCHED REFS:` that warned an agent not to read `tag` and `watchedRefs` as
two independent facts. `sync_wowsims.py --update` regenerates `_comment` from a
template, so moving the pin dropped it as a side effect.

That paragraph existed *because the mistake had already happened twice* — the
optimizer (issue #1) and `timeToNextEnergyTick` (tickets 239/244) were both
declared upstream-absent while live on a branch this repo already watched.

## Do not restore it verbatim

The lost text also said that our pin is normally an ancestor of a watched ref,
so anything on that branch "is reachable from our pin by fast-forward and is
available to us, not absent."

**That reasoning was retracted on the same branch that dropped it** (commit
`294d229`). Ancestry does not establish availability, and `behind_by: 0` does
not discriminate between candidate refs — our pin is an ancestor of
`backend-reforge`, `v0.0.119` and `v0.0.105` alike, because it is a commit on
`master` and every later `master` tag contains it by construction.

So the paragraph needs rewriting, not reinstating. The half worth keeping is
"resolve the watched refs before declaring a feature absent". The half to drop
is "ancestry means it is available to us".

## Note the overlap

`dev` has since gained an `AGENTS.md` rule from ticket 245 —
"A property measured against one option is not a comparison" — which covers the
same failure at the point of reasoning. Decide whether a lockfile `_comment`
still earns its place given that rule exists, rather than restoring text out of
habit.

## The regeneration trap

Whatever wording is chosen, it must survive `--update`. A comment that only
lives in the committed file will be dropped again by the next pin move. The fix
belongs in the template inside `scripts/sync_wowsims.py`, not in the JSON.

## Acceptance

- [ ] A decision recorded: rewrite the guidance, or drop it in favour of the
      `AGENTS.md` rule — with the reason.
- [ ] If kept: the wording lives in `sync_wowsims.py`'s template so a future
      `--update` preserves it, verified by running `--update` and confirming the
      text survives.
- [ ] The retracted ancestry claim does not reappear in any form.
- [ ] `pnpm verify` green.
