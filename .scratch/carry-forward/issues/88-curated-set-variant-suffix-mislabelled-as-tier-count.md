# 88 — `curated_set_phase` docstring calls the `_6p`/`_9p` suffix a tier-bonus count

**Status:** open
**Found:** 2026-08-10, while adding the report's BiS filter.

## The claim in the code

`scripts/assemble_universe.py:354`:

> `feral_p2_6p` / `p2_9p` are the same phase split by tier-bonus count, so
> the leading `pN` is the phase and the suffix is a variant.

The "split by tier-bonus count" half is wrong. The suffix is a **hit
percentage**, not a piece count.

## Evidence

The two vendored sets differ in exactly 2 of 17 slots, and neither is a tier
slot:

| slot | `feral_p2_6p` | `feral_p2_9p` |
| --- | --- | --- |
| back | Thalassian Wildercloak (29994) | Drape of the Dark Reavers (28672) |
| legs | Leggings of Murderous Intent (29995) | Skulker's Greaves (28741) |

Since no tier piece differs, the two sets carry the *same* number of tier
bonuses, so the suffix cannot be counting them.

Summing hit rating (stat `20`) over each set from `vendor/wowsims/db.json`:

```bash
node -e "const fs=require('fs');const db=JSON.parse(fs.readFileSync('vendor/wowsims/db.json','utf8'));const byId={};for(const it of db.items||[])byId[it.id]=it;const g=f=>JSON.parse(fs.readFileSync('vendor/wowsims/'+f+'.gear.json','utf8')).items;for(const f of ['feral_p2_6p','feral_p2_9p']){let hit=0;for(const e of g(f)){const s=byId[e.id]&&byId[e.id].scalingOptions&&byId[e.id].scalingOptions['0'];if(s)hit+=(s.stats&&s.stats['20'])||0;}console.log(f,hit,(hit/15.77).toFixed(2)+'%');}"
```

- `feral_p2_6p` — 78 hit rating ≈ **4.95%**
- `feral_p2_9p` — 123 hit rating ≈ **7.80%**

Add the Heroic Presence 1% band that `caps.ts` already models (a Draenei in
party) and those land on **6%** and **9%** — the suffix. The `9p` pieces are
also *lower* ilvl (115 vs 138), which only makes sense if they are taken for
hit rather than for stats.

**Untested:** the exact rounding convention upstream intends (whether the
label assumes Heroic Presence, or rounds 4.95→5 and is simply approximate) is
inferred from these numbers, not read from a wowsims comment. The negative
claim — that it is *not* a tier-bonus count — is proven by the slot diff
alone and does not depend on that inference.

## Why it matters

The docstring is the only place the suffix is explained, and
`curated_set_phase` splits on `_` to recover the phase, so the parsing is
correct regardless. The cost is downstream: anything rendering `bisSets` to a
reader can repeat "6-piece / 9-piece" as though it described tier count. The
report's BiS filter deliberately does **not** render the variant label for
this reason.

## Fix

Correct the docstring at `scripts/assemble_universe.py:354` to say the suffix
is a hit-percentage variant. Optionally surface a reader-facing label
("~6% hit" / "~9% hit") if `bisSets` is ever rendered per-variant.

No behaviour change — parsing already only reads the `pN` prefix.
