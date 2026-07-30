Status: closed
Type: task
Origin: `.scratch/handoffs/raid-scoped-pool-implementation-review.md` “Not yet done”
Blocks: none
Blocked by: none
Resolution: measured 2026-07-30 — zero false negatives on p2 and p3; filter
  shipped behind --apply-junk-filter (off by default). See
  docs/verification-log.md and .scratch/ticket-18/.

# Recall measurement on the raid-scoped universe (junk-filter gate)

## Problem

Sub-phase 4’s purpose was to measure recall / false negatives on the
**assembled** universe before applying narrowing rules. Existing recall
figures still come from the old ~191-item EP+wowsims set and cannot show
what raid-scoped membership omitted.

The junk filter is correctly **not applied** (S7) — reports show ~30.8%
caster-only rejection at maxPhase 2 on the zone-scoped universe vs ~12% on
the full eligible set (different populations). Neither rate has been checked
against **simulated** results on the 224 / 347 universes.

Universes are now small enough that a full (or stratified) sim pass is
affordable.

## Done when

- A documented measurement run: for maxPhase 2 and/or 3, sim the universe
  membership (or a justified sample) and report:
  - how many “would-be junk rejects” would have been above-cutoff upgrades
    (false negatives if the filter were applied);
  - how that compares to the report’s `junkFilter` counts.
- Explicit go/no-go on applying the junk filter (or a tightened variant).
- Commands and artifact paths under `.scratch/` so the run is reproducible.

## Notes

- Do not apply the junk filter in `assemble_universe.py` until this passes.
- Prefer slamaltman (or another fixed offline character) for comparability
  with existing rank reports.

## Progress 2026-07-28 — membership recall measured (sim recall still open)

`--hold-out-wowhead` added to `assemble_universe.py`; measurement recorded in
`docs/verification-log.md`. Wowhead is both a curation input (PLAN.md §530) and
the gate's yardstick (§14), so recall against it was partly self-graded.

Held out, **P3 recall is 58.5% (72/123)** vs 76.4% with Wowhead as an input.
Universe 325 vs 347. Tier coverage 15/15 either way.

Two ownable buckets fall out, both entirely `d7Eligible` (source resolution, not
eligibility filtering):

- **22 carried only by Wowhead** — crafted / PvP / BoE: Lionheart Executioner,
  Stormherald, Red Belt of Battle, Swiftstrike Shoulders, Gladiator sets,
  Furious Gizmatic Goggles, Mask of the Deceiver.
- **29 missed by everything** — trinket 9, ranged 4, legs 3, finger 3. Every ret
  libram (Avengement, Fervor, Hope) and most badge/rep trinkets (Hourglass of
  the Unraveller, Abacus of Violent Odds, Mark of the Champion, Slayer's Crest).

This covers *membership* recall only. The **sim-based** false-negative check this
ticket asks for — would a junk-filtered item have been an above-cutoff upgrade —
is still not done, so the junk filter stays off.

Overlaps ticket 17 (`excludedNoSource`): the 29 persistent misses are the
concrete, ret-relevant subset of that gap and are the better place to start.

## Blocker found in pre-merge review 2026-07-29 — fix before applying the filter

`CASTER_ONLY_STATS` (`scripts/assemble_universe.py:101`) includes stat **5**
(`StatSpellDamage`), but this repo's own ret weights value it:
`data/presets/ret/p2.ep-weights.json` has `"5": 0.17`. Ret scales with spell
power in 2.4.3 — Seal/Judgement of Blood, Judgement of Command and Crusader
Strike all carry spell-power coefficients.

So `is_caster_junk` currently classifies a stat the EP model prices as a reason
to call an item junk. Harmless today because `measure_junk_filter` only counts
and never removes — but the counts it reports (32.9% `casterOnlyReject`) are the
input to this ticket's go/no-go, and they are wrong on that axis. **Fix the stat
set before trusting any junk-filter measurement, and certainly before applying
the filter.**

**Resolved 2026-07-29.** Stat 5 removed from `CASTER_ONLY_STATS`. The reported
counts are **unchanged** (119 caster-only rejects, 32.9%) because only one item
in the universe has SpellDamage as its sole caster-flagged stat: **30449 Void
Star Talisman** (+48 spell damage, nothing else). **Untested:** whether ret
actually equips this trinket in practice was never verified — the argument for
keeping it rests only on the EP model pricing stat 5 at 0.17, not on a claim
about real-world usage.
Every other spell-damage item also carries Int or Spirit, so it was already
being rejected for those.

The measurement blocker is therefore cleared and the headline percentage stands,
but note what that means: the old rule would have dropped exactly one real ret
item. Pinned by a test in `pool-hardening.test.ts`. The rest of this ticket —
the **sim-based** false-negative check — is still open, and the junk filter
stays off.

## Closed 2026-07-30 — sim-based check done, filter cleared

The false-negative check this ticket gated on:

```
python .scratch/ticket-18/measure_junk_false_negatives.py   --universe data/universes/ret-p3.json   --report .scratch/rank-reports/slamaltman-p3-postfix.json   --db vendor/wowsims/db.json
```

| universe | rejects | above cutoff |
|---|---|---|
| `ret-p3` (362) | 136 | **0** |
| `ret-p2` (238) | 85 | **0** |

Tier coverage stays 15/15 filtered.

**The margin argument first offered here is withdrawn** — a gap measured
against one character's baseline says nothing about a different baseline, which
was the question. See the correction in `docs/verification-log.md`.

**Go on rule 1 (caster-only) only.** An SME review
(`.scratch/handoffs/sme-junk-filter-judgment.md`) found the EP-floor rule was
unsound for weapons: `ep_score` cannot see weapon damage, so Glaive of the Pit
scored 0.00 (last of 17) on an empty stat map while swinging 119.7 weapon dps
with three sockets. `weapon` is now out of `SLOTS_WITH_EP_SIGNAL`; the
underlying scoring gap is ticket 27.

Counts after the fix: p3 134 rejects (119 caster + 15 EP-floor), p2 84 — still
zero above cutoff.

The filter ships as `--apply-junk-filter`, **off by default**, so the committed
universes and the Phase 1 gate figures stay unfiltered. Turning it on by
default is a separate decision and is not taken here.
