Status: closed
Type: bug
Origin: broader sweep after tickets 48-51, 2026-08-07
Blocks: none
Blocked by: none

# A boss name was sometimes an encounter and sometimes one unit of one

A TBC "boss" is an **encounter**, which may be several killable units. The
Illidari Council is four; the Eredar Twins are two; M'uru and Reliquary of the
Lost each transform into a second named unit mid-fight.

Wowhead sometimes credits a drop to the **unit**, AtlasLoot always to the
**encounter**. Nothing folded the two, so the same real drop reached the
universe under two names and `add_source` kept both rows. `boss` is a shipped
`ViewOptions` filter control, so those items advertised two bosses in one zone
where the game has one encounter.

## Measured on `c3f5b97`

Five names reached the universe that AtlasLoot's own boss vocabulary does not
contain:

```bash
python -c "
import json,glob
known=set()
def walk(o):
    if isinstance(o,dict):
        for k,v in o.items():
            if k=='boss' and isinstance(v,str): known.add(v)
            else: walk(v)
    elif isinstance(o,list):
        for x in o: walk(x)
walk(json.loads(open('data/atlasloot_sources.json',encoding='utf-8-sig').read()))
seen={}
for f in sorted(glob.glob('data/universes/*-p*.json')):
    if 'report' in f: continue
    for e in json.load(open(f,encoding='utf-8-sig'))['entries']:
        for s in e.get('sources',[]):
            b=s.get('boss')
            if b and b not in known: seen.setdefault(b,set()).add(e['itemId'])
for b,ids in sorted(seen.items()): print('%-30s %s'%(b,sorted(ids)[:5]))
"
# Entropius                      [34427]
# Essence of Anger               [32332, 32345, 32347]
# High Nethermancer Zerevor      [32373, 32376]
# Lady Sacrolash                 [34189, 34195]
# Trash Mobs                     [30021, 30022, 30026, 30644, 32591]
```

Each sat *beside* its encounter row — 34427 named both `M'uru` and
`Entropius`, 32373 both `The Illidari Council` and `High Nethermancer
Zerevor`.

## Severity: latent, not active

Every unit name was a strict **subset** of its encounter name, and zero items
carried a unit row without the encounter row alongside. So no item was hidden
from a filter — the defect was a duplicate filter entry and a redundant row,
not missing loot. It was one asymmetric transcription away from being worse.

## Root cause, and why it is the same one as 48-51

`ZONE_SPELLING_FIXES` / `canonical_zone` already existed for **zones**, and its
comment describes this exact failure: an unfolded spelling "never matches a
zone-keyed lookup ... and add_source keeps it as a second row beside the
correct one". The `boss` field simply never got the same treatment. This is
the general form of the specific bugs in
[[48-token-name-spliced-into-boss-field]] through
[[51-tier-source-rows-are-unguarded-past-sources0]]: **string fields nothing
canonicalises and nothing cross-checks.**

## Fix

`BOSS_UNIT_TO_ENCOUNTER` + `canonical_boss` in `scripts/assemble_universe.py`,
applied inside `add_source` — the single funnel every input passes through, so
the existing dedupe collapses the duplicate whichever input produced it.

AtlasLoot is the authority: it contains **zero** unit names (verified — no
`Sacrolash`, `Zerevor`, `Alythess`, `Gathios`, `Malande`, `Veras` anywhere), so
the table has a checkable reference rather than resting on recall.

The Karazhan Opera variants (`Romulo and Julianne`, `The Big Bad Wolf`, `The
Wizard of Oz`) are deliberately **not** folded: AtlasLoot lists all three, so
they are three distinct encounters filling one slot.

## Gates

- `scripts/check_boss_aliases.py` (`pnpm boss-aliases:check`, wired into
  `pnpm verify`): every alias target must be a real AtlasLoot encounter, no
  alias key may itself be one, no unfolded name may reach the universe, and any
  *new* boss name outside AtlasLoot's vocabulary fails with an instruction to
  decide rather than silence it.
- `pool-hardening.test.ts` > "a boss name is an encounter, not one unit of
  one": within a zone, an item names at most one boss (Opera excepted).

Both verified by mutation: re-adding `Lady Sacrolash` to 34189 fails both;
pointing an alias at a fabricated encounter (`Sacrolash and Alythess`) fails
the script.

## Proof the fold lost nothing

Item membership identical across all 2140 universe rows, and **zero** items
changed their zone set — only duplicate boss rows within an already-present
zone collapsed. 187 lines deleted, 0 source rows added.

## Still open: the wider class

This closes `boss`. The remaining string fields were enumerated in the same
sweep: `zone` (10 distinct), `faction` (5), `standing` (2), `via` (2) and
`dungeon` (1) are all clean. `profession` is not — 12 distinct values for five
real professions, filed as [[53-profession-field-carries-prose]].

`token` (31 distinct) is well-formed and now cross-checked against the two-hop
map by the ticket-51 gate, so it needs no separate work.
