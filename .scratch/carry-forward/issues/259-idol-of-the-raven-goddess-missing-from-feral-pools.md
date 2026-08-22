Status: open
Type: bug (pool coverage — an upstream BiS item never reaches the candidate set)
Origin: `gate-sme` recheck of the Stage 2 shortlists, 2026-08-22; handoff at
  `.scratch/handoffs/sme-rank-judgment-stage2-recheck-feral.md` (the shared caveat
  holding both feral verdicts off a clean `trust`)
Blocks: phase-2
Blocked by: none

# The feral ranged slot offers one candidate, and upstream's BiS idol is not it

## What happens

Both feral characters get **exactly one** ranged candidate — the idol they are
already wearing. A reader learns nothing about a slot that is a live P2 decision.

```
python -c "import json,glob;[print(f.split('close-')[1][:12], [i['name'] for i in json.load(open(f))['ranking']['items'] if i.get('slot')=='ranged']) for f in sorted(glob.glob('.scratch/rank-reports/stage2-close-*.json')) if 'slamaltman' not in f]"
```

→ `nexess ['Everbloom Idol']`, `shredzepelin ['Everbloom Idol']`

**32387 Idol of the Raven Goddess is missing**, and it sits in *both* pinned
upstream P2 feral gear sets:

```
python -c "import json;[print(f,32387 in [i.get('id') for i in json.load(open('vendor/wowsims/%s.gear.json'%f))['items']]) for f in ('feral_p2_6p','feral_p2_9p')]"
```

→ `feral_p2_6p True`, `feral_p2_9p True`

## The mechanism is the one ticket 253 named, hitting a different item

The item is **present** in our index and **has no source**:

```
python -c "import json;i=json.load(open('data/items/index.json'))['items']['32387'];print(i['name'],'| phase',i['phase'])"
python -c "import json;print(json.load(open('data/atlasloot_sources.json')).get('32387'))"
```

→ `Idol of the Raven Goddess | phase 1`, then `None`.

So the pool builder drops it for want of a source row, exactly as it drops the
Ahune neck and back. This is the same class of defect and the third confirmed
instance, which makes the pattern worth naming: **an item with no AtlasLoot
source silently never becomes a candidate, however good it is.**

Unlike the worn-item case (ticket 253), no disclosure covers this one. A missing
*worn* item at least raises a `worn-unrankable` warning. A missing *candidate*
raises nothing — the slot just looks thin, which is what ticket 173 exists to
complain about.

## Why this is the highest-value fix from the recheck

It is the single caveat keeping **both** feral shortlists off a clean `trust`,
it is one bug rather than two (both runs share the same 228-row pool), and it is
narrow: one item, one missing source row, no scope question attached. Contrast
the heroic exclusion, which is deliberate and belongs to ticket 17.

## Not established

- Whether other upstream-BiS items are missing the same way. **Untested.** The
  obvious check is to diff every pinned `vendor/wowsims/*_p*.gear.json` set
  against the corresponding pool and list what never arrives — that would size
  the problem instead of fixing it one item at a time, and it would give ticket
  173 the detector it actually asks for.
- Whether the right fix is a source row for this item, a rule admitting
  sourceless items that appear in an upstream BiS set, or something else.

## Acceptance

- [ ] 32387 appears as a ranged candidate for both feral characters.
- [ ] The fix is stated in terms of the general mechanism, not hardcoded to this
      id — or, if hardcoded, says why and links the general ticket.
- [ ] The diff of upstream BiS sets against the pools is run and its result
      recorded, so the size of the gap is known rather than guessed.
