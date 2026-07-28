# Plan: raid-scoped pool formation — data foundation and build-out

**Status:** Plan. Not implemented. Do not land to `dev`.
**Date:** 2026-07-28
**Branch context:** `phase-1/five-seed-spread` (dirty tree; do not land without owner ask)
**Parent direction:** `.scratch/handoffs/raid-scoped-pool-handoff.md` — that handoff
locks the direction. This plan says how to build it.
**Scope of this pass:** ret only. Other specs come after the system is proven.

---

## 1. What we are building

A candidate pool for the ret gear ranker that is built from **where items come
from**, not from a stat score.

The current system scores every item with a linear stat formula (EP) and keeps
the top 12 per slot. That does not work, and section 2 gives the measurements.
The replacement builds the pool from three data sources:

1. **Loot tables** — which items drop from which boss in which raid.
2. **Wowhead phase lists** — which items a ret player should consider in a given
   phase, including items that became available for reasons unrelated to raid
   drops.
3. **The wowsims item database** — item stats, for the simulator.

The pool is then narrowed only by rules whose false-negative rate has been
measured (section 6), and the simulator ranks what survives. The simulator
remains the only authority on whether an item is an upgrade.

**Terms used throughout.** *False negative* means a real upgrade that a rule
threw away before it could be simulated. *Recall* is the percentage of real
upgrades a rule keeps. *Spearman correlation* measures how well two rankings
agree, from -1 to 1, where 0 means no agreement. *EP* is the linear stat score
the current generator uses. *Two-hop* means an item obtained through an
intermediate object rather than looted directly, described in section 5.3.

---

## 2. Why the current system is being replaced

Every number here is measured against the committed repo state and can be
re-run. Full detail is in `.scratch/handoffs/pool-redesign/diagnosis-and-plan.md`
and `.scratch/handoffs/pool-redesign/ep-vs-sim-measurement.md`.

| Finding | Measurement |
|---|---|
| Generator admits wowsims' own curated ret BiS sets | 2 of 16 items, the same for preraid, P1, and P2 |
| Why 30 distinct BiS items are missed | 22 ranked out by EP, 7 blocked by the plate-only filter, 1 by the quality floor |
| EP score vs actual simulated DPS gain | Spearman correlation 0.183 across 191 real simulations, where 0 means no agreement and 1 means perfect |
| Slots where EP has no usable signal | shoulder, finger, trinket (all confidence intervals include zero) |
| Librams | EP scores every one exactly 0.0; the generator emits zero ranged entries |
| Ret tier pieces in the pool | T4 2 of 5, T5 2 of 5, T6 5 of 8 — a 4-piece bonus cannot be evaluated |
| Cost of an EP-based cut | A 50% cut discards Hard Khorium Battleplate, the single largest upgrade measured at +42.67 DPS |

Two conclusions follow.

**EP cannot decide membership.** A 50% EP cut throws away the biggest upgrade in
the measured set. No amount of generosity in the threshold fixes this, because
the problem is not the threshold — it is that the score does not track the
outcome.

**The plate-only filter is a separate bug.** Ret's real best-in-slot gear
includes leather and mail. Fixing the armor filter alone rescues only 1 of the 7
items it blocks, because admitting leather and mail roughly doubles the eligible
item count and makes the EP cutoff harder. The two problems interact, so the
armor fix must ship with the membership change, not before it.

---

## 3. Corrections to earlier claims

Several numbers used in earlier documents are wrong. They are corrected here so
the plan is not sized against them.

**The wowsims database has all five phases.** It contains 8,257 items: 6,631 at
phase 1, 439 at phase 2, 502 at phase 3, 161 at phase 4, 524 at phase 5. Items
from Black Temple, Zul'Aman, and Sunwell are all present. An earlier claim that
wowsims lacks upcoming-phase items was wrong.

What is true, and was confused with it: wowsims' **curated ret gear sets** stop
at P2. Upstream contains only `preraid`, `p1`, and `p2` gear set files, verified
at the pinned release and at the current master branch. That is the
best-in-slot-list side, not the item database.

**The source gap is about 673 items, not 2,769.** Of 4,212 ret-eligible items,
2,355 have no source data at all — but 1,682 of those are phase 1, and that
bucket is mostly vanilla items (Brain Hacker, Seal of Ascension, Earthborn Kilt)
that a TBC raid-scoped pool would never include. The gap that matters is the
**673 items at phase 2 and above**, plus tier pieces.

**All 18 ret tier pieces have no source data.** This is measured, and it means
the tier-token handling in section 5.3 is mandatory rather than an
optimization.

**The wowsims database has stats for 96.3% of eligible items.** The 154 items
without stats are 94 trinkets, 32 librams, 19 weapons, and 7 rings — items whose
value is an effect rather than a stat block (Ashbringer, Blackblade of Shahram,
every libram). No other data source would have stats for these, because the
items genuinely have none. This is the same root cause as the EP signal failure
in trinkets and librams.

---

## 4. Decisions already made

These come from the parent handoff and from owner decisions during planning. Do
not re-open them without asking.

| ID | Decision |
|----|----------|
| D1 | EP does not decide membership. |
| D2 | The same EP score must not gate twice. Today the generator writes `ep` onto each row and `prefilterPool` sorts on it again. That ends. |
| D3 | Best-in-slot lists are used for display tags and pinning. |
| D4 | Lists are **not** the entire pool. See the restatement below. |
| D5 | A multi-shell simulation scout is not the membership engine. |
| D6 | Membership is: phase raid loot universe, plus list-sourced items, then eligibility rules, then a safe junk filter, then simulate. |
| D7 | Ret body slots accept plate, leather, and mail. Ranged accepts librams only. Weapons are two-handed, excluding staves. Kael'thas encounter-only legendaries are excluded; Twinblade is kept. |
| D8 | Polearms are excluded as a product scope choice. Paladins **can** equip polearms in TBC; the earlier claim that they cannot was wrong and has been corrected in PLAN.md. |
| D9 | No Wowhead scraping in CI. Collection is a manual step producing committed JSON. |

### D4 restated

D4 rejected using lists as the **entire** membership engine. That still holds.

Wowhead lists in this plan are an **additional source of membership alongside
loot tables**, not a replacement for them. A listed item that does not appear in
the phase's raid loot is **not** a bug in the loot data. Items become available
for reasons unrelated to raid drops: a new badge vendor, a reputation unlock, a
PvP season, or a crafting recipe becoming reachable. Those are real acquisition
paths that a raid-scoped universe cannot see by construction.

Lists serve two purposes:

1. **Filling gaps** — adding items the loot universe misses for a given phase.
2. **Narrowing** — if a phase universe is too large to simulate in reasonable
   time, list membership is a defensible ordering signal. It is defensible in a
   way EP is not, because EP was measured discarding a +42 DPS upgrade.

---

## 5. Data sources and what each is for

Each source answers a different question. Do not use one to answer another's
question.

| Source | Answers | Does not answer |
|---|---|---|
| AtlasLootClassic | Which items drop from which boss in which zone | Item stats; which items are good |
| Wowhead phase/spec lists | Which items matter in a given phase for a given spec | Where items drop |
| wowsims `db.json` | Item stats, sockets, item type, armor type | Where items drop (missing for 673 relevant items) |

### 5.1 AtlasLootClassic

- Repository: `github.com/Hoizame/AtlasLootClassic`, GPL-2.0, actively
  maintained.
- TBC data lives in `AtlasLootClassic_DungeonsAndRaids/data-tbc.lua`.
- Format is plain Lua table literals: bosses keyed by NPC ID under a per-instance
  table, with loot lists of `{ slotPosition, itemID }` pairs per difficulty. No
  Lua interpreter is needed — the structure is mechanical enough for a small
  parser.
- Pin it the same way wowsims is pinned: record the commit in a lockfile, fetch
  into `vendor/`, commit the parsed output.

**Known limitation:** AtlasLoot stores tier sets as flat lists of armor piece
IDs. It does not record which token redeems for which piece. Section 5.3 covers
this.

**On the GPL-2.0 licence.** Sub-phase 1 raises this as an open question. It is
very likely not a blocker: GPL obligations attach to distributing the software,
and this repo is marked `private: true` in `package.json` with no licence file
and no declared licence, so nothing is being distributed. Confirm before any
decision to publish the repo, not before starting work.

### 5.2 Wowhead phase and spec lists

Collected manually into committed JSON. Collection is described in section 8.

Includes the alternative-gear sections, not only the headline best-in-slot pick.
Those sections are where items that became newly relevant in a phase usually
appear. Sub-phase 3 confirmed these sections exist by loading the pages: the
Phase 2 guide's "Other Head Armor Recommendations" section held 5 items that were
not in the visible table, including Justicar Crown — a tier piece the current
generator also misses.

Three findings from sub-phase 3 that affect collection:

**One Wowhead guide page can cover more than one of this repo's phases.** The
guide at the URL ending `dps-bis-gear-pve-phase-2` covers Karazhan, Gruul's Lair,
and Magtheridon's Lair together with Tempest Keep and Serpentshrine Cavern —
phases 1 and 2 in this repo — on a single page, with no per-item phase label.

This is expected rather than a mistake on Wowhead's part. An item from Karazhan
can still be worth wearing in phase 2, so a guide written for a phase-2 player
lists it. The recommendation is about what to wear now, not about when the item
was introduced.

The consequence for collection is specific: **do not derive an item's phase from
the page it was found on.** A collector who tags everything on that page as phase
2 would mislabel every Karazhan item. Item phase comes from `db.json`'s own
`phase` field. Sub-phase 3's schema handles this correctly by omitting a phase
field entirely at collection time and resolving it during the merge in
sub-phase 4.

**The pages are rendered by JavaScript.** A plain HTTP fetch returns an empty
shell. Collection needs a real browser.

**The pre-raid page has no collapsed sections.** Everything is listed flat there.
That is a real difference between pages, not a collection error.

**Open item:** sub-phase 3 could not find a ranged or libram section in the
collapsed lists it inspected on the Phase 2 and Phase 3 pages. Librams are the
slot where the current system fails worst — EP scores every libram 0.0 and the
generator emits no ranged entries at all. Whoever collects must check this
directly rather than assume the slot is covered.

### 5.3 Tier tokens and raid-dropped recipes — the two-hop problem

Some items are not obtained by killing a boss and looting the item. There is an
intermediate step:

- **Tier armor:** a token drops from a boss, and the player trades the token to a
  vendor for the armor piece. All 18 ret tier pieces have no source data in
  `db.json`, so this must be handled explicitly.
- **Crafted items from raid-dropped recipes:** the recipe drops in a raid, and
  the crafted item is made elsewhere. The item belongs to that raid from a
  player's point of view.

Both cases follow the same shape: the item a player wants is linked to a zone
through an intermediate object. The pool must record the **zone where the
intermediate object drops**, so that filtering by raid shows the item.

The existing `ItemSource` type in PLAN.md §8.3.2 already models tokens. Crafted
items from raid recipes need the same treatment: a `crafted` source that also
carries the zone where the recipe drops.

Neither AtlasLoot nor `db.json` records the token-to-piece relationship.

**The Wowhead phase guides do record it, and it can be extracted rather than
typed by hand.** Verified by loading the Phase 2 ret guide and querying the page:
each tier row carries the armor piece, the token, the boss, and the zone
together, with both items as ordinary links containing numeric IDs. For example,
Crystalforge War-Helm (30131) is obtained with Helm of the Vanquished Champion
(30242), which drops from Lady Vashj in Serpentshrine Cavern.

The same "(via ...)" pattern also covers items that are not tier at all —
Telonicus's Pendant of Mayhem via Verdant Sphere, Darkmoon Card: Crusade via
Blessings Deck. So this is a general mechanism for items you cannot loot
directly, not a tier-only convention.

Token naming differs by tier: Tier 4 uses "Fallen Champion", Tier 5 uses
"Vanquished Champion", and Tier 6 uses Conqueror, Protector, and Vanquisher.
Do not assume one scheme covers all three. This is the variation PLAN.md
section 8.3.2 warns about, now confirmed.

Sub-phase 2's job is therefore to verify what collection yields, not to build
the mapping from nothing. Verification is still required — the extraction has
only been checked on one page.

**The existing hand-built mapping is wrong and must not be copied.** In
`scripts/curate_ret_pool.py`, 18 of the 24 `kind: "token"` entries set the
`token` field to the armor piece's own name. Item 30990 is Lightbringer
Breastplate, and its entry records the redeeming token as "Lightbringer
Breastplate". Only 6 entries carry a real token name, all T4 or T5, such as
"Chestguard of the Fallen Champion".

```bash
python -c "
import sys,json; sys.path.insert(0,'scripts'); import curate_ret_pool as C
db=json.load(open('vendor/wowsims/db.json')); n={i['id']:i['name'] for i in db['items']}
print(sum(1 for k,v in C.HAND.items() if v.get('kind')=='token' and v['token']==n.get(k)))
"
```

The zone values in those entries may still be correct, but the token names carry
no information. Sub-phase 2 must verify all 18 from scratch.

This is the second time hand-entered pool data has turned out to be typed rather
than derived. The first is the libram `ep` values of 40 to 60 in the same file,
which no measurement produced. Sub-phase 2 therefore proposes storing the
token's item ID alongside its name, so a test can assert that the token ID and
the piece ID differ and catch this kind of error automatically.

---

## 6. The junk filter, and what it can safely do

The parent handoff proposes using EP as a rejection rule that only removes items
well below the threshold. Measurements show this is unsafe as written and needs
specific limits.

**What was measured.** A rule that rejects items with no melee stats, combined
with an EP floor applied only in the five slots where EP showed real signal
(weapon, feet, waist, hands, wrist), keeps 100% of true upgrades in the measured
set at EP floors of 0%, 10%, and 25%. It first loses an upgrade at a 50% floor.

**Why that 100% is not as strong as it looks.** Every item the rule rejects is a
libram. Librams have no melee stats because their value is an equip effect. The
rule scored 100% only because the test character already wears the best libram,
so no libram upgrade existed to lose. On a character wearing a worse libram, this
rule deletes the upgrade.

**Therefore:** exempting ranged and trinket slots from any stat-based rejection
is part of the rule's definition, not a refinement.

**How much the safe filter actually removes.** With the required exemptions, on
the full 4,212-item eligible universe, the rule rejects 500 items — 11.9%. An
earlier figure of about 32% was measured without the exemptions and does not
describe a safe rule.

**Conclusion:** the junk filter is a genuine filter but it is not the mechanism
that makes the pool small enough to simulate. **Raid-zone scoping does that**,
taking 4,212 eligible items down to roughly 200 at maxPhase 2 and roughly 310 at
maxPhase 3. The junk filter removes about 12% of whatever the zone filter
produces.

Those zone counts only cover the 1,443 items whose zone can currently be
resolved, so they are a lower bound. Once AtlasLoot fills the gap, re-measure
before treating the size target as met.

---

## 7. A limitation that applies to every recall number in this plan

The 191-item test set used for all recall measurements is drawn from the current
EP-based pool combined with wowsims' best-in-slot sets. It therefore cannot
contain any item that neither of those sources ever included.

This means every recall figure, including the verified 100%, is optimistic. A
rule can score perfectly and still drop a good item that was never in either
source. The libram result in section 6 is a concrete example: the rule looked
safe only because the test set contained no libram upgrade for it to lose.

The fix is to measure recall against a wider candidate set. The raid-scoped
universe makes this affordable for the first time — simulating roughly 300 items
is practical, where simulating 4,212 was not. Sub-phase 4 does this.

---

## 8. Sub-phases

Each sub-phase gets its own detailed plan, written by a separate agent, at the
path given. This document routes to them.

### Sub-phase 0 — Decisions that block everything else

**Deliverable:** `.scratch/handoffs/subplans/00-decisions.md`

Resolve and write down:

1. **Carryover policy.** At maxPhase 3, does the universe include Serpentshrine
   and Tempest Keep loot, or only Black Temple and Hyjal?
2. **Badge vendors.** Included by default or not.
3. **PvP gear.** Included in the raid pool, separated, or excluded.
4. **Quality floor.** Rare and above, or epic only at later phases.

No code until these are written down.

**Sub-phase 0 is complete and measured all four.** Results, which change three of
them from open questions into near-forced choices:

- **Carryover: use the union of all raids at or below maxPhase.** This is not a
  preference. Newest-only leaves slots with no candidates at all: zero wrist and
  zero ranged at maxPhase 4, and zero feet, waist, wrist, and ranged at maxPhase
  5. Union gives 201 items at maxPhase 2 against 83 for newest-only.
- **Badge and PvP items cannot come from `db.json` at any point.** Its `sources`
  field only ever holds `drop`, `crafted`, or `rep`. There are no badge or arena
  entries in it. Both paths therefore require AtlasLoot or a hand-built mapping.
  The current pool's 28 PvP entries and 4 badge librams all come from hand-typed
  entries in `scripts/curate_ret_pool.py`.
- **The quality floor is already doing nothing for raids.** No rare-quality items
  exist inside the nine raid zones at any phase. Leave it at rare and above;
  tightening to epic-only would add risk and change nothing.

### Sub-phase 1 — AtlasLoot pin and parse

**Deliverable:** `.scratch/handoffs/subplans/01-atlasloot.md`

Pin the repository, parse `data-tbc.lua`, and emit a mapping from item ID to a
list of sources. Measure how much of the 673-item gap it closes. Report what it
does not close.

**Exit:** a committed, regenerable item-to-source mapping for TBC raids, and a
measured statement of remaining gaps.

### Sub-phase 2 — Tier tokens and raid-recipe crafts

**Deliverable:** `.scratch/handoffs/subplans/02-two-hop.md`

Build the token-to-armor-piece mapping for the three ret tier sets (setIds 626,
629, 680 — 18 pieces, all currently without source data). Verify against Wowhead,
because token groupings differ between T4/T5 and T6. Apply the same treatment to
crafted items whose recipes drop in raids.

**Exit:** filtering by Black Temple shows the T6 pieces whose tokens drop there.

### Sub-phase 3 — Wowhead list collection (ret only)

**Deliverable:** `.scratch/handoffs/subplans/03-wowhead-lists.md`

Collect ret best-in-slot and alternative gear lists for every phase from Wowhead
Classic into committed JSON. Ret only in this pass, to prove the schema and the
process before spending effort on other specs.

Requirements:

- Capture the alternative-gear sections, not just the headline pick.
- Record item ID, phase, slot, and which list section it came from.
- Record the source URL and collection date for every list.
- Manual collection producing committed JSON. Nothing in the build fetches from
  the network.

**Exit:** a committed ret list file covering all phases, plus a measurement of
how many listed items the zone universe already contains.

### Sub-phase 4 — Universe assembly and recall measurement

**Deliverable:** `.scratch/handoffs/subplans/04-universe.md`

Combine raid loot, list items, and the two-hop mappings into a candidate
universe. Apply eligibility rules and the safe junk filter. Then measure recall
properly by simulating the full assembled universe for one phase and checking
what any proposed narrowing rule would have dropped.

This is the sub-phase that addresses the limitation in section 7.

**Exit:** a per-phase universe of a workable size, with a measured false-negative
rate for any narrowing rule that is applied.

### Sub-phase 5 — Rank wiring

**Deliverable:** `.scratch/handoffs/subplans/05-rank-wiring.md`

Remove the EP-based prefilter default in `packages/core/src/pool.ts`. Simulate
the phase-filtered universe. Add a raid view filter using the source field. Keep
the existing ranking engine unchanged.

**Exit:** a real character ranking that a player would act on, under the raid
framing.

### Sub-phase 6 — Tags, tests, and hardening

**Deliverable:** `.scratch/handoffs/subplans/06-hardening.md`

Apply best-in-slot tags for display and pinning only. Add tests: no bows, no
Kael'thas temporary legendaries, tier pieces attributed to their token's zone,
leather and mail items present. Make a missing source a build failure. Document
how to refresh the data when a phase launches.

---

## 9. Success criteria

| # | Criterion |
|---|---|
| S1 | Membership can be explained as "drops or is obtainable from these raids this phase," not "it passed an EP threshold." |
| S2 | Leather and mail items appear without being manually forced in. |
| S3 | Tier pieces appear when filtering by the raid where their token drops. |
| S4 | No EP top-N membership anywhere. The junk filter only removes items that are clearly wrong. |
| S5 | The simulated candidate count for a phase is in the hundreds, not thousands. |
| S6 | Removing best-in-slot tags does not change the pool. |
| S7 | Any narrowing rule that ships has a measured false-negative rate from sub-phase 4, not an assumed one. |

---

## 10. Out of scope

- Landing to `dev` or merging.
- Rewriting the simulation or ranking engine.
- Any network access during a build.
- Using That's My BiS as a data source.
- Full best-in-slot set solving or multi-item optimization.
- Specs other than ret in this pass.

---

## 11. Files likely to change when this is implemented

| Area | File |
|---|---|
| New | AtlasLoot pin and parser; item-to-source output |
| New | `data/phase_raids.json` — phase to zone mapping |
| New | Wowhead list JSON for ret |
| New | Token-to-piece and recipe-to-zone mappings |
| Replace | `scripts/generate_pool.py` membership logic |
| Reduce | `scripts/curate_ret_pool.py` — `FORCE` becomes a small gap list, not the main path |
| Change | `packages/core/src/pool.ts` — stop EP-based membership |
| Fix | `scripts/generate_pool.py` docstring, which still states the incorrect polearm equip rule |
| Tests | Pool composition, token zones, armor types, no bows |
