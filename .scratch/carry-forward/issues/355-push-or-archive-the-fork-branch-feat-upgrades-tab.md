# 355 — Push or archive the fork branch `feat/upgrades-tab`

Status: closed
Opened: 2026-09-10
Closed: 2026-09-10 — option 1, pushed to the personal fork
Blocks: none
Blocked by: none
Relates to: ADR-0030 (Consequence 4), tickets 251, 353; branch `feat/wowsims-reforge-catchup`

## What happened

`data/wowsims-fork.lock.json` carries `"pushed": false`. The fork branch
`feat/upgrades-tab` — the Upgrades tab's entire source — exists on exactly one
machine, in a gitignored clone at `vendor/tbc-new-fork`.

That limitation predates this ticket. What is new is **how much now depends on
it**. ADR-0030 put a merge commit on that branch
(`ab59127d9faad30cdd4190b5f7e6780e34405822`, merging upstream `ec5c5f2`), and
what is downstream of that unpushed commit is concrete:

- The `ui/core/components/sim_header.tsx` conflict resolution exists nowhere
  else. It is a real judgment (keep our `sim-header-container-wrap` wrapper,
  take upstream's removal of `within-raid-sim-hide`), not something a rerun of
  the merge would reproduce on its own.
- This repo's committed `data/sim-implemented-effects.json` is **derived from
  that merge commit** — it embeds `forkCommit: ab59127d9faa...`.
- `data/equip-eligibility.json`, `data/gems/meta-conditions.json` and the 20
  `data/presets/*/*.ep-weights.json` files are all checked against fork symbols
  at that commit by gates that resolve the clone by pinned sha.

If that disk dies, those committed artifacts become unre-derivable and their
gates (`_fork_gate.py`) exit 2 forever with no path back. This is not a
recoverable-with-effort state; it is a dead end.

## Why it was not done in that work

Pushing is a deliberate act, not a side effect: the lock's own `_comment` says
so, and the plan that produced the merge put pushing explicitly out of scope
pending a separate owner decision. Correct for execution — but out-of-scope work
that grows a standing risk should leave a ticket behind, which is this one.

## Options

1. **Push `feat/upgrades-tab` to the personal fork**
   (`https://github.com/dangreenberggit/tbc-new.git`, already the `origin`
   remote) and flip `pushed: true`. Cheapest; makes the branch recoverable and
   is a precondition for ever opening the upstream PR.
2. **Archive a bundle** — `git -C vendor/tbc-new-fork bundle create <path> --all`
   stored off this machine. Keeps the branch private while removing the
   single-disk risk.
3. **Accept the risk explicitly**, and record in ADR-0030 that it was weighed
   and accepted rather than overlooked.

Option 1 or 2 is a decision for the owner; this ticket exists so it is a
decision rather than an oversight.

## The risk grew again on 2026-09-10 (branch `feat/reforge-catchup-leftovers`)

Recorded by that branch's pre-merge review, adversarial axis. The lock no longer
pins `ab59127d9faa`: correcting the `disclosure.ts` over-assertion required a
ported-engine cycle, which put a **new** fork commit on the same unpushed branch
and moved the pin onto it.

```
$ git -C vendor/tbc-new-fork branch -r --contains 3829c66f
                                     # empty — on no remote
$ python -c "import json;d=json.load(open('data/wowsims-fork.lock.json'));print(d['commit'],d['pushed'])"
3829c66f672cdaeaba347920f59db0795a01e2c9 False
```

So the single-disk dependency now covers a second commit, and this repo's
committed `data/sim-implemented-effects.json` embeds `3829c66f` as its
`forkCommit` — an artifact whose provenance cannot be resolved from any other
machine. Every ported-engine fix from here will do the same thing again: the
cycle *requires* a fork commit, so the gap between what is pinned and what is
recoverable widens with each one.

This changes the urgency, not the options — 1 or 2 below still resolve it.

## Resolution — option 1, 2026-09-10

The owner chose option 1 and authorised the push. It was a **fast-forward**, not
a force: the remote already carried the branch at `d49096e9`, an ancestor of the
pin, 211 commits behind it.

```
$ git -C vendor/tbc-new-fork push origin feat/upgrades-tab
To https://github.com/dangreenberggit/tbc-new.git
   d49096e90..0b50f4026  feat/upgrades-tab -> feat/upgrades-tab
$ git -C vendor/tbc-new-fork ls-remote origin refs/heads/feat/upgrades-tab
0b50f402630e0300a83023b299c5ff3733f2cfe4	refs/heads/feat/upgrades-tab
```

One correction to this ticket's own framing, measured during the same session:
the branch was **not** absent from the remote. `pushed: false` in the lock is a
hand-maintained flag, and both this ticket and a session handoff repeated it as
"exists on exactly one machine". The remote held `d49096e9` throughout. What was
genuinely on no remote was the *pinned commit* and the 211 commits leading to
it — which is the part that mattered, since
`data/sim-implemented-effects.json` embeds the pin. Read the flag as a claim to
verify with `ls-remote`, never as a measurement.

The pin has also moved since this ticket was written: it names `3829c66f` above,
but the lock now reads `0b50f402` (the ticket-362 item-swap fix moved it). The
acceptance below is checked against the lock's current value, as the ticket
itself instructed.

## Acceptance

- [x] One of the three options above is chosen and recorded. — option 1.
- [x] If pushed: `pushed` flipped to `true` in `data/wowsims-fork.lock.json`,
      and the remote branch verified to contain **the lock's current `commit`**
      — `ls-remote` returns `0b50f402`, byte-identical to the lock's `commit`.
- [ ] If archived: not applicable; option 1 was taken.

## What is NOT claimed

Pushing makes the branch recoverable; it does not make it reviewed, merged, or
upstream-ready. The single-disk risk is closed. The standing consequence
recorded above still holds in a weaker form: each future ported-engine fix adds
a fork commit, so `commit` moves ahead of the remote until the next push.
Re-verify with `ls-remote` rather than trusting `pushed: true`.
