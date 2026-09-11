Status: open
Type: chore
Origin: docs/reviews/feat-reforge-catchup-leftovers.md (round 2, Standards axis)
Blocks: none
Blocked by: none

# Tickets 351 and 362 cite code by line number, and the worst of them point into a gitignored fork

## What

`AGENTS.md` and `docs/agents/known-traps.md` both say to locate by grep, never
by line number, because line numbers in this repo rot. Three handoff citations
were checked on 2026-09-10 and **all three were wrong while their findings
held** — a moved file, a line number from the wrong copy of a two-copy file,
and a stale range.

Two committed tickets still carry the pattern:

```
$ grep -c '\.\(ts\|go\|py\|mjs\):[0-9]' .scratch/carry-forward/issues/351-weapon-imbue-does-not-follow-candidate-weapon.md
11
$ grep -c '\.\(ts\|go\|py\|mjs\):[0-9]' .scratch/carry-forward/issues/362-upgrades-tab-enhancement-run-panics-on-an-item-swap-item.md
6
```

Ticket 350 carries three more, though those were already converted to grep
anchors in the body and the remaining hits are inside quoted prior text.

## Why these two are worse than the usual case

The citations in 351 and 362 point at **fork** files — `sim/druid/forms.go`,
`sim/core/consumes.go`, `sim/core/item_swaps.go`, `sim/core/database.go`. Those
live in `vendor/tbc-new-fork`, which is gitignored, at a pin
(`data/wowsims-fork.lock.json` → `commit`) that `git branch -r --contains`
finds on no remote (ticket 355). So a reader who wants to check one of these
citations needs a checkout they may not have, at a commit they cannot fetch,
and the line number will have moved anyway.

A grep anchor survives all three problems: it works in any checkout, at any
commit, and it says what it is looking for rather than where it sat.

## Not a defect this branch introduced

Both tickets predate the skeleton-scope stage. The Standards axis of the second
review round flagged them because they fall inside the review range, which runs
from the merge-base. Filed rather than fixed inline because the conversion is
mechanical, touches two tickets that are otherwise settled, and none of it
blocks a merge.

Note the same branch **did** fix this class where it was rewriting anyway:
ticket 350's `rank.ts:785-790` became "grep for the condition", and ADR-0031
cites by grep throughout. So the standard is understood; its application is
uneven.

## What to do

1. Convert each `file.ext:NNN` citation in 351 and 362 to a grep anchor — the
   symbol, condition or string being pointed at, plus the file path.
2. For fork files, say which tree the path is in
   (`vendor/tbc-new-fork/...`) and note it is gitignored, so a reader who
   cannot resolve it knows why rather than assuming the path is wrong.
3. Re-check each claim while converting. A citation that cannot be re-anchored
   because the symbol is gone is a finding, not a formatting problem.

## Acceptance

- [ ] `grep -c '\.\(ts\|go\|py\|mjs\):[0-9]'` returns 0 for tickets 351 and 362.
- [ ] Every converted citation names a symbol or string that a grep finds at
      the current pin, or is marked as unresolvable with the reason.
- [ ] Fork-tree paths say they are fork-tree paths.

## What is NOT claimed

Nothing here says any finding in 351 or 362 is wrong. Both tickets' conclusions
were reviewed and held; this is about whether a future reader can re-check them.
