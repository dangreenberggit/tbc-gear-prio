# 89 — Season 3 PvP weapons are missing from the P3 pool

Status: open
**Found:** 2026-08-10, reviewing the feral P3 rank report.

## Scope correction up front

The original report was "S3 PvP items aren't on the list". That is **too
broad**: S3 *armor* is present. `data/universes/feral-p3.json` carries 7
"Vengeful Gladiator's" (S3 arena) pieces plus 5 "Vindicator's" (S3 honor)
pieces — 12 PvP rows, up from 3 at P2.

The real gap is **weapons**, and it is narrow enough to act on.

## The gap

Every Gladiator melee weapon in `vendor/wowsims/db.json`, by season:

| season | phase | ilvl | items | in feral-p3 pool? |
| --- | --- | --- | --- | --- |
| S1 | 1 | 123 | Bonecracker (28302), Maul (28476), Slicer (28295) | Maul only |
| S2 | 2 | 136 | Bonecracker (31958), Maul (32014), Slicer (32052) | **Maul only** |
| S3 | 3 | 146 | Bonecracker (33662), Slicer (33762), Staff (33716) | **Staff only** |

So at max-phase 3 the pool offers the **S2** maul (ilvl 136) but not the S3
Bonecracker or Slicer (ilvl 146). On the shredzepelin feral P3 run,
`Merciless Gladiator's Maul` (32014, S2) ranks **#1**.

Note S3 has **no maul**: the two-hand maul line stops at S2. `Vengeful
Gladiator's Bonecracker` is `handType: 3` (one-hand) where the Maul is
`handType: 4` (two-hand), so it is not a like-for-like feral swap and may
legitimately rank far below. **The defect is that it is never offered, not
that it would necessarily win.**

## Reproduce

```bash
node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('data/universes/feral-p3.json','utf8'));const rows=Array.isArray(j)?j:(j.entries||j.items||[]);const ids=new Set(rows.map(r=>r.itemId));for(const id of [33662,33762,33716,32014])console.log(id,ids.has(id));"
```

Expected today: `33662 false`, `33762 false`, `33716 true`, `32014 true`.

## Suspected cause — hypothesis, untested

PvP rows carry `origin: "wowhead"` and no `season` field at all (every PvP
source in both universes serialises as `S?`), so the pool's PvP membership
comes from Wowhead scraping rather than a season-indexed list. If that scrape
is per-slot and weapons are sourced from a different list than armor, S3
weapons could be dropped while S3 armor lands. **Not verified** — confirm by
re-running the pool assembly for feral p3 and checking which upstream list
each PvP row came from before changing any parser.

## Also worth fixing while here

`ItemSource` for PvP has a `season` field (`rank-report.ts` renders `PvP · arena
S3` when present) but no universe populates it, so every PvP row renders a
bare `PvP · arena`. Populating it would make this class of gap visible on the
page instead of requiring a db diff to notice.

## Not in scope

Whether an S3 one-hander is actually competitive for feral is a ranking
question the sim answers once the items are in the pool. This ticket is only
about pool membership.
