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

## 1. Warcraft Logs client — the biggest gap

**Upstream:** `ui/raid/components/importers/raid_wcl_importer.tsx`, 776 lines.

**Ours:** nothing. See [`README.md`](README.md) — `gear-source.ts` is an
interface plus a fixture replayer.

What theirs covers:

| Piece                    | Detail                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------ |
| OAuth                    | client-credentials against `classic.warcraftlogs.com/oauth/token`                    |
| GraphQL transport        | query builder, error handling, response unwrapping                                   |
| Point-cost awareness     | their code comments that WCL bills 1 point per subquery, and batches accordingly     |
| `CombatantInfo` parsing  | the event our whole gear read depends on                                             |
| `gear[] → ItemSpec`      | `id`, `permanentEnchant`, `gems[].id` — the same namespace we verified independently |
| Spec classification      | from the WCL icon string                                                             |
| Talent → preset matching | picks a sim preset from logged talents                                               |

**Take:** the query shapes, the point-batching approach, and the gear mapping.

**Do not take:** the credentials. Upstream hardcodes a shared `Basic` auth pair
in the browser bundle (in `getWCLBearerToken`). We want our own, and cloning a
shared rate-limited budget into a second deployment is a bad idea regardless of
where our app is hosted.

**Still ours to write — the smaller half.** Their importer starts from a report
URL plus a fight id and builds all 25 raiders. Ours starts from a _character
name_ and must find the most recent qualifying kill. That selection policy has no
upstream equivalent. Their spec classification is also icon-string-based, while
ours is talent-tree plurality — we verified upstream's approach agrees, but ours
was chosen for a reason (P0: no spec label exists at actor level) and should stay.

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
