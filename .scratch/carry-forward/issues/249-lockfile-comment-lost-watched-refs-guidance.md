Status: closed
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

## Resolution, 2026-08-21 — removed, not maintained

Owner's call: this should either be maintained properly or removed. Removed,
with a one-line pointer left behind.

**Why removal.** `dev` now carries an `AGENTS.md` rule from ticket 245 —
"A property measured against one option is not a comparison" — which covers the
same failure, names `watchedRefs` explicitly, and does not carry the retracted
ancestry claim. Keeping a second copy in a regenerated JSON string means two
places to keep true, and the JSON copy is the one that goes stale silently.

**Why it vanished in the first place, which settles it.** The paragraph was
never in `sync_wowsims.py`'s `_comment` template — it had been hand-added to the
JSON. `--update` rebuilds `_comment` from the template, so the text could not
have survived any pin move. It was structurally doomed, not unluckily deleted.

**What was done.** The template now ends with one sentence:

> Before concluding an upstream feature is absent, resolve every ref in
> watchedRefs -- see AGENTS.md.

That is a pointer, not a duplicate: the reasoning stays in `AGENTS.md` where
agents read it, and the lockfile says only enough to send you there. A comment
above the template records why it is deliberately short, so the next person does
not hand-add prose back into the JSON.

Verified by running `sync_wowsims.py --update --ref feature/backend-reforge` and
confirming the sentence survives regeneration and `watchedRefs` is preserved.

The retracted ancestry claim ("reachable from our pin by fast-forward and is
available to us") does not reappear in any form.

## Acceptance

- [x] Decision recorded: removed in favour of the `AGENTS.md` rule, with reason.
- [x] The surviving pointer lives in `sync_wowsims.py`'s template, verified by
      re-running `--update`.
- [x] The retracted ancestry claim does not reappear.
- [x] `pnpm verify` green.
