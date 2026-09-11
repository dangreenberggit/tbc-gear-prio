Status: closed
Closed: 2026-09-10 — converted before the merge ask, same session it was filed
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

- [x] `grep -c '\.\(ts\|tsx\|go\|py\|mjs\|json\):[0-9]'` returns **0** for
      ticket 351 and **3** for ticket 362 — those three are the captured panic
      stack trace, left verbatim on purpose (see the carve-out below).
- [x] Every converted citation names a symbol or string that a grep finds at
      the current pin. Verified, each returning ≥ 1:
      `adjustImbues(` in `ui/core/proto_utils/gear.ts`; `setGear(eventID` in
      `ui/core/player.tsx`; `private toDatabase(` in the same file;
      `adjustImbues` in `ui/core/wasm/bulk_sim/batch.ts`;
      `runRaidSimLightweight` in `ui/core/sim_ui.tsx`; `MhImbueId == 34340` in
      `sim/druid/forms.go`; `func (aa *AutoAttacks) MH()` in
      `sim/core/attack.go`; `registerStaticImbue`, `case 29453:` and
      `case 34340:` in `sim/core/consumes.go`; `func NewItem` in
      `sim/core/database.go`; `func (character *Character) enableItemSwap` and
      `func toItem` in `sim/core/item_swaps.go`.
- [x] Fork-tree paths say they are fork-tree paths. Both tickets now carry a
      line stating the paths are in `vendor/tbc-new-fork`, which is gitignored.

## The one deliberate carve-out

Ticket 362's lines 27–29 are the panic's own stack trace, pasted verbatim:

```
  ... core.NewItem                      sim/core/database.go:489
  ... core.toItem                       sim/core/item_swaps.go:500
  ... core.(*Character).enableItemSwap  sim/core/item_swaps.go:57
```

Those line numbers are **captured tool output, not citations**. Rewriting them
would falsify a record of what the program printed. The ticket now says so
immediately below the block, and every prose citation around it was converted.
A future grep-count on 362 should expect 3 and read the note rather than
treating it as unfinished work.

## Two things the conversion turned up

**A wrong path.** Ticket 351 cited `sim_ui.tsx:358`, implying
`ui/core/components/sim_ui.tsx`. The file is at `ui/core/sim_ui.tsx`; there is
no `components/` copy. Exactly the rot this ticket was filed about — the line
number was stale *and* the directory was wrong.

**A symbol that had moved.** `gear.ts:398` was cited as `Gear.adjustImbues`.
That method exists, but a grep for the names the citation implied found
nothing until the surrounding code was read; the real anchor is `adjustImbues(`
on the gear class, sitting beside `hasSharpMHWeapon` / `hasBluntMHWeapon`.

Neither changed a conclusion. Both would have cost the next reader time.

## What is NOT claimed

Nothing here says any finding in 351 or 362 is wrong. Both tickets' conclusions
were reviewed and held; this is about whether a future reader can re-check them.
The weightstone/sharpening-stone ids were re-checked while converting and
reconcile cleanly: 34340 is the Adamantite Weightstone (blunt), 29453 the
Adamantite Sharpening Stone (sharp), and `forms.go` gates on 34340 only, which
is what 351 says.
