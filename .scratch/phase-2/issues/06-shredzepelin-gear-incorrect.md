Status: open
Type: task
Origin: chat, 2026-08-08
Blocks: phase-2
Blocked by: none

# Shredzepelin's cat fixture is an off-tank fight, and nothing says so

The gear read is **faithful**. The original report ("the gear read is wrong")
was investigated and the parser cleared: the 19→17 slot mapping is correct, all
17 item ids resolve in `data/items/index.json`, and Wolfshead Helm (8345, ilvl
45) is genuinely equipped — the pinned sim keys a powershifting rotation branch
on exactly that id in the head slot (`sim/druid/forms.go:92,147`,
`sim/druid/feralcat/rotation.go:52`). The 278xxx ids are Anniversary-rescaled
versions of real TBC items, not corruption.

The actual defect is **unguarded fight selection**.

`test/fixtures/shredzepelin.raw.json` is Morogrim Tidewalker, a fight where
shredzepelin was **backup tank** — he stayed in cat form the whole fight but
wore tank gear for a tanking job that was never needed. Reported by the user,
who knew the raid assignment; the log alone does not state it.

## Why our confidence signal cannot see it

`classifyFeralForm` measures form uptime only, and `feral-offline.ts:5-9`
states the assumption: cat and bear share a talent tree, so form uptime is what
separates them. Here form uptime says **99.1% cat at confidence ~1.0** and is
*correct about the form* while being useless about the role. The signal is not
noisy; it is measuring the wrong thing.

## Measured: Blessing of Salvation discriminates where form uptime cannot

Read from the `buffs_table` auras already present in each fixture:

| fixture | fight | form | Salvation |
| --- | --- | --- | --- |
| `shredzepelin.raw.json` | Morogrim | 99.1% Cat | **absent** |
| `shredzepelin-bear.raw.json` | Karathress | 69.1% Bear | absent |
| `nexess.raw.json` | Karathress | 96.6% Cat | **100%** |

The discriminating pair is shredzepelin/Morogrim vs nexess/Karathress: both are
~99% cat, so form uptime cannot tell them apart, and salv separates them
completely. Salv is stripped from anyone who might tank, so its absence is
close to *assignment intent* rather than a gear-shape proxy.

Re-run:

```bash
python -c "import json;[print(f,[(a['name'],a.get('totalUptime')) for a in json.load(open(f))['buffs_table']['data']['auras'] if 'alva' in a['name']]) for f in ['test/fixtures/shredzepelin.raw.json','test/fixtures/nexess.raw.json']]"
```

Two caveats, both arguing for **warn, never auto-reject**:

- Salv is lost on death, and is dropped deliberately by high-threat DPS. A dead
  DPS looks like a tank.
- A raid with no salv-capable paladin has nobody with salv.

**The roster check is not implementable against current captures.**
`scripts/capture_fixture.py:56` queries the Buffs table with `sourceID:$sid`, so
`buffs_table` holds auras for the *target player only* — there is no raid-wide
aura data to ask "did anyone else have salv?". Widening the capture is a
separate data-pipeline change. Until then the warning must be worded as a
question to the user ("no Salvation on this fight — off-tank duty, or no
paladin?") rather than as an assertion of off-tank role.

## Downstream consequence

`docs`-side, the existing SME handoff
[`sme-rank-judgment-feral-shredzepelin.md`](../../handoffs/sme-rank-judgment-feral-shredzepelin.md)
§2 called the cloak-and-ring domination "mostly correct rather than a bug". That
conclusion was reached without knowing this was an off-tank fight, and it is
wrong: those slots dominate because tank pieces (Icebound Cloak, Violet Signet —
both zero agility, zero AP, both carrying defense rating) are being ranked
against a cat baseline. The 1917.50 DPS baseline is a backup-tank baseline, so
every delta against it is inflated. That handoff needs a correction note.

This also blocks the one open Phase 2 gate box, **"≥3 real characters produce
believable shortlists"** — shredzepelin is one of the three.

## Scope

1. **Always disclose the source fight** — encounter, fight id, route, form
   uptime, salv status — on every rank run, not only when something looks
   wrong. Precedent: the `report-events` note at `cli.ts:365-371`, which exists
   for the same "do not let it look identical to a clean resolve" reason.
   `FightSummary.confidence` is recorded today and never reaches the user;
   `summaryToResolved` (`rank.ts:828`) drops it.
2. **Flag the off-tank shape**: salv absent while form uptime says DPS →
   lower confidence and warn, guarded by the roster check above.
3. **Let the user pick a different fight.** `resolveFight` already takes
   `input.fight`, but there is no `--fight` CLI flag and no way to list
   candidates.

Known cost on (3): `feralOfflineRecordings` records exactly **one** fight per
fixture, so a multi-fight capture is needed before choosing between fights is
testable end to end. (1) and (2) are reachable without it.

Not in scope: changing what the parser reads, or dropping the fixture.
