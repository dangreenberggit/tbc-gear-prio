Status: open (data fixed; the missing sync check is what remains)
Type: data divergence (no mechanism keeps two copies in step)
Origin: ticket 156 slice C session, 2026-08-16
(`.scratch/carry-forward/plans/ticket-156/handoff-2026-08-16.md` §8 item 4, §9)
Blocks: none
Blocked by: none

Note for any in-browser measurement: the tab's pool comes from the fork's
bundled copy. It matches `data/universes/` as of 2026-08-16, and nothing
enforces that it still will.

# The fork's bundled universes drifted from this repo's, with nothing to catch it

Filed as "the fork has 394 ret-p3 entries against this repo's 390, probably
benign". Both halves of that were wrong: the divergence was **not** four extra
items, it was not confined to ret-p3, and it was **not** benign.

## What was actually wrong

All six bundled universes had drifted. Fork-only / core-only entry counts at
the time of investigation:

| Universe | fork-only | core-only |
| --- | --- | --- |
| ret-p2 | 7 | 7 |
| ret-p3 | 10 | 6 |
| ret-p4 | 10 | 6 |
| ret-p5 | 22 | 6 |
| feral-p2 | 8 | 1 |
| feral-p3 | 10 | 1 |

Content had drifted too: on ret-p3, **300 of 384 shared entries differed**,
because `curationHint` values were rescored upstream. The copies also predated
`epWeights` provenance being stamped into the artifacts, so that key was
absent from all six.

Two upstream commits explain the membership half, and both are **deliberate
decisions the stale copies were silently reverting**:

- **`c718d38`** force-admits six SME-flagged ret librams and trinkets. So
  `Darkmoon Card: Crusade`, `Hourglass of the Unraveller` and `Abacus of
  Violent Odds` — three well-known ret trinkets — were **absent from the
  browser pool entirely** and could not be ranked at any phase.
- **`1fcfcaf`** drops stub-only sim effects per ticket 171's user ruling: an
  item whose only sim effect is a `TODO: Manual implementation required` stub
  must not appear in any candidate pool. The stale copies still carried those
  items, so the tab **offered candidates that ruling excludes by design**.

Root cause: `upgrades/data/*.universe.json` are hand-copied. The fork's copy
was written once (`f7146dd69`, "Wire adapters into the Upgrades tab") and
never updated, while `data/universes/` moved on through five commits. Nothing
generates them, and nothing compares them.

## Fixed (2026-08-16)

Data only. Refreshed by straight copy from `data/universes/*.json` at
`60e05571`; all six now compare `==` under `json.load`. Fork commit
`5e26fa0d8`, with the detail recorded in the fork's
`upgrades/data/PROVENANCE.md`. The two ep-weights files were checked at the
same time and had not drifted. `data.ts` reads only `entries`, so the added
`epWeights` key is inert; fork `type-check` and this repo's 832 tests
(E-W3 included) pass after the refresh.

Re-runnable:

```bash
python -c "
import json
for f in ['ret-p2','ret-p3','ret-p4','ret-p5','feral-p2','feral-p3']:
    a=json.load(open(f'data/universes/{f}.json',encoding='utf-8'))
    b=json.load(open(f'vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/data/{f}.universe.json',encoding='utf-8'))
    print(f, a==b)
"
```

## What this ticket still owns

**The mechanism.** The same drift recurs the moment a universe is regenerated,
and it will again be invisible: the copies are gitignored-adjacent vendor data
with no gate over them. `check_engine_port_drift.py` covers the ported
*engine* files and deliberately does not look at data.

Options, none chosen:

1. A `pnpm verify` check that compares the six pairs and fails on difference —
   cheapest, and matches how `engine-port-drift:check` already guards the code
   half. Needs a defined skip when `vendor/tbc-new-fork` is absent, which is
   the ordinary state on a fresh clone.
2. Make the fork import from a generated location so there is one copy.
3. Accept drift and document that the tab's pool is a pinned snapshot, with
   the pin recorded — the current situation, minus the surprise.

## Acceptance criteria

- [x] Establish how the copies are produced. **They are not** — hand-copied
      once, never regenerated.
- [x] Decide which side is authoritative: `data/universes/` is, and the
      divergences were core changes the copy predated.
- [x] Bring the copies back into line, extended to p2/p4/p5 and feral rather
      than ret-p3 alone.
- [ ] A check that fails when the two diverge again.
