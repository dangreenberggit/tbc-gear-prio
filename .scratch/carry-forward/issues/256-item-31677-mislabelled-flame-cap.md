Status: closed
Type: defect (a stated game fact is wrong in three artifacts)
Origin: pre-merge domain axis on feat/stage-2-close-shortlist-box, 2026-08-21
Blocks: none
Blocked by: none

# Item 31677 is Fel Mana Potion, not Flame Cap

## The finding

Three artifacts call item `31677` "Flame Cap". It is **Fel Mana Potion**. The
vendored sim source names it outright:

```
grep -n "31677" vendor/tbc-new-fork/sim/core/consumes.go
```

→ line 161: `// registerFelManaPotionCD handles Fel Mana Potion (31677): restores 3200 mana over 24s`

Affected:

- `scripts/build_feral_skeleton.py:96` — "the rotation's Dark Rune and Flame Cap
  branches". **This is the origin; it predates the branch that surfaced it.**
- `.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/commands.md:124`
- `.scratch/handoffs/sme-rank-judgment-stage2-close-ticket-250.md` (several)

## Why it is worth fixing rather than shrugging at

The measurement is unaffected — the APL guard behaves the same whatever the item
is called, and the zero-cast conclusion stands. But the mana thresholds in that
guard (2300/2000) differ per potion *because* Fel Mana Potion restores a
different amount than Super Mana Potion. Under the "Flame Cap" reading those
numbers are inexplicable; under the correct reading they are the point. A future
reader debugging that gate would be sent the wrong way.

`build_feral_skeleton.py:82-97` is a load-bearing comment that several artifacts
now quote. Fixing the source comment is the useful half.

## Acceptance

- [x] `scripts/build_feral_skeleton.py:96` names Fel Mana Potion.
- [x] The two scratch artifacts corrected or annotated.
- [x] Confirm no other file repeats the mislabel: `grep -rn "Flame Cap" --include=*.py --include=*.ts --include=*.md . | grep -v node_modules`

## Resolution (2026-08-21, `fix/worn-item-pool-coverage`)

`scripts/build_feral_skeleton.py:96` now names Fel Mana Potion, and the comment
carries the *why* the ticket asked for: the guard thresholds differ per potion
(Super Mana Potion `22832` at 2300, Fel Mana Potion `31677` at 2000) because the
potions restore different amounts, cited to
`vendor/tbc-new-fork/sim/core/consumes.go:161`.

Both named scratch artifacts were corrected in place and carry a dated
correction note saying no measurement changed:

- `.scratch/handoffs/sme-rank-judgment-stage2-close-ticket-250.md` (7 occurrences)
- `.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/commands.md` (1)

The sweep found the mislabel in four further artifacts the ticket did not list.
Two are **open** tickets that would be worked from a stale name, so they were
corrected: `255-document-selected-versus-available-consumables.md` (2) and
`73-extend-sim-defaults-extractor-to-talents-and-consumables.md` (1). Ticket 255
quotes the `build_feral_skeleton.py` comment directly, so leaving it would have
broken the quote.

Deliberately **not** changed: closed tickets 250 and 244, the stage-gate
plan/review/decision-log artifacts, `docs/reviews/feat-stage-2-close-shortlist-box.md`
and `.scratch/carry-forward/map.md`. These are dated historical records of what
was written at the time; the review file and this ticket name the mislabel *as
the finding*, so the string is load-bearing there. Remaining `Flame Cap` matches
in the tree are these records plus the correction notes above.
