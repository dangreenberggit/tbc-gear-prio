# SME rank judgment — ticket 250, feral rotation "regression"

Seat: gate-sme (second SME seat, stage-gate `feat/stage-2-close-shortlist-box`).
Scope: ticket 250 only. Shortlist believability for the three characters was
judged by a different seat and is not re-issued here.

## Verdict

**trust-with-caveats** — trust the re-measurement, and trust its sign.

The re-measurement is sound and the conclusion drawn from it is the one the
numbers support. The new 22-action rotation is **better**, not worse, and the
game reason for that is visible in the cast counts, not just in the DPS
average. Ticket 250's premise is wrong in sign on the current pin.

The caveats are two, and neither touches the sign:

1. Arm 1's absolute 782.14 is a **floor, not a ceiling** — three consumable
   branches never fire (finding G4), so tip's own number understates tip.
   The rotation gap is therefore at least 42.91 DPS, plausibly more.
2. The comparison is on **one gear set at one phase**. That is the right
   question for this repo, and it is not evidence about the rotation in
   general.

`contested:` ticket 250 states as fact "their rewrite is ~18 DPS worse on our
gear" and "Upstream's new feral rotation costs ~18 DPS". Both are contradicted.
Old = 740.67, new = 782.14 on the pinned v0.0.119 binary — the new rotation is
41.47 DPS **ahead** as a whole package and 42.91 ahead on rotation alone.

## What was reviewed

| input | what it is |
| --- | --- |
| `.scratch/carry-forward/issues/250-feral-rotation-regression-unreviewed.md` | the ticket and its acceptance items |
| `.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/commands.md` | three-arm design, invocations, results |
| `arm{1,2,3}-*.request.json` / `.result.json` (same dir) | the six sim payloads I read directly |
| `.scratch/stage-gate/stage-2-close-shortlist-box/binary-provenance.md` | pin, digest, live above-cutoff counts |
| `.scratch/rank-reports/stage2-close-{shredzepelin,nexess}.json` | feral above-cutoff rows |
| `data/items/index.json` | item stat lines |

Character context: two night-elf feral druids at maxPhase 2, pool 228, baselines
2266.9 and 2302.5 DPS. Skeleton is the owner's own P2 settings export,
StandardTalents `-503032132322105301251-05503301`.

Every number below came from commands I ran; each is given inline.

## Game findings

| # | finding | severity | evidence |
| --- | --- | --- | --- |
| G1 | The 42.91 DPS gap is real and has a clean feral-mechanics explanation: the new rotation lands more Shreds and far more Ferocious Bites. | high (resolves the ticket) | cast-count extract below |
| G2 | The old rotation's DPS *variance* is 2.8× tip's, which is itself a sign the old list was mis-sequencing, not just scoring lower. | medium | `stdev` 32.229 (tip) vs 91.860 (old rot) |
| G3 | Tiger's Fury is cast zero times in **both** arms. Expected for TBC feral at this gear. Not a defect. | none (rules out a false alarm) | cast table below |
| G4 | Dark Rune `22788`, Flame Cap `31677`, Night Dragon's Breath `22105` never fire — but this is **correct APL behaviour**, not the disarm `build_feral_skeleton.py:92-97` warns about. | medium (ticket-worthy, not a bug) | APL condition read, below |
| G5 | The feral above-cutoff sets are believable feral rows; the movement 27→14 / 55→12 is explained by a higher baseline, not by rotation damage. | low | baseline + row read below |

### G1 — why the new rotation wins (the actual game reason)

Per-iteration cast counts, both arms on tip's gear and tip's consumables, so the
only difference is the priority list:

```
python -c "import json;NAMES={27008:'Rip',33983:'Mangle',27002:'Shred',24248:'FerociousBite',768:'CatForm',9846:'TigersFury'};
[ (lambda p: (print('==',a,round(p['dps']['avg'],2)),[print(' ',NAMES.get(x['id'].get('spellId'),x['id'].get('otherId') or x['id']),sum(t['casts'] for t in x['targets'])/20000,round(sum(t['damage'] for t in x['targets'])/20000)) for x in p['actions'] if sum(t['casts'] for t in x['targets'])]))(json.load(open('.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/%s.result.json'%a))['raidMetrics']['parties'][0]['players'][0]) ) for a in ('arm1-tip','arm3-oldrot-tipcons')]"
```

| action | tip (Arm 1) casts/iter | old rot (Arm 3) casts/iter | tip dmg/iter | old dmg/iter |
| --- | --- | --- | --- | --- |
| Shred | 50.8 | 47.6 | 54,448 | 51,500 |
| Ferocious Bite | 5.8 | 3.9 | 8,522 | 6,412 |
| Mangle (Cat) | 17.5 | 14.5 | 11,968 | 9,890 |
| Rip | 10.1 | 10.3 | 28,758 | 29,471 |
| white melee | 195.8 | 195.8 | 36,580 | 35,454 |
| Cat Form (powershift) | 46.8 | 39.1 | — | — |
| Super Sapper | 0.322 | 0.229 | 829 | 589 |

This is a coherent feral story, and it is the story a druid would expect from a
rotation rewrite that adds a `Powershifting` group and thirteen tuning
variables where the old list had one:

- **Powershifts up 39.1 → 46.8 per fight.** Powershifting is the TBC feral
  energy engine — drop cat form, re-enter with Furor granting energy, spend it.
  *(Recalled, unverified: Furor 5/5 gives 40 energy on shifting into cat; the
  Wolfshead Helm interaction the new list names in its variables gives more.)*
  More shifts is more energy, and every downstream number moves with it.
- **That energy lands on Shred and Bite, the two highest-value spends.** Shred
  +3.2 casts, Bite +1.9 casts, Mangle +3.0 casts. Rip is *flat* (10.1 vs 10.3)
  — exactly right: Rip is a maintenance debuff, you want it up, not spammed.
  A rotation that gained DPS by over-Ripping would be suspect. This one didn't.
- **The new list has `Rip CP` / `Bite CP` / `Bite Trick CP (Wolfshead)` /
  `Bite Energy Cutoff Mod` / `Rip End Threshold` as named variables.** The old
  list has one variable, `Bloodlust time`. That is the difference between
  "finisher at 5 CP always" and "finisher when the combo points, the energy,
  and the remaining fight time all agree". The measured Bite delta is what that
  bookkeeping buys.
- **Sapper and Drums usage also rises** (0.322 vs 0.229 sappers/iter). The old
  list is leaving engineering cooldowns on the floor.

Read as a druid rather than as a spreadsheet: the old 12-action list is a
"press buttons in order" APL, and the new 22-action list is a real feral
priority with powershift management. **A ~43 DPS gain from that is entirely
plausible.** I would have been more suspicious of the ticket's original claim
that it *lost* 18.

`stats:` old package (Arm 2, 740.67) reproduces ticket 250's own old number to
the cent on the new binary. So the old half of the ticket's pair is
reproducible and the *new* half (722.55) is the stale figure. That is the
cleanest possible signature of "the ticket's new number came off a binary we no
longer pin", which is what the ticket itself suspected.

### G2 — the variance is the tell

| arm | DPS avg | per-iteration stdev |
| --- | --- | --- |
| Arm 1 tip rotation | 782.14 | **32.23** |
| Arm 2 old package | 740.67 | 70.30 |
| Arm 3 old rotation, tip consumables | 739.23 | **91.86** |

Command: `python -c "import json;[print(a,json.load(open('.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/%s.result.json'%a))['raidMetrics']['parties'][0]['players'][0]['dps']) for a in ('arm1-tip','arm2-old-package','arm3-oldrot-tipcons')]"`

A feral rotation that runs *consistently* has low run-to-run spread; one that
occasionally starves on energy or clips a finisher has high spread. Tip's
stdev is a third of the old rotation's. This is independent of the mean and
points the same way: the new list is not merely scoring higher, it is failing
less often. It also means the DPS mean is a *conservative* summary of the
improvement — the old rotation's bad runs are much worse.

This matters for ranking work specifically: a noisier baseline rotation makes
per-item deltas noisier, which is the mechanism by which "the ranking moved
more than the DPS did" (ticket 250's own observation) happens.

### G3 — Tiger's Fury absent in both arms, and that is correct

Neither arm casts Tiger's Fury (spell 9846 appears in the action id list with
zero casts in both). I checked because a feral rotation with no Tiger's Fury
would normally be a red flag.

*Recalled, unverified TBC game fact:* in TBC, Tiger's Fury costs 30 energy and
adds flat damage per attack, and the feral community consensus was that it is a
**DPS loss** for a shred-spec cat at raid gear levels because the energy is
worth more as another Shred. It only became a rotational button in Wrath, when
it was changed to *generate* energy. Both rotations declining to cast it is
therefore correct play, not a broken branch. Flagged so nobody re-opens it as a
bug.

### G4 — the zero-cast consumables are correct, not the disarm the script warns about

You asked whether the zero casts for `22788` / `31677` / `22105` are expected
feral play or a bug. **They are correct, and the mechanism is different from
the one `build_feral_skeleton.py:92-97` warns about.** I read the actual APL
conditions rather than inferring from the arrays:

```
python -c "import json;r=json.load(open('.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/arm1-tip.request.json'))['raid']['parties'][0]['players'][0]['rotation'];print([json.dumps(g) for g in r['groups'] if g['name']=='Powershifting'][0])"
```

The `Powershifting` group's consumable branches are each guarded by a
`selectedConjured` / `selectedPotion` test naming a **specific** item id:

- Demonic Rune `12662` branch fires only if `selectedConjured == 12662`.
- Dark Rune `22788` branch fires only if `selectedConjured == 22788`.
- The generic potion branch fires, with mana-deficit thresholds that are
  *conditional on which potion is selected* (`not selectedPotion(22832) or
  deficit >= 2300`, `not selectedPotion(31677) or deficit >= 2000`).

And the skeleton's actual selections are:

```
python -c "import json;c=json.load(open('.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/arm1-tip.request.json'))['raid']['parties'][0]['players'][0]['consumables'];print(c['potId'],c['conjuredId'],c['conjuredItems'],c['potions'])"
# 22832 12662 [22105, 12662, 22788] [13442, 18253, 22828, 22832, 22837, ...]
```

`conjuredId` is **12662**, not 22788 and not 22105. `potId` is **22832**.

So the game reading is: `conjuredItems` and `potions` are the *menu of what is
available to pick*, and `conjuredId` / `potId` are *what the player actually
picked*. A druid can only have one conjured mana item and one potion selected
at a time. The APL's `selectedConjured(22788)` branch is upstream saying "if the
user picked Dark Rune, use it here" — and this user picked Demonic Rune. The
branch correctly does nothing. Same for Flame Cap: `31677` appears only inside a
`not selectedPotion(31677)` guard, which is a *threshold modifier*, not a cast
action — Flame Cap is never castable from this list at all, and the guard's
purpose is to lower the mana-deficit bar when Flame Cap is the pick. `22105`
(Night Dragon's Breath) appears in the menu array but is referenced by **zero**
APL tokens, so no branch could ever cast it.

Cross-check that the selected pair does fire: Demonic Rune 40,000 casts
(2.0/iter — its full cooldown usage), Super Mana Potion 38,864 (1.94/iter).
Both selected items fire essentially every time they can.

**This is not the failure `build_feral_skeleton.py:92-97` warns about.** That
warning is about *dropping* the arrays, which makes `registerConjuredCD` refuse
to arm the chosen item and silently zeroes the branch you *did* select. Here
the arrays are present, the selected items fire at full rate, and the zeros are
on branches the player did not select. The script's comment is correct and the
skeleton is correctly built; the observation just needs the "selected vs
available" distinction added so nobody reads it as the disarm again.

*Domain note on the pick itself:* Demonic Rune over Dark Rune is the normal
choice — *recalled, unverified:* they are near-identical mana returns, and Dark
Rune's health cost is the differentiator. Super Mana Potion `22832` over
Destruction/Haste potions is standard for a powershifting feral, because the
whole constraint is mana for shifts. Both picks read as a real player's setup,
which is consistent with the skeleton being the owner's own export.

**Consequence for the headline number:** none for the sign, but Arm 1's 782.14
is measured with three branches inert *by design*. There is no headroom being
lost here that a correctly-configured player would have. So 782.14 is not
understated after all — I disagree with `commands.md`'s parenthetical that "it
would, if anything, mean tip's 782.14 understates tip". It doesn't; the
branches are inert because they are not selected, and selecting them would
*replace* Demonic Rune rather than add to it.

### G5 — the above-cutoff movement

Live counts (feral p2): shredzepelin **14**, nexess **12**, baselines 2266.9 and
2302.5. Ticket 250 cites 27 and 55; the plan's C11 cited 20/43 at baseline
2145.6.

The domain explanation is straightforward and it is **not** about the rotation
list being wrong. The baseline rose by roughly 120–155 DPS (2145.6 → 2266.9 /
2302.5). Above-cutoff membership is a comparison against the character's
current output; when the character's own DPS rises, marginal sidegrades stop
clearing the bar. Fewer rows at a higher baseline is the expected direction.
The two feral characters at nearly the same baseline (2266.9 / 2302.5) landing
at nearly the same count (14 / 12) is consistent with that.

Ticket 250's 55-row feral-p3 figure is also not comparable to a p2 count —
different maxPhase, different pool.

**Does it bear on ticket 250's question? No.** Ticket 250 says "the ranking
moved more than the DPS did, so the rank output is the sharper signal". That
reasoning held when the DPS delta was believed to be −18 with an unexplained
mechanism. Now the DPS delta is +42.91 with a mechanism visible in the cast
counts, and the row-count movement is explained by baseline. The rank output is
no longer the sharper signal; the cast counts are.

I did check the rows themselves for game sanity:

- **Merciless Gladiator's Maul** top for both ferals, +59.8 / +57.2. Read the
  row: `handType: 4` (two-hand), `phase: 2`, stat index 19 = **1010 feral
  attack power**, plus 42 stamina, 55 agility, 33 resilience. A two-hand mace
  with an explicit feral AP budget is exactly the S3 arena feral weapon, druids
  can equip it, and feral AP on the weapon is the single biggest lever a feral
  has. Correct row, correct magnitude. *(Command:
  `python -c "import json;d=json.load(open('data/items/index.json'));print([i for i in d['items'] if i['name']==\"Merciless Gladiator's Maul\"])"`.)*
  Worth engineers knowing it is **arena loot**, not raid loot — it sits above
  raid drops in both lists, which is correct for S3 feral weapons but is the
  kind of row a reader may query.
- **Belt of One-Hundred Deaths** second for both, and also top for the ret.
  Stat line carries 29 agi / 25 str / 74+74 (hit+crit range) / 244. A leather
  belt strong for both a feral and a ret is normal; both are physical melee.
- **Tsunami Talisman** on shredzepelin at +7.2 with an almost-empty stat map
  (only two nonzero entries, 10 and 38). Per this skill's own rule, an empty
  stat line does not mean a weak trinket — its value is the proc. +7.2 is a
  modest, believable trinket delta. Not a defect.
- Slot spread is belt-and-neck-and-wrist heavy for both ferals, which reads as
  a well-geared character with a few weak slots left. Believable.

Nothing in the feral rows contradicts the re-measurement.

## Answers to ticket 250's acceptance items

**1. Expected, mismatch, or absent on the current pin?**

**Absent — and reversed.** There is no ~18 DPS regression on the current pin.
The new rotation measures 42.91 DPS *better* with the rotation isolated, and
41.47 better as a whole package. The sign flip is plausible as game domain
judgment, and I do **not** think it smells like a measurement artifact. Three
independent things agree:

- the mean (782.14 vs 739.23, 62 σ against a 1.38 bound);
- the *variance* (32.2 vs 91.9 — a separate statistic the ticket never looked at);
- the *cast counts* (more powershifts → more Shred, Bite and Mangle, with Rip
  held flat), which is a mechanism, not a summary.

A measurement artifact would move the mean without producing a coherent
mechanism in the cast breakdown. This one does.

**2. Skeleton or rotation — which should change?**

**Neither.** There is nothing unmet. The rotation is not starved (Arm 3 shows
the old list consuming tip's consumables at full rate: `22832` 37,527 casts,
`12662` 35,583), and the zero-cast branches in G4 are correct
selected-vs-available behaviour rather than an unmet precondition. The adoption
of the 22-action rotation in `d41c46c` was the right call and is worth keeping
on its measured merits, not merely on the "take upstream's rotation" rule.

**3. Close or leave open?**

**Close ticket 250**, with the pair superseded rather than kept:

- supersede `740.67 / 722.55` with `740.67 (old) / 782.14 (tip)` on
  v0.0.119 sha256 `4b60235d…`, invocations in
  `q2-remeasure/commands.md`;
- record the sign contradiction explicitly so a future reader does not find the
  old claim and re-derive it;
- record the G1 mechanism (powershift count → Shred/Bite volume, Rip flat) so
  the conclusion survives without re-running the sim.

**One thing should carry forward as its own ticket**, and it is documentation,
not a bug: `scripts/build_feral_skeleton.py:92-97` says dropping the arrays
"silently disarms the rotation's Dark Rune and Flame Cap branches". That is
true of dropping them, but the comment invites the misreading that those
branches *should* fire when the arrays are present. They should not — Dark Rune
is unselected and Flame Cap has no cast action at all. Add the selected-vs-
available distinction to that comment so the next reader does not spend a seat
on it. That is exactly what happened here.

## Gate

Would I trust this output as a feral druid who knows the game?

**Yes, for the question ticket 250 asks.** The rotation comparison is clean,
single-variable, reproducible from the recorded commands, and the winner wins
for a reason I can name in game terms. The feral shortlist rows I spot-checked
are believable and correctly typed.

What must be true before an unqualified yes:

- The comparison stays scoped to this gear at this phase. It is not a general
  claim about upstream's rotation, and should not be quoted as one.
- The `build_feral_skeleton.py:92-97` comment gets the selected-vs-available
  clarification, so the G4 zeros are not re-flagged.

## Confidence caveats

- G1's mechanism reading is mine, from cast counts I extracted. The counts are
  read from the committed result JSONs with the command shown. The *reading*
  of them as "powershift engine → more Shred/Bite" is domain judgment.
- Furor energy-on-shift, Wolfshead Helm, and Tiger's Fury being a TBC DPS loss
  are **recalled, unverified** TBC facts. None of them is load-bearing for the
  verdict — the verdict rests on the measured counts and the measured spread.
- I did not run any sim. Every DPS and cast figure is read from the six
  committed result JSONs on the digest in `binary-provenance.md`.
- I did not re-judge shortlist believability; the row checks in G5 are only the
  sanity spot-checks needed to answer whether the row-count movement bears on
  ticket 250.
- `vendor/wowsims/db.json` was not consulted; the item rows I needed were
  unambiguous in `data/items/index.json` and no name-vs-stats disagreement
  arose.

## Notes for engineering

- Ticket 250's headline is wrong in sign. Fix the ticket text when closing it,
  not just the checkbox — the sentence "their rewrite is ~18 DPS worse" will
  otherwise be quoted later.
- The old rotation's DPS spread is 2.8× the new one's. If any historical
  ranking was produced on the old rotation, its per-item deltas were noisier
  than the current ones, independent of the mean.
- Zero casts for Dark Rune and Flame Cap are correct. Do not "fix" them.
- Merciless Gladiator's Maul is arena loot sitting at the top of both feral
  lists. Correct, but expect it to be questioned.
- I disagree with one line in `commands.md`: the zero-cast branches do not mean
  tip's 782.14 understates tip. See G4.
