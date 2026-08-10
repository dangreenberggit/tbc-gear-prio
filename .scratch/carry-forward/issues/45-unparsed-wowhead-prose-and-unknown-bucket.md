Status: open
Progress: sections 1 and 3 closed 2026-08-06; section 2 (feral pre-raid list) deliberately deferred, needs a hand-transcribed Wowhead fetch out of scope for this worker
Type: task
Origin: pre-merge review of `phase-2/feral` (adversarial A2, domain, standards), 2026-08-06
Blocks: none
Blocked by: none

# 87 Wowhead rows still parse to nothing, and `unknown` shows up as a group

Two leftovers from the review of `phase-2/feral`. Both are narrower than they
were — that branch taught `parse_wowhead_source` the badge-vendor,
reputation-vendor and quest-with-zone shapes, taking feral p1-p2 from 18
unparsed rows to 7 and p3 from 20 to 2 — but neither is closed.

## 1. The remaining unparsed prose

```bash
python -c "
import json,glob,sys; sys.path.insert(0,'scripts')
from assemble_universe import parse_wowhead_source as p
for f in sorted(glob.glob('data/wowhead-lists/*/*.json')):
    d=json.load(open(f))
    u=sum(1 for e in d['entries'] if not p(e['wowheadSourceText']))
    print(f'{f}: {u} of {len(d[\"entries\"])}')
"
# 87 of 627 across all seven lists; ret/pre-raid.json is the worst at 26 of 72.
```

The shapes still dropped are zone-less quests ("Quest: Colossal Menace"), world
drops ("Random World Drop", "World Drop - Azeroth"), and free-text zone drops
("Zone Drop - Karazhan Trash Mobs", "Drop: Chess Event - Karazhan").

There is a `{kind: "world"}` variant that nothing currently emits — the world
drop rows are the obvious candidate. Zone-less quests have no variant at all;
adding `quest` would need the same union/JSON/codegen round trip `unknown`
took.

**Why it is not urgent:** unparsed prose no longer produces a *wrong* source,
only an absent one, and `pool-hardening.test.ts` now asserts an item on a
Wowhead list never ships as `unknown`. The cost is lost provenance in the UI,
not a wrong shortlist.

## 2. Feral has no pre-raid list

Ret pairs its stage files with `data/wowhead-lists/ret/pre-raid.json` (72
rows); feral has none, and its `p1-p2.json` is transcribed from the *phase-2*
guide. So feral's phase-1 non-raid gear is thinner than ret's — the pre-raid
guide is where a lot of the badge, quest and reputation items for that tier are
named. Raised by the domain axis of the `phase-2/feral` review as an unverified
gap rather than a defect.

Collecting `data/wowhead-lists/feral/pre-raid.json` from
<https://www.wowhead.com/tbc/guide/classes/druid/feral/dps-bis-gear-pve-pre-raid>
would close it. Note `WOWHEAD_STAGE_FOR_MAX_PHASE` does not currently reference
a `pre-raid` stage for any spec, so wiring it in is part of the job.

## 3. `unknown` is a visible group

`zoneKeyOf` (`packages/core/src/view.ts:109`) falls through to
`item.source.kind`, so `--group-by raid` now renders a literal `unknown`
bucket. It is honest but ugly, and it is the same fall-through ticket 35
describes for arbitrary zones.

## Done when

- Every collected row either parses to a source or is listed here as a shape
  we deliberately do not model.
- Grouped output does not show a raw `kind` string as though it were a zone.

## Progress 2026-08-06

Sections 1 and 3 done. **Section 2 (feral pre-raid list) deliberately
deferred** — it needs fetching and hand-transcribing a Wowhead guide page
(<https://www.wowhead.com/tbc/guide/classes/druid/feral/dps-bis-gear-pve-pre-raid>),
which is out of scope for this worker. Left `Status: open` for that reason;
re-run the count in this ticket's §1 command and the `wowsims_curated_item_ids`
comparison in ticket 41 once that list exists, since ticket 41 already showed
collecting a feral list does not by itself move membership numbers.

### §1 — unparsed prose

Confirmed the ticket's own diagnosis: `{kind: "world"}` was the unused variant,
and "World Drop" was the actionable shape among the three named (zone-less
quests and free-text "Zone Drop"/trash-mob prose were named but not called
"obvious", and stay unmodeled — adding a `quest` variant is the same
union/JSON/codegen round trip flagged in the ticket, and the free-text zone
shapes are the kind of guide-prose-chasing ticket 41 explicitly warns against).

Added `WORLD_DROP_RE` (`scripts/assemble_universe.py`) matching "world drop"
case-insensitively against the four phrasings actually collected ("Drop: World
Drop", "Random World Drop (Bind on Equip)", "World Drop - Azeroth", "World
Drop -The Outland"), wired into `parse_wowhead_source` as a fallback when
`DROP_RE`/`QUEST_ZONE_RE` find no parenthetical zone. Emits `{"kind":
"world"}` — the existing zero-field variant in `pool.ts`, not a new one.

Measured before/after:

```bash
python -c "
import json,glob,sys; sys.path.insert(0,'scripts')
from assemble_universe import parse_wowhead_source as p
total=0; unparsed=0
for f in sorted(glob.glob('data/wowhead-lists/*/*.json')):
    d=json.load(open(f))
    u=sum(1 for e in d['entries'] if not p(e['wowheadSourceText']))
    total+=len(d['entries']); unparsed+=u
print(unparsed, 'of', total)
"
# before: 87 of 627
# after:  72 of 627
```

Adding the regex alone produced provenance but not membership: `world` was not
in `is_list_only_source` (`badge`/`pvp`/`crafted`/`rep` only), so an item whose
sole Wowhead source was a world drop still had `source_acc` non-empty but never
tripped `list_only` in the membership gate — same shape as the crafted-recipe
gap ticket 41 diagnosed for `wowsims_curated_item_ids`. Added `"world"` to
`is_list_only_source`'s tuple (same doc comment, same reasoning: no raid zone,
list-driven membership).

Regenerated all six committed universes
(`python scripts/assemble_universe.py --spec <spec> --max-phase <n> --report
data/universes/<spec>-p<n>.report.json`). The diff is purely additive — no row
removed or modified in any `.json`, confirmed with `git diff data/universes/*.json
| grep '^-' | grep -v '^---'` returning nothing — plus the corresponding
`wowheadRecall`/`listOnlyMembership`/`perSlot` counts moving up in the
`.report.json` sidecars. ret-p2 gained 23203 Libram of Fervor (ranged);
ret-p3/p4/p5 also gained 31275 Necklace of Trophies; feral-p2/p3 gained three
items each. Two pinned universe-size assertions needed updating to match:
`packages/core/test/pool.test.ts` (235 → 236, ret-p2) and
`packages/core/test/pool-hardening.test.ts` (359 → 361, ret-p3), each with a
changelog comment naming the cause, following the existing convention in both
files.

### §3 — `unknown` as a visible group

`zoneKeyOf` (`packages/core/src/view.ts`) fell through to `item.source.kind`
verbatim for any zone-less source. Added a `ZONELESS_SOURCE_LABELS` lookup
covering all six zone-less `ItemSource` kinds (`badge`, `crafted`, `rep`,
`pvp`, `world`, `unknown`) rather than special-casing only `unknown`, since the
same fall-through affected all of them identically. `zoneKeyOf` now looks the
kind up in that table (falling back to the raw kind only for a future variant
that has neither a `zone` nor a label — a defensive default, not an expected
path).

TDD: added a RED test in `packages/core/test/view.test.ts`
("labels a zone-less source with a readable bucket, not the raw kind string
(ticket 45 §3)") asserting `groupBy: "raid"` on an `{kind: "unknown"}` item
produces the bucket key `"Source not recorded"`, confirmed failing against the
pre-fix tree (`expected [ 'unknown' ] to deeply equal [ 'Source not
recorded' ]`), then made it pass.

This is distinct from ticket 35 (`groupBy: 'raid'` picking an arbitrary zone
for a *multi*-zone item) — that ticket's fix is a still-open product decision
about display when an item spans two real zones; this ticket only concerns
items with *no* zone at all, which is unaffected by that decision either way.

### Verified

`pnpm verify` green (Node 22.16.0) after both fixes and the two pinned-count
updates: typecheck, lint, format, `vitest run` (381 passed / 2 skipped / 2
todo), `skeleton:check`, `mirrors:check`.
