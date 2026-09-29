Status: open
Type: investigation
Origin: owner, 2026-09-28, during stage-gate 511-512-set-credit (`.scratch/stage-gate/511-512-set-credit/decision-log.md`, 2026-09-28 entries, and `other-pieces-decisions.md` in the same folder; both gitignored)
Blocks: none
Blocked by: none
Related: 511, 512, 298, 500, 505, 519

# The tab cannot show the value of moving a worn set bonus to other slots

This is an investigation ticket. It records a gap and the questions to
answer before anyone designs a fix. Do not start a fix from this ticket.

## The owner's words

2026-09-28, answering the Q-other-pieces decision in stage-gate
511-512-set-credit, verbatim:

> I'm leaning towards A, but that phase 5 set item gap looks serious. File it as an investigatory ticket for later I guess, but I'll note really answer how it doesnt affects this ticket.

## The kind of scenario

A player wears exactly enough pieces of a set for one of its bonuses. The
candidate pool also has pieces of that set for slots where the player
wears a non-set item. The best move can then be two swaps together: put a
better non-set item into a slot that holds a set piece, and put a set piece
into a slot that did not hold one. The worn piece count, and so the bonus,
stays the same, and the player gains the stats of both new items.

The Upgrades tab values one item at a time. On its own, the non-set item
breaks the bonus, and the set piece for the other slot adds only its own
stats. Neither row shows the value of the two swaps together.

Once the player has equipped the extra set piece, the tab handles the rest:
they then wear one piece more than the bonus needs, and the non-set row no
longer breaks it. The gap is the first move, when neither swap reads well
on its own.

The scenario is not only a phase-5 case. Four of the five committed tab
fixtures, at phases 2 and 3, have a worn set at exactly a bonus count and
unworn pieces of that set for other slots. See the 2026-09-28 comment.

## Example: feral in phase 5

- Upstream's feral "P4 6P" preset wears four Thunderheart pieces (set 676):
  shoulders 31048, chest 31042, hands 31034, legs 31044
  (`git -C vendor/tbc-new-fork show HEAD:ui/druid/feralcat/gear_sets/p4_6p.gear.json`).
  That gives the 4-piece bonus.
- Upstream's feral "P5" preset keeps the 4-piece bonus with the shoulders
  plus the Sunwell Thunderheart Wristguards 34444, Waistguard 34556 and
  Treads 34573. It wears non-set Sunwell items in chest (34397), hands
  (34370) and legs (34188)
  (`git -C vendor/tbc-new-fork show HEAD:ui/druid/feralcat/gear_sets/p5.gear.json`).
- For a player in the P4 gear, the tab would rate the Bladed Chaos Tunic
  (34397) by a sim of that one chest swap, which loses the 4-piece bonus.
  No row shows that the Thunderheart Wristguards would restore it.

The example cannot be run today for a second reason. The feral phase-5
candidate pool has none of 34444, 34556 and 34573: each of these commands
prints 0 (and 1 for 31048, the shoulders):

`git -C vendor/tbc-new-fork show HEAD:ui/core/components/individual_sim_ui/upgrades/data/feral-p5.universe.json | grep -c '"itemId": *34444\b'`

Tickets 298 and 500 record that data gap, and ticket 505 records the
owner's direction that the fork's candidate pool should come from wowsims'
own item source. Ticket 519 is the same kind of question at phase 3: the
owner asked whether a row should be compared with "4 pieces other than the
helm".

## Why the tab cannot show it

Line numbers are in `ui/core/components/individual_sim_ui/upgrades/engine/`
of `vendor/tbc-new-fork` at fork commit
`0f499576d6f69abf7ba36836b17cc82fcc722e36`, the `commit` in
`data/wowsims-fork.lock.json` on 2026-09-28. Read them with
`git -C vendor/tbc-new-fork show 0f499576:<path> | sed -n <from>,<to>p`.

- A row's own figure is a sim of that one swap
  (`rank.ts:1200`, `deltaDps = candObs.dps - candBaselineDps`). For the
  non-set chest, that sim already includes the lost 4-piece bonus.
- The set-bonus loop skips every bonus at or below the worn count
  (`rank.ts:1751`, `if (threshold <= piecesWorn) continue;`), so a worn
  bonus is never offered as a gain.
- Set rows get future bonuses only above their count after the swap
  (`rank.ts:2615-2619`). A Thunderheart Wristguards row at worn 4 goes to 5
  pieces and has no bonus above 5, so it shows only its own stats.
- Non-set rows get no set treatment at all (`rank.ts:2560-2561`,
  `if (setId == null) continue;`).
- Non-set rows can still show a fixed "breaks 4-piece ..." note
  (`set-bonus.ts:31-54`, called at `rank.ts:1201`), and a slot whose best
  row reads 0 or less can be labelled a dead slot with cause
  `set-break-toll` (`dead-slots.ts`). Neither points at the set piece that
  would restore the bonus. Whether the feral phase-5 chest slot would get
  that label is a hypothesis, untested.

## How often it happens: what is measured and what is not

Measured: in every committed candidate pool from phase 2 to phase 5, every
spec has at least two sets with pieces in more than four slots. Feral and
ret have 2 or 3 such sets per phase; the other specs have 8 to 19.
Command (Git Bash, repo root):

```
python -c "
import json,glob,collections as C;I=json.load(open('data/items/index.json',encoding='utf8'))
for f in sorted(glob.glob('data/universes/*-p[2-5].json')):
  s=C.defaultdict(set)
  for e in json.load(open(f,encoding='utf8'))['entries']:
    k=I.get(str(e['itemId']),{}).get('setId')
    if k: s[k].add(e['slot'])
  print(f, sum(len(v)>4 for v in s.values()), sorted(len(v) for v in s.values() if len(v)>4))
"
```

That count measures only how many sets have pieces in more than four
slots. It is not a bound on the scenario. A five-slot set with a 4-piece
bonus already allows the move (the Thunderheart helm case in ticket 519).
A smaller set can also allow it when its bonus needs fewer pieces than it
has slots, for example a set with pieces in 3 or 4 slots and a 2-piece
bonus. Not measured, each a hypothesis:

- how many of those sets have a bonus the sim implements and that changes
  the spec's DPS;
- how often a player worn at a bonus has a better non-set item for a set
  slot and a usable set piece for another slot (the 2026-09-28 comment
  counts it only in the five committed tab fixtures);
- how much DPS the move is worth when it exists (the 2026-09-28 comment
  gives an additive estimate for two fixtures, not a sim).

## What to investigate

1. **How common the scenario is.** For each DPS spec and phase, find the
   sets where a player can wear the bonus from more than one group of
   slots: tier sets in phase 5, where the Sunwell wrist, waist and feet
   pieces join the five tier-6 pieces, and any phase where a set has
   pieces in more slots than a bonus needs. Say which cases matter, using
   upstream's presets as examples where they exist.
2. **What the tab would need to show it.** For example, a group swap
   valued as a whole: a non-set item in one slot plus a set piece in
   another, simmed together or estimated from figures the run already has.
   Say which row shows the figure (the non-set item, the set piece, or
   both), how the other item is chosen, how many extra sims a run would
   need, and how the tab explains the pair to the player. The partner
   choice is the same question as Q-partner-check in stage-gate
   511-512-set-credit, so read its answer first.
3. **How it interacts with the Set potential figure.** Set potential today
   credits a set row with bonuses above its count after the swap. A move
   keeps the count the same. Decide whether the figure belongs under Set
   potential, shows with Set potential off too, or neither. Check that no
   bonus is counted twice when the non-set row and the set-piece row both
   point at the same restored bonus, and how ranking by the best total
   (the owner's decision in 511-512-set-credit) would treat a row that has
   both a solo figure and a paired figure.
4. **What depends on the data gap.** The feral phase-5 case needs 34444,
   34556 and 34573 in the candidate pool (tickets 298, 500, 505). Say
   which parts of this investigation can go ahead without them.

## How this relates to tickets 511 and 512

Recorded on 2026-09-28 for the owner's question. Neither ticket depends on
this gap or changes the figure of a non-set row, because that figure is a
plain sim of the swap. Ticket 512's ladder (plan revision 7, step 12)
measures every worn bonus on the player's own gear each run, which is the
value a move would restore. Ticket 511's step sims (step 15.2) sim a
group of swaps as one gear. A fix for this gap could reuse both
(hypothesis, untested). The 2026-09-28 comment adds that a set row can
also be too low from phase 5, and says which fix designs would change a
511 or 512 figure.

## What would close this

A written finding, linked here, that answers items 1 to 4 with a
re-runnable command for each figure, and either a follow-up ticket for a
fix or a recorded decision not to show the move.

## Comments

### 2026-09-28 — independent verifier's findings

An independent verifier (agent a093f89f3cb255db3) checked this ticket
against the committed data and the fork. These are its findings. They
answer part of items 1 and 3 above; they do not close the ticket.

**1. The scenario is not only a phase-5 case.** In 4 of the 5 committed
tab fixtures (`data/tab-fixtures/`), the player wears a set at exactly a
bonus count, and the ranking has unworn pieces of that set for other
slots:

- `feral-p2-malorne4` (phase 2): Malorne worn at 4; unworn helm.
- `feral-p3-nordrassil4` (phase 3): Nordrassil worn at 4; unworn helm.
- `feral-p3-p2bis` (phase 3): Malorne worn at 2; unworn hands, legs and
  helm.
- `feral-p3-th-hands-legs` (phase 3): Thunderheart worn at 2 (hands and
  legs); unworn chest, shoulders and helm.

`ret-p3-p2` wears one Crystalforge piece, which is below the set's first
bonus, so it does not have the scenario. To re-run the check, save this
script and run it with `python` from the repo root. For each fixture it
prints the worn sets and the unworn pieces of each set in the ranking,
with each piece's `deltaDps`:

```python
import json,collections as C,sys
I=json.load(open('data/items/index.json',encoding='utf8'))
for fn in ['feral-p3-p2bis','feral-p3-th-hands-legs','feral-p3-nordrassil4','feral-p2-malorne4','ret-p3-p2']:
  d=json.load(open('data/tab-fixtures/%s.json'%fn,encoding='utf8'))
  print('==',fn,'phase',d['phase'])
  worn=C.defaultdict(list)
  for i,it in enumerate(d['gear']['items']):
    x=I.get(str(it.get('id')),{})
    if x.get('setId'): worn[x['setId']].append((i,it['id'],x.get('name'),x.get('slot')))
  items=d['ranking']['items']
  for s,v in worn.items():
    print('  worn set',s,I.get(str(v[0][1]),{}).get('setName'),len(v),[(a[2]) for a in v])
    pool=[(r['slot'],r['itemId'],r.get('name'),round(r['deltaDps'],1)) for r in items if I.get(str(r['itemId']),{}).get('setId')==s and not r.get('owned')]
    print('    unworn pool pieces:',pool)
```

**2. A worked example.** In `feral-p3-th-hands-legs`, the fixture records
the Thunderheart 2-piece break as 106.24 DPS. Shady Dealer's Pantaloons
(30898, legs, not a set piece) reads −81.8 and is 235th in the ranking's
item list; that figure includes the lost 2-piece bonus. The Thunderheart
Chestguard (31042) reads +28.7 on its own. Worn together, the chest keeps
the 2-piece bonus, so the pair is worth about −81.8 + 106.24 + 28.7 =
+53.1 DPS. This is an estimate that adds recorded figures, not a sim
(hypothesis, untested). In `feral-p3-p2bis` no move looks worth making:
the best estimate by the same method is about +3.6 DPS, under the 5.09
DPS gate the verifier used (hypothesis, untested).

**3. A set row's gear path can charge a break that a move would avoid.**
This happens when the path takes the slots of a worn set and that set has
pieces for other free slots. It cannot happen at phase 3, where the sets
use the same five slots (head, shoulders, chest, hands, legs). It becomes
possible in phase 5, with the Sunwell Thunderheart wrist, waist and feet
pieces. This is the verifier's reasoning; no run has shown it (untested).

**4. The dead-slot warning is incomplete in a move scenario.** Ticket 512
widened the engine's "set-break toll" dead-slot warning to every worn set
(`rank.ts` `countedLadderBreaks` feeding `plausibilityWarnings`, and
`dead-slots.ts` `thresholdLostByDroppingOnePiece`). `countedLadderBreaks`
exists at fork commit 02d0ea2a (the lock's `commit` today) and not at
0f499576:
`git -C vendor/tbc-new-fork show 02d0ea2a:ui/core/components/individual_sim_ui/upgrades/engine/rank.ts | grep -n countedLadderBreaks`.
As the body says, the warning does not point at the set piece that would
keep the bonus. No tab file outside `engine/` reads
`plausibilityWarnings`:
`git -C vendor/tbc-new-fork grep -n plausibilityWarnings 02d0ea2a -- ui ':!ui/core/components/individual_sim_ui/upgrades/engine'`
prints nothing.

**5. What this means for tickets 511 and 512.** Every 511 or 512 figure
is either a sim of gear the player can wear or a value measured on the
player's current gear. So this gap can only leave a row too low, never
too high, and those rows read the same before and after 511 and 512
(the verifier's reasoning, untested). Whether a later fix for this ticket
changes any 511 or 512 figure depends on its design (hypothesis,
untested):

- a fix that only adds a figure to non-set rows changes none of them;
- a fix that credits set pieces for making a move possible would change
  set-row figures in every phase.
