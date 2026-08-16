Status: open
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
