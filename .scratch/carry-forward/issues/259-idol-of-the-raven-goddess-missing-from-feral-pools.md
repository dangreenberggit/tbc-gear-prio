Status: open
Type: bug (pool coverage — an upstream BiS item never reaches the candidate set)
Origin: `gate-sme` recheck of the Stage 2 shortlists, 2026-08-22; handoff at
  `.scratch/handoffs/sme-rank-judgment-stage2-recheck-feral.md` (the shared caveat
  holding both feral verdicts off a clean `trust`)
Blocks: phase-2
Blocked by: none

# The feral ranged slot offers one candidate, and no real competitor reaches it

## What happens

Both feral characters get **exactly one** ranged candidate — the idol they are
already wearing. A reader learns nothing about a slot that is a live P2 decision.

```
python -c "import json,glob;[print(f.split('close-')[1][:12], [i['name'] for i in json.load(open(f))['ranking']['items'] if i.get('slot')=='ranged']) for f in sorted(glob.glob('.scratch/rank-reports/stage2-close-*.json')) if 'slamaltman' not in f]"
```

→ `nexess ['Everbloom Idol']`, `shredzepelin ['Everbloom Idol']`

**32387 Idol of the Raven Goddess is missing**, and it sits in *both* pinned
upstream P2 feral gear sets:

```
python -c "import json;[print(f,32387 in [i.get('id') for i in json.load(open('vendor/wowsims/%s.gear.json'%f))['items']]) for f in ('feral_p2_6p','feral_p2_9p')]"
```

→ `feral_p2_6p True`, `feral_p2_9p True`

## The mechanism is the one ticket 253 named, hitting a different item

The item is **present** in our index and **has no source**:

```
python -c "import json;i=json.load(open('data/items/index.json'))['32387'];print(i['name'],'| phase',i['phase'])"
python -c "import json;print(json.load(open('data/atlasloot_sources.json')).get('32387'))"
```

→ `Idol of the Raven Goddess | phase 1`, then `None`.

So the pool builder drops it for want of a source row, exactly as it drops the
Ahune neck and back. This is the same class of defect and the third confirmed
instance, which makes the pattern worth naming: **an item with no AtlasLoot
source silently never becomes a candidate, however good it is.**

Unlike the worn-item case (ticket 253), no disclosure covers this one. A missing
*worn* item at least raises a `worn-unrankable` warning. A missing *candidate*
raises nothing — the slot just looks thin, which is what ticket 173 exists to
complain about.

## SETTLED 2026-08-22 by measurement — both earlier corrections were wrong

A third SME seat ran the sim instead of reasoning about the code. Same gear, same
seed, 20,000 iterations each, only `equipment.items[16]` varied:

| ranged slot | DPS | vs worn Everbloom |
| --- | --- | --- |
| Everbloom Idol (worn) | 2153.6 | — |
| Idol of Feral Shadows | 2116.5 | −37.1 |
| Idol of the Raven Goddess | 2113.3 | −40.3 |
| nothing equipped | 2098.9 | −54.6 |

Re-runnable: `vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe sim --infile … --outfile …`
from `test/fixtures/shredzepelin-cat.raid-sim-request.json` with
`simOptions {"iterations":20000,"randomSeed":"443754031"}`; `iterationsDone: 20000`
and `error: null` on all four arms. Full detail in
`.scratch/handoffs/sme-idol-slot-settled.md`.

**What this overturns, in order:**

1. **The original framing (seat 1) was wrong.** The idol slot is *not* a live P2
   decision. Everbloom wins by 37 DPS; the other two are within a few DPS of each
   other. Nothing here is close.
2. **The first correction (seat 2) was also wrong**, and so was this ticket after
   I applied it. Seat 2 argued 32387 scores ~zero because Improved Leader of the
   Pack buffs *party members* and these are single-actor sims. That reads off the
   buff text but not the code: the druid sits in its own party and the sim hands
   the aura to every party member, wearer included. **Measured, 32387 is worth
   +14.3 DPS over an empty slot** — small, but not nothing, and the reasoning
   behind the ~zero claim does not hold.
3. **The acceptance criterion I rewrote is unworkable.** It demands 28372 Idol of
   Feral Shadows reach the pool, but its only source is
   `[{"dungeon": "The Arcatraz", "kind": "heroic"}]` — the heroic category
   `assemble_universe.py:68-76` excludes **on purpose**, which is ticket 17's
   pre-raid scope question. Chasing it here quietly reopens a decision this
   ticket has no business reopening.

**What survives, and it is the whole point:** the pool-coverage mechanism. An item
with no recorded source is silently never considered — third confirmed instance,
after the Ahune neck and back. That is worth fixing generally, and the general fix
is the detector ticket 173 asks for, not a hunt for any particular idol.

**The lesson worth more than the ticket:** two seats reasoned from source code to a
DPS conclusion and both got it wrong in different directions. One sim run settled
it. When the question is "what is this item worth", measure it.

## Superseded correction, kept for the trail — 32387 is the wrong item to chase

The pre-merge domain axis refuted this ticket's framing before merge. The
pool-coverage gap is real; the item named as the prize is not.

**32387 Idol of the Raven Goddess carries no personal DPS for a feral cat.** Its
only effect in the pinned sim upgrades the *party* Leader of the Pack aura from
Regular to Improved (`vendor/tbc-new-fork/sim/druid/druid.go:166`,
`feralcat/feralcat.go:78-84`), and Improved LotP adds `MeleeCritRating, 20` to
**party members**, not the wearer (`sim/core/buffs.go:817-830`) — the wearer's 5%
crit is granted either way. `vendor/wowsims/db.json` lists its effect literally as
`"Improved Party Auras (39926)"`, and `sim/druid/items.go:209-212` registers it as
a no-op.

These are **single-actor sims**. Pooling 32387 would produce a candidate scoring
approximately **zero delta** against the worn Everbloom Idol, which grants
`IdolShredBonus += 88` — a real personal gain (`items.go:194-207`). The original
acceptance box would have been satisfied by a row that changes nothing, and this
ticket's claim to be the highest-value fix of the recheck was exactly backwards.

It sits in upstream's BiS *set* because a raiding feral brings the raid-wide crit
aura — a consideration a solo-actor DPS ranking cannot express. **That is the
durable lesson: `bisTags` corroboration silently fails for party-buff items**, and
both SME handoffs leaned on that technique hardest.

**The item actually worth pooling is 28372 Idol of Feral Shadows** — phase 1, Rip
damage +7 per combo point per tick (`druid.go:30`), a genuine personal-DPS
competitor to Everbloom. This ticket did not name it.

**Idol of Terror (33509) is `phase: 4`** in upstream's own db, so it is correctly
absent from a `maxPhase: 2` run rather than missing. The SME asserted P2 relevance
while its own handoff admitted it had not confirmed that; withdrawn.

**Severity, revised.** The slot is closer to "one idol dominates" than to "a live
P2 decision" — for a solo-actor cat sim the field reduces to Everbloom (+88 Shred,
flat) against Feral Shadows (Rip scaling), and **neither handoff measured either**.
This stays open as a real pool gap, but it is not the recheck's top prize.

## Why this looked like the highest-value fix (superseded above)

It is the single caveat keeping **both** feral shortlists off a clean `trust`,
it is one bug rather than two (both runs share the same 228-row pool), and it is
narrow: one item, one missing source row, no scope question attached. Contrast
the heroic exclusion, which is deliberate and belongs to ticket 17.

## Not established

- Whether other upstream-BiS items are missing the same way. **Untested.** The
  obvious check is to diff every pinned `vendor/wowsims/*_p*.gear.json` set
  against the corresponding pool and list what never arrives — that would size
  the problem instead of fixing it one item at a time, and it would give ticket
  173 the detector it actually asks for.
- Whether the right fix is a source row for this item, a rule admitting
  sourceless items that appear in an upstream BiS set, or something else.

## Acceptance

- [ ] The sourceless-item mechanism is addressed generally — an item with no
      recorded drop source no longer vanishes from the pool without a trace.
      **Do not chase a specific idol.** Measurement settled the slot: Everbloom
      wins by 37 DPS and neither alternative is close, so no idol is a missing
      upgrade. 28372 is heroic-sourced and pooling it would reopen ticket 17's
      scope question; 32387 is worth +14.3 over an empty slot and loses to what
      is worn.
- [ ] The fix is stated in terms of the general mechanism, not hardcoded to this
      id — or, if hardcoded, says why and links the general ticket.
- [ ] The diff of upstream BiS sets against the pools is run and its result
      recorded, so the size of the gap is known rather than guessed.
