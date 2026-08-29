# SME rank judgment — upgrades-all-dps-specs (plan step 12)

Branch `feat/upgrades-all-dps-specs`, tip 8157678. Audience: engineering team.

## Verdict

**trust-with-caveats** — with one blocking finding.

Nine of the eleven questions come back clean, several of them better
corroborated than the plan claimed. Two do not:

- **F1 (blocking) — warlock BiS tags are frozen at pre-raid across every
  phase.** This is a real defect in shipped data, not the documented
  staleness pattern. Fix or disclose before ship.
- **F2 (contested, high) — the warlock `za`/`t6` phase split is built on a
  premise the data contradicts.** The two sets are the same power level, so
  the "wrong ordering" the question worried about does not exist — but the
  mapping is still not right.

Nothing else I found should stop the ship. The PvP membership question (F3)
is a real domain call that I rule on below, and it is a judgment, not a bug.

## What was reviewed

Eleven questions posed by the executor covering 38 universe files, 9 token
maps, 17 EP-weight files, and the per-spec engine tables. I judged rows read
from `data/universes/*.json`, `data/two-hop/*-tokens.json`,
`vendor/wowsims/db.json`, `vendor/wowsims/*.gear.json`, and
`packages/core/src/cap-profile.ts`, plus sim source under
`vendor/tbc-new-fork/sim/`.

Commands that produced the evidence are given per finding below. Every
numeric figure quoted to me in the prompt (pool sizes, dbPhase counts,
bisTags counts, the 180 PvP rows) reproduced exactly when I recomputed it —
the packet's arithmetic is sound.

## Findings

| # | Finding | Severity | Evidence |
| --- | --- | --- | --- |
| F1 | Warlock BiS tags are identical at p2, p3, p4 and p5 — the same 10 items, all pre-raid/T4-era. The `swp` set (17 rows) is in the p5 pool and contributes **zero** tags. Tagged items are Frozen Shadoweave Robe/Boots/Shoulders, Spellstrike Pants, Girdle of Ruination, Bracers of Havok, Ashyen's Gift, Stormcaller, Khadgar's Knapsack, Icon of the Silver Crescent. No warlock wears Frozen Shadoweave at Sunwell. | **blocking** | `python -c "…json.load(open('data/universes/warlock-p%d.json'%p))…Counter(curatedSets of bisTagged)"` → all four phases: `{'preraid':10,'t4':5,'destro_preraid':5,'destro_t4':3,'t5':1,'t6':1}`. Contrast balance p5 `{'p3':16,'p4':13,'p5':3,'p2':2}` and ele p5 `{'p3':16,'p4':13,'p5':4,…}` — phase-named sets tag correctly; the tier-named spec does not. |
| F2 | `contested:` The plan states t6→p3 and za→p4 as TBC raid release order, and the question asks whether za-above-t6 creates a wrong ordering. Measured, the two sets are **the same power**: median ilvl 146.0 both, max 151 both, mean 143.3 (za) vs 142.0 (t6), and they share **13 of 15 items**. `za` is the T6-tier set with two Zul'Aman pieces swapped in, not a tier between t5 and t6. So no power inversion is created — but t6→p3 is wrong on its own terms: a set whose median ilvl is 146 is not p3 gear. | high | ilvl/median/mean per set computed from `vendor/wowsims/warlock_*.gear.json` joined to `scalingOptions.0.ilvl` in db.json. Set difference: only-in-za = 33192 Carved Witch Doctor's Stick (ilvl 132), 33829 Hex Shrunken Head (133); only-in-t6 = 29370 Icon of the Silver Crescent (110), 29982 Wand of the Forgotten Star (134). |
| F3 | PvP gear should not be in a PvE upgrade pool. 104–182 arena/PvP-named rows per new spec at p5 (warrior 182, ele/enh 180, balance 159, rogue 153, hunter 134, shadow 131, warlock 120, mage 104) against **5 for ret and 12 for feral**. The new pools are not like the two already shipped. | high | `sum(1 for i in entries if 'Gladiator'/"Veteran's"/'Vindicator' in name)` over `data/universes/*-p5.json`. Reproduces the packet's 180 figure for warrior's dbPhase route. |
| F4 | `contested:` Plan phase matrix says mage curated sets stop at `p2Arcane`. The profile actually vendors **p3** sets — `mage_p3_staff.gear.json` and `mage_p3_sword.gear.json` (`scripts/assemble_universe.py:790-791`). Mage's degradation 4(b) is milder than the packet states: bisTags trace to ≤p3, not ≤p2. Mage's 21 tags at p5 are the **second-highest** of the nine, not a weak spec. | medium | `ls vendor/wowsims/mage_*`; `grep -n "mage" -A 20 scripts/assemble_universe.py` :787-791; bisTags count from mage-p5.json = 21. |
| F5 | 19822 Zandalar Vindicator's Breastplate (ilvl 65, q4, phase 1) is in warrior's pool. This is **vanilla Zul'Gurub** loot, not TBC PvP — it matched a name heuristic. Harmless at ilvl 65 (nothing will rank it) but it shows the name-substring branch mis-classifies. | low | `db.json` row: `19822 p1 ilvl65 q4 "Zandalar Vindicator's Breastplate" sources:none`. |
| F6 | Arcane Focus is **school-masked to Arcane** (`sim/mage/talents.go:112` adds to `SchoolBonusHitChance[SchoolIndexArcane]`), exactly like balance's and warlock's masks. The cap-profile comment lists the scope caveat for balance/warlock/enh but not for mage. The set of scope-masked talents is four, not three. | low | `sed -n '107,113p' vendor/tbc-new-fork/sim/mage/talents.go`. |

### Rows and claims that check out

**Token maps (Q2) — confirm all, including the unwitnessed Hero column.**
Reading every `tokenId` across all eleven committed maps and grouping by which
specs share an id gives a fully consistent partition:

- T4 (29753-29767) / T5 (30236-30250): **Champion** = ret, rogue, ele, enh
  (paladin/rogue/shaman); **Defender** = warrior, balance, feral, shadow
  (warrior/priest/druid); **Hero** = hunter, mage, warlock.
- T6 (31089-31103, +34848-34858): **Conqueror** = ret, shadow, warlock;
  **Vanquisher** = balance, feral, mage, rogue; **Protector** = ele, enh,
  hunter, warrior.

These match the TBC groupings (**recalled, unverified** — no authoritative
source in repo; but the elimination is forced and the T6 re-cut is
independently witnessed by `feral-tokens.json` notes 9-10). Every one of the
nine T6 assignments in the question is correct as shipped. The Hero column
being "pure elimination" is fine: with paladin=Champion and druid=Defender
fixed, and three disjoint triples over nine classes, hunter/mage/warlock is
the only assignment left. Note 34852/34855/34858 (Vanquisher bracers/belt/
boots) list only balance/mage/rogue — feral is absent from those three. Worth
an engineering glance; it may be correct if feral's map predates the T6 extra
slots.

**Cap constants (Q5) — confirm both, with a caveat on 9%.**
Spell 16%: `sim/core/target.go:393` sets `BaseSpellMissChance` vs level 73 to
`0.17`, and `sim/core/spell_result.go:257` floors residual miss at
`math.Max(0.01, …)` — so 16% reaches the floor and 17% is unreachable. 16% is
right. Independently corroborated by the mage sim's own default config, which
sets `PseudoStatSchoolHitPercentArcane` to **16**
(`ui/mage/dps/sim.tsx:96-98`).

Physical 9%: the sim's `BaseMissChance` vs level 73 is **0.08**
(`target.go:394`), and the physical path has **no 1% floor** —
`GetPhysicalMissChance` returns `max(0, …)` (`spell_outcome.go:572-579`). So
against the sim's own model, yellow-hit is capped at **8%**, not 9%. The 9%
figure is the long-standing community number for white/dual-wield melee and is
what this repo already shipped for ret. It is not wrong as a banner, but it is
one point above what this sim would zero out at. Since the banner changes no
DPS number, ship it — but engineering should know the constant does not derive
from the vendored sim. Dual-wield adds a further flat 19% white-hit miss
(`spell_outcome.go:575-576`) which no single cap number can express.

Hunter reading `StatMeleeHitRating`: **correct**. `sim/core/unit.go:676-677`
declares only `MeleeHitRating → PhysicalHitPercent` and `SpellHitRating →
SpellHitPercent`; there is no ranged hit rating in this sim. Confirmed from a
second direction by `sim/core/statweight.go:54`, which sums melee *and* ranged
hit percent into the single `MeleeHitRating` slot. The 9% cap applying to
ranged is right for the same reason, and hunter correctly sets
`trackExpertise: false` — ranged attacks cannot be dodged or parried.

**Scope-masked hit talents (Q3) — acceptable for an advisory banner.**
For a banner that changes no DPS number, over-crediting hit is a wrong label,
not a wrong ranking. Ship it. Two qualifications: the enh case is the worst
(up to 6% for a 2H build) and the cap-profile comment already says so
honestly; and the list should be four talents, not three (F6). The `ele`
comment correctly notes Elemental Precision's fire/frost/nature mask covers
every school an elemental shaman casts, so treating it as global is exact
there — that distinction is well made.

Mage Arcane Focus over Elemental Precision: **correct**, and better supported
than the packet claims. Every vendored mage set is Arcane, and the sim's own
default caps Arcane hit at 16. Elemental Precision is also deliberately
bug-compatible (2%/pt frost, 1%/pt fire, `talents.go:533-535`) — encoding a
single number for it would be wrong for one school either way.

**Preferred metas (Q6) — all correct at raid level.**
Resolved every id against `db.json` `gems`: 34220 Chaotic Skyfire Diamond,
25893 Mystical Skyfire Diamond, 32409 Relentless Earthstorm Diamond. The
assignments match what the sim authors themselves gemmed: 34220 appears in
every balance/ele/mage/warlock vendored set, and 25893 in shadow's p2 and p3
sets. Shadow taking Mystical over Chaotic is the correct and slightly
non-obvious call for a spec that benefits from the haste proc. 25893's stat
map is empty — that is a proc gem, not a weak gem, and the pipeline should not
be induced to treat it as low-value.

**InferPhase spot-check (Q8) — 9 of 10 right, 1 harmless.**
Gladiator branch is correct: Gladiator=S1→p1 (24546 ilvl 123), Merciless=S2→p2
(30486 ilvl 136), Vengeful=S3→p3 (33728/34015 ilvl 146), Brutal=S4→p5
(35066/35068 ilvl 159, 34988 ilvl 154). Arena seasons do align to those
content phases (**recalled, unverified**), and the ilvls corroborate the
ordering from repo data. The ilvl-bucket branch is also right: 31323/31340/
31329/31333 at ilvl 100 and 32166/32188 at ilvl 105 are all correctly p1 —
ilvl 100-105 is Karazhan-era. The single miss is F5.

**Epic floor (Q9) — correct to drop; no raid-relevant loss.**
All ten sampled exclusions are quality 3 (rare) and read from db.json at ilvls
61-115: 13015 Serathil (61), 22071 Deathmist Bracers (65), 17982 Ragnaros Core
(65), 31756 Dib'Muad's Crysknife (94), 31209/31078/31219 (109), 28944/28180/
31553 (115). Nothing here is raid-relevant at p2-p5. Note 28944 Grand
Marshal's Cleaver and 28180 Myrmidon's Headdress at ilvl 115 are the closest
calls, and 28944 is vanilla PvP gear — dropping it is doubly right. The floor
is doing what it was meant to do.

**EP provenance (Q10) — acceptable.**
EP weights drive a prefilter and gem fill, not the ranking numbers. A
build-labelled preset ("Combat Swords"), a WiP label, and an unphased default
are all disclosed degradations, and disclosure is the right treatment. The
single-variant choice per spec is defensible because each is the variant the
fork's own `sim.ts` wires as default. No variant needs its own weights before
ship. This is the mildest item in the packet.

**bisTags coverage (Q11) — the count is not the problem.**
Warlock's 10 is not low because 10 is a small number; it is low because all 10
are pre-raid items (F1). Conversely mage's 21 is second-highest, contradicting
the packet's framing of mage as the degraded spec (F4). Judge tag quality by
what the tags point at, not by how many there are.

## Gate

Would I trust this as a player who knows TBC? For nine of eleven specs, yes.
For warlock, no — the tab would tell a Sunwell-geared warlock that Frozen
Shadoweave is BiS, which any warlock would immediately recognise as wrong, and
that is the kind of visible error that costs trust in every other number on
the page.

To close the gate:

1. **Fix or disclose F1.** Either make the tier→phase mapping reach the
   tagger so `swp` tags at p5 and `t6`/`za` tag at their phases, or suppress
   warlock's BiS tags entirely rather than show pre-raid gear labelled BiS at
   Sunwell. Suppressing is acceptable; showing the current tags is not.
2. **Re-decide F2 alongside F1.** Given `za` and `t6` are the same power and
   share 13/15 items, mapping them to p3 and p4 is not defensible. The honest
   mapping is t4→p1, t5→p2, t6→p4 with `za` as a p4 sibling, and `swp`→p5,
   leaving p3 backed by t5 — but this is an engineering call about a labelling
   input, and either a corrected mapping or an explicit "warlock tags are tier-
   named, phase unmapped" disclosure closes it.
3. **Rule on F3 before ship** (my ruling below).

F4, F5 and F6 are not blocking. F4 is a plan-text correction; F5 is one inert
low-ilvl row; F6 is a comment omission.

### My ruling on PvP membership (F3)

Exclude arena gear from the PvE pools, via `exclude_ids`.

Reasons, in game terms. Arena gear is bought with a currency PvE play does not
generate, gated behind a personal and team rating, and season-locked — a
player looking at PvE upgrades cannot act on it the way they can act on a raid
drop or a badge purchase. It is also systematically mis-valued by a PvE sim:
its budget is partly spent on resilience, which does nothing on a boss, so it
will rank *below* its ilvl and clutter the list without ever winning. And the
asymmetry is the strongest argument: ret and feral ship with 5 and 12 such
rows, so the two specs that have already been reviewed and trusted are
effectively PvP-free. Admitting 104-182 rows for the new specs makes them a
different product from the two that passed review.

Two carve-outs worth engineering's consideration rather than a blanket id
list. First, a handful of arena pieces genuinely were PvE-competitive in TBC
at specific slots (**recalled, unverified** — I did not measure which, and
would not assert a list from memory). Second, honour/badge-adjacent gear that
is *not* rating-gated is a different case from Gladiator gear and is
legitimately reachable. If a blanket exclusion is too blunt, excluding only
the rating-gated Gladiator lines and keeping the rest is a reasonable
narrower cut. Either is better than shipping all 182.

Runtime is explicitly not a constraint here, so this is purely the membership
question, and I am ruling on it as such.

## Confidence caveats

- **Token triples are recalled, not sourced.** The repo contains no
  authoritative statement of the T4/T5 class groupings; the maps' own notes
  say so. My confirmation rests on the internal consistency of the eleven
  committed maps plus recall. High confidence, but if the T4/T5 Hero column
  is ever contradicted by an outside source, that source wins over me.
- **Arena season→phase alignment is recalled.** The ilvl progression in
  db.json corroborates the *ordering* but does not by itself prove S4→p5.
- **The 9% physical cap discrepancy is a reading of this sim's constants**,
  not a claim that 9% is wrong as a game fact. I did not run the sim to see
  where misses actually zero out.
- **I did not review the three archetype rankings** (shadow, rogue, hunter
  from the running UI) that plan step 12(a) calls for — they were not in the
  packet I was given. My verdict covers the data and tables only. If those
  rankings are part of the gate, they still need a look; F1 in particular
  suggests checking whether any other spec's tags misbehave in the UI.
- **I did not verify the 34852/34855/34858 feral absence** noted above, only
  observed it.
- I ran no git commands and made no edits.
