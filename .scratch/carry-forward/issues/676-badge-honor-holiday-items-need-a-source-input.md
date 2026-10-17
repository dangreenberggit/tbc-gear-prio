Status: open
Type: task
Origin: stage tab-source-labels (deferred part P3), branch feat/tab-source-labels
Blocks: none
Blocked by: none
Serves: .scratch/plans/upgrades-tab-finish-line.md, Tab-adjacent follow-on (source labels)
Related: 643, 660, 293, 45, 173

# Badge, honor and holiday items need an input that names their source

Filed 2026-10-16: 643, 660 (part 1) and 45 (§2) carry `Blocked by: 676`;
293 points here. Their bodies are not copied; this ticket is the work plan
they share. Ticket 660 part 2 (the Mug's stats) is ticket 677.

## Owner's words (verbatim, handoff `.scratch/handoffs/upgrades-tab-source-labels-HANDOFF.md` § Owner rulings)

- 2026-10-16T04:07Z (tab-blocking-finish decision-log:79): "If it's a certain factual fix then of course."
- Empty Mug of Direbrew, 2026-10-15T21:21Z: ""Empty Mug of Direbrew now tops most trinket lists" this is fine."

## What the player sees

Idol of Terror (33509), Staff of the Forest Lord (34898), the Frost Lord's
War Cloak (278819, Ahune) and every other row the db-phase route admits
show "Source not recorded" (ticket 643, 660 part 1). At p5 that is 223
(warlock) to 403 (warrior) rows per spec, 29-34% of each list
(2026-10-16; command in the handoff § The tickets).

## Why it is deferred

~~No committed or vendored input names these sources~~ (corrected by the
pre-merge review of feat/tab-source-labels, finding P1, 2026-10-16: false
for some rows; see § Review correction below) (measured 2026-10-16,
stage tab-source-labels planning): `vendor/wowsims/db.json` `sources[]` has
only `drop`, `crafted`, `rep`; `assets/db_inputs/atlasloot_db.json` only
`drop`, `crafted`; `data/atlasloot_sources.json` only `raid`, `heroic`,
`rep`; `data/two-hop/*` only tokens and recipes. The only badge costs in
the repo are the Wowhead prose in `data/wowhead-lists/{ret,feral}/*.json`
~~(4 ids)~~ (8 Badge of Justice item ids, 7 of them with a cost, and 20
with honour or arena text; corrected by the same review). Most of the work
is data collection, not a code fix.

## Goal

Scope since stage tab-follow-ups P1 (2026-10-17): only the rows still
`kind: unknown` after the cross-spec list sources that P1 added; the current
Goal, Done when, Seam contract and Candidates are in § Remainder after stage
tab-follow-ups (part P4, deferred) below, which replaces the older sections
where they differ.

A committed input, regenerated into `data/universes/*` and the fork copies,
from which the badge-vendor, honor, PvP-vendor and holiday-boss items still
`unknown` after P1 get a source kind a player can read, with a `holiday` kind (or an agreed
alternative) added to `packages/core/src/item-source-kinds.json`, fork
`model/engine/pool.ts`, `SOURCE_LABELS`, the locale and the schema.

## Decide first (one owner question, if any)

Ticket 293's route is a per-spec Wowhead harvest, up to 45 hand-copied
files with `wowheadSourceText` verbatim. A smaller route is one table of
badge-vendor and PvP-vendor items (a few hundred ids from the Badge of
Justice and honor vendors) plus a holiday-boss list (Ahune, Coren
Direbrew, Headless Horseman). Measure what each closes (count of unknown
rows each would remove, per spec) before asking; ask only if the owner's
preference is not derivable.

## Seam contract

- From P1: `sourceDetail` in fork `utils/format.ts` prints a new kind only
  after a rule is added for it; `SOURCE_LABELS` is in a ported engine file
  (PROVENANCE cycle in `docs/agents/known-traps.md:70-94`).
- From P2: the builder writes db/AtlasLoot drops for the force-included
  items; the db-phase route at `scripts/assemble_universe.py:2380` still
  writes `unknown` for everything else. 31033 Libram of Righteous Power
  and 31856 Darkmoon Card: Crusade still ship
  `{"kind": "unknown", "origin": "curated"}` in ret; their only source is
  the prose in `TICKET_157_FORCE_INCLUDE` ("Quest: News of Victory",
  "Quest: Darkmoon Blessings Deck (BoE trinket)"). A quest/vendor source
  input or kind from this ticket closes them; the membership grant stays
  in `ticket_157_included`. The validation guard accepts any zone name in
  db.json's `zones` table for `raid` and `heroic`, so a source naming a
  real five-man zone passes without another guard change.

## Done when

- Every row in the ticket 643 and 660 lists carries a non-`unknown` source
  from a cited input; 281739 Empty Mug of Direbrew's label follows the same
  rule (its rank is ruled fine; its label was not ruled on).
- The 293 count is re-measured and recorded.
- `pnpm verify` green; fork re-pinned; `pnpm tab-fixtures:smoke` shows the
  new labels on `feral-p5-th4pc`.

## Review correction 2026-10-16 (pre-merge review feat/tab-source-labels, P1)

The premise "no committed input names these sources" is false for some
rows. A committed `data/wowhead-lists/*/*.json` file names their source,
but only ret and feral have lists, and each universe reads only its own
spec's list (`wowhead_lists_for_phase`, `scripts/assemble_universe.py`).
So 33296 Brooch of Deftness is `badge` cost 25 (origin `wowhead`) in
ret-p5 but `unknown` (origin `db`) in warrior-p5, balance-p5 and
feral-p5; 33880 is `pvp` honour in feral-p5 and `unknown` in balance-p5;
33910 is `pvp` honour in ret-p5 and `unknown` in warrior-p5.

Measured at feat/tab-source-labels 9af4fae8: p5 rows whose first source is
`unknown`, and how many of those item ids any Wowhead list names:

| p5 universe | unknown-first rows | named in a Wowhead list |
| ----------- | -----------------: | ----------------------: |
| balance     |                328 |                      27 |
| ele         |                370 |                      12 |
| enh         |                379 |                      14 |
| feral       |                318 |                       8 |
| hunter      |                323 |                      11 |
| mage        |                224 |                       8 |
| ret         |                375 |                      10 |
| rogue       |                290 |                      13 |
| shadow      |                248 |                       8 |
| warlock     |                223 |                       8 |
| warrior     |                403 |                      15 |
| total       |               3481 |                     134 |

Re-run from the repo root:

```
python -I -c "import glob,json,os;L={e['itemId'] for p in glob.glob('data/wowhead-lists/**/*.json',recursive=True) for e in json.load(open(p,encoding='utf-8'))['entries']};[print(os.path.basename(p),len(u),sum(e['itemId'] in L for e in u)) for p in sorted(glob.glob('data/universes/*-p5.json')) if not p.endswith('.report.json') for u in [[e for e in json.load(open(p,encoding='utf-8'))['entries'] if e['sources'][0]['kind']=='unknown']]]"
```

Of the 134, the list text is Badge of Justice for 51 rows, honour or arena
for 15, and a drop, quest or world drop for 68 (classified by the list's
`wowheadSourceText`). 12 of the 134 are named by the universe's own spec's
list and are still `unknown` (ret 10, feral 2); why the builder does not
read those rows is a hypothesis, untested (the stage files read for p5, or
text `parse_wowhead_source` cannot read).

The 8 / 7 / 20 counts in § Why it is deferred, the 51 / 15 / 68 split and
the 12 own-spec rows come from this script, saved to a file and run from
the repo root with `python -I <file>.py` (2026-10-16, `tbc-gear-prio@ed8beb00`:
`badge ids 8 with a cost 7 honour/arena ids 20` and
`{'badge': 51, 'pvp': 15, 'other': 68} own-spec {'feral': 2, 'ret': 10}`;
pre-merge review feat/tab-source-labels, R2). Badge means the list text
matches `badges? of justice`; honour or arena means it contains `honor` or
`arena`; "with a cost" means the badge text holds a digit.

```python
import glob, json, os, re
L, T = {}, {}
for p in glob.glob('data/wowhead-lists/**/*.json', recursive=True):
    spec = os.path.normpath(p).split(os.sep)[2]
    for e in json.load(open(p, encoding='utf-8'))['entries']:
        L.setdefault(e['itemId'], set()).add(spec)
        T.setdefault(e['itemId'], set()).add(e.get('correctedSourceText') or e.get('wowheadSourceText') or '')
boj = lambda t: re.search('badges? of justice', t.lower())
badge = {i for i, ts in T.items() if any(boj(t) for t in ts)}
cost = {i for i in badge if any(boj(t) and re.search(r'\d', t) for t in T[i])}
pvp = {i for i, ts in T.items() if any('honor' in t.lower() or 'arena' in t.lower() for t in ts)}
print('badge ids', len(badge), 'with a cost', len(cost), 'honour/arena ids', len(pvp))
cls, own = {'badge': 0, 'pvp': 0, 'other': 0}, {}
for p in sorted(glob.glob('data/universes/*-p5.json')):
    if p.endswith('.report.json'): continue
    spec = os.path.basename(p).split('-')[0]
    for e in json.load(open(p, encoding='utf-8-sig'))['entries']:
        if e['sources'][0]['kind'] != 'unknown' or e['itemId'] not in L: continue
        ts = ' '.join(T[e['itemId']]).lower()
        cls['badge' if boj(ts) else 'pvp' if 'honor' in ts or 'arena' in ts else 'other'] += 1
        if spec in L[e['itemId']]: own[spec] = own.get(spec, 0) + 1
print(cls, 'own-spec', own)
```

So the Wowhead lists close at most 134 of 3481 unknown p5 rows (about 4%).
The rest of this ticket's data collection stands.

**Remaining work this review adds:** apply a Wowhead-list source to an item
whichever spec's list names it (the builder change in
`scripts/assemble_universe.py`), then regenerate `data/universes/*` and the
fork copies, and re-measure the table above.

## Remainder after stage tab-follow-ups (part P4, deferred)

Appended 2026-10-17 from the stage's deferred part P4 draft
(`.scratch/stage-gate/tab-follow-ups/parts/P4/ticket.md`, gitignored). It is
placed before § Q-676-source measured so that section stays last for its
candidate C subsection (stage plan step 26).

### Owner ruling 2026-10-17: no second source of truth

The owner said in chat on 2026-10-17, about the measured candidate C
(vendoring the two AtlasLoot modules): "we should be especially careful not
to put lots of effort into building a second source of truth, which is
already generally a bad idea unless there is a specific reason it is very
necessary and *also* isn't an actual second source of truth on a specific
thing (for example, missing items that for some reason are needed is one
thing--items that are on wowsims already with the info needed and then
"atlasloot has different IDs" is immediately suspicious)"

What this means for the next planner:

- Before any new input is added, first measure what wowsims already says
  about these items: the `vendor/wowsims/db.json` fields, and the upstream UI,
  such as the PvP block of `ItemSource`
  (`vendor/tbc-new-fork/ui/features/gear/components/SelectorModal/ItemSource.tsx`),
  which already renders some PvP sources.
- The holiday items' ids do not match AtlasLoot's (upstream re-issued them, as
  281739 and similar). That is a sign that AtlasLoot is the wrong source for
  them, not a reason to build a name join.
- Candidate C stays recorded below as measured. It is not a chosen route.

### The owner's words it serves

"use orchestration to make sure the follow up tickets are knocked out."
(owner, 2026-10-17; brief § Goal). Constraint from the same brief: "a fix that
tweaks a guess instead of using the direct signal 'isnt a solution'" (owner,
2026-10-17; brief § Constraints). Item data stays borrowed: "Fork items come
from wowsims (ADR-0029); never re-mirror or grow our own item data" (brief
§ Constraints).

### Goal

A committed input, inside the item and source data the project already
borrows, that names the badge-vendor, honour-vendor and holiday-boss source of
every badge, honour and holiday item still `kind: unknown` after P1 (about
3,400 p5 rows across the 11 specs; the exact per-spec count is in ticket 676
§ Q-676-source measured, written by P1 step 4). The tab's Source cell then
states where each such item comes from. Closes 643, 660 part 1 and 45 §2 when
done (finish-line plan).

### Done when

- A chosen candidate (below) is vendored or written through the
  `data-pipeline-work` skill (pin, parser, regen); `pnpm universe:assemble` per
  spec and phase regenerates the universes and `universe-rebuild:check` stays
  green.
- Any new kind (`holiday`) is added together in
  `packages/core/src/item-source-kinds.json`, fork `model/engine/pool.ts`
  (ported file: PROVENANCE cycle, `docs/agents/known-traps.md:70-94`),
  `SOURCE_LABELS` and the locale.
- Every row of `data/wowhead-list-gaps.json` this work sources or admits is
  deleted from the file, or `wowhead-list-gaps:check` fails `STALE GAP`; a new
  cause gets a new key in the file's `reasons` block.
- The 12 own-spec rows (ticket 676 § Q-676-source measured, cause C16 of the
  stage plan) are each sourced, admitted in the gap file with a reason, or
  left with a written owner question: whether to read `ret/pre-raid.json` at
  p5 (policy, up to 26 rows); quest text with no zone (30257, 31033, 28176);
  the `unkept_wowhead_place` drops (23206 Naxxramas, 32387 heroic Sethekk
  Halls, 31856 "Bind on Equip").
- The 19 raid rows candidate A would name cross-spec get a witness that
  satisfies `packages/core/test/pool-hardening.test.ts:1373-1440`, or stay
  `unknown` with that reason written.
- No new synchronous vitest case over 30 s; an oracle-style case over the
  fixtures yields per job with `yieldToEventLoop` in
  `packages/core/test/fork-meta-repair.test.ts` (P3).
- `pnpm verify` green; the wowsims-file audit lists only
  `ui/app/SimTabsSection.tsx`.

### Seam contract (what the planned parts give it and assume)

- From P1: the cross-spec index function in `scripts/assemble_universe.py`
  (badge/pvp/world only; one source per kind, priced badge beats cost 0) and
  its helper `add_unknown_or_cross_spec`, used at the three `unknown` writes
  (curated bis, curated force-include, db-phase); a new input plugs in there. The measured
  table in ticket 676 § Q-676-source measured: per-spec counts for candidates
  A, B1, B2 and the causes of the 12 own-spec rows. P1 assumes P4 adds its
  input through `data-pipeline-work` and adds any `holiday` kind in the four
  places above together.
- From P2: `data/wowhead-list-gaps.json` and the two check scripts
  `scripts/check_universe_rebuild.py`, `scripts/check_wowhead_list_gaps.py`.
  P2 assumes P4 regenerates through `pnpm universe:assemble` and edits neither
  script to pass.
- From P3: nothing it reads; the `yieldToEventLoop` helper and the 30 s rule
  above.

### Candidates (Q-676-source beyond candidate A)

P1 records candidates A (cross-spec Wowhead lists, 59 badge/pvp/world rows of
3,481 at p5), B1 (other db.json source keys, 0 rows) and B2 (vendored
AtlasLoot tables, 0 rows) with counts. The remainder needs one of:

- **C: vendor two more AtlasLoot modules** — `AtlasLootClassic_PvP/data-tbc.lua`
  and `AtlasLootClassic_Collections/data-tbc.lua` at the pinned AtlasLoot
  commit — and extend `scripts/parse_atlasloot.py`. Win condition, written
  before measuring: the two modules name, per spec and phase, most of the
  badge/honour rows and the holiday-boss rows (Ahune, Coren Direbrew, the
  Headless Horseman) now `unknown`. Measurement: stage tab-follow-ups P3
  step 26 fetched both files at the pinned commit into scratch (vendored
  nothing) and recorded the per-spec, per-phase counts in ticket 676
  § Q-676-source measured, "Candidate C measured". Read that subsection
  first; if its win condition is met, C is the candidate to vendor.
- **D: a local badge / PvP source table** — ADR-0029 `:85-90` justifies a
  source-only table (not item data) when the borrowed inputs name no source.
  Win condition: every badge and honour row named with a vendor and a cost
  from a cited page, with no item stats of our own. Dropped if C names the
  same rows, because C stays inside borrowed data.

Decide C before D: start from C's recorded counts; take D only for the rows C
leaves, with the reason written. This part was deferred for the stage budget
(5 chunks, 700 lines), not for a missing measurement.

### What this stage learned that P4's planner needs

- Reading both list folders through `wowhead_dir` is not a route: it adds 82
  p5 rows through list-only membership and 10 raid+boss claims the witness
  rule rejects (R-676 § A, `cross.py`; stage plan C4). Membership stays in
  `ticket_157_included`.
- The db-phase route skips ids that already have a source (`:2368`), so an
  input added at the index is read only for rows that would be `unknown`.
- `vendor/atlasloot/` at the pin holds only dungeon/raid and faction tables;
  its one Ahune block is Wrath-gated with ids 54801-54806 not in the pinned
  db (R-676 § B).
- Research: `C:\Users\dgree\Code\lulz\tbc-gear-prio\.scratch\agent-reports\2026-10-17-general-task-676-source-candidates.md`
  (gitignored; scripts `cross.py`, `b1.py`, `b2a.py`, `own12.py` in the file).

## Q-676-source measured 2026-10-17 (stage tab-follow-ups P1)

### Candidates

| Candidate | What it is | Unknown-first p5 rows it names |
| --- | --- | ---: |
| A | Any spec's Wowhead list gives a row on another spec's universe a `badge`, `pvp` or `world` source (built in this stage) | 59 (badge 40, pvp 11, world 8); 51 by the db-phase route, 8 by the curated routes |
| A, raid kinds | The same for `raid` rows | 19; not copied: they also grant membership, and Wowhead-only raid+boss claims are what `pool-hardening.test.ts:1373-1440` rejects (part P4) |
| B1 | Other `sources[]` keys in db.json | 0: db.json has only `drop`, `crafted`, `rep`, and none of the unknown-first rows has any |
| B2 | Vendored AtlasLoot tables | 0: `vendor/atlasloot/` holds only dungeon/raid and faction tables; its one Ahune block is Wrath-gated with ids not in the pinned db |
| C | AtlasLootClassic `AtlasLootClassic_PvP/data-tbc.lua` and `AtlasLootClassic_Collections/data-tbc.lua` at the pinned commit, not vendored | measured in P3 step 26 (subsection below) |

B1 and B2 are from the 2026-10-17 research report on 676's source candidates
(scripts `b1.py`, `b2a.py`, `b2b.py` in it; the report is a gitignored file
under `.scratch/agent-reports/` in the main checkout). B1 re-runs as
`python -I -c "import json;print({k for i in json.load(open('vendor/wowsims/db.json',encoding='utf-8'))['items'] for s in i.get('sources',[]) for k in s})"`.

### What the builder now does

`cross_spec_list_sources(max_phase)` in `scripts/assemble_universe.py` reads
every list folder (`feral`, `ret`) at the stage files the phase reads, keeps
`badge`, `pvp` and `world` rows, and reduces them to one source per kind per
item. `add_unknown_or_cross_spec` uses that index at the three places a row
gets `unknown` (curated bis, ticket-157 force-include, db-phase). Membership
code is unchanged; a hold-out build reads no index.

Conflict rule, one source per kind per item, so the output does not depend
on which folder is read first:

- `badge`: the highest `cost`. A priced row beats G'eras's cost-0
  "Vendor: G'eras (Badges of Justice)" row.
- `pvp`: the row that names a `season`, else the first in folder/stage order.
- `world`: rows are identical.

### Measured: committed universes (base `f979411f`) against an in-memory rebuild with the new builder

Every one of the 44 universes keeps the same entry count and the same item
ids. Ret gains nothing: its own list already supplies these rows. The
rebuild also gives the 19 honour rows a season (ticket 681); those are not
counted below. No other row's sources changed.

Totals of rows whose first source leaves `unknown`:

| phase | rows | badge | pvp | world | db route | curated route | distinct item ids |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p2 | 36 | 26 | 2 | 8 | 28 | 8 | 6 |
| p3 | 45 | 26 | 11 | 8 | 37 | 8 | 11 |
| p4 | 55 | 36 | 11 | 8 | 47 | 8 | 12 |
| p5 | 59 | 40 | 11 | 8 | 51 | 8 | 13 |

At p5 this takes the unknown-first rows from 3481 to 3422.

Per universe (by kind counts each source the filled row carries):

| universe | entries old | entries new | same ids | filled | by kind | by route |
| --- | --- | --- | --- | --- | --- | --- |
| balance-p2 | 479 | 479 | True | 6 | {'badge': 4, 'world': 1, 'pvp': 1} | {'db': 6} |
| balance-p3 | 686 | 686 | True | 10 | {'pvp': 5, 'badge': 4, 'world': 1} | {'db': 10} |
| balance-p4 | 767 | 767 | True | 11 | {'pvp': 5, 'badge': 5, 'world': 1} | {'db': 11} |
| balance-p5 | 964 | 964 | True | 11 | {'pvp': 5, 'badge': 5, 'world': 1} | {'db': 11} |
| ele-p2 | 550 | 550 | True | 4 | {'badge': 3, 'world': 1} | {'db': 4} |
| ele-p3 | 803 | 803 | True | 4 | {'badge': 3, 'world': 1} | {'db': 4} |
| ele-p4 | 912 | 912 | True | 5 | {'badge': 4, 'world': 1} | {'db': 5} |
| ele-p5 | 1151 | 1151 | True | 6 | {'badge': 5, 'world': 1} | {'db': 6} |
| enh-p2 | 568 | 568 | True | 4 | {'badge': 3, 'world': 1} | {'db': 2, 'curated': 2} |
| enh-p3 | 829 | 829 | True | 4 | {'badge': 3, 'world': 1} | {'db': 2, 'curated': 2} |
| enh-p4 | 939 | 939 | True | 5 | {'badge': 4, 'world': 1} | {'db': 3, 'curated': 2} |
| enh-p5 | 1191 | 1191 | True | 6 | {'badge': 5, 'world': 1} | {'db': 4, 'curated': 2} |
| feral-p2 | 479 | 479 | True | 1 | {'badge': 1} | {'db': 1} |
| feral-p3 | 686 | 686 | True | 1 | {'badge': 1} | {'db': 1} |
| feral-p4 | 767 | 767 | True | 2 | {'badge': 2} | {'db': 2} |
| feral-p5 | 962 | 962 | True | 2 | {'badge': 2} | {'db': 2} |
| hunter-p2 | 503 | 503 | True | 4 | {'badge': 3, 'world': 1} | {'db': 2, 'curated': 2} |
| hunter-p3 | 737 | 737 | True | 4 | {'badge': 3, 'world': 1} | {'db': 2, 'curated': 2} |
| hunter-p4 | 846 | 846 | True | 5 | {'badge': 4, 'world': 1} | {'db': 3, 'curated': 2} |
| hunter-p5 | 1080 | 1080 | True | 6 | {'badge': 5, 'world': 1} | {'db': 4, 'curated': 2} |
| mage-p2 | 359 | 359 | True | 3 | {'badge': 2, 'world': 1} | {'db': 3} |
| mage-p3 | 508 | 508 | True | 3 | {'badge': 2, 'world': 1} | {'db': 3} |
| mage-p4 | 563 | 563 | True | 4 | {'badge': 3, 'world': 1} | {'db': 4} |
| mage-p5 | 697 | 697 | True | 4 | {'badge': 3, 'world': 1} | {'db': 4} |
| ret-p2 | 541 | 541 | True | 0 | {} | {} |
| ret-p3 | 794 | 794 | True | 0 | {} | {} |
| ret-p4 | 917 | 917 | True | 0 | {} | {} |
| ret-p5 | 1156 | 1156 | True | 0 | {} | {} |
| rogue-p2 | 458 | 458 | True | 4 | {'badge': 3, 'pvp': 1} | {'db': 2, 'curated': 2} |
| rogue-p3 | 664 | 664 | True | 8 | {'pvp': 5, 'badge': 3} | {'db': 6, 'curated': 2} |
| rogue-p4 | 748 | 748 | True | 9 | {'pvp': 5, 'badge': 4} | {'db': 7, 'curated': 2} |
| rogue-p5 | 951 | 951 | True | 9 | {'pvp': 5, 'badge': 4} | {'db': 7, 'curated': 2} |
| shadow-p2 | 384 | 384 | True | 3 | {'badge': 2, 'world': 1} | {'db': 3} |
| shadow-p3 | 545 | 545 | True | 3 | {'badge': 2, 'world': 1} | {'db': 3} |
| shadow-p4 | 599 | 599 | True | 4 | {'badge': 3, 'world': 1} | {'db': 4} |
| shadow-p5 | 744 | 744 | True | 4 | {'badge': 3, 'world': 1} | {'db': 4} |
| warlock-p2 | 370 | 370 | True | 3 | {'badge': 2, 'world': 1} | {'db': 3} |
| warlock-p3 | 523 | 523 | True | 3 | {'badge': 2, 'world': 1} | {'db': 3} |
| warlock-p4 | 578 | 578 | True | 4 | {'badge': 3, 'world': 1} | {'db': 4} |
| warlock-p5 | 716 | 716 | True | 4 | {'badge': 3, 'world': 1} | {'db': 4} |
| warrior-p2 | 644 | 644 | True | 4 | {'badge': 3, 'world': 1} | {'curated': 2, 'db': 2} |
| warrior-p3 | 950 | 950 | True | 5 | {'badge': 3, 'world': 1, 'pvp': 1} | {'curated': 2, 'db': 3} |
| warrior-p4 | 1092 | 1092 | True | 6 | {'badge': 4, 'world': 1, 'pvp': 1} | {'curated': 2, 'db': 4} |
| warrior-p5 | 1396 | 1396 | True | 7 | {'badge': 5, 'world': 1, 'pvp': 1} | {'curated': 2, 'db': 5} |

### Conflicts between lists

| item | kind | rows | kept | universes it fills |
| --- | --- | --- | --- | --- |
| 29381 | badge | `feral/p1-p2` cost 0; `ret/p1-p2` cost 25 | cost 25 | p2-p5: balance, ele, enh, hunter, mage, rogue, shadow, warlock, warrior |
| 29383 | badge | `feral/p1-p2` cost 0; `ret/p1-p2` cost 41 | cost 41 | p2-p5: the same nine |
| 28476 | pvp | `feral/p1-p2` arena; `feral/p3` honour season 1 | honour season 1 | none (p3-p5) |
| 31984 | pvp | `ret/p1-p2` arena; `ret/p3` honour, no season | arena | none (p3-p5) |

No two priced badge rows differ. The two pvp conflicts are arena/honour
disagreements inside one spec's own lists. Neither item reaches an
`unknown` site in any universe, so the rule's choice for them changes no
output today. Which of the two texts is right for 28476 and 31984 is not
checked here.

### Why own-spec list rows stay `unknown` (12 rows at p5)

From the same research report (script `own12.py`):

- 6 ret ids are only in `ret/pre-raid.json`, which no stage reads: 29382,
  28645, 28646, 31322, 31318, 28176.
- Quest text that names no zone parses to `[]` (no `quest` kind): 30257,
  31033, 28176.
- `unkept_wowhead_place` drops a place outside TBC's raids and admitted
  heroics: 23206 (Naxxramas, ret and feral), 32387 (heroic Sethekk Halls,
  feral), 31856 ("Bind on Equip" read as a zone).

None of them is a `badge`, `pvp` or `world` row in another list, so this
stage leaves them as they are (part P4).

Update 2026-10-17 (pre-merge review of feat/tab-follow-ups, finding A2): the
cross-spec index now also reads `ret/pre-raid.json` for badge, PvP and world
rows, so 29382 (badge 25), 28645 and 28646 (honour) and 31318 and 31322
(world) are no longer `unknown`: 104 universe rows across the 11 specs, no
membership change. 28176 stays `unknown` (quest text with no zone). Membership
still does not read the pre-raid list; that question above is unchanged.

### Re-run

The measurement compares the committed universes with an in-memory rebuild,
so it shows the change only on a tree whose universes predate it (at
`f979411f` with this builder). Save as a file and run
`python -I <file> <repo root>`:

```python
import contextlib, io, json, sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(sys.argv[1])
sys.path.insert(0, str(ROOT / "scripts"))
import assemble_universe as A

specs = sorted(p.name[:-len("-p2.json")] for p in (ROOT / "data/universes").glob("*-p2.json"))
filled = defaultdict(lambda: defaultdict(set))
for spec in specs:
    for n in (2, 3, 4, 5):
        old = json.loads((ROOT / f"data/universes/{spec}-p{n}.json").read_text(encoding="utf-8"))
        with contextlib.redirect_stderr(io.StringIO()):
            new, _ = A.assemble(n, spec=spec)
        oe = {e["itemId"]: e for e in old["entries"]}
        ne = {e["itemId"]: e for e in new["entries"]}
        kinds, routes, other = Counter(), Counter(), 0
        for iid, o in oe.items():
            nn = ne.get(iid)
            if nn is None or o["sources"] == nn["sources"]:
                continue
            if o["sources"][0]["kind"] == "unknown" and nn["sources"][0]["kind"] != "unknown":
                routes[o["sources"][0]["origin"]] += 1
                kinds.update(s["kind"] for s in nn["sources"])
                filled[n][iid].add(spec)
            else:
                other += 1
        print(spec, n, len(oe), len(ne), set(oe) == set(ne), dict(kinds), dict(routes), "other", other)
for n in (2, 3, 4, 5):
    for c in A.cross_spec_list_sources(n)[1]:
        print(n, c["itemId"], c["kind"], c["kept"], c["rows"], sorted(filled[n].get(c["itemId"], ())))
```

### Candidate C measured (P3 step 26)

Measured 2026-10-17 on `tbc-gear-prio@6a86ef98` (universes as P1 left them).
Both modules were downloaded into an empty scratch folder and read as data;
nothing is vendored and no script changed.

Inputs, at the pinned AtlasLoot commit `0bc91eb6899bebbf3b99072b446c1b83778ddeb9`
(`data/atlasloot.lock.json`):

| File | Bytes | sha256 |
| --- | ---: | --- |
| `AtlasLootClassic_PvP/data-tbc.lua` | 46622 | `9dd41d773235eaa873ac9093d3d03bad8e5ac1f7368d7ca356bdeb30d1736d03` |
| `AtlasLootClassic_Collections/data-tbc.lua` | 31859 | `4ffc8988d0e349004a8ae604ee99d98403ceab01e7c6a6cbaafbf3eb54218e0b` |

A row is `{ <slot>, <id> ... }`, the shape `scripts/parse_atlasloot.py`'s
`LOOT_RE` reads. The PvP module has 729 rows: 614 item rows and 115 item-set
ids (sub-tables with `TableType = SET_ITTYPE`). The Collections module has
546 item rows, plus 3 icon rows with no item id. Set ids name no extra row:
only the 17 season-1 arena set ids exist in db.json (which files every arena
season's pieces under the season-1 id), and the rows they reach are not
`unknown`. The counts below are item rows only.

"Unknown-first" is a row whose `sources[0].kind` is `unknown`. "Named by C"
counts each row once; no row is named by both modules.

| Universe | Unknown-first | Named by C | PvP module | Collections module | Not named |
| --- | ---: | ---: | ---: | ---: | ---: |
| balance-p2 | 178 | 93 | 46 | 47 | 85 |
| balance-p3 | 221 | 117 | 65 | 52 | 104 |
| balance-p4 | 257 | 153 | 67 | 86 | 104 |
| balance-p5 | 317 | 207 | 89 | 118 | 110 |
| ele-p2 | 195 | 105 | 47 | 58 | 90 |
| ele-p3 | 242 | 133 | 70 | 63 | 109 |
| ele-p4 | 294 | 183 | 72 | 111 | 111 |
| ele-p5 | 364 | 247 | 94 | 153 | 117 |
| enh-p2 | 200 | 106 | 47 | 59 | 94 |
| enh-p3 | 247 | 134 | 70 | 64 | 113 |
| enh-p4 | 299 | 184 | 72 | 112 | 115 |
| enh-p5 | 373 | 252 | 94 | 158 | 121 |
| feral-p2 | 177 | 93 | 46 | 47 | 84 |
| feral-p3 | 220 | 117 | 65 | 52 | 103 |
| feral-p4 | 256 | 153 | 67 | 86 | 103 |
| feral-p5 | 316 | 207 | 89 | 118 | 109 |
| hunter-p2 | 163 | 98 | 47 | 51 | 65 |
| hunter-p3 | 200 | 126 | 70 | 56 | 74 |
| hunter-p4 | 249 | 173 | 72 | 101 | 76 |
| hunter-p5 | 317 | 241 | 94 | 147 | 76 |
| mage-p2 | 133 | 78 | 38 | 40 | 55 |
| mage-p3 | 167 | 103 | 58 | 45 | 64 |
| mage-p4 | 185 | 121 | 60 | 61 | 64 |
| mage-p5 | 220 | 156 | 79 | 77 | 64 |
| ret-p2 | 184 | 102 | 47 | 55 | 82 |
| ret-p3 | 229 | 129 | 69 | 60 | 100 |
| ret-p4 | 296 | 194 | 71 | 123 | 102 |
| ret-p5 | 375 | 267 | 93 | 174 | 108 |
| rogue-p2 | 155 | 97 | 46 | 51 | 58 |
| rogue-p3 | 188 | 121 | 65 | 56 | 67 |
| rogue-p4 | 223 | 156 | 67 | 89 | 67 |
| rogue-p5 | 281 | 214 | 89 | 125 | 67 |
| shadow-p2 | 148 | 78 | 39 | 39 | 70 |
| shadow-p3 | 187 | 103 | 59 | 44 | 84 |
| shadow-p4 | 205 | 121 | 61 | 60 | 84 |
| shadow-p5 | 244 | 157 | 80 | 77 | 87 |
| warlock-p2 | 132 | 78 | 38 | 40 | 54 |
| warlock-p3 | 166 | 103 | 58 | 45 | 63 |
| warlock-p4 | 184 | 121 | 60 | 61 | 63 |
| warlock-p5 | 219 | 156 | 79 | 77 | 63 |
| warrior-p2 | 201 | 117 | 47 | 70 | 84 |
| warrior-p3 | 242 | 144 | 69 | 75 | 98 |
| warrior-p4 | 310 | 210 | 71 | 139 | 100 |
| warrior-p5 | 396 | 293 | 93 | 200 | 103 |

Split by AtlasLoot table at p5. No p5 row is in two tables, so each spec's
figures sum to its "Named by C" (2,397 over the 11 specs). No row is named
by `MidsummerFestivalBC` or `Brewfest`.

| Spec (p5) | BadgeofJustice | BadgeofJustice4 | BadgeofJusticeP5 | BCCSunmote | WorldEpicsBC | HalloweenBC | ArenaS1PvP | ArenaS2PvP | ArenaS3PvP | ArenaS4PvP | HonorSetBCC | PVP_INSIGNIA | TerokkarPvP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| balance | 31 | 39 | 30 | 2 | 13 | 3 | 26 | 18 | 19 | 22 | 2 | 2 | 0 |
| ele | 40 | 53 | 39 | 3 | 15 | 3 | 26 | 19 | 23 | 22 | 2 | 2 | 0 |
| enh | 41 | 53 | 43 | 3 | 15 | 3 | 26 | 19 | 23 | 22 | 2 | 2 | 0 |
| feral | 31 | 39 | 30 | 2 | 13 | 3 | 26 | 18 | 19 | 22 | 2 | 2 | 0 |
| hunter | 32 | 50 | 43 | 3 | 16 | 3 | 26 | 19 | 23 | 22 | 2 | 2 | 0 |
| mage | 26 | 21 | 16 | 0 | 11 | 3 | 20 | 16 | 20 | 19 | 2 | 2 | 0 |
| ret | 38 | 68 | 46 | 5 | 14 | 3 | 26 | 19 | 22 | 22 | 2 | 2 | 0 |
| rogue | 32 | 38 | 34 | 2 | 16 | 3 | 26 | 18 | 19 | 22 | 2 | 2 | 0 |
| shadow | 26 | 21 | 17 | 0 | 10 | 3 | 20 | 16 | 20 | 19 | 2 | 2 | 1 |
| warlock | 26 | 21 | 16 | 0 | 11 | 3 | 20 | 16 | 20 | 19 | 2 | 2 | 0 |
| warrior | 47 | 69 | 56 | 5 | 20 | 3 | 26 | 19 | 22 | 22 | 2 | 2 | 0 |
| **all 11** | 370 | 472 | 370 | 25 | 154 | 33 | 268 | 197 | 230 | 233 | 22 | 22 | 1 |

What C leaves `unknown` at p5 (1,025 rows over the 11 specs):

- 173 rows are holiday-boss items that upstream re-issued under ids of
  200000 and above (Ahune and Coren Direbrew; for example 281739 Empty Mug
  of Direbrew, original 38287). AtlasLoot lists the original ids, so no id
  matches. All 173 match a `MidsummerFestivalBC` (97) or `Brewfest` (76) row
  by item name (`count-c-holiday.py` below).
- 804 other epics, not classified further. The first examples the script
  prints are tier pieces (Thunderheart, Nordrassil, Malorne), Chancellor's
  tunics and Terokk's quest rewards.
- 30 rows with PvP rank names (Sergeant's, Grand Marshal's, General's ...).
- 18 rares or lower.

Win condition (`## Remainder after stage tab-follow-ups` § Candidates,
written before measuring): "the two modules name, per spec and phase, most
of the badge/honour rows and the holiday-boss rows (Ahune, Coren Direbrew,
the Headless Horseman) now `unknown`."

- Badge and honour rows: met. C names a row in every one of the 44
  universes (52% to 76% of unknown-first rows per universe; 2,397 of 3,422
  at p5), from the three badge-vendor tables, the four arena seasons and
  the honour table. The universes do not mark which unknown rows are badge
  or honour items, so there is no exact denominator; of the 1,025 p5 rows
  C leaves, 30 carry a PvP rank name.
- Holiday-boss rows: not met by item id. Ahune and Coren Direbrew rows are
  0 named because upstream re-issued their ids; the Headless Horseman table
  names 3 rows per spec. A name join reaches all 173 re-issued rows, but
  joining by name is a P4 design choice, not measured here as a route.

Re-run: save the scripts below in a folder that is not the download
folder, then run
`python -I count-c.py <pair root> <pvp data-tbc.lua> <collections data-tbc.lua>`,
`python -I count-c-rest.py <pair root> <path to count-c.py> <pvp lua> <collections lua>`
and `python -I count-c-holiday.py <pair root> <collections lua>`.

`count-c.py`:

```python
"""Candidate C (ticket 676): which unknown-first universe rows the AtlasLoot
PvP and Collections modules name. Usage:
  python -I count-c.py <pair root> <pvp data-tbc.lua> <collections data-tbc.lua>
"""

import collections
import glob
import json
import os
import re
import sys

ROOT, PVP, COLL = sys.argv[1:4]

TOP_RE = re.compile(r'^(?:data\["([^"]+)"\]|local ([A-Z_]+))\s*=\s*\{')
ROW_RE = re.compile(r"^\s*\{\s*(\d+)\s*,\s*(\d+)\s*[,}]")
ROWLIKE_RE = re.compile(r"^\s*\{\s*\d+\s*,")
STRING_RE = re.compile(r'"(?:[^"\\]|\\.)*"')


def parse(path):
    """Yield (top table, 'item' or 'set', id). Rows inside a sub-table with
    TableType = SET_ITTYPE carry item-set ids, not item ids."""
    out = []
    unmatched = 0
    top = None
    stack = []  # one bool per open brace: inside a SET_ITTYPE table
    with open(path, encoding="utf-8") as f:
        for line in f:
            if not stack:
                m = TOP_RE.match(line)
                if m:
                    top = m.group(1) or m.group(2)
            code = STRING_RE.sub('""', line).split("--", 1)[0]
            in_set = stack[-1] if stack else False
            if stack and "TableType" in code and "SET_ITTYPE" in code:
                stack[-1] = True
                in_set = True
            m = ROW_RE.match(code)
            if m and top is not None and stack:
                out.append((top, "set" if in_set else "item", int(m.group(2))))
            elif ROWLIKE_RE.match(code) and stack:
                unmatched += 1
            for ch in code:
                if ch == "{":
                    stack.append(stack[-1] if stack else False)
                elif ch == "}":
                    stack.pop()
                    if not stack:
                        top = None
    return out, unmatched


db = json.load(open(os.path.join(ROOT, "vendor/wowsims/db.json"), encoding="utf-8"))
set_items = collections.defaultdict(set)
for it in db["items"]:
    if it.get("setId"):
        set_items[it["setId"]].add(it["id"])

# itemId -> {(module, table)}: from item rows only, and from set rows
# resolved through db.json setId. db.json files every arena season's pieces
# under the season-1 set id (e.g. Merciless Gladiator's Plate Helm 30488 has
# setId 567), so a resolved set counts all seasons under ArenaS1PvP.
by_item = collections.defaultdict(set)
by_set = collections.defaultdict(set)
for module, path in (("PvP", PVP), ("Collections", COLL)):
    rows, unmatched = parse(path)
    tables = collections.Counter(t for t, _, _ in rows)
    sets = {i for _, k, i in rows if k == "set"}
    print(
        f"{module}: {len(rows)} rows ({sum(1 for r in rows if r[1] == 'item')} item, "
        f"{len(sets)} set ids, {sum(1 for s in sets if s not in set_items)} set ids not in db), "
        f"{unmatched} row-like lines unmatched, tables {dict(tables)}"
    )
    for table, kind, i in rows:
        if kind == "item":
            by_item[i].add((module, table))
        else:
            for iid in set_items.get(i, set()):
                by_set[iid].add((module, table))

print()
print("universe | unknown-first | named by item rows | PvP | Collections | + by resolved sets | by table (item rows)")
grand = collections.Counter()
for path in sorted(glob.glob(os.path.join(ROOT, "data/universes/*-p[0-9].json"))):
    u = json.load(open(path, encoding="utf-8"))
    unk = [e for e in u["entries"] if e["sources"][0]["kind"] == "unknown"]
    hit = [e for e in unk if e["itemId"] in by_item]
    extra = [e for e in unk if e["itemId"] in by_set and e["itemId"] not in by_item]
    by_mod = collections.Counter(m for e in hit for m in {m for m, _ in by_item[e["itemId"]]})
    by_table = collections.Counter(t for e in hit for _, t in by_item[e["itemId"]])
    name = os.path.basename(path)[:-5]
    print(
        f"{name} | {len(unk)} | {len(hit)} | {by_mod['PvP']} | {by_mod['Collections']} | {len(extra)} | "
        + ", ".join(f"{t} {n}" for t, n in sorted(by_table.items()))
    )
    if name.endswith("-p5"):
        grand["unknown"] += len(unk)
        grand["named by item rows"] += len(hit)
        grand["added by resolved sets"] += len(extra)
        grand.update({"table:" + t: n for t, n in by_table.items()})
        ids = {e["itemId"] for e in unk}
        grand["renumbered ids >= 200000 among unknown"] += sum(1 for i in ids if i >= 200000)
print()
print("p5 totals:", dict(grand))
```

`count-c-rest.py`:

```python
"""What the two modules leave unnamed at p5 (ticket 676 candidate C).
Usage: python -I count-c-rest.py <pair root> <count-c.py> <pvp lua> <collections lua>"""
import collections, glob, json, os, re, sys
root, cc, pvp, coll = sys.argv[1:5]
ns = {}
exec(open(cc, encoding="utf-8").read().split("db = json.load")[0].replace("ROOT, PVP, COLL = sys.argv[1:4]", ""), ns)
named = {i for path in (pvp, coll) for _, k, i in ns["parse"](path)[0] if k == "item"}
db = {it["id"]: it for it in json.load(open(os.path.join(root, "vendor/wowsims/db.json"), encoding="utf-8"))["items"]}
PVP_WORDS = re.compile(r"Gladiator|Veteran|Vindicator|Grand Marshal|High Warlord|Marshal's|General's|Battlemaster|Guardian's|Sergeant|Commander|Champion's|Legionnaire|Knight-|Blood Guard|Stone Guard")
cat = collections.Counter(); ex = collections.defaultdict(list)
for path in sorted(glob.glob(os.path.join(root, "data/universes/*-p5.json"))):
    for e in json.load(open(path, encoding="utf-8"))["entries"]:
        if e["sources"][0]["kind"] != "unknown" or e["itemId"] in named:
            continue
        i, n = e["itemId"], e["name"]
        if i >= 200000: c = "renumbered id >= 200000"
        elif PVP_WORDS.search(n): c = "PvP-named (Gladiator, Veteran, ...)"
        elif db.get(i, {}).get("quality", 0) >= 4: c = "other epic"
        else: c = "other rare or lower"
        cat[c] += 1
        if len(ex[c]) < 12 and (i, n) not in ex[c]: ex[c].append((i, n))
for c, n in cat.most_common():
    print(f"{c}: {n}  e.g. {ex[c]}")
print("total unnamed:", sum(cat.values()))
```

`count-c-holiday.py`:

```python
"""Renumbered (id >= 200000) unknown p5 rows whose name matches a row comment in
the Collections holiday tables. Usage: python -I count-c-holiday.py <pair root> <collections lua>"""
import collections, glob, json, os, re, sys
root, coll = sys.argv[1:3]
TOP = re.compile(r'^data\["([^"]+)"\]')
ROW = re.compile(r"^\s*\{\s*\d+\s*,\s*(\d+)\s*[,}].*--\s*(.+?)\s*$")
names = {}; top = None
for line in open(coll, encoding="utf-8"):
    m = TOP.match(line)
    if m: top = m.group(1)
    m = ROW.match(line)
    if m and top in ("MidsummerFestivalBC", "Brewfest", "HalloweenBC"):
        names[m.group(2)] = (top, int(m.group(1)))
per = collections.Counter(); unmatched = set(); rows = 0
for path in sorted(glob.glob(os.path.join(root, "data/universes/*-p5.json"))):
    for e in json.load(open(path, encoding="utf-8"))["entries"]:
        if e["sources"][0]["kind"] == "unknown" and e["itemId"] >= 200000:
            rows += 1
            hit = names.get(e["name"])
            if hit: per[hit[0]] += 1
            else: unmatched.add((e["itemId"], e["name"]))
print("renumbered unknown p5 rows:", rows, "matched by name:", dict(per), "unmatched ids:", sorted(unmatched))
```
