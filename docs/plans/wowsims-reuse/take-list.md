# Take list — upstream code we should use rather than write

Detail behind [`README.md`](README.md). **Reference notes and proposals.**
Nothing implemented; no existing file changed by this document.

Upstream pin: `wowsims/tbc-new` @ `8aa378b3671a0923fd11fb34b4b3753e53f20c9b`.
Re-check any upstream file with:

```bash
gh api "repos/wowsims/tbc-new/contents/<path>?ref=8aa378b3671a0923fd11fb34b4b3753e53f20c9b" --jq '.content' | base64 -d
```

Assessed on `dev` @ `23c3291`.

---

## 1. Warcraft Logs client — reference only, NOT a take

> **CORRECTED 2026-08-04.** An earlier revision of this section called upstream's
> importer "the biggest gap" and the clearest take-don't-build item in the repo.
> **That was wrong**, and it was wrong in a way that would have cost time: their
> classifier throws on our data. The investigation below is the correction. The
> underlying observation that we have written _no_ live WCL client still stands
> — see [`README.md`](README.md) — but upstream is not the answer to it.

**Upstream:** `ui/raid/components/importers/raid_wcl_importer.tsx`, 776 lines.
**Ours:** `PLAN.md` §5.2 specifies `WclGearSource` in detail, with [P0]-verified
endpoints and a classifier. Unbuilt, but specified.

**Verdict: take ~nothing. Read it as a reference for the report-scoped GraphQL
query shapes, and for the gear-field mapping. PLAN.md §5.2 wins on facts.**

### 1.1 Their spec classifier cannot run on our data

Upstream classifies at line 63: `const wclSpec = data.icon.split('-')[1]`,
expecting `"Paladin-Justicar"`. Our Anniversary fixture has **no `icon` field on
actors at all**:

```bash
python -c "
import json; d=json.load(open('test/fixtures/slamaltman.raw.json'))
def w(o):
    if isinstance(o,dict):
        if 'actors' in o and isinstance(o['actors'],list):
            a=o['actors']; print('actors:',len(a),'keys:',sorted(a[0].keys()))
            print('with icon:',sum(1 for x in a if 'icon' in x))
        [w(v) for v in o.values()]
    elif isinstance(o,list): [w(v) for v in o[:3]]
w(d)"
# actors: 74 keys: ['id', 'name', 'server', 'subType']
# with icon: 0
```

`subType` is class-level only (`Paladin`, never `Retribution`). On our data
`data.icon.split('-')[1]` is `undefined`, `fullType` becomes
`"Paladinundefined"`, and their constructor throws `Player type not implemented`.

This is not a stylistic difference. **§5.2's [P0] talent-plurality classifier is
the only one that works here**, and `packages/core/src/spec.ts` already
implements it correctly.

### 1.2 They embody the [R18] trap

§5.2's [R18] warns that `talents[].id` means _points spent_, not talent ids.
Confirmed in our fixture — the `id` values sum to exactly **61** for all 25
combatants, the level-70 TBC talent budget:

```bash
python -c "
import json; d=json.load(open('test/fixtures/slamaltman.raw.json')); f=[]
def w(o):
    if isinstance(o,dict):
        if isinstance(o.get('talents'),list) and o['talents']: f.append(o['talents'])
        [w(v) for v in o.values()]
    elif isinstance(o,list): [w(v) for v in o]
w(d); print('combatants:',len(f)); print('first:',f[0])
print('id-sums:',sorted({sum(t.get('id',0) for t in x) for x in f}))"
# combatants: 25
# first: [{'id': 21, ...}, {'id': 40, ...}, {'id': 0, ...}]
# id-sums: [61]
```

Upstream reads `talents[i]?.guid` (line 121) and treats it as points-spent for
preset matching — the right _reading_, but our field is named `id`, not `guid`.
On our shape theirs is `undefined`, `Math.abs(undefined - n)` is `NaN`, and the
distance comparison silently selects preset index 0 instead of erroring.

### 1.3 The half we need most is absent

Theirs parses `classic.warcraftlogs.com/reports/ID#fight=N` and queries
`report(code:)`. §5.2 needs `findFights(character, spec)` — character-first
discovery via `encounterRankings` / `recentReports`. Grep their file for
`encounterRankings|recentReports|zoneRankings|characterData`: **zero hits.**
There is no counterpart to lift.

### 1.4 What is actually reusable

Roughly **60–90 lines of 776 (~10%)**: the GraphQL string literals (~lines
463–540, report-scoped) and a trivial field rename. The remainder is bound to
upstream's `Player` / `simUI` / `TypedEvent` / `RaidSimPreset` objects —
`eventID` appears 26×, `simUI` 12×. "Porting" it means rewriting it.

The one genuine borrow: their gear shape (`id`, `permanentEnchant`, `gems[].id`)
maps cleanly onto our `LoggedItem`, confirming the `effectId` enchant namespace
we verified independently.

**Do not take the credentials.** Upstream hardcodes a shared `Basic` auth pair in
the browser bundle (`getWCLBearerToken`). We want our own (`WCL_CLIENT_ID` /
`WCL_CLIENT_SECRET`, PLAN.md §13).

### 1.5 Open: the OAuth host

Upstream uses `classic.warcraftlogs.com/oauth/token`; §5.2 [P0] records
`www.warcraftlogs.com/oauth/token` and says "_not_ a classic-specific one".
`wcl_probe.py` tries `www` first and records its success — that is a
first-success record, **not** evidence that `classic` fails. **Hypothesis,
untested:** both work and share one OAuth host. Settling it needs credentials:
`python wcl_probe.py`. Not worth blocking on; the GraphQL URL is not in dispute.

---

## 2. Game mechanics constants

**Upstream:** `ui/core/constants/mechanics.ts` — hit, crit, haste, expertise,
dodge, parry, defense and resilience rating conversions, plus `CHARACTER_LEVEL`
and `BOSS_LEVEL`.

**Ours:** none of these constants appear in `packages/core/src` (checked by
grep). PLAN.md §4's `CapState` — the hit-cap banner, `capUncertainty`,
`hitDriven` — is **specified but unbuilt**.

**Verdict: take.** Small file, but exactly the kind of thing where a
hand-derived constant produces a plausible-looking wrong answer. The ret
yellow-hit-cap story in PLAN.md §4 depends on
`PHYSICAL_HIT_RATING_PER_HIT_PERCENT = 15.769233`; deriving that ourselves buys
nothing and risks a silent error in a headline UI element.

---

## 3. Display layer

Only relevant if we build UI, but it is the area `packages/core` deliberately
has none of.

| Upstream                                 |  Bytes | Gives us                                     |
| ---------------------------------------- | -----: | -------------------------------------------- |
| `components/gear_picker/gear_picker.tsx` | 12,582 | Slot pickers, item search, filter menu       |
| `proto_utils/database.ts`                | 15,854 | Item/gem/enchant lookup, preset encounters   |
| `proto_utils/equipped_item.ts`           | 11,130 | Equipped-item model carrying gems + enchants |
| `proto_utils/stats.ts`                   | 28,681 | Stat vector maths, display ordering, caps    |
| `wowhead.ts`                             |      — | Tooltip links, icon URLs                     |
| `constants/item_notices.tsx`             |      — | Per-item warnings (bugged/changed items)     |

---

## 4. The sim

One engine, three build shells (CLI / WASM / HTTP server). Covered in
[`../compute-topology.md`](../compute-topology.md). Our `SimRunner` port and
their `WorkerInterface` have the same shape, so nothing needs reconciling.

---

## 5. What stays ours

Not present upstream in any form:

1. **Fight selection** — most recent qualifying kill for a character/spec.
2. **Candidate pools per phase** — raid-scoped universes, curated sources, tier
   tokens (`data/universes/`, `scripts/assemble_universe.py`).
3. **Single-item ranking against logged gear** — the eight-stage engine: EP
   prefilter, per-candidate gem fill and meta repair, paired-replicate
   statistics, noise cutoff, `substitutions`/`assumptions`.
4. **The product framing** — "what should I want tonight," the cutoff, cap
   warnings, the `RankInput`/`ViewOptions` split.

Deliberately kept despite an upstream counterpart:

- **`meta.ts`** (204 lines) — a documented port of `proto_utils/gems.ts`.
  Behaviourally equivalent; all four compare-colour metas carry no min-colour
  keys, so our either/or branch matches their AND. Wants a tripwire test, not a
  rewrite.
- **`parse_atlasloot.py`** — upstream's `tools/database/atlasloot.go` reads
  **MoP** URLs only and cannot produce TBC data.

**On their Bulk tab** (`components/individual_sim_ui/bulk_tab.tsx`): it sims
user-configured gear _combinations_ with slot freezing and a combinations
counter — "which of these sets is best." We answer "which single item, against
gear read from your log, clears the noise floor." **Untested:** I read its
structure, not its full behaviour. If it can already produce single-item deltas
against a fixed baseline, item 3 above shrinks and this section needs revisiting.

---

## 6. Why Phase 1 has been slow — what the numbers say

| Ours                                                           | Lines | Upstream counterpart                        |      Bytes |
| -------------------------------------------------------------- | ----: | ------------------------------------------- | ---------: |
| `gems.ts` + `meta.ts` + `meta-repair.ts` + `candidate-gems.ts` |   813 | `proto_utils/gems.ts`                       |      9,871 |
| `items.ts` + `slots.ts` + `set-bonus.ts` + `stats.ts`          |   253 | `gear.ts` + `stats.ts` + `equipped_item.ts` |     53,995 |
| `gear-source.ts`                                               |    73 | `raid_wcl_importer.tsx`                     | ~776 lines |

Our domain layer is ~1,066 lines total; confirmed overlap with upstream is ~250
(meta gems, item phase). **Rebuilt volume is not where the time went.** The
pattern in this audit is the opposite: the expensive gaps are things _not yet
written_ that upstream would have handed us — the WCL client, the mechanics
constants, the whole display layer.

---

## 7. Unverified

- Whether the Bulk tab can produce single-item deltas (§5).
- Whether upstream's WCL query shapes still work unmodified against the current
  API — their code is pinned at our commit, not necessarily current.
- WASM-vs-native numerical parity
  ([`../compute-topology.md`](../compute-topology.md) E1).
- I surveyed `ui/core`, `tools/` and the importer set. I did **not** read
  `sim/core/*.go` (the combat engine) or the spec-specific `ui/<class>/`
  directories beyond ret's presets.
