# Pre-merge review — phase-0/close-gates

Diffed against: `dev...phase-0/close-gates` (`1d5cf2d`)

Reviewers: fresh subagents (adversarial, domain, standards, spec). No shared
memory of writing the branch.

---

## Adversarial

1. **`scripts/compose_slamaltman_raid_sim.py:229`** — `simVersion` is hardcoded
   `"v0.0.101"`; wowsimcli’s raw result has no such field, and the live
   `version` call is only printed, never written. Trigger: any binary under
   the hardcoded path (or a swapped binary) → fixture still claims
   `v0.0.101`, poisoning `RecordedSimRunner` / `contentHash` provenance for a
   plausible DPS.

2. **`scripts/compose_slamaltman_raid_sim.py:96–97, 161`** — `temporaryEnchant`
   is dropped and never mapped into consumables/imbues. Trigger: Slamaltman MH
   `temporaryEnchant: 2639` → request MH is permanent-enchant-only; sim returns
   a clean number that is not the logged weapon state.

3. **`scripts/compose_slamaltman_raid_sim.py:195–212`** — Fixture is written,
   then success is “`raidMetrics.dps.avg` exists”; `error` and
   `iterationsDone == 3000` are never required. Trigger: non-null `error` with
   leftover metrics, or partial `iterationsDone` → exit 0 and a
   committed-looking result file.

4. **`scripts/compose_slamaltman_raid_sim.py:109–114`** — Anti–filter-only
   guard asserts only sim indices 0/3/14 (head/back/MH). Trigger: a reorder
   that keeps those three but swaps e.g. trinkets/rings/wrist-hands → asserts
   pass, valid JSON, wrong DPS, no error.

5. **`scripts/compose_slamaltman_raid_sim.py:30` vs `scripts/fetch_wowsimcli.py`**
   — Compose pins a fixed `v0.0.101-win32-x64` path; fetch installs
   `wowsimcli-{lock.tag}-{platform}`. Trigger: lock/tag advances and both
   vendor dirs exist → compose keeps simming the old binary while lock/docs
   imply the new pin.

6. **`scripts/verify_fixture.py`** — Slot/enchant mismatches print
   `PLAN.md 8.4's table is WRONG` but still exit 0 (`main() or 0`). Trigger:
   wrong actor gear that still name-matches, or a bad fixture → CI/scripts
   treat the run as green.

---

## Domain

1. **`specID` is not a classification signal (docs + PLAN gate still treat it
   as one).** `docs/phase0-findings.md` §4 and PLAN §14 cite `specID` /
   talent-tree points. In `slamaltman.raw.json`, **all 25 combatants have
   `specID: 0`**, including Slamaltman (`5/11/45` → Ret by plurality).
   Consequence: Phase 1 that trusts `specID` (or treats `0` as Holy)
   mis-specs everyone; talent plurality is the only working signal in this
   fixture.

2. **Enchant/gem counts still cite the wrong actor in older prose.**
   `docs/phase0-findings.md` §10 / early verification-log R19: _"10/10 … All
   12 gems"_. PLAN §14 (this branch) corrected to _"9/9 … 10/10"_. Consequence:
   §10/R19 historical numbers remain Hagguth’s unless a reader notices the
   third-sitting correction.

3. **R4 claims meta activation; code never checks it.**
   `verify_fixture.py` asks _"is the meta active?"_ but only resolves IDs /
   colour histogram. Sim does not enforce meta (PLAN §9). Consequence:
   **2042.85** may include inactive-meta stats; gate is “logged gear sims,”
   not “legal gemming sims.”

4. **Slot-order tables duplicated** in `compose_slamaltman_raid_sim.py` and
   `verify_fixture.py` — second source can drift from PLAN §8.4 / R17.

5. **Binary pin hardcoded beside lockfile** — `fetch_wowsimcli.py` reads
   lock; compose / `slim_result` hardcode `v0.0.101`.

### Unverified

- `CombatantInfo.faction` shape (integer `1` vs documented `{id, name}`).
- MH `temporaryEnchant: 2639` not re-resolved in this sitting’s log.

---

## Standards + Spec

### Standards

**Hard — comment policy** (`AGENTS.md` / `docs/workflow.md`):

- `scripts/fetch_wowsimcli.py` — `ASSETS` comment says `(vendor dirname suffix,
binary name)` but values are `(zip asset, binary)`. Misleading; fix or
  delete.

**Judgement-call smells:** Duplicated Code (slot maps + actor lookup across
two scripts); Divergent Change (hardcoded win32 CLI/version vs lockfile-driven
fetch); Message Chains on raid/player path (acceptable for one-shot probe).

### Spec

**(a) Missing / partial**

1. Box 2 reproduction incomplete — log points at a gitignored share-link path;
   preset JSON is committed, exact decode re-run is not.
2. “One entry per box” only half-met — both boxes under one “third sitting”
   section.
3. `RecordedSimRunner` fixture is slimmed (avg/stdev), not a full
   `RaidSimResult` replay capture.

**(b) Scope creep**

1. `test/fixtures/ret-p2.raid-sim-skeleton.json` (~945 lines) — useful, not in
   Done when.
2. `events[0]` / actor-name fix — outside the two boxes; justified by the
   sitting’s discovery.

**(c) Looks done, looks wrong** — none material beyond (a)3. Slot path,
enchants, preset filename, loose ends, and gate ticks match the spec.

---

## Summary

| Axis        | Findings            | Worst                                                                        |
| ----------- | ------------------- | ---------------------------------------------------------------------------- |
| Adversarial | 6                   | Hardcoded `simVersion` / binary path can poison RecordedSimRunner provenance |
| Domain      | 5 (+2 unverified)   | `specID: 0` on every combatant — Phase 1 must not trust `specID` as written  |
| Standards   | 1 hard + smells     | Misleading `ASSETS` comment                                                  |
| Spec        | 3 partial + 2 creep | Slimmed result fixture vs full `RaidSimResult` Done when                     |

Do not merge until the findings above have been read. Merge is the user’s call.

---

## Disposition (post-review)

Fixed on this branch before merge:

| Finding                                           | Fix                                                                                     |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Adversarial: hardcoded `simVersion`               | Stamped from `wowsimcli version` into the slim fixture                                  |
| Adversarial: compose binary path vs lock          | `resolve_cli()` reads `data/wowsims.lock.json` tag + platform                           |
| Adversarial: success without checking error/iters | Validate `error` / `iterationsDone` / `dps.avg` **before** writing the committed result |
| Adversarial: `verify_fixture` exits 0 on mismatch | Exits 1 if WCL slot mismatches, R19 ambiguous, or sim-order disagree                    |
| Standards: misleading `ASSETS` comment            | Corrected                                                                               |

Deferred (out of this branch’s cheap-fix scope; workflow for parking them is a separate branch):

- Domain: `specID: 0` on every combatant — Phase 1 must not trust `specID` as documented
- Domain/Adversarial: full 17-slot assert; shared slot-map source of truth
- Adversarial/Domain: `temporaryEnchant` → consumable imbue
- Domain: meta activation check (PLAN §9 / gem solver)
- Spec: slim vs full `RaidSimResult`; share-link repro in git; one-entry-per-box log shape
