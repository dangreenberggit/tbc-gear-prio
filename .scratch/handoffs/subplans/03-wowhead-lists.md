# Sub-phase 3: Wowhead list collection (ret only)

**Status:** Plan. Not implemented. No lists collected yet, no code changed.
**Parent:** `.scratch/handoffs/raid-scoped-pool-plan.md`, sub-phase 3 (section 8).
**Scope:** Ret only. This proves the schema and process before any other spec.

This document plans the work. It does not collect the lists. `packages/`,
`scripts/`, and `data/` are unchanged by this document.

---

## 1. Survey: what Wowhead Classic actually publishes

I looked at the live pages, not cached knowledge. Method and URLs below.

### 1.1 The guide set

Wowhead publishes one "Best in Slot" guide per gearing stage for retribution
paladin DPS in TBC Classic. Found via a Wowhead search and confirmed by
opening each page:

| Stage | URL | Wowhead's own phase label (from page text) |
|---|---|---|
| Pre-raid | `https://www.wowhead.com/tbc/guide/classes/paladin/retribution/dps-bis-gear-pve-pre-raid` | Calls itself "Phase 1" in the guide body, but covers dungeon/rep/craft gear before any raid drop. Author: terryn, updated 2026/02/15. |
| Raid tier 1 | `https://www.wowhead.com/tbc/guide/classes/paladin/retribution/dps-bis-gear-pve-phase-2` | Also labeled "Phase 2" in the body. Covers Karazhan, Gruul's Lair, Magtheridon's Lair, **and** Tempest Keep/Serpentshrine Cavern together (see 1.4 below — this is important and easy to misread). Author: Surveillant, updated 2026/06/18. |
| Phase 3 | `https://www.wowhead.com/tbc/guide/retribution-paladin-dps-bt-hyjal-phase-3-best-in-slot-gear-burning-crusade` | Black Temple + Mount Hyjal. |
| Phase 4 | `https://www.wowhead.com/tbc/guide/retribution-paladin-dps-za-phase-4-best-in-slot-gear-burning-crusade` | Adds Zul'Aman. |
| Phase 5 | `https://www.wowhead.com/tbc/guide/retribution-paladin-dps-swp-phase-5-best-in-slot-gear-burning-crusade` | Sunwell Plateau. |

There is also a hub/index page,
`https://www.wowhead.com/tbc/guides/classes/best-in-slot-guides-burning-crusade-classic`,
which links out to the per-class, per-stage guides above. It is not itself a
data source, only a navigation page.

**Important naming trap found while surveying, stated plainly:** the page
titled "...phase-2" in its URL slug is the guide that covers what the repo
calls content tier P1 **and** P2 combined (Karazhan/Gruul/Magtheridon plus
Tempest Keep/Serpentshrine Cavern). Wowhead is not using "phase" the same way
this repo's `maxPhase` does. Do not assume the URL slug number equals the
committed `phase` field. Each item's actual phase must be read from that
item's own row — the **Source** column names the boss and zone, and the raid
loot data (sub-phase 1, AtlasLoot) or a manual zone-to-phase lookup
(`data/phase_raids.json`, sub-phase 0/1) is what actually assigns the
`phase` number, not the guide's URL. Section 3 below covers this.

I did not find a separate "Phase 1" (Karazhan/Gruul/Mag only, no TK/SSC) page
distinct from the combined page. Confirm this again at collection time by
re-searching; it is possible the guide changed since this survey. This point
was verified only against the pages fetched on 2026-07-28 and is not certain
to be Wowhead's permanent structure.

### 1.2 Per-page structure

Confirmed by inspecting the live, rendered DOM (`document.querySelectorAll`)
on the Phase 2 and Phase 3 pages, not from a static fetch — a plain HTTP fetch
of these URLs returns a near-empty shell, because the content is client-rendered.
Collection must use a real browser, not a fetch-and-parse script.

Each page is organized by equipment slot, in this order on the Phase 3 page:
Head, Shoulder, Back, Chest, Wrist, Hand, Waist, Leg, Feet, Neck, Ring,
Trinket, Weapon. (Ranged/relic did not appear as a separate heading on the
pages checked — see 1.5.)

For each slot there are two parts:

1. **A visible "Rank | Item | Source" table.** This is the headline pick.
   It commonly lists more than one row — ties are real. On the Phase 2 page,
   Back armor lists two items both tagged "Best" (Razor-Scale Battlecloak,
   Thalassian Wildercloak), and Head lists one tagged "Best: Hit" and one
   "Best" plain. Other rows use tags like "Near Best", "Best: Human",
   "Best: non-Human". The tag is prose, not a fixed enum — do not try to
   parse it into a controlled vocabulary; store it as free text (section 2).
   The Source column names a boss and a zone directly (`Drop: Lady Vashj
   (Serpentshrine Cavern)`), a quest, or `Crafted: <profession>`.

2. **A collapsed section titled "Other `<Slot>` Armor Recommendations"**
   (or "Other `<Slot>` Jewelry Recommendations" for neck/ring, "Other Trinket
   Recommendations", "Other Weapon Recommendations"). Confirmed present as a
   `.toggler-title` element for every slot on the Phase 3 page (13 togglers,
   one per slot listed above) and on the Phase 2 page. **Confirmed absent
   entirely on the Pre-Raid page** — that page has 0 togglers; every item
   pre-raid is presented flat, no headline-vs-alternative split.

   The collapsed content is real HTML already in the DOM (`class="exclude-units"`
   on the container after the heading), not lazily loaded — it does not
   require a network request to reveal, only a UI toggle click (or reading
   the DOM directly, which is what I did). It contains additional item links
   beyond the headline table. Example, Phase 2 "Other Head Armor
   Recommendations": Merciless Gladiator's Scaled Helm, Justicar Crown, Helm
   of the Fallen Champion, Mask of the Deceiver, and a link to Badge of
   Justice itself (that last one is a currency/vendor reference embedded in
   prose, not a piece of gear — see section 3, step 4, for how to handle a
   non-gear link found in these sections).

This confirms the parent plan's premise: the alternative sections are real,
present on every raid-tier page, and contain items absent from the headline
table. A collection pass that only reads the headline table would miss them.

### 1.3 Item identifiers

Every item name in both the headline table and the "Other" sections is an
`<a>` link to `https://www.wowhead.com/tbc/item=<ID>/<slug>`. The numeric ID
is unambiguous and appears in the URL itself, e.g.
`https://www.wowhead.com/tbc/item=32041/merciless-gladiators-scaled-helm`.
Tooltips and slugs can change; the numeric ID does not. Collection must
record the ID, not the name or slug, as the primary key (section 2).

### 1.4 Zone/source text is prose, not a controlled field

The "Source" column is free text written for a human: `Drop: Lady Vashj
(Serpentshrine Cavern)`, `Quest: Special Delivery to Shattrath City`,
`Crafted: Blacksmithing (Bind on Pickup)`, `Drop: Trash Mobs (Karazhan)`. It
sometimes names a token item rather than the final piece directly (`via Helm
of the Vanquished Champion`). This is exactly the two-hop tier-token case
sub-phase 2 already plans for. The collected JSON in this sub-phase does
**not** try to parse this prose into an `ItemSource` value — see section 2,
field `wowheadSourceText`. Turning it into a structured `ItemSource` is
sub-phase 4's merge step, using the already-planned AtlasLoot and token
mappings as the authority, with this text only as a cross-check.

### 1.5 Ranged/relic (libram) slot

Neither the Phase 2 nor Phase 3 toggler list included a "Ranged" or "Relic"
or "Libram" heading in the slot walk I inspected. This needs a direct check
at collection time — search the page text for "Libram" specifically, since
PLAN.md and the parent plan (D7) both establish librams as ret's only ranged
option, and the earlier EP-based system was already measured to score every
libram 0.0 (parent plan section 2). If Wowhead's guide is genuinely silent on
librams, that is worth recording as a gap, not silently working around it.

---

## 2. Schema for the committed JSON

One file per phase-guide page collected:
`data/wowhead-lists/ret/<stage>.json`, where `<stage>` matches the page
collected (`pre-raid`, `p1-p2`, `p3`, `p4`, `p5` — see naming note below).

Each file:

```json
{
  "spec": "ret",
  "stage": "p1-p2",
  "sourceUrl": "https://www.wowhead.com/tbc/guide/classes/paladin/retribution/dps-bis-gear-pve-phase-2",
  "collectedDate": "2026-07-28",
  "collectedBy": "human-or-agent-name",
  "pageAuthor": "Surveillant",
  "pageUpdated": "2026/06/18",
  "entries": [
    {
      "itemId": 30131,
      "itemName": "Crystalforge War-Helm",
      "slot": "head",
      "section": "headline",
      "rankLabel": "Best",
      "wowheadSourceText": "Drop: Lady Vashj (Serpentshrine Cavern) (via Helm of the Vanquished Champion)"
    },
    {
      "itemId": 32041,
      "itemName": "Merciless Gladiator's Scaled Helm",
      "slot": "head",
      "section": "alternative",
      "rankLabel": null,
      "wowheadSourceText": null
    }
  ]
}
```

Field notes:

- **`itemId`** — the numeric Wowhead item ID, required, the join key against
  `vendor/wowsims/db.json`'s `id` field and against the eventual pool's
  `itemId`.
- **`itemName`** — captured for human readability and for catching an ID
  transcription error. Not authoritative; `db.json`'s name is authoritative
  if they ever disagree.
- **`slot`** — use this repo's existing slot vocabulary already in
  `data/pools/ret.json` (`head`, `neck`, `shoulder`, `back`, `chest`,
  `wrist`, `hands`, `waist`, `legs`, `feet`, `finger`, `trinket`, `ranged`,
  `weapon`), not Wowhead's heading text directly. A fixed mapping table from
  Wowhead's slot headings to this vocabulary belongs in the collection
  procedure (section 3), so this stays a controlled field.
- **`section`** — exactly two values: `"headline"` (from the visible
  Rank/Item/Source table) or `"alternative"` (from the "Other ...
  Recommendations" toggler). This is the field the parent plan's D4
  restatement and the "narrowing signal" use case both depend on — do not
  collapse it into one list.
- **`rankLabel`** — the free-text tag from the headline table (`"Best"`,
  `"Best: Hit"`, `"Near Best"`, `"Best: Human"`, etc.), or `null` for
  alternative-section entries, which carry no such tag on the page.
  Free text, not an enum — Wowhead does not use a fixed vocabulary here.
- **`wowheadSourceText`** — the literal Source-column text for headline
  entries, or `null` for alternative-section entries (they do not have a
  Source column; only an item link). Kept as opaque text per section 1.4. Do
  not parse this into `ItemSource` in this sub-phase.
- No `ep`, no `owned`, no `source: ItemSource` — those belong to the merged
  pool file (`data/pools/ret.json`), not to this raw collection file. This
  file is an input to sub-phase 4's merge, not a pool.

**Phase field, explicitly not in this schema.** Do not put a `phase` (P1–P5)
number directly on each entry at collection time. Section 1.1 shows the
Wowhead "phase-2" guide spans this repo's tiers P1 and P2 together, so
copying a phase number off the guide page would silently mislabel items. The
per-entry `phase` field is assigned during the sub-phase 4 merge, by cross-
referencing `wowheadSourceText`'s named zone/boss against
`data/phase_raids.json` (sub-phase 0/1), the same way loot-table entries get
their phase. An item found only in a Wowhead list, with no zone this repo can
resolve (a badge, a quest reward, a crafted item), gets its phase from the
gearing stage the page represents at the coarser grain Wowhead actually uses
— pre-raid items are phase-independent floor gear, `p1-p2` items are P1 or P2
depending on which raid the Source text names, etc. This resolution logic is
sub-phase 4's job, not this file's.

**Stage naming.** Use `pre-raid`, `p1-p2`, `p3`, `p4`, `p5` as the `stage`
value and filename, matching what Wowhead actually publishes (section 1.1),
not an invented `p1`/`p2` split that does not exist as separate pages. If a
future Wowhead update splits Phase 1 and Phase 2 into separate guides,
re-survey and add a file; do not force today's combined page into two files
by guessing which rows belong to which tier.

**Merge with loot-table entries (sub-phase 4).** The merge key is `itemId`.
For an item present in both this file and the AtlasLoot-derived loot table,
sub-phase 4 keeps the loot table's `ItemSource` (it is structured and
already zone/boss-accurate) and adds a `listSection: "headline" |
"alternative"` tag plus `rankLabel` for display, sourced from this file. For
an item present only in this file, sub-phase 4 must resolve or hand-assign
an `ItemSource` using `wowheadSourceText`, or mark it explicitly as an
unresolved gap — it must not be silently dropped, per the parent plan's
"missing source is a build failure" rule (PLAN.md §8.3.2).

---

## 3. Collection procedure

Repeatable by a human or an agent with a real browser (not a plain HTTP
fetch — section 1.2 established the pages are client-rendered).

1. **Open the guide page** for the stage being collected (URLs in section
   1.1). Re-verify the URL still resolves and still names retribution
   paladin — Wowhead has renamed guide slugs before.

2. **Walk the page slot by slot**, in the order the page presents them. For
   each slot heading:
   a. Read every row of the visible Rank/Item/Source table. Record each as
      `section: "headline"`.
   b. Find and open (or read the already-present DOM for) the "Other `<Slot>`
      ... Recommendations" toggler, if present for this page (it will not be
      present on the pre-raid page — that is expected, not an error; record
      nothing extra and move on). Record every item link inside as
      `section: "alternative"`.
   c. Map the page's slot heading to this repo's slot vocabulary using this
      fixed table:

      | Wowhead heading | repo `slot` |
      |---|---|
      | Head Armor | `head` |
      | Neck Jewelry | `neck` |
      | Shoulder Armor | `shoulder` |
      | Back Armor | `back` |
      | Chest Armor | `chest` |
      | Wrist Armor | `wrist` |
      | Hand Armor | `hands` |
      | Waist Armor | `waist` |
      | Leg Armor | `legs` |
      | Feet Armor | `feet` |
      | Ring Jewelry | `finger` |
      | Trinket | `trinket` |
      | Weapon | `weapon` |
      | Libram / Relic (if present — see section 1.5) | `ranged` |

      If a heading appears that is not in this table, stop and add it here
      rather than guessing a mapping.

3. **Resolve every item name to an item ID from the link URL**, per section
   1.3. Never type or infer an ID from memory — read it from
   `href="https://www.wowhead.com/tbc/item=<ID>/..."`. If an item is
   mentioned in prose without a link (rare, but the Aldor/Scryers discussion
   on the Phase 2 page names items in running text, not only in tables),
   skip it — this file only records items that appear as an actual table row
   or toggler-list entry with a link, not every item name mentioned
   anywhere on the page.

4. **Skip non-gear links.** Some links inside a slot's table or toggler are
   not the piece of gear itself — the Head example in section 1.2 included a
   link to "Badge of Justice" (a currency), and some Source columns link to
   a quest or a token item rather than the final armor piece. Only record an
   entry when the **link is the actual equippable item being recommended for
   this slot** (its Wowhead item page should show it as armor/weapon/jewelry
   with a slot, not a currency or quest). When unsure, open the item's own
   Wowhead page and check its displayed slot/type before recording it.

5. **An item appearing in multiple sections or multiple phase pages**: keep
   every occurrence as a separate entry in its own file. Do not deduplicate
   across files at collection time — for example if item 30131 appears in
   both the `p1-p2` file's `head` headline and, hypothetically, also as an
   alternative on the `p3` file, both rows are collected independently.
   Deduplication and merge-across-phases is sub-phase 4's job, once loot-
   table phase data is available to resolve which occurrence is authoritative.
   Within one file, an item should not appear twice for the same slot in the
   same section — if it does, that is a page-reading error, not a real
   duplicate; re-check the page.

6. **Record the file header fields** — `sourceUrl` (the exact URL visited),
   `collectedDate` (ISO date, the day of collection, not the page's
   "Updated" date), `collectedBy`, and the page's own byline
   (`pageAuthor`, `pageUpdated`) copied from the page for staleness tracking
   (section 5).

7. **Save as** `data/wowhead-lists/ret/<stage>.json` and commit it. This is
   the only step that touches the repo; nothing upstream of this step is
   automated or run in CI, per D9.

---

## 4. Verification

After collecting, run two checks. Both are plain scripts against files
already in the repo (or about to be, from earlier sub-phases) — no network
access.

**Check A — overlap with the zone-scoped universe.** Once sub-phase 1's
AtlasLoot-derived loot table and sub-phase 0's `data/phase_raids.json` exist,
count how many `itemId`s in the collected Wowhead files already appear in
the zone-scoped raid-loot universe for the matching phase, versus how many
are new. Report both counts and the list of new item IDs, per file and
combined. This is the number the parent plan's sub-phase-3 exit criterion
asks for ("a measurement of how many listed items the zone universe already
contains"). Suggested command shape, to be written once sub-phase 1's output
file exists:

```
node scripts/measure_wowhead_overlap.js \
  --lists data/wowhead-lists/ret/*.json \
  --loot-universe data/loot/ret-universe.json   # sub-phase 1 output, name TBD there
```

This script does not exist yet and is not part of this sub-phase's
deliverable — it is listed here so sub-phase 4 (or whoever writes it) has
the shape already agreed. Do not claim this measurement has been run until
that script exists and has actually been executed; until then this is a
plan for a check, not a result.

**Check B — every collected item ID exists in `vendor/wowsims/db.json`.**
This can be written and run today, independent of the other sub-phases,
because `db.json` already exists and is committed
(`vendor/wowsims/db.json`, 8,257 items, keyed by numeric `id` — confirmed by
reading the file directly). For every `itemId` across every
`data/wowhead-lists/ret/*.json` file, confirm a matching `id` exists in
`db.json`'s item array. An item absent there cannot be simulated (parent
plan section 1, source 3), so a miss here is a hard stop, not a warning —
either the collected ID was mistyped (go re-check the Wowhead link) or the
item genuinely has no simulate-able data and must be flagged before it ever
reaches sub-phase 4's merge. Shape:

```
node scripts/check_wowhead_ids_in_db.js data/wowhead-lists/ret/*.json
```

Also not written yet; this sub-phase specifies it so the collection work in
section 3 has a check waiting for it immediately, rather than discovering
missing IDs downstream in sub-phase 4.

---

## 5. Staleness

**What makes a list stale.** Wowhead guides carry their own "Updated" date
in the page byline (captured as `pageUpdated` in the schema, section 2) —
this is the primary staleness signal, cheaper than diffing content. A
guide's content also changes without the date changing if Wowhead does a
minor edit; the date is a lower bound on freshness, not a guarantee.
Practical triggers to re-collect:

- The pinned `CURRENT_PHASE` in wowsims moves (PLAN.md already treats this
  as the P3-launch signal for other data; the same event should trigger a
  re-collection of the newly-current phase's Wowhead guide, since a guide
  written before a phase's release is necessarily provisional).
- The `pageUpdated` byline on a previously-collected page has moved forward
  since `collectedDate`.
- A sub-phase-4 recall measurement (parent plan section 7) finds a real
  upgrade that appears in neither the loot universe nor any collected list —
  that is a signal the lists themselves may be missing something Wowhead has
  since added.

**Cost of re-collection.** One page per stage, five stages for ret. Section
3's procedure is the same work again — walking each slot's headline table
and toggler. Based on the page sizes measured in section 1 (13 slots, under
100 total item links on the largest page checked), this is on the order of
15–30 minutes per page for a careful human pass, faster for an agent
re-running the same DOM-read steps used in this survey. Re-collection
replaces the whole file for that stage; it does not patch individual rows,
so the diff between old and new committed JSON is itself a visible record of
what changed.

---

## 6. Scope note

**Ret-specific in this schema:** nothing, structurally. The `spec` field is
already a variable, not hardcoded; the slot vocabulary table in section 3 is
the general 14-slot TBC gear vocabulary already used by every spec's pool
file (`data/pools/<spec>.json`), not something ret-only. The one part of
this plan that was ret-specific was the survey itself — the actual guide
URLs, and the observation about which pages have togglers — which had to be
checked spec by spec because Wowhead publishes one guide set per class/spec
combination, not one universal page.

**What changes for other specs:** repeat section 1's survey per spec (the
URL pattern `dps-bis-gear-pve-<stage>` under
`/tbc/guide/classes/<class>/<spec>/` is a reasonable starting guess, but
must be re-verified — do not assume it holds for a caster spec or a spec
with a different itemization language, e.g. "Ranged" meaning a bow for a
hunter rather than a libram for a paladin). The output path becomes
`data/wowhead-lists/<spec>/<stage>.json`, same schema. The slot-mapping
table in section 3 already covers every slot in this repo's vocabulary, so
it should not need spec-specific entries — a caster's "Ranged" slot is still
`ranged` in the schema, it just resolves to a wand instead of a libram, which
is exactly the kind of detail that belongs in `ItemSource`/eligibility rules
(sub-phase 4, D7-equivalent for that spec), not in this collection schema.

Tank and healer specs may have Wowhead guides organized differently (e.g. a
combined survivability/DPS gear list, or separate mitigation vs. threat
tables) — this was not checked, since this pass is ret-only by design. Flag
that as an open question for whoever picks up the next spec, not something
this document resolves.

---

## 7. Explicitly out of scope for this sub-phase

- Actually collecting any list. This document plans the process; no
  `data/wowhead-lists/` files exist yet.
- Writing `scripts/measure_wowhead_overlap.js` or
  `scripts/check_wowhead_ids_in_db.js` (section 4 specifies their shape only).
- Resolving `wowheadSourceText` into a structured `ItemSource` (sub-phase 4).
- Any spec other than ret.
- Any change to `packages/`, `scripts/`, or `data/`.

---

## 8. Correction after direct inspection of the Phase 2 page

The owner pointed out that the earlier survey did not look at the per-phase
guide pages closely enough. Re-checked by loading
`https://www.wowhead.com/tbc/guide/classes/paladin/retribution/dps-bis-gear-pve-phase-2`
in a browser and querying the DOM. The page contains considerably more usable
structure than section 1 of this document describes.

### Measured on that single page

| Measure | Value |
|---|---|
| Distinct item IDs linked | 103 |
| Total item links | 108 |
| Collapsed "Other ... Recommendations" sections | 13 (26 DOM nodes, each title appears twice) |
| Rows containing a "(via ...)" token reference | 10 |

103 distinct items on one phase page is not a short best-in-slot list. It is
close in size to the whole zone-scoped universe for that phase (201 items under
union carryover), which makes this a substantial membership source rather than a
supplementary one.

### The token relationship is on the page and is machine-extractable

This is the important finding. Section 1 and sub-phase 2 both assumed the
token-to-piece mapping had to be built by hand. It does not. Each tier row
carries the armor piece, the token, the boss, and the zone together, and both
items are ordinary item links with numeric IDs:

| Piece | Piece ID | Token | Token ID | Boss and zone |
|---|---|---|---|---|
| Crystalforge War-Helm | 30131 | Helm of the Vanquished Champion | 30242 | Lady Vashj, Serpentshrine Cavern |
| Crystalforge Breastplate | 30129 | Chestguard of the Vanquished Champion | 30236 | Kael'thas Sunstrider, Tempest Keep |
| Crystalforge Greaves | 30132 | Leggings of the Vanquished Champion | 30245 | Fathom-Lord Karathress, Serpentshrine Cavern |
| Crystalforge Gauntlets | 30130 | Gloves of the Vanquished Champion | 30239 | Leotheras the Blind, Serpentshrine Cavern |
| Crystalforge Shoulderbraces | 30133 | Pauldrons of the Vanquished Champion | 30248 | Void Reaver, Tempest Keep |
| Justicar Crown | 29073 | Helm of the Fallen Champion | 29760 | Prince Malchezaar, Karazhan |
| Justicar Greaves | 29074 | Leggings of the Fallen Champion | 29766 | Gruul the Dragonkiller, Gruul's Lair |

The same pattern also covers non-tier two-hop items, which neither this document
nor sub-phase 2 anticipated: Telonicus's Pendant of Mayhem via Verdant Sphere,
Darkmoon Card: Crusade via Blessings Deck, Mark of the Champion via The
Phylactery of Kel'Thuzad. So "(via X)" is a general mechanism for "you do not
loot this directly", not a tier-only convention.

Note the T5 token names on this page are "Vanquished Champion", and T4 uses
"Fallen Champion". An earlier note in the parent plan referred to
Conqueror/Protector/Vanquisher, which are the Tier 6 groupings. Do not assume
one naming scheme covers all tiers — this is exactly the variation PLAN.md
section 8.3.2 warns about.

### Row structure is regular

Rows follow `Rank | Item | Source`, where rank is a short label such as "Best",
"Best: Hit", "Best: Human", or "Optional", and source is free text such as
"Drop: Lady Vashj (Serpentshrine Cavern)" or "Crafted: Engineering (Bind on
Pickup)". The rank labels carry conditions worth keeping, since "Best: Hit" and
"Best: Human" record why an item is chosen.

### What this changes

1. Collect the token ID and the piece ID together from these rows. Sub-phase 2's
   hand-verification job shrinks to checking what this yields rather than
   building the mapping from nothing.
2. Extract `(via ...)` generally, not only for tier pieces.
3. Keep the rank label text. It is a condition, not decoration.
4. Section 1's claim that no ranged or libram section was found still needs a
   direct check. It was not resolved by this pass.

### Still not verified

- Whether the other phase pages (pre-raid, 3, 4, 5) share this structure. Only
  the Phase 2 page was inspected in detail.
- Whether 103 items per page is typical or particular to this phase.
- Whether every "(via ...)" reference resolves to an item that exists in
  `vendor/wowsims/db.json`.
