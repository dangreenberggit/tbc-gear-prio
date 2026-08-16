Status: open
Type: data divergence (two sources of truth for the same pool)
Origin: ticket 156 slice C session, 2026-08-16
(`.scratch/carry-forward/plans/ticket-156/handoff-2026-08-16.md` §8 item 4, §9)
Blocks: none
Blocked by: none

Note for any in-browser measurement: the tab's pool count is evidence about
the fork's bundled copy, not about this repo's `data/universes/`.

# The fork's bundled ret p3 universe is not this repo's ret p3 universe

Earlier notes recorded this as "the fork has 394 entries against this repo's
390" and guessed it was "probably benign". The counts are right and the reading
is wrong: **the difference is not four extra items, it is sixteen items that
differ in both directions.**

Re-runnable:

```bash
python -c "
import json
a=json.load(open('data/universes/ret-p3.json'))
b=json.load(open('vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/data/ret-p3.universe.json'))
ea={e['itemId']:e for e in a['entries']}; eb={e['itemId']:e for e in b['entries']}
print('fork only:', sorted(set(eb)-set(ea)))
print('core only:', sorted(set(ea)-set(eb)))
"
```

**In the fork, absent from this repo (10):**

| id | name | slot | phase |
| --- | --- | --- | --- |
| 28590 | Ribbon of Sacrifice | trinket | 1 |
| 28592 | Libram of Souls Redeemed | ranged | 1 |
| 28774 | Glaive of the Pit | weapon | 1 |
| 28823 | Eye of Gruul | trinket | 1 |
| 29297 | Band of the Eternal Defender | finger | 3 |
| 30008 | Pendant of the Lost Ages | neck | 2 |
| 30063 | Libram of Absolute Truth | ranged | 2 |
| 30619 | Fel Reaver's Piston | trinket | 2 |
| 32368 | Tome of the Lightbringer | ranged | 3 |
| 32489 | Ashtongue Talisman of Zeal | trinket | 3 |

**In this repo, absent from the fork (6):**

| id | name | slot | phase |
| --- | --- | --- | --- |
| 22401 | Libram of Hope | ranged | 1 |
| 27484 | Libram of Avengement | ranged | 1 |
| 28034 | Hourglass of the Unraveller | trinket | 1 |
| 28288 | Abacus of Violent Odds | trinket | 1 |
| 31033 | Libram of Righteous Power | ranged | 1 |
| 31856 | Darkmoon Card: Crusade | trinket | 1 |

## Why "probably benign" does not survive the list

The divergence is concentrated in **trinkets and librams** — the two slots where
ret item choice is most contested. `Darkmoon Card: Crusade`, `Hourglass of the
Unraveller` and `Abacus of Violent Odds` are all well-known ret trinkets that
the browser build cannot rank at all, because they are not in its pool.
`Ashtongue Talisman of Zeal` is the reverse: the browser can rank it and the
CLI cannot.

So the two surfaces answer "what should I equip?" from different candidate
sets, and neither is a superset of the other. A user comparing a CLI report
against the tab will find items missing from each, with nothing on either
surface explaining why.

## What is not yet known

- **Which side is right.** Unestablished. It could be that the fork's copy was
  generated from a different phase filter, a different `classAllowlist` pass, or
  simply an older run of `assemble_universe.py`. Nobody has diffed the
  generation inputs.
- **Whether p2/p4/p5 diverge the same way.** Only ret p3 was compared.
- **Whether the fork's copy is generated at all**, or was hand-copied once and
  has drifted since. This decides whether the fix is a regeneration step or a
  build-time import.

Deliberately not guessed here — the earlier "probably benign, 4 extra entries"
note is what this ticket exists to correct, and replacing one guess with
another would repeat the mistake.

## Acceptance criteria

- [ ] Establish how `upgrades/data/ret-p3.universe.json` is produced and
      whether anything regenerates it from this repo's `data/universes/`.
- [ ] Decide which side is authoritative and say why.
- [ ] Either the fork consumes this repo's universes (single source of truth),
      or the divergence is documented with the reason each item differs.
- [ ] Extend the comparison to p2, p4 and p5 before closing.
- [ ] A check that fails when the two diverge again, if they are meant to match.
