Status: open
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

- [ ] `scripts/build_feral_skeleton.py:96` names Fel Mana Potion.
- [ ] The two scratch artifacts corrected or annotated.
- [ ] Confirm no other file repeats the mislabel: `grep -rn "Flame Cap" --include=*.py --include=*.ts --include=*.md .`
