# Sub-phase 1 plan: AtlasLoot pin and parse

**Status:** Plan only. Not implemented. Do not modify `packages/`, `scripts/`,
or `data/` to build this — that happens when someone picks up the plan.
**Date:** 2026-07-28
**Parent:** `.scratch/handoffs/raid-scoped-pool-plan.md`, sub-phase 1.
**Prior research used here:** `.scratch/handoffs/raid-scoped-pool-spike.md` §4
and §5–6 (AtlasLoot feasibility, and the corrected 673-item gap number). This
plan does not redo that research. It turns it into a build plan.

---

## 1. What this sub-phase produces

A committed, regenerable mapping from item ID to a list of `ItemSource`
records, built by parsing AtlasLootClassic's TBC loot data. Plus a measured
count of how many of the 673 gap items it resolves, and a written list of what
it does not resolve.

This sub-phase does not touch the ranking engine, the pool file, or any
existing script. It produces one new input that later sub-phases consume.

---

## 2. Pinning

Follow the same pattern as `scripts/sync_wowsims.py` and
`data/wowsims.lock.json`, described below so the next builder does not have to
re-read that file to find the shape.

### 2.1 What that pattern is

`scripts/sync_wowsims.py` pins one upstream repo to one commit SHA, recorded
in `data/wowsims.lock.json`. Files are fetched by exact path into
`vendor/wowsims/` (gitignored — see `.gitignore`, not re-verified here but
follow the existing `vendor/` convention). The **parsed output** — not the
vendored files — is what gets committed to `data/`. `TRACKED` is a hardcoded
dict of `{local_name: upstream_path}`, not a directory listing: the script
does not crawl the repo, it fetches a fixed, named list of files.

`--check` reports drift (upstream moved, or a local file's sha256 no longer
matches the lockfile) without writing anything. `--update` re-fetches and
rewrites the lockfile. Both are read via `gh api` against raw GitHub content
URLs, no git clone.

### 2.2 What to build for AtlasLoot

New script: `scripts/sync_atlasloot.py`. New lockfile:
`data/atlasloot.lock.json`. New vendor directory: `vendor/atlasloot/`
(gitignored, same as `vendor/wowsims/`).

```python
REPO = "Hoizame/AtlasLootClassic"
LOCKFILE = "data/atlasloot.lock.json"
VENDOR = "vendor/atlasloot"

TRACKED = {
    "data-tbc.lua": "AtlasLootClassic_DungeonsAndRaids/data-tbc.lua",
}
```

Only track `data-tbc.lua` to start. Do not add `data.lua` (base/shared),
`data-wrath.lua`, `droprate.lua`, or `droprate_override.lua` unless a
measured gap in section 4 traces back to one of them. Adding an untracked
file "just in case" is exactly the kind of scope creep this plan is trying to
avoid — each tracked file is a maintenance and licence surface (section 6).

`sync_atlasloot.py` should be a near-copy of `sync_wowsims.py`'s `do_update`
and `do_check` functions, minus the `CURRENT_PHASE` parsing (AtlasLoot has no
equivalent field — there is nothing to extract from the fetched file besides
its bytes and hash). The lockfile fields:

```json
{
  "repo": "Hoizame/AtlasLootClassic",
  "tag_or_branch": "<resolved at pin time — see below>",
  "commit": "<full sha>",
  "files": {
    "data-tbc.lua": {
      "path": "AtlasLootClassic_DungeonsAndRaids/data-tbc.lua",
      "sha256": "<hex>",
      "bytes": <int>
    }
  }
}
```

**Open question this plan does not resolve: does AtlasLootClassic tag
releases?** `sync_wowsims.py` pins to a GitHub release tag
(`repos/{repo}/tags`). The spike (§4) did not check whether
`Hoizame/AtlasLootClassic` has tags. Whoever builds this must run:

```bash
gh api repos/Hoizame/AtlasLootClassic/tags --jq '.[0:5]'
```

If tags exist, pin to the latest tag, same as wowsims. If the repo has no
tags (common for addon repos that just push to `main`), pin to a specific
commit SHA on the default branch instead — `gh api
repos/Hoizame/AtlasLootClassic/commits/main --jq '.sha'` — and record that
this repo is pinned by commit, not by tag, in the lockfile's `tag_or_branch`
field (set it to `"main"` or whatever the default branch is called). Do not
block on this — either pinning mechanism satisfies "pin it consistently,"
because the load-bearing property is a recorded commit SHA plus a per-file
sha256, and both mechanisms give you that.

### 2.3 What "consistent" means here, precisely

The two properties `sync_wowsims.py` guarantees, and this script must too:

1. A fresh clone can answer "which upstream commit produced this data" by
   reading the lockfile alone — no vendor directory required, since vendor
   is gitignored.
2. `--check` can detect both "upstream moved" (commit drift) and "someone
   hand-edited the vendored file" (sha256 drift) without a network call for
   the sha256 half.

`CURRENT_PHASE`-style content-derived metadata does not apply here — nothing
in AtlasLoot's data format carries an equivalent "what tier is current"
signal. Skip that part of the pattern; it is specific to wowsims.

---

## 3. Parse approach

### 3.1 No Lua VM

Confirmed by the spike (§4): the loot lists are simple positional literals —
`{ slotPosition, itemID }` pairs, with `-- Item Name` line comments, nested
under boss tables keyed by NPC ID, nested under a per-instance table. This is
regular enough for a line-oriented parser: find instance table openings, find
boss sub-tables and their NPC ID key, find loot-list lines matching `{ N,
itemID }` inside them. No arithmetic, no variables, no function calls to
evaluate — a real Lua interpreter would be solving a problem this data
doesn't have.

**Before writing the parser, read a real slice of the file** and confirm the
line shape holds for at least one full instance table, including where
`[NORMAL_DIFF]` and `[HEROIC_DIFF]` differficulty keys sit relative to the
boss's NPC ID key, since raids don't have heroic but dungeons do — this
parser is being pointed only at `data-tbc.lua`, which the spike says
contains both dungeon and raid instances in one file, so the parser must
either skip dungeon tables or the sub-phase must decide it's fine to parse
them too (see section 3.4).

Use Python (`re` + manual line scanning), matching the rest of `scripts/`
(all `.py`, per `scripts/generate_pool.py`, `scripts/curate_ret_pool.py`,
`scripts/sync_wowsims.py`). New file: `scripts/parse_atlasloot.py`.

### 3.2 Output schema

Output: `data/atlasloot_sources.json`, a dict from item ID (string key, to
match `db.json`'s own JSON key convention — verify against
`vendor/wowsims/db.json`'s `items` array, which uses integer `id` fields
inside array entries, not a keyed dict; choose whichever the consumer
(section 3.3) finds more natural, but state the choice in the file rather
than leaving it implicit) to a list of `ItemSource` records.

`ItemSource` is the type already defined in PLAN.md §8.3.2:

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

AtlasLoot's `data-tbc.lua` boss loot lists only ever produce two of these
eight kinds directly:

- **`kind: 'raid'`** for a raid instance boss drop.
- **`kind: 'heroic'`** for a dungeon instance boss drop, if dungeon tables
  are parsed too (section 3.4) — though PLAN.md's `heroic` variant carries
  `dungeon: string`, not `zone`/`boss`, so the parser must map AtlasLoot's
  dungeon-instance name to the `dungeon` field, not `zone`.

AtlasLoot's other addon modules (badge vendors, crafting, reputation — not
inspected in this sub-phase, see section 6) could in principle produce
`badge`, `crafted`, or `rep` records, but this plan scopes the parser to
`data-tbc.lua`'s boss loot lists only. Do not attempt to also parse a badge-
vendor or reputation-vendor data file in this sub-phase; that is new scope
requiring its own file identification and format check, and the parent plan
already assigns badge-vendor policy to sub-phase 0 (decisions) and crafted /
rep two-hop handling to sub-phase 2.

Example output shape:

```json
{
  "28825": [
    { "kind": "raid", "zone": "Karazhan", "boss": "Prince Malchezaar" }
  ]
}
```

An item can legitimately have more than one source (drops from two different
bosses, or a boss on two difficulties that both count as the same zone) — the
list, not a single record, is the unit. De-duplicate identical
`{kind, zone, boss}` tuples produced by, for example, a boss appearing on
both `[NORMAL_DIFF]` and `[HEROIC_DIFF]` keys within the same raid instance
(TBC 25-man raids from this era do not have heroic raid difficulty, but the
parser should not assume that — assert it instead, and fail loudly if a
raid-instance table in `data-tbc.lua` has a heroic key, rather than silently
double-counting or silently dropping one).

### 3.3 Boss NPC ID → boss name → zone

AtlasLoot keys bosses by NPC ID under a per-instance table (spike §4: `data[
"HellfireRamparts"]`, keyed sub-tables per boss). Two different lookups are
needed to turn that into an `ItemSource`:

1. **NPC ID → boss name.** `db.json`'s `npcs` array already has this:
   `{"id": 9019, "name": "Emperor Dagran Thaurissan", "zoneId": 1584}` (shape
   confirmed by reading `vendor/wowsims/db.json` directly). Build a dict
   `npcs_by_id = {n["id"]: n["name"] for n in db["npcs"]}`, same as
   `scripts/generate_pool.py`'s existing `npcs_by_id` (see
   `map_source()` in that file — this sub-phase's parser should reuse that
   exact lookup pattern, not invent a new one).

2. **Instance table name → zone name.** AtlasLoot's per-instance table key
   (a Lua-identifier-style string like `"HellfireRamparts"` or
   `"Karazhan"`) does not match `db.json`'s `zones[].name` field
   character-for-character in general (spacing, apostrophes, capitalization
   may differ — e.g. AtlasLoot's key style versus `db.json`'s `"Gruul's
   Lair"`). Do not assume string equality resolves this. Instead:
   - Prefer resolving zone from the **NPC's own `zoneId`** in `db.json`'s
     `npcs` array (each npc already carries `zoneId`), then look up
     `zones_by_id[zoneId]` for the canonical name — this sidesteps needing
     to match AtlasLoot's instance-table naming at all, for any boss whose
     NPC ID is present in `db.json`.
   - Only fall back to matching AtlasLoot's instance-table name against
     `zones[].name` (with a small hand-written alias table for known
     mismatches) for NPC IDs that are **not** in `db.json`'s `npcs` array —
     which will happen, since AtlasLoot covers dungeons and world bosses
     `db.json` may not track NPCs for.
   - Record, in the parse report (section 4), how many bosses were resolved
     each way, so a reviewer can see how much the fallback path is doing.

This order matters: resolving zone from the NPC's own `zoneId` is more
reliable than trusting AtlasLoot's own instance-table naming, because it
reuses a mapping this codebase already trusts (`scripts/generate_pool.py`
already does exactly this for `db.json`'s native `sources[].drop`).

### 3.4 Dungeons in `data-tbc.lua`

The spike (§4) says `data-tbc.lua` covers "TBC dungeons and raids" in one
file. Decide explicitly, before writing the parser, whether dungeon tables
are parsed in this pass:

- **Recommendation: parse both**, tagging dungeon-instance bosses as `kind:
  'heroic'` only if difficulty metadata says heroic, otherwise treat a
  normal-dungeon drop as out of scope for the raid-scoped pool (PLAN.md's
  `heroic` kind is specifically about heroic dungeon drops, which matter for
  badge-adjacent gearing — normal-mode dungeon drops mostly don't clear the
  raid-scoped pool's quality/relevance bar and can be dropped at parse time
  or kept and filtered downstream; either is fine, but state the choice in
  the parser's own comments).
- Do not spend sub-phase-1 effort building dungeon-specific zone/badge logic
  beyond tagging — that is sub-phase 0's badge-vendor decision and sub-phase
  4's universe assembly, not this sub-phase's job.

---

## 4. Gap measurement — the exit criterion

The parent plan states the number that matters is **673 ret-eligible items
at phase ≥ 2 with no `sources[]` in `db.json`**. This section specifies the
exact command to measure how many of those 673 the AtlasLoot parse resolves.
Do not guess the number before running it.

### 4.1 Reproduce the 673 baseline first

Before measuring what AtlasLoot closes, confirm the 673 figure against the
currently pinned `db.json` (`vendor/wowsims/db.json`, pinned at
`v0.0.101` per `data/wowsims.lock.json` — re-sync first if it's stale: `python
scripts/sync_wowsims.py --check`). Reuse `ret_equippable()` from
`scripts/generate_pool.py` rather than re-deriving eligibility rules by hand
— that function is the one piece of code in this repo that already encodes
D7 (plate/leather/mail, libram-only ranged, two-handed non-polearm/staff
weapon, Kael'thas exclusion). Import it directly rather than copying its
logic, so a future change to eligibility rules doesn't silently desync the
two measurements.

```python
import json, sys
sys.path.insert(0, "scripts")
from generate_pool import ret_equippable

db = json.load(open("vendor/wowsims/db.json"))
gap = [
    it for it in db["items"]
    if ret_equippable(it)
    and (it.get("phase") or 0) >= 2
    and not it.get("sources")
]
print(len(gap), "items")
```

Run this and confirm the count matches 673 (or record the delta and why, if
`db.json` has moved since the spike's measurement — `data/wowsims.lock.json`
records the exact pin, so a mismatch means either the pin changed or the
spike's own number needs re-verification, not that this sub-phase's method is
wrong).

### 4.2 Measure closure

For each item in that 673-item gap list, check whether
`data/atlasloot_sources.json` (section 3.2) has a non-empty entry for its
item ID:

```python
import json, sys
sys.path.insert(0, "scripts")
from generate_pool import ret_equippable

db = json.load(open("vendor/wowsims/db.json"))
gap = [
    it for it in db["items"]
    if ret_equippable(it)
    and (it.get("phase") or 0) >= 2
    and not it.get("sources")
]
atlas = json.load(open("data/atlasloot_sources.json"))

resolved = [it for it in gap if str(it["id"]) in atlas and atlas[str(it["id"])]]
unresolved = [it for it in gap if str(it["id"]) not in atlas or not atlas[str(it["id"])]]

print(f"{len(resolved)}/{len(gap)} resolved by AtlasLoot")
print(f"{len(unresolved)} remain unresolved")
for it in unresolved[:30]:
    print(it["id"], it.get("name"), "phase", it.get("phase"))
```

Save this as `scripts/measure_atlasloot_gap.py` (or a `.scratch/` one-off if
it's not meant to be a permanent script — builder's call, but if it becomes
part of the sub-phase's "Exit" deliverable per the parent plan, it should be
committed and re-runnable, not a throwaway).

**This resolved/unresolved count, run against the actual parse output, is
the exit criterion for this sub-phase.** No number is asserted in this plan
because the parse has not been written yet.

### 4.3 What "resolved" should mean, precisely

A gap item counts as resolved only if the parser produced a well-formed
`ItemSource` record for it (section 3.2) — not merely "AtlasLoot's raw Lua
mentions this item ID somewhere." An item ID appearing in `data-tbc.lua` but
failing to resolve to a zone (because both the NPC-ID and instance-name
lookups in section 3.3 failed) should be counted as **unresolved** and
logged separately from "item ID not found in AtlasLoot at all" — these are
two different failure modes with two different fixes (one is upstream data
this repo doesn't have; the other is a lookup bug in this repo's parser).

---

## 5. What this will not solve

State this explicitly rather than let sub-phase 2 discover it by surprise.

**Tier sets have no token-to-piece link in AtlasLoot.** Confirmed by the
spike (§4): AtlasLoot stores tier sets as flat `{slotPosition, itemID}`
lists of the actual armor piece IDs, the same shape as any other boss loot
list. It does not encode which vendor token redeems for which piece. All 18
ret tier pieces across setIds 626 (T4), 629 (T5), and 680 (T6) currently have
`sources: null` in `db.json` — verified by the parent plan (section 4) — and
parsing AtlasLoot's `data-tbc.lua` will not change that, because the token
redemption relationship simply isn't in this data source at all, in any
form.

**Concretely:** if AtlasLoot's raid loot list for, say, Illidan's boss table
includes a "Vanquisher" token item ID, and the actual Redemption-line
Retribution armor piece it redeems for is a *different* item ID, the parser
in this sub-phase will (at best) resolve the *token's* item ID to a zone —
which is not the same as resolving the *armor piece's* item ID to a zone.
Whether AtlasLoot's boss loot lists even list the token IDs, the armor piece
IDs, or both, is not established by this plan and should be checked when the
parser is written, but either way the token→piece link itself is absent from
this data source.

This is handed to sub-phase 2 (`.scratch/handoffs/subplans/02-two-hop.md`)
as-is: a hand-built mapping of 3 tier sets × 6 pieces = 18 total records,
verified against Wowhead, is still required regardless of what this
sub-phase produces. Sub-phase 1's parse output can be used by sub-phase 2 to
resolve the **token's own zone** (which boss drops the Vanquisher token,
say) — that part is exactly this sub-phase's `raid`/`kind` output — but the
"token X redeems for piece Y" edge is not derivable from AtlasLoot and must
be hand-entered.

**Also out of scope for this sub-phase, restated from section 3.2:** badge
vendors, reputation vendors, crafted items from raid-dropped recipes, and
PvP gear. AtlasLoot likely has data files for some of these (spike §4
mentions a separate "Crafting module," not inspected), but parsing them is
new scope with its own format-verification step, not covered by pinning and
parsing `data-tbc.lua`. If a later sub-phase wants one of these, it should
get its own short plan, following this one as a template for the pin/parse
mechanics but re-verifying the file's actual structure — do not assume
another AtlasLoot data file has the same shape as `data-tbc.lua` without
looking.

---

## 6. Risks

**Licence.** AtlasLootClassic is GPL-2.0. This plan proposes committing
**parsed output** (`data/atlasloot_sources.json`) derived from that data,
not the Lua source itself (the Lua source stays in the gitignored
`vendor/atlasloot/` directory, matching the wowsims pattern where the vendor
files are gitignored and only parsed output is committed). Whether a
derived, mechanically-extracted item-ID-to-zone mapping counts as a
"derivative work" under GPL-2.0 in a way that obligates this repo (which is
not stated anywhere in this plan to be under GPL-2.0 itself, or open source
at all) is a legal question this plan does not answer. **This needs a
decision from the repo owner before the parsed output is committed** —
either confirm the repo's own licence is compatible, or treat the parsed
output as a build artifact regenerated locally and not committed (in which
case every consumer must run the sync+parse step themselves, which changes
the "build failure on missing source" story in PLAN.md §8.3.2). Flag this
loudly; do not default to "probably fine."

**Upstream format drift.** `data-tbc.lua`'s structure (spike §4: positional
`{slotPosition, itemID}` literals under NPC-ID-keyed boss tables under
per-instance tables) is not documented anywhere upstream as a stable API —
it's an addon's internal data file. A future upstream commit could
reformat it (different key names, added fields, restructured nesting)
without warning. The pinning mechanism (section 2) protects against silent
drift — `--check` will catch a commit change — but does not protect against
the *parser* breaking when someone deliberately re-pins to a newer commit.
Whoever re-pins should re-run the parser and check its own sanity output
(section 4.2's resolved/unresolved counts) before trusting the new pin, the
same discipline `sync_wowsims.py --update` already expects for
`CURRENT_PHASE` changes.

**Item IDs in AtlasLoot but not in the pinned `db.json`.** AtlasLoot and
wowsims' `db.json` are independent projects, pinned independently, and
nothing guarantees their item ID sets fully overlap. A parsed
`ItemSource` record for an item ID that doesn't exist in `db.json` at all is
useless to this repo — `db.json` is the only source of stats, and an item
with no stats can't be simmed regardless of whether its source is known.
The parser (or the gap-measurement script in section 4.2) should report how
many resolved item IDs have no matching entry in `db.json["items"]`, so this
is visible rather than silently discarded. Expect this population to be
small — both projects track the same live TBC Classic item set — but it is
not measured by this plan and should not be assumed to be zero.

**NPC ID collisions across `db.json` and AtlasLoot.** Section 3.3's
NPC-ID-first zone resolution assumes an NPC ID means the same creature in
both data sources. This is very likely true (NPC IDs are a Blizzard-assigned
global namespace, not per-addon), but has not been spot-checked in this
plan. Whoever writes the parser should spot-check a handful of resolved
bosses by name (does `npcs_by_id[9019]` say "Emperor Dagran Thaurissan" and
does AtlasLoot's own `-- Item Name` comment context agree this is the right
boss) before trusting the bulk resolution.

---

## 7. Exit criterion, restated

This sub-phase is done when:

1. `data/atlasloot.lock.json` exists, pinning a specific AtlasLoot commit,
   following the pattern in section 2.
2. `data/atlasloot_sources.json` exists, generated by
   `scripts/parse_atlasloot.py` from the vendored `data-tbc.lua`, in the
   schema from section 3.2.
3. The command in section 4.2 has been run against the real parse output,
   and its resolved/unresolved counts are written down (not guessed) in a
   handoff document for sub-phase 2 and sub-phase 4 to read.
4. Section 5's "will not solve" statement about tier tokens is confirmed
   still true against the actual parse output (i.e., check that none of the
   18 ret tier piece item IDs got a real zone out of this parse — if one
   did, section 5 is wrong and should be corrected, not silently left
   stale).
5. The licence question in section 6 has been raised with the repo owner,
   not silently resolved either way.
