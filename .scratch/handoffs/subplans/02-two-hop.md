# Sub-phase 2 plan: tier tokens and raid-recipe crafts

**Status:** Plan. Not implemented.
**Parent:** `.scratch/handoffs/raid-scoped-pool-plan.md`, section 8, sub-phase 2.
**Scope:** ret tier pieces (setIds 626, 629, 680) plus a small, explicit list of
ret-relevant crafted items whose recipe drops in a raid.

---

## 0. The problem in plain words

Most items in the pool drop straight from a boss: kill the boss, the item is in
the loot table, done. Two kinds of items do not work that way:

1. **Tier armor.** A boss does not drop the armor piece. It drops a "token" —
   a separate item, like a coin — and the player hands that token to a vendor
   in exchange for the real armor piece. If we only record where the armor
   piece itself drops, the answer is "nowhere," because it never drops. We
   have to record where the token drops instead, and remember that the token
   stands in for the armor piece.
2. **Crafted items from raid recipes.** A boss drops a recipe (a pattern,
   plan, or formula). A player with the right profession uses that recipe to
   craft the item at a forge or table, not in the raid. The item still
   belongs to that raid in a player's mind — "the trinket from the recipe
   that drops off X" — even though nothing about the crafting step happens in
   the raid.

The parent plan calls this general shape "two-hop": the item a player wants is
reached through an intermediate object (a token or a recipe), and the pool
must record which raid the *intermediate object* drops in, not try to record
a raid for the final item directly, because the final item has no raid drop
at all.

This plan covers both cases for ret paladins only.

---

## 1. Verified facts about the current state

All commands below were run against the current worktree
(`C:\Users\dgree\Code\lulz\tbc-gear-prio`, branch `phase-1/five-seed-spread`)
and can be re-run.

### 1.1 The three ret tier sets and their 18 pieces have no source data

```js
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('vendor/wowsims/db.json', 'utf8'));
const items = db.items;
const sets = [626, 629, 680];
const tierItems = items.filter(i => sets.includes(i.setId));
console.log(tierItems.length); // 18
console.log(tierItems.every(i => i.sources === undefined)); // true
```

Result: 18 items, all with `sources === undefined`. Set 626 (Justicar
Battlegear, T4) has 5 pieces, set 629 (Crystalforge Battlegear, T5) has 5
pieces, set 680 (Lightbringer Battlegear, T6) has 8 pieces (T6 added rings and
a belt to the set, which is why it is 8 and not 5).

Full item ID list with `db.json` `type` code (armor slot):

| itemId | name | set | type code |
|---|---|---|---|
| 29071 | Justicar Breastplate | T4 | 5 (chest) |
| 29072 | Justicar Gauntlets | T4 | 7 (hands) |
| 29073 | Justicar Crown | T4 | 1 (head) |
| 29074 | Justicar Greaves | T4 | 9 (legs) |
| 29075 | Justicar Shoulderplates | T4 | 3 (shoulder) |
| 30129 | Crystalforge Breastplate | T5 | 5 (chest) |
| 30130 | Crystalforge Gauntlets | T5 | 7 (hands) |
| 30131 | Crystalforge War-Helm | T5 | 1 (head) |
| 30132 | Crystalforge Greaves | T5 | 9 (legs) |
| 30133 | Crystalforge Shoulderbraces | T5 | 3 (shoulder) |
| 30982 | Lightbringer Gauntlets | T6 | 7 (hands) |
| 30989 | Lightbringer War-Helm | T6 | 1 (head) |
| 30990 | Lightbringer Breastplate | T6 | 5 (chest) |
| 30993 | Lightbringer Greaves | T6 | 9 (legs) |
| 30997 | Lightbringer Shoulderbraces | T6 | 3 (shoulder) |
| 34431 | Lightbringer Bands | T6 | 6 (finger) |
| 34485 | Lightbringer Girdle | T6 | 8 (waist) |
| 34561 | Lightbringer Boots | T6 | 10 (feet) |

Note `db.json`'s `type` field is the armor-slot code, not a WoW inventory
slot ID — confirm the code-to-slot mapping used elsewhere in the codebase
(`packages/core`) before relying on the numbers above for anything beyond
sanity-checking this table by eye.

### 1.2 What `scripts/curate_ret_pool.py` already does (prior art, not to be trusted blindly)

The `HAND` dict at the top of `scripts/curate_ret_pool.py` (lines 21-143)
hand-fills `source: null` gaps from the generator. It covers 9 of the 18 tier
pieces:

- T6: 34485, 34561, 30990, 30997, 34431 (5 of 8)
- T5: 30132, 30129 (2 of 5)
- T4: 29074, 29075 (2 of 5)

**Missing entirely from HAND (9 pieces get no source at all today):**
29071, 29072, 29073 (all of T4 except greaves/shoulders), 30130, 30131, 30133
(3 of 5 T5 pieces), 30982, 30989, 30993 (3 of 8 T6 pieces).

Verify this split by re-running the grep used to build this table:

```
grep -nE "29071|29072|29073|29074|29075|30129|30130|30131|30132|30133|30982|30989|30990|30993|30997|34431|34485|34561" scripts/curate_ret_pool.py
```

**A bug in the existing entries, found while checking this plan.** Look at
one HAND entry:

```python
30990: {"kind": "token", "zone": "Black Temple", "token": "Lightbringer Breastplate"},
```

The key `30990` is the **armor piece's own item ID** (Lightbringer
Breastplate). The `token` field is set to `"Lightbringer Breastplate"` — the
same piece's own name. That is not a token. A real token item (for example,
"Reinforced Fel Iron Chestguard") has its own separate item ID and its own
name, and it is that token's ID that should key the map, or at minimum the
`token` field should name the actual token item, not repeat the armor
piece's name back at itself. I checked this by reading the file directly
(`scripts/curate_ret_pool.py` lines 23-43, 89-122); I did not need Wowhead to
see the mismatch, but Wowhead is needed to find the real token IDs and names
(section 2).

This means: **do not copy the existing 9 HAND entries as correct.** Their
`zone` values are plausible (Black Temple, Hyjal Summit, Sunwell Plateau,
Tempest Keep, Karazhan, Serpentshrine Cavern all line up with which raid
introduced each tier in TBC), but the `token` field they carry is wrong for
all 9, and none of them record a real token item ID anywhere. Re-verify the
zone too — plausible is not the same as checked.

### 1.3 db.json's own `sources` field, for crafted items, is more useful than expected

`db.json` items with `requiredProfession` set (111 items) frequently carry a
`sources` array with a `crafted` entry:

```json
{
  "id": 13503,
  "name": "Alchemist's Stone",
  "requiredProfession": 1,
  "sources": [{ "crafted": { "profession": 1, "spellId": 17632 } }]
}
```

This gives profession and the recipe's spell ID. It does **not** give where
the recipe (the spellId's teaching item) drops. That has to come from
elsewhere — see section 3.

```
node -e "
const fs=require('fs');
const db=JSON.parse(fs.readFileSync('vendor/wowsims/db.json','utf8'));
const withProf = db.items.filter(i=>i.requiredProfession);
console.log(withProf.length); // 111
console.log([...new Set(withProf.map(i=>i.requiredProfession))]);
"
```

Result: 111 items with `requiredProfession` set; profession codes present are
`[1, 11, 2, 4, 8, 7]` (Alchemy, Enchanting, and others — confirm the
profession-ID map used elsewhere in the codebase before trusting these
numbers as human-readable).

### 1.4 The generated pool currently ships `source: null` for all 9 covered tier pieces

`data/pools/ret.generated.json` (pre-curation, machine output) has
`source: null` for every one of the 9 tier pieces HAND covers. That is
expected — HAND is applied in a later pass. `data/pools/ret.json`
(post-curation) does carry the HAND-filled `token` source for those 9, which
confirms `curate_ret_pool.py`'s hand map is the only thing populating tier
sources today; nothing in the generator does it.

```
node -e "
const fs=require('fs');
const out=JSON.parse(fs.readFileSync('data/pools/ret.json','utf8'));
const tierIds=[30990,30129,34561,30132,29074,29075,30997,34485,34431];
for (const e of out.entries) if (tierIds.includes(e.itemId)) console.log(e.itemId, JSON.stringify(e.source));
"
```

---

## 2. Task 1 — verify and complete the 18-piece token map

### 2.1 What "verify" means here, concretely

For each of the 18 armor pieces, open its Wowhead item page (Wowhead
Classic / TBC database, not retail) and read the "Redeemed From" or "Sold
by" section, which names the token item. Then open the token's own Wowhead
page, which states which boss drops it and in which zone (Wowhead labels
this under "Dropped by").

Record, per piece:

- `pieceId` — the armor item ID (already known, section 1.1).
- `tokenId` — the token item's own Wowhead item ID.
- `tokenName` — the token item's name, as shown on Wowhead.
- `zone` — the raid zone the token drops in.
- `boss` — the boss that drops the token (optional per the existing
  `ItemSource` type, but record it; it costs nothing and helps a future boss
  filter).

This has to be done by hand, one piece at a time, because neither AtlasLoot
(per the parent plan, section 5.1) nor `db.json` records the
token-to-armor-piece relationship. AtlasLoot lists tier pieces as flat
armor-ID lists without the token link (parent plan, section 5.1, "Known
limitation"). This is not a scriptable step.

### 2.2 Why this cannot be assumed from class or slot alone

PLAN.md §8.3.2 states token groupings change between tiers:

> Token groupings are per-tier data and change at T6 — T4/T5 use Champion /
> Defender / Hero, T6 switches to Conqueror / Protector / Vanquisher, and
> the class groupings differ between them. Verify against Wowhead before
> committing the mapping; the domain reference flags its own table as
> unverified.

Concretely: in T4/T5, which token name (Champion / Defender / Hero) a given
class's tier uses is not the same pattern as in T6 (Conqueror / Protector /
Vanquisher). A paladin's T5 pieces might come from a "Hero" token while a
different class's T5 pieces come from "Champion," and the T6 mapping does not
mirror that assignment one-to-one. Do not infer the T6 token grouping from
the T4/T5 one. Check each tier's token names on Wowhead independently.

Additionally, each vendor that redeems tokens is itself zone-specific (a
Shattrath or Area 52 quartermaster, or a raid-adjacent NPC) — the vendor
location is not the same as the drop zone, and does not matter for this
plan. Only the token's drop zone matters, because that is what the raid
filter keys on.

### 2.3 Verification checklist per piece

For all 18 pieces, do this once and write the result into the mapping file
(section 4):

1. Open the armor piece's Wowhead page. Confirm the item exists and the name
   matches `db.json`.
2. Read "Redeemed From" (or equivalent section) to get the token item name
   and ID.
3. Open the token's Wowhead page. Read "Dropped by" to get the boss and
   zone.
4. Cross-check the zone against the tier's known origin raid as a sanity
   check, not a substitute for step 3: T4 (Justicar) is Karazhan and
   Gruul's Lair tokens; T5 (Crystalforge) is Serpentshrine Cavern and
   Tempest Keep tokens; T6 (Lightbringer) is Black Temple, Hyjal Summit,
   and Sunwell Plateau tokens (Sunwell adds rings/belt/feet in this set,
   consistent with 30982/30989/30990/30993/30997/34431/34485/34561 being 8
   pieces instead of 5).
5. If a piece's existing HAND entry already names a plausible zone (see
   section 1.2), still redo steps 1-3. Plausible is not verified. The
   `token` field bug in section 1.2 shows the existing entries were never
   checked against a real token item.

I did not do this Wowhead lookup as part of this planning pass — it is
listed here as the task, not performed. Nothing in this document states a
zone or token name for any piece as fact; section 1.2's zone guesses for the
9 covered pieces are flagged explicitly as unverified, not adopted.

---

## 3. Schema

### 3.1 The existing `token` source shape

PLAN.md §8.3.2 defines:

```ts
type ItemSource =
  | { kind: 'raid';    zone: string; boss?: string }
  | { kind: 'token';   zone: string; boss?: string; token: string }
  | { kind: 'badge';   cost: number }
  | { kind: 'crafted'; profession: string }
  | { kind: 'rep';     faction: string; standing: string }
  | { kind: 'heroic';  dungeon: string }
  | { kind: 'pvp';     via: 'arena' | 'honor'; season?: number }
  | { kind: 'world' }
```

### 3.2 Is `{ kind: 'token' }` sufficient? Mostly, with one addition

The `zone` and `boss` fields are enough to answer the question this plan
exists for: "does this piece show up when I filter by raid X." That works
today with just a zone string.

What is missing, based on the bug found in section 1.2: **the `token` field
is typed as a free-text `string`, and nothing enforces that it is the actual
token item's name rather than the armor piece's own name repeated back.**
The type does not catch this because a string is a string either way. Two
options, in order of how much they change:

- **Minimal:** keep `token: string` but also require the token's item ID,
  since a name string can drift or be typo'd and an ID cannot silently
  duplicate the piece's own ID without being caught by a simple assertion
  (`tokenId !== pieceId`). Add `tokenId: number` alongside `token: string`.
- **No change:** leave the shape as-is and rely on hand-review (section 5)
  to catch mistakes like the one in section 1.2. Cheaper, but it is exactly
  how the existing bug got in.

Recommendation: add `tokenId: number`. It is a one-field addition, it lets a
test assert `tokenId !== pieceId` cheaply (catching the exact bug found in
section 1.2), and it gives a stable key if a future feature wants to show
the token's own icon or link.

Proposed updated shape for this kind only:

```ts
| { kind: 'token'; zone: string; boss?: string; token: string; tokenId: number }
```

This is a schema change to `packages/core` types (PLAN.md §8.3.2's
`ItemSource`), which is out of scope for this planning document to edit but
in scope to flag as a required follow-up in sub-phase 5 or 6's file list.

### 3.3 Crafted-from-raid-recipe shape

The parent plan (section 5.3) says a `crafted` source needs to carry the
zone the recipe drops in, and that the existing `crafted` kind does not do
this:

```ts
| { kind: 'crafted'; profession: string }
```

Proposed addition, a new variant rather than overloading the existing one
(overloading `crafted` would make plain BoE-recipe crafts and raid-recipe
crafts indistinguishable by shape alone, which defeats the point of a
tagged union):

```ts
| { kind: 'crafted'; profession: string; recipeZone?: string; recipeBoss?: string }
```

`recipeZone` and `recipeBoss` are optional so ordinary crafted items whose
recipe is bought from a trainer or a non-raid vendor (the common case — most
of the 111 `requiredProfession` items in section 1.3 are not raid recipes)
keep working with `{ kind: 'crafted', profession }` alone. Only the small set
identified in section 4 below gets the extra two fields.

---

## 4. Task 2 — raid-recipe crafted items

### 4.1 What `db.json` gives for free, and what it does not

`db.json`'s `sources[].crafted.spellId` (section 1.3) identifies the recipe
spell but not where the recipe itself (the pattern/plan/formula item that
teaches that spell) drops. There is no field in `db.json` connecting a
`spellId` back to a recipe item ID or a zone. This has to be found by hand,
the same way as the token map.

### 4.2 How to enumerate ret-relevant raid-recipe crafts

This will be small and hand-built, not derived. Proposed process:

1. Filter `db.json` items to ret-equippable slots (plate/leather/mail body
   armor, or ranged/librams — matching D7 in the parent plan) with
   `requiredProfession` set. This is the candidate list, likely well under
   50 items once narrowed to ret-usable armor types and stats.
2. For each candidate, check by hand on Wowhead whether the item's recipe
   (not the item itself) is a raid drop, versus a trainer recipe, a vendor
   recipe, a quest reward, or a world drop. Most will not be raid drops —
   this is expected. Only keep the ones that are.
3. For the ones that are raid drops, record `recipeZone` and optionally
   `recipeBoss` the same way as the token map.

I have not run step 1's filter as part of this plan — it requires the
ret-slot eligibility logic that lives in `scripts/generate_pool.py` /
`packages/core`, which this document is not allowed to modify or execute
changes against. State the exact filter command to run when this task is
picked up:

```
node -e "
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('vendor/wowsims/db.json', 'utf8'));
const candidates = db.items.filter(i => i.requiredProfession);
console.log(candidates.length); // 111, per section 1.3
"
```

then intersect that list with whatever ret-eligibility filter
`scripts/generate_pool.py` uses (plate/leather/mail armor types, librams for
ranged — see PLAN.md §8.3, R11) to get the real candidate count. That
intersection was not computed in this pass; expect it to be well under 111,
since most of the 111 are cloth (mage/priest/warlock robes) or other
non-ret slots based on the sample read in section 1.3 (Robe of the
Archmage, Robe of the Void, Truefaith Vestments, Spellfire Belt — none are
ret-eligible armor types except possibly the belt by base stats, but its
armor type is cloth per `armorType: 1`).

### 4.3 Honest sizing

This is hand work with no shortcut. Expect single digits to low teens of
ret-relevant raid-recipe crafted items in TBC (examples from general TBC
knowledge, unverified against this repo's data and not to be trusted without
the Wowhead check in 4.2 step 2 — do not commit these without verifying):
things like a leatherworking or blacksmithing plate/mail piece whose pattern
drops in Karazhan or Serpentshrine Cavern. Do not guess-fill this list from
memory; every entry needs the Wowhead check.

---

## 5. Validation

### 5.1 The test

Add a test (location: alongside existing pool tests, likely
`packages/core/test/pool-file.test.ts` per the file already modified on this
branch, or a new `packages/core/test/tier-tokens.test.ts` — final placement
is an implementation decision, not fixed here) asserting that filtering
`data/pools/ret.json` entries by `source.zone === 'Black Temple'` returns
exactly the T6 pieces whose tokens drop there, plus any non-tier Black
Temple raid drops already in the pool.

### 5.2 Expected item IDs — stated honestly as unverified

Based on section 1.2's zone guesses (unverified — see the warning in that
section), the T6 pieces currently tagged `Black Temple` are itemIds 30990
(Lightbringer Breastplate) and 30997 (Lightbringer Shoulderbraces). Once the
Wowhead verification in section 2 is done, this set may change — some of the
8 T6 pieces currently missing a source (30982, 30989, 30993) may turn out to
have Black Temple tokens too, since Black Temple was T6's first raid.
**Do not write the test's expected-ID list until section 2's verification is
complete.** Writing it now from the unverified guesses in section 1.2 would
bake in the same kind of error found in the `token` field bug.

The test should also assert, per the schema addition in 3.2, that
`tokenId !== pieceId` for every token-kind entry — this directly catches the
bug documented in section 1.2 if it recurs.

### 5.3 A second check worth adding

Assert that every one of the 18 tier piece IDs (list in section 1.1) has a
non-null `source` in `data/pools/ret.json`. Today 9 of 18 fail this
(section 1.2). This turns "9 pieces silently have no raid filter" into a
build failure, matching the parent plan's stated goal (PLAN.md §8.3.2: "a
`null` source is a build-time failure for a pool that ships").

---

## 6. Effort estimate

| Task | Hand-built vs. derived | Estimate |
|---|---|---|
| Wowhead lookup for 18 tier pieces (9 already have a HAND entry to re-check, 9 are new) | Hand-built, one Wowhead item page + one token page per piece | 18 pieces x ~5 min each (open item page, open token page, record 4 fields) = roughly 1.5 hours, plus time to fix the 9 existing wrong entries |
| Schema addition (`tokenId` on token kind, `recipeZone`/`recipeBoss` on crafted kind) | Small, mechanical type + validation change in `packages/core` | Under an hour once the plan is approved — not done in this pass |
| Enumerate ret-relevant raid-recipe crafted items | Hand-built: filter `db.json` by `requiredProfession` + ret slot eligibility, then Wowhead-check each candidate's recipe source | Filter step is a one-line script; Wowhead-check depends on candidate count from 4.2 step 1 (unknown until run), likely 10-20 items x ~3 min = under an hour |
| Wire results into `HAND` (or its replacement) in `scripts/curate_ret_pool.py` | Mechanical, once data is verified | Under 30 minutes |
| Tests (5.1-5.3) | Hand-written, small | Under an hour |

Total, once this plan is approved: roughly half a day of focused hand
verification plus a small implementation pass. The dominant cost is the
Wowhead lookups, which cannot be automated per D9 (no Wowhead scraping in
CI, parent plan section 4) and per the parent plan's explicit statement that
a person looking things up during curation is not a build dependency
(PLAN.md §8.3.2, point 3).

---

## 7. Summary of what this plan does and does not settle

**Settled by measurement in this pass:**
- All 18 ret tier pieces have no `sources` in `db.json` (section 1.1, exact
  IDs listed).
- 9 of 18 already have a HAND entry in `scripts/curate_ret_pool.py`; 9 do
  not (section 1.2).
- All 9 existing HAND entries for tier pieces have a `token` field that
  wrongly repeats the armor piece's own name instead of naming the actual
  token item (section 1.2) — this is a real bug, found by reading the file,
  not assumed.
- `db.json` gives profession and spell ID for crafted items but never a
  recipe's drop zone (section 1.3).

**Left for the implementer, explicitly not done here:**
- The actual Wowhead lookups for all 18 tier pieces (section 2).
- The actual list of ret-relevant raid-recipe crafted items (section 4).
- The schema change itself (section 3.2, 3.3 are proposals, not applied).
- The test's expected-ID list (section 5.2), which depends on the Wowhead
  lookups.

---

## Correction: the mapping does not have to be built by hand

Added after the owner pointed out that the Wowhead research in sub-phase 3 was
too shallow. The per-phase guide pages were then inspected directly.

This document assumed the token-to-piece mapping had to be assembled by hand,
one Wowhead lookup per piece, at roughly half a day of work. That assumption is
wrong. The Wowhead phase guides already carry the relationship in a regular,
machine-readable form. See `03-wowhead-lists.md` section 8 for the measured
detail.

Each tier row on the Phase 2 page gives the piece, the token, the boss, and the
zone together, with both items as links carrying numeric IDs:

| Piece | Piece ID | Token | Token ID | Source |
|---|---|---|---|---|
| Crystalforge War-Helm | 30131 | Helm of the Vanquished Champion | 30242 | Lady Vashj, Serpentshrine Cavern |
| Crystalforge Breastplate | 30129 | Chestguard of the Vanquished Champion | 30236 | Kael'thas Sunstrider, Tempest Keep |
| Crystalforge Greaves | 30132 | Leggings of the Vanquished Champion | 30245 | Fathom-Lord Karathress, Serpentshrine Cavern |
| Crystalforge Gauntlets | 30130 | Gloves of the Vanquished Champion | 30239 | Leotheras the Blind, Serpentshrine Cavern |
| Crystalforge Shoulderbraces | 30133 | Pauldrons of the Vanquished Champion | 30248 | Void Reaver, Tempest Keep |
| Justicar Crown | 29073 | Helm of the Fallen Champion | 29760 | Prince Malchezaar, Karazhan |
| Justicar Greaves | 29074 | Leggings of the Fallen Champion | 29766 | Gruul the Dragonkiller, Gruul's Lair |

Two consequences.

**This sub-phase becomes verification, not construction.** Collect the mapping in
sub-phase 3, then check it here. The effort estimate of half a day was based on
manual lookup for all 18 pieces and should be revised down once collection has
run. Verification is still needed: only one page has been inspected, and the
extraction has not been checked against the other four phase pages.

**The scope is wider than tier.** The same "(via ...)" pattern covers items that
are not tier pieces at all, including Telonicus's Pendant of Mayhem via Verdant
Sphere and Darkmoon Card: Crusade via Blessings Deck. This document was scoped to
tier tokens plus raid-dropped recipes. The real category is any item obtained
through an intermediate object, and the guides mark all of them the same way.

**One correction to this document's own earlier text.** Tier 5 tokens are named
"Vanquished Champion" and Tier 4 tokens "Fallen Champion". Earlier notes in the
parent plan cited Conqueror, Protector, and Vanquisher, which are the Tier 6
names. All three schemes exist and none generalises to the others.

The finding that the existing `HAND` map in `scripts/curate_ret_pool.py` is wrong
for 18 of its 24 token entries still stands and is unaffected by this correction.
