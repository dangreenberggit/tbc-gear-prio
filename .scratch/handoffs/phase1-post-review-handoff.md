# Handoff — Phase 1 complete, post-review ticket burn-down

**Date:** 2026-07-29
**Branch:** `phase-1/five-seed-spread`
**Tip:** `5e0fc23` — `pnpm verify` green, `pnpm land --check-only` green
**Nothing is merged.** Landing needs a separate explicit ask from the user.

---

## Where things stand

Phase 1's gate in PLAN.md §14 is **9/9 checked** and the pre-merge review is
written at `docs/reviews/phase-1-five-seed-spread.md`. The branch is
land-ready; the user asked to checkpoint here and work tickets instead.

Recent commits, newest first:

| SHA | What |
|---|---|
| `5e0fc23` | Hedged spell-power claims that were never verified |
| `7d90499` | Removed SpellDamage from `CASTER_ONLY_STATS` |
| `3af4c24` | World-boss drops now carry one correct source (closes 21) |
| `f814885` | Rank tests call the production swap path |
| `cc0d391` | `docs/pipeline-demo.html` snapshot dashboard |
| `52ee3b0` | Pre-merge review: four axes, fixes, six tickets |

---

## Ground rules that bit me — read these first

1. **Never state a game fact you did not check.** I asserted "Void Star Talisman
   is a trinket ret genuinely uses" from nothing, and repeated a subagent's
   claim about ret's spell-power coefficients as if I had verified it. Both are
   now hedged (`5e0fc23`). AGENTS.md § Durable claims requires a re-runnable
   command or the word untested **in the same sentence**. This applies to commit
   messages, tickets, code comments and the verification log.
2. **Verify a subagent's headline before acting on it.** The adversarial review
   filed a critical meta-gem bug with a confident mechanism. The symptom
   reproduced; the mechanism was wrong. Patching what it described would have
   changed nothing and looked like a fix.
3. **Probe JSON schemas before reporting numbers from them.** Three separate
   times I guessed a key (`.source` vs `.sources`, `items` vs `entries`, top-
   level vs id-keyed) and produced a confidently wrong figure. Read one record
   first.
4. **Delegate bounded research.** The user called this out explicitly: a yes/no
   question needing files I will not reuse belongs in a Sonnet subagent, not in
   my context.
5. **Regenerate, don't hand-edit, `data/universes/*.json`.** Always
   `python scripts/assemble_universe.py --max-phase N --out <ABS> --report <ABS>`.
   Relative `--out` trips a pre-existing `relative_to` crash in the final print.

---

## Open tickets

`pnpm issues:open` lists them. In the order I would take them:

### 22 — rank tests duplicate production *(half done, needs a decision)*

`.scratch/carry-forward/issues/22-rank-test-duplicates-production-swap.md`

The duplication half is **done**: `equipmentForCandidateSwap` is exported from
`rank.ts` and the test helper delegates to it.

The coverage half is open and is **more interesting than the ticket title**.
After de-duplicating I neutered `fillOptsForSwap` to `return {}` and all 10
tests still passed. Measured why:

- Swept all 362 `ret-p3` candidates against slamaltman's worn gear comparing
  `fillEmptyCandidateGems` with and without the opts → **zero differ**.
- The fixture wears one `unique` gem (31118) and it is a **meta**, so it can
  never collide with a non-meta fill.
- Under real ret weights the best gem of each colour is never unique — filling
  belt 30106 unconstrained gives `[32193, 32193]`, neither unique.

**So `usedUnique` may be unreachable in production entirely.** Before writing a
purpose-built fixture, answer: does the unique-tracking feature earn its keep?
Deleting it is a legitimate outcome and probably the better one. Ask the user.

### 20 — meta gems ranked by an EP model that cannot see their effects

`.scratch/carry-forward/issues/20-meta-gem-ep-model-blind-to-proc-effects.md`

Filling an empty meta socket picks Swift Skyfire Diamond (25894, 9.84 EP) over
Relentless Earthstorm Diamond (32409, 9.00 EP). Both activate on the probe set,
so the deficit tie-break is neutral and EP legitimately decides.

Root cause (domain review): in `db.json` **every** meta's stats array carries
only incidental stats, never the effect. Relentless shows `12 Agi`; its 3% crit
damage is invisible. Thundering Skyfire is all zeros. Ranking metas by EP is
meaningless in general.

Note the ticket also asks to fix `metaDeficit` in `bestGemForSocket` to score
meta-socket candidates against their *own* condition rather than
`metaCtx.metaId` — correct on its merits, but it does **not** change this
outcome (I tried it and reverted).

### 19 — two of three seams ship one adapter

`.scratch/carry-forward/issues/19-second-adapter-gear-source-store.md`

PLAN.md §5: *"Each seam below has two adapters that both actually get built, in
Phase 1, and both actually get used."* `SimRunner` has two; `GearSource` has
only `RecordedGearSource`; `Store` has only `MemoryStore`. Every
"runs offline from fixtures" claim is true but unfalsifiable.

**Largest ticket here.** `WclGearSource` needs live WCL auth, rate limiting and
point budgeting, and is most of what PLAN.md calls Phase 2's caching work.
Amending §5 by ADR to move the second adapter to Phase 2 is a legitimate
resolution — but it must be recorded, not silent.

### 23 — spec drift *(five items)*

`.scratch/carry-forward/issues/23-spec-drift-fullpool-deps-pools-setnote.md`

`fullPool` unimplemented; `source: null` measured but not gated by code; `Deps`
grew four fields beyond §4; per-tier universes replaced the single accumulating
pool R2 argued for (**needs an ADR**, `docs/adr/` does not exist yet);
`setBonusNote` emits a raw `setId` (`breaks 2-piece set 629`) instead of a name.

The quickest real win is `setBonusNote` — `data/items/index.json` already has
the set name.

### 18 — universe recall *(blocker cleared, main work open)*

The `CASTER_ONLY_STATS` blocker is fixed. Still open: the **sim-based**
false-negative check — would junk-filtered items have been above-cutoff
upgrades? Needs sim runs. **The junk filter stays off until this passes.**

### 24, 17, 12–15

`24` standards smells (nice-to-have; the duplicated pinned-fetch logic across
three sync scripts is the highest-value item). `17` phase≥2 no-source gap.
`12`–`15` predate this review.

---

## Things that look like bugs but are not

- **Non-raid items missing from the universe** (librams, badge trinkets,
  crafted, heroic dungeon drops) — deliberate. The design is raid-zone-scoped.
  Tracked in 13 and 17. The user scoped badge vendors to **P1 and possibly P4**,
  not P3.
- **`ranged` has only 3 candidates** — same reason; ret librams mostly drop
  outside raids.
- **Caster items in the universe** (Ancient Spellcloak, Ring of Flowing Light) —
  cloaks/rings/necks have no armor-type gate and the junk filter is off. The sim
  sorts them below cutoff unaided; verified in the P3 run.
- **Polearms ranking below cutoff** — correct for slamaltman, who wields a
  strong sword. Admitting them was still right for other characters.
- **`wowheadRecall` in the default report is circular** — the Wowhead list is a
  curation input. Use `--hold-out-wowhead` for the honest number. Known,
  documented, `wontfix`.

---

## Useful numbers (all measured, all re-derivable)

| | |
|---|---|
| Universe | 238 (p2), 362 (p3) |
| Tier coverage | 15/15 |
| Baseline DPS | 2003.26 |
| Above cutoff | 43 of 357 ranked |
| Cutoff | `{absDps: 3.4, pct: 0.15}` |
| Wowhead recall, list as input | 100/123 (81.3%) |
| Wowhead recall, **held out** | 78/123 (63.4%) ← quote this one |
| Best-family held out | 15/21 |
| Raid-sourced Best held out | 14/14 |
| Junk filter (measured, **not applied**) | 119/362 caster-only (32.9%) |

Re-rank: `pnpm rank --region US --realm dreamscythe --character slamaltman
--offline --max-phase 3 --report .scratch/rank-reports/<name>.html` (~15 min,
363 sims).

---

## Repo hazards

- **A host freeze on 2026-07-29 zero-filled two git refs** (the branch ref and
  `refs/stash`) — 41 null bytes rather than deletion. Commits survived; the tip
  was recovered from `.git/logs/HEAD`. If git reports "your current branch
  appears to be broken", check `od -c .git/refs/heads/<branch>` before panicking.
- `vendor/` is gitignored. `pool-hardening.test.ts` skips vendor-dependent tests
  when `vendor/wowsims/db.json` is absent, so a green CI run proves less than a
  green local run.
- A sparse clone of wowsims/tbc-new sits in the scratchpad from the polearm
  investigation; `ui/core/player_classes/paladin.ts` is the authority for class
  weapon proficiencies.

---

## Do not

- Land, merge into `dev`, or set `TBC_ALLOW_DEV_MERGE=1` without an explicit ask.
- Apply the junk filter before ticket 18's sim measurement.
- Re-report the known non-raid gaps as new findings.
- Quote 81.3% or 14/14 as the headline recall figure.
