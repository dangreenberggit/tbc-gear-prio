# Handoff — remaining Phase 1 tickets

**Date:** 2026-07-30
**Branch:** `phase-1/five-seed-spread`
**Tip:** `8a872bb` — `pnpm verify` green, 119 tests
**Nothing is merged.** Landing needs a separate explicit ask.

This covers what is **not** written down in PLAN.md, the tickets, or
`docs/verification-log.md`. Read those first; this is the delta.

---

## Numbers that changed today — re-derive before quoting anything older

| | was | now |
|---|---|---|
| `ret-p2` universe | 238 | **230** |
| `ret-p3` universe | 362 | **354** |
| bisTags populated | — | 23 (p2) / 24 (p3) |

Both dropped by 8: `classAllowlist` is now enforced (ticket 25), evicting
class-specific SSC/TK trinkets a paladin cannot equip. The counts are pinned in
`pool-hardening.test.ts` (354) and `pool.test.ts` (230). **Any handoff, report
or ticket quoting 238/362 predates this and is stale.**

Also stale: the P3 rank report at
`.scratch/rank-reports/slamaltman-p3-postfix.json` was generated against the
362-row universe. Its 43-above-cutoff and baseline 2003.26 figures are still
usable — none of the 8 evicted items ranked above cutoff — but a fresh run
would rank 346, not 357.

---

## New ADRs — read before re-litigating any of these

`docs/adr/` did not exist this morning. PLAN.md's "ADRs to write on approval"
list (§17 — **find it by title, it was §16 until today and moved**) reserves
items 1–15, so these start at 0016.

- **0016** — second `GearSource` / `Store` adapters deferred to Phase 2. The
  §5 two-adapter rule is *not* repealed; only the phase moves.
- **0017** — per-tier generated universes replace the single curated pool.
  R2's argument was about *curation accumulating*; the universe is now
  generated, so the premise expired. R2's load-bearing half (tier is a user
  input, filtered **inclusively**) is untouched and still enforced.
- **0018** — `fullPool` is not implemented **because the prefilter it skips was
  never built**. `rank.ts` filters by phase and Kael temp legendary only.

---

## Ground rules that bit me today

1. **A stat map is not the whole item.** I called Glaive of the Pit "no stats
   at all, not competitive at any gear level" from an empty `stats` map. It has
   354–532 weapon damage at 3.7 speed (119.7 weapon dps, within 5.7% of the
   worn Lionheart Executioner), three sockets and a 1.33 PPM proc. My probe
   read `weaponDamageMin` from the **top level** of the db record, where it
   does not exist, printed `None`, and I did not question it. It lives at
   `scalingOptions.0.weaponDamageMin/Max`. **Print one full record before
   reasoning about any field.**
2. **"X spends a third of its budget on a wasted stat" is rhetoric, not
   arithmetic.** The question is whether total contribution beats the
   alternative. Compute both sides or say you did not.
3. **A margin measured on one character is not a general fact.** I justified
   the junk filter with "22.6 dps of headroom"; the user correctly rejected it.
   Change the baseline and every number moves — which was the question. What
   survived was a *class-of-item* argument (these are not ret items at any gear
   level), which does not depend on the baseline.
4. **Distinguish magnitude from ordering.** Relentless's +3% crit damage is
   worth ~0.6% of damage at 10% crit and ~2.4% at 40% — a 4x swing, so no
   single dps number for it is portable. But it beats Swift Skyfire by ~7x at
   the low end and ~28x at the high end, so the *ordering* never flips. Encode
   orderings; do not encode magnitudes you cannot defend.
5. **Do not fan out slices that share a file.** I split tickets 12 and 25 as
   "disjoint" when both edit `scripts/assemble_universe.py`. Three writers then
   raced the index, lint-staged's stash/restore compounded it, and one agent's
   commit swept the other's work in. Verify disjointness by listing each
   slice's files, not by eyeballing the task descriptions.
6. **Messages to a running subagent arrive inside its tool results**, which is
   structurally where prompt injection appears. A correctly-behaving agent will
   refuse to act on them (one did, and flagged it). Put coordination facts in
   the *spawn prompt*, or sequence the work instead.

---

## Per-ticket notes the tickets themselves do not carry

### 27 — `ep_score` blind to weapon damage *(newest, and the sharpest)*

`ep_score` sums `stats[i] * weights[i]`. Weapon damage is not in the stats map
and there is **no weapon-damage term in the ret EP weights**, so `curationHint`
ranks two-handers on their stat line alone. Glaive of the Pit scores **0.00**,
last of 17 weapons, on an empty stat map.

`weapon` has already been removed from `SLOTS_WITH_EP_SIGNAL` so the junk
filter cannot drop weapons on this score. **The score is still wrong for any
other consumer of `curationHint` on weapons** — audit before relying on it.

Note the same blind spot explains the existing `ranged` / `trinket` exemptions
in `is_caster_junk`: all three P3 librams have **empty stat maps** and would be
rejected without their exemption. Do not "tidy up" those exemptions.

Sockets are a second, smaller gap — `ep_score` ignores `gemSockets` entirely,
and Hammer of the Naaru / Glaive of the Pit have three each where the worn
Lionheart Executioner has none.

### 15 — enchant applies like the UI *(has a concrete blocker)*

The UI rule needs `enchant.type` plus the item's `handType` / `weaponType` /
`rangedWeaponType`. **The upstream data has all of it**; the committed index
does not:

```
data/items/index.json fields: enchantable, name, phase, requiredProfession,
                              setId, setName, slot, socketBonus, sockets, unique
vendor db enchant fields:     effectId, spellId, name, icon, type, stats, quality
vendor db item (28430):       handType=4 weaponType=9 type=13
```

So step one is extending `scripts/generate_item_gem_index.py` (the same move
that fixed `setBonusNote` — it already copies `setName` across). `isEnchantable`
in `items.ts` is the current, cruder gate, used at `rank.ts:481`.

### 14 — carry the worn enchant (including "none")

**Read the ticket's own "What research found" section before coding.** The
original mechanism (skeleton default enchant leaking) is *not supported by the
code as written* — `swapItemAt` only sets `enchant` when the worn slot has one.
The user symptom may still be real, but it needs a reproduced request JSON dump
first. Do not fix a leak that is not there. Overlaps 15 heavily; consider doing
15 first, since a wrongly-*copied* enchant is the likelier explanation.

### 24 — standards smells *(three items left)*

Done: pinned-fetch dedupe, `EpWeights` rename, the silent slot-drop.

The **typing half of the slot item** has a trap worth knowing: deriving a union
via `(typeof SIM_ORDER)[number]` does **not** work. `resolveJsonModule` widens
JSON array elements to `string`, so the derived type accepts `"not-a-real-slot"`
with no error — verified. A hand-written union could drift from
`slots-table.json`, which is worse than none. Needs the table emitted as a
`.ts` const with `as const`, or a generated union. That is codegen, not an
annotation.

Also left: unused `Deps` breadth (overlaps 23), feature envy in
`fillOptsForSwap`, and `rank-report.ts`'s divergent change.

### 23 — spec drift *(two of five left)*

Items 1, 2 and 4 are resolved (ADR-0018, source-kind build guard, ADR-0017).

Item 3 (`Deps` shape) is **deferred with reasons in the ticket**. The key fact:
the ticket argues `pool` should move to `RankInput` because "they are inputs
and they are hashed" — but `contentHash` in `rank.ts` is currently the literal
placeholder `` `phase1-baseline:${character}` ``. Nothing is hashed. Revisit
when `contentHash` is real; that is when the field's home decides whether the
cache is correct.

Item 5 (`setBonusNote`) is done. Still open on this ticket: only p2 and p3
universe files exist while `cli.ts` builds `ret-p${maxPhase}` for any phase and
`phase_raids.json` advertises tiers 4 and 5 — selecting tier 4 finds no file.

### 17 / 13 — the no-source gap and raid-recipe crafts

Related, and 17 is the better entry point. The 29 items missed by everything
(ret librams, badge/rep trinkets) are the concrete ret-relevant subset. The
user scoped **badge vendors to P1 and possibly P4, not P3** — do not widen that
without asking.

---

## Things that look like bugs but are not

Carried forward from the previous handoff and still true:

- **Non-raid items missing from the universe** (librams, badge trinkets,
  crafted, heroic dungeon drops) — deliberate, the design is raid-zone-scoped.
- **`ranged` has only 3 candidates** — same reason.
- **Caster items in the universe** — cloaks/rings/necks have no armor-type
  gate and the junk filter is off. The sim sorts them below cutoff unaided.
- **Polearms ranking below cutoff** — correct for slamaltman, who wields a
  strong sword. Admitting them was still right.
- **`wowheadRecall` in the default report is circular** — use
  `--hold-out-wowhead` for the honest number. `wontfix`.

New to this list:

- **The junk filter rejecting 119 caster-only items** — SME-reviewed and sound.
  It is a stat-*presence* test, never a magnitude test, so it does not inherit
  the `ep_score` blind spot. Verified: none of the 119 carries Str, Agi, AP,
  melee hit/crit/haste, armour pen or expertise.
- **`fullPool` missing from `RankInput`** — see ADR-0018. Not drift to fix.

---

## Useful numbers (all measured, all re-derivable)

| | |
|---|---|
| Universe | 230 (p2), 354 (p3) |
| Tier coverage | 15/15 |
| Baseline DPS | 2003.26 |
| Cutoff | `{absDps: 3.4, pct: 0.15}` |
| Wowhead recall, **held out** | 78/123 (63.4%) ← quote this one |
| Junk filter (measured, **not applied**) | 134 rejects at p3, 0 above cutoff |

Re-rank: `pnpm rank --region US --realm dreamscythe --character slamaltman
--offline --max-phase 3 --report .scratch/rank-reports/<name>.html` (~15 min).

Regenerate universes — **absolute paths only**, a relative `--out` used to
crash on `relative_to` (fixed today, but the habit is still right):

```
python scripts/assemble_universe.py --max-phase 3 \
  --out  /abs/path/data/universes/ret-p3.json \
  --report /abs/path/data/universes/ret-p3.report.json
```

---

## Repo hazards

- **`vendor/` is gitignored.** `pool-hardening.test.ts` skips vendor-dependent
  tests when `vendor/wowsims/db.json` is absent, so **a green CI run proves
  less than a green local run.** Several tests added today are
  `skipIf(!hasWowsimsVendor)`.
- **`docs/plans/*.md` is untracked and was failing `format:check`**, which
  blocks `pnpm verify` for everyone since Prettier scans the whole tree. I ran
  `prettier --write` on it; content unchanged, still untracked. If it reappears
  dirty, that is why.
- **A stale `data/proto/` worktree fails `fetch:protos:check` on Windows** with
  "checksum mismatch" on every file. That is CRLF, not a bad pin — ticket 26
  now says so in the message. Fix:
  `rm -f data/proto/*.proto && git checkout -- data/proto/`.
- **`pnpm verify` typecheck can take >2 min** on a cold `tsc --build`. Do not
  assume a timeout means a hang.
- A sparse clone of `wowsims/tbc-new` sits at `.scratch/wowsims-tbc-new-src/`.
  It is the authority for game mechanics questions —
  `sim/core/item_effects.go`, `sim/core/spell_outcome.go`,
  `ui/paladin/retribution/gear_sets/*.gear.json`. **Use it instead of
  recalling TBC facts.**

---

## Do not

- Land, merge into `dev`, or set `TBC_ALLOW_DEV_MERGE=1` without an explicit ask.
- Quote 238/362 universe counts, or the "22.6 dps margin" argument.
- Re-report the known non-raid gaps as new findings.
- Remove the `ranged` / `trinket` exemptions from `is_caster_junk`.
- Fan out slices that touch the same file.
