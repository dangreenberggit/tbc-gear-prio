Status: open
Type: task
Origin: `.scratch/handoffs/telephone-postmortem-findings.md`
Blocks: phase-1
Blocked by: none

# `classAllowlist` is never enforced — class-illegal items sit in the shipping universes

## Problem

`vendor/wowsims/db.json` carries a `classAllowlist` field (2006 items have a
non-empty one). Nothing in this repo reads it. The only occurrences are the
generated protobuf type:

```
packages/core/src/proto/ui_pb.ts:292
packages/core/src/proto/ui_pb.ts:639
```

(plus their `dist/` copies). No script, filter, or test consumes the field, so
items an allowlist restricts to another class pass eligibility unchallenged.

## Blast radius (measured 2026-07-30)

Both shipping universes contain **8 class-illegal entries**, the same 8 in each —
class-specific SSC/TK trinkets, none allowlisted to Paladin (class 2):

| id | name | classAllowlist |
|---|---|---|
| 30450 | Warp-Spring Coil | 4 (Rogue) |
| 30449 | Void Star Talisman | 9 (Warlock) |
| 30665 | Earring of Soulful Meditation | 5 (Priest) |
| 30446 | Solarian's Sapphire | 1 (Warrior) |
| 30448 | Talon of Al'ar | 3 (Hunter) |
| 30663 | Fathom-Brooch of the Tidewalker | 7 (Shaman) |
| 30664 | Living Root of the Wildheart | 11 (Druid) |
| 30720 | Serpent-Coil Braid | 8 (Mage) |

`ret-p2.json` 238 entries, `ret-p3.json` 362 entries; 8 illegal in each, 0
entries missing from `db.json`.

Reproduce:

```bash
node -e "
const db=require('./vendor/wowsims/db.json');
const byId=new Map((db.items||[]).map(i=>[i.id,i]));
for (const u of ['ret-p2','ret-p3']) {
  const es=require('./data/universes/'+u+'.json').entries;
  const bad=es.filter(e=>{const a=byId.get(e.id??e.itemId)?.classAllowlist;
    return Array.isArray(a)&&a.length&&!a.includes(2);});
  console.log(u, es.length, 'entries,', bad.length, 'class-illegal');
}"
```

Note `vendor/wowsims/db.json` is a synced artifact — if absent, run
`scripts/sync_wowsims.py` (pin in `data/wowsims.lock.json`) before reproducing.

## Why it matters

These are unequippable by the character the universe was assembled for. They
consume trinket-slot candidate budget and can surface in a ranking as an upgrade
the player cannot take — a basic in-game sanity failure of the kind
`sme-rank-review` is meant to catch downstream, but which belongs upstream in
eligibility.

One of them, 30449 Void Star Talisman, is currently **pinned into the pool by a
test** in `packages/core/test/pool-hardening.test.ts` ("does not treat spell
damage as a caster-only stat"). That test's purpose is to assert the
`CASTER_ONLY_STATS` stat set, not to assert this item belongs in a paladin
universe. Enforcing `classAllowlist` will evict the item and break that test —
the test needs rewriting against a class-legal spell-damage item, or restating
so it checks the stat set directly rather than via pool membership. See
`.scratch/handoffs/telephone-postmortem-findings.md` for why that item ended up
pinned.

Also check `classDenylist` if `db.json` carries one — the same audit applies.

## Done when

- `assemble_universe.py` (or whichever stage owns eligibility) rejects entries
  whose non-empty `classAllowlist` excludes the target class, with the rejection
  counted in the universe report like other eligibility reasons.
- Both shipping universes regenerated; the 8 entries above are gone.
- `pool-hardening.test.ts`'s spell-damage test rewritten so it no longer depends
  on a Warlock-only trinket being in a paladin pool.
- A test asserts the new rule (an entry with an excluding allowlist stays out).

## Notes

- **Untested:** whether any of the 8 has ever appeared in a produced rank report
  — not measured. The defect is admission into the universe; downstream impact
  is unquantified.
- Target class for ret is `2` (Paladin). 337 `db.json` items are allowlisted to
  class 2, so the field is well populated and usable as a positive filter too.
