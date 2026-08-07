Status: open
Type: analysis
Origin: root-cause question after tickets 48-53, 2026-08-07
Blocks: none
Blocked by: none

# Why wrong names get in, and why tests do not catch them

Tickets 48-53 fixed six defects. This is the mechanism behind all of them,
which is the thing worth acting on.

## 1. How wrong data gets in: one input class produces all of it

Inputs split into two kinds, and the split is visible in their own metadata:

| Input | Provenance field | Produced a defect? |
|---|---|---|
| `data/atlasloot_sources.json` | parse of the AtlasLoot addon | no |
| `data/two-hop/raid-recipes.json` | `generatedBy: scripts/parse_atlasloot.py` | no |
| `vendor/wowsims/db.json` | pinned upstream artifact | no |
| `data/two-hop/*-tokens.json` | hand-curated, carries correction notes | no (was the *corrector* in 49/50) |
| `data/wowhead-lists/**` | `collectedBy: delegator-agent` / `claude-opus-5` | **all six** |

Every defect in 48, 49, 50, 51, 52 and 53 entered through
`data/wowhead-lists/**` — an LLM reading a rendered web page and typing JSON.
Zero came from a machine parse.

```bash
python -c "
raw=open('data/atlasloot_sources.json',encoding='utf-8-sig').read()
for n in ['Zerevor','Sacrolash','Trash Mobs']: print(n, n in raw)
"
# all False -- the alias names in ticket 52 exist only on the transcription path
```

That is not a claim that the agents were careless. Transcription of a rendered
page is a **lossy, unverifiable channel**: the page mixes item name, token name,
boss and zone into one line of prose, the LLM re-serialises it from memory of
what it read, and nothing downstream can tell a faithful copy from a slip.
Ticket 49 is the clean illustration — the transcription was *correct* with
respect to a Wowhead page that was itself wrong, and the only reason we know is
that `ret-tokens.json` had independently recorded the upstream mislabel.

**This channel is not going away** (the guides carry BiS opinion that AtlasLoot
does not), so the response is not "stop transcribing" but "never let a
transcription be the only witness to a checkable fact".

## 2. Why tests did not catch it: only cross-checks ever worked

Every gate in this repo that has ever caught one of these works the same way:
**compare two independent inputs and fail on disagreement.**

- ticket 51's gate: universe rows vs `data/two-hop/*-tokens.json`
- ticket 52's checker: emitted boss names vs AtlasLoot's boss vocabulary
- the pre-existing tier guard: `entry.source` vs the two-hop map

Nothing else has ever caught anything, and the reason is structural: a
transcription defect is **well-formed data**. `"Morogrim Tidewalker"` is a real
boss, `"Serpentshrine Cavern"` is a real zone, and the pair is a syntactically
perfect `ItemSource`. Type checking, schema validation and shape assertions all
pass, because nothing about the value is malformed — it is simply *not true*.
Only a second, independent witness can tell you that.

Two corollaries that explain the specific misses:

- **The type system cannot help here, ever.** `ItemSource` types `boss`,
  `token` and `profession` as `string`. Tightening them to unions would catch
  a *fabricated* name but not a *misattributed* real one, which is the actual
  failure mode in 49, 50 and 51.
- **Tests written against the data inherit its errors.** `pool.test.ts` and
  `view.test.ts` both used 30129's bogus Serpentshrine row as their multi-zone
  fixture, with a comment asserting it "really does carry" both zones. A test
  authored by reading the shipped data cannot detect that the data is wrong;
  it pins the defect in place and makes the eventual fix look like a
  regression.

## 3. The exposure this leaves: 13 uncross-checked claims

Cross-checking only works where a second source exists. Items present in
neither `atlasloot_sources.json` nor a two-hop map, but carrying a zone or boss
claim, have **no independent witness**:

```bash
python -c "
import json,glob
al={int(k) for k in json.load(open('data/atlasloot_sources.json',encoding='utf-8-sig'))}
tot=0
for spec in ['ret','feral']:
    th={e['pieceId'] for e in json.load(open('data/two-hop/%s-tokens.json'%spec,encoding='utf-8-sig'))['entries']}
    for f in sorted(glob.glob('data/universes/%s-p*.json'%spec)):
        if 'report' in f: continue
        for e in json.load(open(f,encoding='utf-8-sig'))['entries']:
            if e['itemId'] in al or e['itemId'] in th: continue
            for s in e.get('sources',[]):
                if s.get('boss') or (s.get('kind')=='raid' and s.get('zone')):
                    tot+=1; break
print(tot)
"
# 13
```

The list is short and specific:

| Item | Claim | Note |
|---|---|---|
| 30017 Telonicus's Pendant of Mayhem | Tempest Keep / Kael'thas | in all six universes |
| 34397 Bladed Chaos Tunic | Sunwell / M'uru | ret-p5 |
| 34388 Pauldrons of Berserking | Sunwell / Eredar Twins | ret-p5 |
| 34392 Demontooth Shoulderpads | Sunwell / Eredar Twins | ret-p5 |
| 31042/31034/31044 Thunderheart | BT / Hyjal | feral T6 — see below |

The Thunderheart rows are a **known** gap, not a new discovery:
`feral-tokens.json`'s own notes already say "T6 (Thunderheart) is absent ... so
feral maxPhase 3+ has no tier coverage yet" and, separately, that the whole
feral map is "UNVERIFIED against Wowhead". The repo was honest about it and
nothing was checking it.

Everything else on a Wowhead list but outside both cross-check sources is
`crafted`/`badge`/`rep`/`pvp`/`unknown` — kinds carrying no zone and no boss,
so there is nothing misattributable.

## 4. What to do

Ordered by value, not effort.

1. **Record per-row provenance in the universe.** `add_source` already takes an
   `origin` (`db`/`atlasloot`/`two-hop`/`wowhead`/`curated`) and `source_acc`
   already stores `(source, origin)` pairs — the emitted row throws it away, so
   provenance survives only as aggregate counts in the `.report.json`. Keeping
   it per row makes "which claims rest on transcription alone" a query instead
   of the reconstruction above, and lets a gate assert *that set does not grow*.
   This is the highest-value change and it is small.
2. **Gate the uncross-checked set at 13.** A test that fails when a zone/boss
   claim exists with no independent witness turns silent growth into a decision.
   Needs (1) to be expressible cleanly.
3. **Prefer the machine parse on disagreement, and say so once.** Ticket 49 and
   50 both resolved as "the curated/parsed side was right". That is now three
   independent confirmations and belongs in a written rule rather than being
   re-derived per incident.
4. **Fixtures must not be authored from shipped data.** `real-source.ts` makes
   using real rows easy, which is good, but a fixture chosen because it has a
   shape is a fixture that will pin whatever error produced that shape. Prefer
   a row the cross-check covers.
5. Close the feral T6 map gap so the Thunderheart rows gain a witness.

## Done in this pass (items 1 and 2)

**Per-row provenance now ships.** `add_source` already had the `origin`; the
emitted row now keeps it (`{"kind": "raid", ..., "origin": "wowhead"}`), and
`ItemSourceOrigin` intersects the `ItemSource` union rather than repeating on
all nine variants. So the question "what rests on transcription alone" is a
query against the shipped data:

```bash
python -c "
import json,glob
U={'wowhead','curated'}
n=0
for f in sorted(glob.glob('data/universes/*-p*.json')):
    if 'report' in f: continue
    for e in json.load(open(f,encoding='utf-8-sig'))['entries']:
        for s in e.get('sources',[]):
            if not (s.get('boss') or (s.get('kind')=='raid' and s.get('zone'))): continue
            if s.get('origin') in U and not any(
                o.get('origin') not in U and o.get('zone')==s.get('zone') for o in e['sources']):
                n+=1
print(n)
"
# 11
```

The origin-based count is **11**, not the 13 estimated above by re-joining the
inputs — and it correctly includes `31048 Thunderheart Pauldrons`, which the
estimate missed. That is the point of the field: the reconstruction was both
over- and under-counting.

**The set is gated.** `pool-hardening.test.ts` > "zone and boss claims have an
independent witness" fails on any *new* uncorroborated claim, against a
`KNOWN_UNCORROBORATED` allowlist of 5 item ids (30017 plus the four
Thunderheart T6 pieces). A second test fails when an allowlist entry *gains* a
witness, so the list must shrink as coverage improves rather than lingering as
a stale exemption.

Both directions mutation-verified: planting a lone `wowhead` raid row on 34241
fails the first; adding 34241 to the allowlist while it still has a `db`
witness fails the second.

## Still open

- The "prefer the parsed/curated side on disagreement" rule is written down
  once, somewhere binding. Three independent confirmations now (49, 50, 52).
- Whether feral T6 gets a two-hop map (or an explicit "no coverage" marker) is
  decided — that alone would clear 4 of the 11.
- Fixture-authoring guidance (item 4 above) is not yet written anywhere an
  agent will read it. This is the one that bit twice in `pool.test.ts` and
  `view.test.ts`, and it is a `writing-for-agents` / AGENTS.md change, so it
  needs proposing in chat before editing per this repo's own rule.
