Status: open
Type: question
Origin: owner at the ticket 502 render gate, 2026-09-27 (`.scratch/stage-gate/502-other-pieces-rule/owner-answers-renders.md`)
Blocks: none
Blocked by: none
Related: 502 (the rule that counts the other set pieces' own stats), ADR-0034

# Thunderheart Cover: why its single-swap figure differs so much between two runs, and whether a row should be compared with the best route to the same bonus

## What the owner said

At the ticket 502 render gate the owner approved the renders and raised the
Thunderheart Cover row. Verbatim, from
`.scratch/stage-gate/502-other-pieces-rule/owner-answers-renders.md`
(gitignored):

> It looks good except for the cover issue.  It seems weird that one helm would be -200 DPS but this one would only be -81. And if I understand correctly, that's without adding a set bonus. I wonder if it's a sign of some other issue with the system for determining these numbers. If it was closer to -200 then we wouldn't see it as a contender.
>
> There is the other possible issue of being able to get a set bonus via a better method. (4 pieces other than the helm).
>
> We can file this as a separate ticket since it doesn't seem to be the tooltip.

## What the committed fixtures show

Both fixtures were recorded at fork `2117d5271`.

- Thunderheart Cover (31039) has "Item stats" −202.0 in
  `feral-p3-nordrassil4` and −81.0 in `feral-p3-th-hands-legs`. These are the
  row's `deltaDps` (−202.046 and −81.020):
  `python -c "import json;[print(f,[round(i['deltaDps'],3) for i in json.load(open('data/tab-fixtures/%s.json'%f))['ranking']['items'] if i['itemId']==31039]) for f in ('feral-p3-nordrassil4','feral-p3-th-hands-legs')]"`
- In `feral-p3-th-hands-legs`, with Set potential on, the Cover ranks 10th at
  +20.9. Its popover reads: Item stats −81.0; SET POTENTIAL; Thunderheart
  Harness 4pc (2/4) +73.2; Thunderheart Chestguard stats +28.7; Total +20.9.
  Command (the checker is a gitignored stage tool; the committed test
  `packages/core/test/fork-set-fixtures.test.ts` checks the same figures
  through the fork's `view.ts`):
  `node .scratch/stage-gate/502-other-pieces-rule/tools/r1check.mjs feral-p3-th-hands-legs --popover --ids=31039`,
  and the same with `--rows --ranks` for the rank.

## The SME seat's point

The SME seat's handoff for ticket 502
(`.scratch/handoffs/sme-rank-judgment-502-other-pieces-rule.md`, finding
F9) notes that Thunderheart Chestguard + Thunderheart Pauldrons reach the
same Thunderheart 4pc for +103.5, without the Cover. That is the measured
Thunderheart 4pc package in `feral-p3-th-hands-legs` (items 31048 and
31042, `packageDeltaDps` 103.495):
`python -c "import json;[print(s['setName'],s['threshold'],s['packageItemIds'],s['packageDeltaDps']) for s in json.load(open('data/tab-fixtures/feral-p3-th-hands-legs.json'))['ranking']['setBonuses'] if s.get('packageDeltaDps') is not None]"`

## Open questions

No cause is known for either point.

1. Why does the same helm's single-swap figure differ so much between the
   two runs (−202.0 in `feral-p3-nordrassil4`, −81.0 in
   `feral-p3-th-hands-legs`)? Does the difference point to a problem in how
   the figures are worked out, or does it follow from the different worn
   gear in the two runs?
2. Should a set row be compared against the best measured route to the same
   bonus that leaves that row's item out? Today the Cover row's figure
   assumes the Cover plus the Chestguard, while the Chestguard + Pauldrons
   route reaches the same 4pc without the Cover.

## What would close this

1. An investigation that answers question 1, with the commands it ran.
2. An owner ruling on question 2, and a follow-up ticket if the ruling
   changes the rule in ADR-0034's ticket 502 paragraph.
