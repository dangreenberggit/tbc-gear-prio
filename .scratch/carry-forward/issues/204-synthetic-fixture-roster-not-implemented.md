Status: closed
Type: plan item not implemented
Origin: `feat/candidate-pool` REPORT.md deviation 5, ruled on in `docs/plans/wowsims-tab/candidate-pool.md` §3.4 (2026-08-15)
Blocks: candidate-pool M2 resumption (7.2 held-out recall needs it); adding any new spec to the roster
Blocked by: none

# Build the synthetic fixture roster from candidate-pool §7.a

§7.a says fixtures are synthetic characters — upstream's preset gear set for
the spec worn with the sim's default settings — one per DPS spec with a
committed universe, gear point chosen so the full-sweep shortlist has ≥ 10
above-cutoff rows (pre-raid or p1 preset at `maxPhase 2`), ret tuning and
every other spec gating. Both fixtures on the branch are still WCL-derived
(`packages/core/src/fixtures/feral-offline.ts` and the slamaltman ret
fixture). Nothing that shipped needed the rule (M2 was not built, so no
held-out recall gate ran), which is why it slipped; it is needed the moment
M2 resumes (ticket 203) and it is what lets a new spec join without WCL.

## Done when

- One synthetic fixture per roster spec, recorded with the pinned toolchain
  (`data-pipeline-work`), the (spec, preset phase, `maxPhase`) triple in the
  fixture header, and the above-cutoff row count ≥ 10 asserted in a test.
- The WCL-derived feral fixture is either replaced or kept alongside with a
  one-line reason in §7.a.

## 2026-08-15 — done

Merged as `fe3883e`. One synthetic character per DPS spec, built from
upstream's committed preset gear rather than a WCL log.

| spec  | preset phase | `maxPhase` | above-cutoff / pooled |
| ----- | ------------ | ---------- | --------------------- |
| ret   | 1 (pre-raid) | 2          | **38 / 240**          |
| feral | 1 (pre-raid) | 2          | **42 / 246**          |

Both clear §7.a's ≥ 10 floor comfortably. `packages/core/test/synthetic-fixtures.test.ts`
asserts the floor **and** the (spec, preset phase, `maxPhase`) triple, so a
future data change cannot quietly erode either. Verified by the orchestrator:
4 tests pass, replaying deterministically from the committed recordings.

Files: `packages/core/src/fixtures/synthetic-offline.ts`,
`scripts/record_synthetic_fixtures.mjs`,
`packages/core/test/fixtures/synthetic-roster-recordings.json`.

**The WCL fixtures were kept, not replaced.** §7.a said to replace feral's if
it was WCL-derived; the worker checked what depends on them first and found
`feral-preset.test.ts` and `slamaltman-offline.test.ts` cover
confidence-from-form-uptime, salvation uptime and talent capture — behaviour
that exists *only* because WCL data is ambiguous. A synthetic fixture has no
such ambiguity, so it cannot stand in for those tests; replacing would have
deleted the coverage. Reason recorded in §7.a per this ticket's own rule.

**Deviation:** the prompt said preset gear comes from a nested fork clone at
`vendor/tbc-new-fork`. Presets actually arrive via
`python scripts/sync_wowsims.py --restore` into `vendor/wowsims/*.gear.json`,
governed by a lockfile. The worker used the real mechanism and documented it.

Status: **closed**.
