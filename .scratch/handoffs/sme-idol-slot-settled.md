# SME judgment — the feral idol slot (ticket 259, settled)

**Verdict: `do-not-trust`** — the ticket as currently written.

`contested:` the ticket states as fact that "32387 Idol of the Raven Goddess
carries no personal DPS for a feral cat" and that pooling it "would produce a
candidate scoring approximately **zero delta**". Both are wrong. Measured, it is
worth about **+14 DPS** over an empty ranged slot. The correction section that
rewrote this ticket needs rewriting.

`contested:` the ticket's acceptance box asks for 28372 Idol of Feral Shadows to
appear as a candidate. Its only recorded source is **heroic**, which this project
excludes on purpose (ticket 17). As written the box may be unreachable without
reopening that decision.

---

## Plain English first

### What the three idols do

An idol is the druid's ranged slot. It has no stats. It just changes one ability.

- **Everbloom Idol (29390)** — Shred hits 88 harder. Shred is the cat's main
  attack, so this is a straight damage gain, all the time.
- **Idol of Feral Shadows (28372)** — Rip ticks harder, 7 more per combo point
  per tick. Rip is the cat's bleed. Also a straight damage gain, but it rides on
  a smaller share of your damage than Shred does.
- **Idol of the Raven Goddess (32387)** — upgrades your Leader of the Pack aura
  from the plain version to the improved one. Everyone in your party, **you
  included**, gets a bit more crit.

### The thing an earlier reviewer got wrong

A reviewer read the code and concluded Raven Goddess only helps *other* people,
so in a sim with nobody else in the raid it must be worth nothing. That reads
correctly off the buff description but not off the code path. Leader of the Pack
is a party aura, and the druid is in its own party. The sim hands every party
member the aura, and the druid is a party member. So the wearer keeps the crit.

I ran it rather than argued it. Four runs, same gear, same random seed, 20,000
fights each, one actor:

| Ranged slot | DPS | vs Everbloom |
| --- | --- | --- |
| Everbloom Idol (currently worn) | 2153.6 | — |
| Idol of Feral Shadows | 2116.5 | −37.1 |
| Idol of the Raven Goddess | 2113.3 | −40.3 |
| nothing equipped | 2098.9 | −54.6 |

Raven Goddess beats an empty slot by 14 DPS. Not zero. The "scores nothing"
claim is dead.

### So what is the actual answer

Everbloom wins, clearly, by roughly 37 DPS over the next best. The other two are
within 3 DPS of each other, which is a coin flip.

**The slot is a foregone conclusion at P2 for a solo cat.** If you have
Everbloom, you wear Everbloom. That is worth saying out loud, because it is the
opposite of what the ticket's title implies.

But the ranking still ought to *show* that. Right now the report offers one
idol — the one already on the character — and a reader cannot tell whether that
means "you already have the best one" or "we forgot to check". Those look
identical and they are not the same thing. Showing Feral Shadows and Raven
Goddess at −37 and −40 is how a reader learns the slot is settled.

### Is the bug worth fixing

The underlying bug is real and it is not about idols. Items with no recorded
drop source silently never get considered. This is the third one found. Fixing
the general mechanism is worth doing. Chasing any single idol is not.

One caution on the fix: Feral Shadows drops from a **heroic** dungeon, and this
project leaves heroics out on purpose. Requiring it to appear, as the ticket now
does, quietly reopens that decision. Raven Goddess and Everbloom have no source
at all and are the cleaner test of the real bug.

### Why upstream's BiS set wears Raven Goddess anyway

In a real raid the aura hits four other people. A gear ranking that simulates
one character alone can never see that value, so it will always rate Raven
Goddess below Everbloom. That part of the earlier correction was right, and it
is a genuine limitation worth writing down — it just does not make the item
score zero.

---

## Findings

| # | Finding | Severity | Evidence |
| --- | --- | --- | --- |
| 1 | "32387 carries no personal DPS" is false. Leader of the Pack is applied to the wearer along with the rest of the party, so the Improved upgrade's crit reaches the druid. | high — the ticket was rewritten on this claim | `sim/core/raid.go:56-57` builds the party buffs from every player including the druid; `sim/core/character.go:307` calls `applyBuffEffects(agent, …, partyBuffs, …)` on that same druid; `sim/core/buffs.go:247-249` applies `LeaderOfThePackAura(char, IsImproved(...))` to `char`. Nothing excludes the contributor. |
| 2 | Measured: 32387 is worth **+14.34 DPS** over an empty ranged slot, not ~0. | high | Four runs of `vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe sim --infile … --outfile …`, base request `test/fixtures/shredzepelin-cat.raid-sim-request.json`, only `equipment.items[16]` varied, `simOptions {"iterations":20000,"randomSeed":"443754031","debugFirstIteration":false}`. `iterationsDone: 20000` and `error: null` on all four. Results: 2153.57 / 2116.49 / 2113.28 / 2098.94. |
| 3 | Everbloom is the correct worn idol and wins by a wide margin. −37.08 vs Feral Shadows, −40.30 vs Raven Goddess. Standard error of the mean ≈ 113/√20000 ≈ 0.8 DPS, so both gaps are far outside noise. | informational, but it settles the slot | Same four runs. |
| 4 | The gap between Feral Shadows and Raven Goddess is 3.2 DPS — about 4 standard errors on a shared seed, so nominally ordered, but far too small to call a decision. Seat 2's framing of Feral Shadows as "the real competitor" and Raven Goddess as a non-item is not supported; they are near-equals and both lose badly. | medium — the ticket's acceptance box is aimed at the wrong item on the wrong grounds | Same four runs. |
| 5 | The ranged slot is **not** a live P2 decision for a solo-actor ranking. Seat 1's premise ("a slot that is a live P2 decision") is wrong; the ticket's own correction gestured at this but hedged it as "closer to". It is settled. | medium — affects how the fix should be justified | Same four runs. |
| 6 | 28372's only recorded source is heroic Arcatraz, which is excluded by design (ticket 17). Making it a candidate is not purely a source-row fix. | medium — acceptance criterion may be unreachable as scoped | `python -c "import json;print(json.load(open('data/atlasloot_sources.json')).get('28372'))"` → `[{'dungeon': 'The Arcatraz', 'kind': 'heroic'}]` |
| 7 | 29390 (the worn Everbloom) also has no source row. So the same defect covers the item the character is already wearing, not just candidates. | medium — usefully widens the bug's footprint | `python -c "import json;s=json.load(open('data/atlasloot_sources.json'));print(s.get('29390'),s.get('32387'),s.get('33509'))"` → `None None None` |
| 8 | The ticket's claim that Idol of Terror (33509) is `phase: 4` and correctly absent is **correct**. Confirmed, no dispute. | none — upholds seat 2 | `python -c "import json;print(json.load(open('data/items/index.json'))['33509']['phase'])"` → `4` |
| 9 | The ticket's claim that all four idols carry empty stat lines is correct, and is exactly the case the skill warns against reading as "weak item". Both seats avoided that trap; noting it so a later reader does not fall in. | none | `data/items/index.json` — all four have all-zero `stats` arrays. |
| 10 | The general defect the ticket names — an item with no AtlasLoot source never becomes a candidate — is real and is the part worth keeping. | high value, unchanged | 32387 and 29390 both present in `data/items/index.json`, both absent from `data/atlasloot_sources.json` (commands above). |

## What I judged, and how it was produced

- Ticket at its current state: `.scratch/carry-forward/issues/259-idol-of-the-raven-goddess-missing-from-feral-pools.md`, including the `CORRECTION 2026-08-22` section.
- Sim source, pinned fork: `vendor/tbc-new-fork/sim/druid/druid.go`, `sim/druid/items.go`, `sim/druid/feralcat/feralcat.go`, `sim/core/buffs.go`, `sim/core/raid.go`, `sim/core/character.go`.
- Item data: `data/items/index.json`, `data/atlasloot_sources.json`.
- The four measurement runs described in finding 2. Request and result files are in the session scratchpad (`req_29390.json` / `res_29390.json` and the same for `28372`, `32387`, `0`); they are temporary, re-derivable from the recipe above.

## Confidence caveats

- **The party-aura mechanism is read from code, not from a stat readout.** I traced `raid.go:56` → `character.go:307` → `buffs.go:247` and measured a 14 DPS gap that an inert item cannot produce. I did not dump the druid's final crit rating to confirm the +20 rating specifically. The direction and rough size are solid; the exact attribution to the crit term is inferred.
- **All numbers are for one gear set** — `test/fixtures/shredzepelin-cat.raid-sim-request.json`, the composed Shredzepelin P2 cat. The other feral character (nexess) was not measured. Idol ordering is very unlikely to flip on gear, but the exact deltas will differ.
- **One seed.** All four runs share `randomSeed: "443754031"`, which is the right choice for comparing them to each other and the wrong one for treating any single figure as an absolute. The Feral Shadows vs Raven Goddess 3.2 DPS gap in particular I would not defend across seeds.
- **Recalled, unverified:** that Improved Leader of the Pack in the real game grants the party 2% crit and heals the crit-er, and that the wearer benefits from their own aura in-game as well. The repo-data claims above do not depend on this; it is offered only as a plausibility check on the code.
- I did not evaluate whether Raven Goddess would win once the raid actually has four other party members in it. That configuration does not exist in this pipeline, so the question is out of scope, but it is the reason upstream's BiS set disagrees with our ranking.

## Notes for engineering

- The bug is "no drop source recorded means the item is never considered". Keep that. Drop the idol-specific framing entirely.
- The acceptance box should not name 28372; its heroic source entangles this with ticket 17. 32387 and 29390 are the clean cases.
- Consider that a slot with exactly one candidate and no explanation is indistinguishable from a broken slot. That is a reporting gap independent of this bug.
