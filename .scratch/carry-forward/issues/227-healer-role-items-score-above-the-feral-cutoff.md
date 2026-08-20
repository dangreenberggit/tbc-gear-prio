Status: blocked
Type: bug (suspected scoring / role-relevance gap on the feral-p3 fixture)
Origin: second `sme-rank-review` opinion on ticket 225's closure, 2026-08-18 —
  verdict `do-not-trust` on the closure; handoff at
  `.scratch/handoffs/sme-rank-judgment-ticket-225-second-opinion.md`
Blocks: none
Blocked by: 234

# Ten healer-statted items score above the feral cutoff

On the committed `feral-p3` truth sweep, **10 of the 28 rows in the
band above the cutoff are healer gear** — intellect, healing power,
spellpower, spirit and mp5, with **zero** agility, strength, attack
power, melee crit, melee hit, expertise or armour penetration. They score
**+4.61 to +7.80 DPS** for a feral druid, and one of them is the neck
slot's best row.

A feral gains nothing measurable from a healing stat line. Either these
items should not clear the cutoff, or the reason they do needs to be
stated and defended.

## Why this is a sibling of ticket 226, not part of it

Ticket 226 covers three slots where **every non-worn candidate loses by
an implausible margin** — a cliff, where the suspicion is that value is
being credited to the incumbent or withheld from candidates. This ticket
is the opposite sign: items that should be near-zero are scoring
**positive** and clearing a threshold.

They may share a root cause and they may not. Ticket 226's shapes are
concentrated in three slots and involve items with real effects that may
not be simulated; this one is spread across six slots (feet, wrist,
waist, back, finger, neck) and involves items whose *stat lines alone*
should place them at zero. Filing them together would force one
diagnosis onto two different signatures. If a single cause is found,
close whichever ticket it does not belong to with a pointer.

## The verified list

Stat lines were read from this repo's own files, not recalled. Every one
of the ten agrees **exactly** between `data/items/index.json` and
`vendor/wowsims/db.json` (`scalingOptions.0.stats`), so this is not a
repo item-identity defect — it is what upstream says these items are.
Stat indices come from `enum Stat` in `data/proto/common.proto`
(0 str, 1 agi, 2 sta, 3 int, 4 healing, 5 spellpower, 16 spirit,
17 AP, 21 melee crit, 35 mp5).

| itemId | slot | name | delta DPS | stat line |
| --- | --- | --- | --- | --- |
| 29308 | finger | Band of Eternity | +7.80 | sta 28, int 25, healing 64, spellpower 22, mp5 10 |
| 29309 | finger | Band of the Eternal Restorer | +7.80 | sta 28, int 25, healing 64, spellpower 22, mp5 10 |
| 32609 | feet | Boots of the Divine Light | +7.62 | sta 47, int 24, healing 73, spellpower 25, spirit 24 |
| 32516 | wrist | Wraps of Purification | +7.53 | sta 24, int 25, healing 53, spellpower 18, mp5 7 |
| 29920 | finger | Phoenix-Ring of Rebirth | +6.37 | int 24, healing 55, spellpower 19, mp5 10 |
| 29984 | waist | Girdle of Zaetar | +6.10 | sta 22, int 23, healing 73, spellpower 25, spirit 24 |
| 29989 | back | Sunshower Light Cloak | +5.95 | sta 18, int 24, healing 77, spellpower 26, spirit 20 |
| 28822 | neck | Teeth of Gruul | +5.81 | int 21, healing 46, spellpower 16, spirit 19, mp5 8 |
| 29307 | finger | Band of Eternity | +5.16 | sta 24, int 22, healing 55, spellpower 19, mp5 8 |
| 28661 | finger | Mender's Heart-Ring | +4.61 | sta 18, int 21, healing 44, spellpower 15, spirit 19 |

**On 28822 Teeth of Gruul specifically.** The second SME opinion recalled
it as a melee neck; that recollection is wrong and is discarded. Both
data sources give it `{int 21, healing 46, spellpower 16, spirit 19,
mp5 8}`. It is a healer neck by upstream data. What survives is the part
that matters: a healer neck is the feral neck slot's **argmax** at +5.81
DPS, above the two genuine feral necks, 30017 Telonicus's Pendant of
Mayhem (+5.73) and 32591 Choker of Serrated Blades (+4.37).

## Reproduce

```
npx tsx packages/core/test/measure-cutoff-band.ts
```

Stat-line verification and the noise arithmetic below, both committed at
`.scratch/handoffs/ticket-227-healer-stat-lines.txt`:

```
python -c "import json; idx=json.load(open('data/items/index.json',encoding='utf-8')); db={i['id']:i for i in json.load(open('vendor/wowsims/db.json',encoding='utf-8'))['items']}; iid=28822; print(idx[str(iid)]['name'], [ (i,v) for i,v in enumerate(idx[str(iid)]['stats']) if v ]); print(db[iid]['scalingOptions']['0']['stats'])"
```

## Hypothesis (untested): these are noise-positives, not scoring errors

**Marked hypothesis — not established.** The truth fixture carries its
own error bar, and it is the same size as the cutoff being applied to it:

```
python -c "import json,math,statistics; r=json.load(open('packages/core/test/fixtures/synthetic-roster-recordings.json',encoding='utf-8'))['rows']['feral-p3']; s=statistics.mean(v['stdev'] for v in r['recordings'].values()); print('mean stdev %.4f' % s); print('SE at %d = %.4f DPS' % (r['iterations'], s/math.sqrt(r['iterations'])))"
# mean stdev 162.1527
# SE at 3000 = 2.9605 DPS
```

The effective cutoff on this fixture is **2.9288 DPS** (the `deltaPct >=
0.15` arm of `meetsCutoff` against a baseline of 1952.5249585538932).
So **SE(3000) = 2.9605 DPS is marginally larger than the cutoff itself**.
Among roughly 300 candidates that are truly not upgrades, a scatter of
+1σ to +2σ readings is expected, and those land above the cutoff by
arithmetic alone with no scoring defect at all. Every one of the ten
healer rows sits in exactly that range:

```
  29308  +7.80 DPS = 2.63 sigma      29984  +6.10 DPS = 2.06 sigma
  29309  +7.80 DPS = 2.63 sigma      29989  +5.95 DPS = 2.01 sigma
  32609  +7.62 DPS = 2.57 sigma      28822  +5.81 DPS = 1.96 sigma
  32516  +7.53 DPS = 2.54 sigma      29307  +5.16 DPS = 1.74 sigma
  29920  +6.37 DPS = 2.15 sigma      28661  +4.61 DPS = 1.56 sigma
```

That the observed values fall where the hypothesis predicts is
**consistent with** it and is not proof of it. Two rows at +2.63σ from a
pool this size is unremarkable; so is a healer ring pair landing on the
identical +7.80. What would distinguish noise from a real scoring path is
below.

If the hypothesis holds, the consequence is larger than these ten rows:
the recorded "truth" this repo classifies against **cannot resolve the
cutoff it is being compared to**, and the `aboveCutoffCount` of 86 that
several tests assert on is itself partly noise. That would be a finding
about the fixture, not about healer items.

## Acceptance criteria

- [x] **Do the healer rows survive more iterations?** Re-sim these ten
      item ids against the pinned `wowsimcli` at materially more than
      3,000 iterations and report each delta with its own SE. The
      hypothesis predicts they collapse toward zero and drop below the
      cutoff. If instead they hold at +5 to +8 DPS, the noise explanation
      is refuted and something is genuinely crediting healing stats to
      feral DPS.
- [x] **Is any healer stat reaching the DPS calculation?** Check whether
      intellect, healing power, spellpower, spirit or mp5 carries a
      non-zero EP weight or otherwise enters the delta for feral —
      `data/presets/feral/p1.ep-weights.json` and the sim request built
      in `rank.ts`. Note that EP ordering only selects candidates; the
      delta itself comes from the sim, so a non-zero weight would explain
      *pool membership* but not a positive DPS delta. Say which of the
      two is in play.
- [x] **Per-item variance, not just the fixture mean.** The σ figures
      above use one fixture-wide mean stdev. Report each of the ten rows'
      own `stdev` and `iterationsDone` from the recordings, so the σ
      claim rests on that item's variance rather than the pool average.
- [x] **How many non-healer rows are also noise-positives?** If the
      hypothesis holds it does not stop at healer gear. Estimate how many
      of the 86 above-cutoff rows are within 2σ of the boundary, and say
      what that implies for the tests that assert `aboveCutoffCount` and
      for ticket 225's closed conclusion.
- [ ] **Should role-inappropriate items be pooled at all?** NEEDS OWNER
      RULING — carried in ticket 234; see Resolution below. Decide and
      record whether items with no class-usable stat should be excluded
      from a spec's candidate pool, or kept and disclosed. This is a
      product question, not only a scoring one; if the answer is "kept",
      the report must not present them as upgrades without a caveat.

## Out of scope

- Ticket 226's head / idol / trinket cliffs. Opposite sign, different
  slots; see "Why this is a sibling" above.
- Ticket 224's presentation of tied rows.
- Re-recording the `feral-p3` fixture before the cause is known.

## Resolution (2026-08-19) — hypothesis refuted; one criterion left open

Full findings, with commands: `.scratch/handoffs/ticket-227-healer-noise.md`.
Run with `npx tsx packages/core/test/measure-ticket-227-direct.ts`.

**This ticket's noise hypothesis is refuted.** It was marked untested and it
does not survive testing. At 30,000 iterations **nine of the ten still clear
the cutoff**, and the two largest rows grew rather than shrank (+7.80 ->
+8.17). Only 28661 Mender's Heart-Ring collapsed below the line (+4.61 ->
+1.60) — the single case the hypothesis predicted for all ten. Across five
independent seeds the delta for 29308 has a standard deviation of **0.212
DPS**; noise does not reproduce that tightly across independent streams.

**Healer stats really do reach the DPS calculation, through mana.** Isolating
each stat of Band of Eternity via `bonusStats` with gear untouched, at 30,000
iterations:

| added stat | delta DPS |
| --- | --- |
| intellect 25 | **+29.92** |
| mp5 10 | **+13.17** |
| healing power 64 | 0.0000 |
| spellpower 22 | 0.0000 |
| stamina 28 | 0.0000 |

Healing power and spellpower are worth exactly nothing, as the SME expected.
Intellect and mp5 are not. Both saturate at the same ceiling (int +2500 ->
+157.13, mp5 +1000 -> +156.76), which is the signature of a **hard mana
constraint** rather than a stat weight: this feral runs out of mana, and
anything that extends it buys casts.

The cause is the fixture's raid setup, not the items:
`data/presets/feral/p2.raid-sim-skeleton.json` runs a 180-second encounter
with **no Blessing of Wisdom, no mana spring totem and no Innervate**.

EP is not involved either way: no healer stat index carries a feral EP weight,
and EP only orders the pool — the delta comes from the sim.

**On the 86 / aboveCutoffCount worry.** 34 of the 85 above-cutoff rows sit
within 2x their own SE of the boundary and 16 within 1x, so that count is
imprecise and the `synthetic-fixtures.test.ts` assertion on it is a change
detector rather than a correctness gate (out of scope to change here). But the
worry is *smaller* than it first looked: proximity to the boundary did not
make the healer rows wrong, and it does not make the others wrong either.

**Status stays `open`** on one criterion — the product ruling in 5e, which an
agent cannot make. It is carried with options, precedent, measurements and a
recommendation in
`.scratch/carry-forward/issues/234-owner-ruling-mana-driven-upgrades-and-the-feral-skeleton.md`.
The recommendation is to fix the skeleton's missing mana buff and caveat the
report, rather than to exclude the items: they are correctly simulated and
genuinely do produce DPS here, so excluding them would suppress a true
measurement instead of addressing the modelling choice that causes it.

**Sibling relationship to ticket 226.** No single diagnosis explains both, so
neither is closed with a pointer to the other. 226's trinkets contribute a
deterministic, reproducible *nothing* and land on the incumbent's value; this
ticket's rows carry *real positive* deltas from mana. Opposite sign, different
mechanism. The one thing they share is a consequence: the `impl` / `stub`
labels in `data/sim-implemented-effects.json` misled both investigations,
filed as ticket 237.

## Status, 2026-08-20 — `blocked`, on ticket 234

Four of the five acceptance boxes are checked and the Resolution section above
records the measured outcome. The one open box — "Should role-inappropriate
items be pooled at all?" — is marked NEEDS OWNER and is exactly ticket 234's
question, so this ticket is `blocked` rather than `open`: no agent can make
progress on it, only the owner can. 234 already carries `Blocks: 227`; the
reverse edge (`Blocked by: 234`) is added here so the dependency reads in both
directions.

`blocked` is a sub-state of open, so this ticket still appears in
`pnpm issues:open` — it is visible, just not actionable by an agent. The ruling
itself is not made here.
