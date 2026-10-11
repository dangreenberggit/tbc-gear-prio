# Pre-merge review — fix/loud-failure-blocks

Reviewed range: `005fa7c67efdac57437b783d8856e63a7041d7e1..2c9409e28b1fc5c0e3318f4673078f37e567d690`

Reviewed range: `2c9409e28b1fc5c0e3318f4673078f37e567d690..bcc78d6ef6add25a437946b111ce7255fd335e36`

Dispatch note, round 1: small-change lane. `git diff --shortstat dev...HEAD`
gave "5 files changed, 43 insertions(+), 8 deletions(-)"; `git diff
--name-only dev...HEAD` listed the two `pre-merge-review/SKILL.md` copies,
tickets 599 and 600, and `.scratch/carry-forward/map.md`. `codex` is not on
`PATH`, so one fresh `general-task` reviewer on Opus ran the adversarial
brief and the `code-review` Standards and Spec checks. No domain brief: the
diff has no game-domain content.

## Adversarial

- **A1 (silent wrong result):** the "Any other finding" bullet in step 3
  still said "fixed when this branch introduced it, otherwise a `defer` row
  with a ticket", so an unfixed missing test this branch added could be
  deferred without the owner's permission.
- **A2 (other):** the outcome list and step 5 said "whose row does not
  quote the owner's permission", but a blocked finding has no legal
  Disposition word (only `fixed`, `defer`, `wontfix`).
- **A3 (other):** the round 2 skip rule ("a finding that step 3 says is
  fixed in this branch has no fix commit") gave blocked loud failures a
  second route to "Stop".

## Domain

Skipped: no game-domain content.

## Standards + Spec

- **B1 (bookkeeping):** the `map.md` line for 599 changed the owner's
  reason. The owner wrote "youre spending more money talking abotu it then
  it will ever save".

**Standards: clean otherwise. Spec:** both items done, apart from A1 and B1.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                   |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | bcc78d6e: the bullet now blocks the merge unless the owner allows a `defer` row |
| A2  | Adversarial | fixed       | bcc78d6e: a blocked finding gets no row until the owner allows the deferral     |
| A3  | Adversarial | fixed       | bcc78d6e: the skip rule names only "fixed before merge" findings                |
| B1  | Standards   | fixed       | bcc78d6e: map line now reads "discussing it costs more than it would save"      |

## Focused check (round 2)

Fork range: none (`git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json`
exits 0). One fresh `general-task` reviewer on Opus.

1. Conditions 1 to 3: hold.
2. Each change matches its finding: pass. The commit also widened ticket
   600 item 1's "Fixed" note to name "any other finding" (R2-2).
3. New tests: none in the range.
4. Tests the fixes touch: none.

Findings:

- **R2-1 (contradiction, not bookkeeping):** SKILL.md:174-175 says the
  round 2 table has "one row per finding", but the A2 fix at SKILL.md:223-227
  says a blocked finding gets no Disposition row yet. Suggested text for
  174-175: "add a `## Disposition (round 2)` table with one row per finding,
  except a finding that blocks the merge: it gets its row only as the
  outcome list in "Round limit" says."
- **R2-2 (bookkeeping):** the ticket 600 note widening; the text is correct
  and follows from A1.

R2-1 is not bookkeeping, so the review stopped here as "Round limit" says,
and the user decided what happens next.

## Disposition (round 2)

| ID   | Axis          | Disposition | Ticket / note                                                                                                                             |
| ---- | ------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| R2-1 | Focused check | fixed       | the reviewer's suggested text applied to SKILL.md:173-175 with the owner's go on 2026-10-10, relayed by the coordinator; no further round |
| R2-2 | Focused check | wontfix     | bookkeeping: the ticket 600 note follows from A1 and is correct                                                                           |

The owner also confirmed on 2026-10-10, relayed by the coordinator, that A1
stays: missing tests and spec gaps a branch introduces also block the merge.

## Summary

Round 1 found three rule gaps and one paraphrase slip; bcc78d6e fixed all
four. Round 2 found that the A2 fix contradicts the round 2 Disposition
sentence (R2-1), so the review stopped. Tickets filed by this branch: 0.
Tickets closed: 1 (599, `wontfix`).
