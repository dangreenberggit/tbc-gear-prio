Status: open
Type: docs (a comment that misleads two readers in a row)
Origin: `gate-sme` seat 2, 2026-08-21; handoff at
  `.scratch/handoffs/sme-rank-judgment-stage2-close-ticket-250.md`
Blocks: none
Blocked by: none

# build_feral_skeleton.py's consumables comment omits selected-vs-available

`scripts/build_feral_skeleton.py:92-97` warns that dropping `potions` /
`conjuredItems` "silently disarms the rotation's Dark Rune and Fel Mana Potion branches
while the sim still returns a confident number". True, and load-bearing.

What it does not say is that those two lists are the **available menu**, while
`conjuredId` / `potId` are the single **pick** — so a branch naming an unpicked item
correctly casts zero times even when the arrays are fully populated. On tip
(`conjuredId: 12662`, `potId: 22832`) Dark Rune `22788` and `22105` cast zero, and
Fel Mana Potion `31677` appears only inside a `not selectedPotion(31677)` threshold guard
and is not castable from the list at all.

Verify:

```
python -c "import json;p=json.load(open('data/presets/feral/p2.raid-sim-skeleton.json'))['raid']['parties'][0]['players'][0];print('picks',p['consumables']['conjuredId'],p['consumables']['potId']);s=json.dumps(p['rotation']);[print(t,s.count(t)) for t in ('22788','31677','22105')]"
```

This cost two readers real time during the Stage 2 gate work: the executor first
wrote the zeros up as a possible bug meaning tip understated its own DPS, and the
SME seat had to correct it (selecting Dark Rune would *replace* Demonic Rune, not
add to it). Both the ticket-250 write-up and `q2-remeasure/commands.md` now carry
the distinction; the comment itself still does not.

## Acceptance

- [ ] The comment states that the arrays are availability and `conjuredId`/`potId`
      are the selection, and that an unpicked branch casting zero is correct.
