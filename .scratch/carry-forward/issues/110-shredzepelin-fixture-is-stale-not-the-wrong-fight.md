Status: open
Type: bug
Origin: provenance investigation, 2026-08-10 (`.scratch/set-bonus-value/gear-snapshot-provenance-2026-08-10.md`)
Blocks: none
Blocked by: none

# The shredzepelin baseline is a stale snapshot, and nothing says so

`test/fixtures/shredzepelin-cat.raw.json` (bound at `packages/core/src/cli.ts:340`)
differs from the owner's current gear in 10 of 17 slots. It was suspected of
being a backup-tank fight. It is not.

## What was checked

The fixture is report `YwahQLgv2jBrZGn6`, fight **63, Void Reaver**, captured in
commit `78ca9af` (2026-08-08) and never touched since:

```
git log --oneline --follow -- test/fixtures/shredzepelin-cat.raw.json
python -c "import json; d=json.load(open('test/fixtures/shredzepelin-cat.raw.json')); print(d['report_code'], d['fight'])"
```

It carries **Hand of Salvation at 100% uptime** — a clean DPS fight:

```
python -c "
import json
c=json.load(open('test/fixtures/shredzepelin-cat.raw.json'))
tt=c['buffs_table']['data']['totalTime']
for a in c['buffs_table']['data']['auras']:
    if 'alva' in str(a.get('name')): print(a['name'], a['totalUptime'], '/', tt)
"
```

The off-tank fixture the owner is remembering is `shredzepelin.raw.json`
(Morogrim Tidewalker, zero salvation, armor 6027 / stamina 810 vs Void Reaver's
4705 / 615). Ticket 06 replaced it and kept it deliberately as the regression
case for the off-tank warning. **That fix is intact and did not regress.**

## The actual defect

Every one of the ten differing slots is an **item level increase** in the
owner's favour, five moving phase 1 → phase 2 (neck 128→138, back 128→138,
waist 110→138, legs 115→138, finger1 128→138, finger2 100→128, trinket
112→128, weapon 115→136, relic 110→115). Aggregate: +26 agi, +181 AP, +113
crit, −40 str, −47 hit. That is progression, not a tank set.

The baseline every candidate delta is measured against is therefore a snapshot
of an earlier point in the character's gearing, and **nothing in the report
says how old it is**. The 103/106 loop priced the gear gap at −7.9 DPS on the
T6 package delta and +4.49 on the CURSED−VENG helm ordering
(`.scratch/set-bonus-value/loop-103-106/06-owner-settings-diff.md`).

## Why the existing guard did not catch it

`salvationUptimeOf` (`packages/core/src/spec.ts:204`) and the warning in
`packages/core/src/disclosure.ts:196` detect *wrong-role* fights. Staleness is
invisible to any within-report check — every fight in report `YwahQLgv2jBrZGn6`
is equally old. Fixture selection is also a commit-time human choice
(`FERAL_FIXTURES` is a hard-coded list), so no runtime path can re-pick.

## Fix shape

1. **Re-snapshot** from a recent DPS fight in the owner's current gear, or
   accept their `IndividualSimSettings` export as a gear source. Note ticket 72:
   no `IndividualSimSettings` → `RaidSimRequest` lift exists
   (`packages/core/src/compose.ts:5-7`).
2. **Surface capture age.** The provenance disclosure already names the fight;
   it should also carry the capture date and flag a snapshot older than some
   threshold, so a stale baseline is visible instead of silent. **Hypothesis,
   untested**: this is the cheapest durable guard, since more selection logic
   cannot see staleness.

## Relationship to other tickets

- **108** (out-of-range ids 278827 / 278819 in neck and back) is *not* subsumed.
  Both slots happen to change on a re-snapshot, but 108's bug is silent
  resolution of an unmapped id to a Wrath item — an id-mapping defect that
  survives any fixture change. Keep separate.
- **109** (custom exported rotation) is the larger half of the same owner-vs-us
  gap; the 103/106 loop priced rotation at +31 vs gear's −7.9.
