# Plan review — reforge-catchup-leftovers

Reviewer seat (`gate-reviewer`, Opus, effort medium), read-only, against
`brief.md` + `plan.md` + `research-notes.md` on `feat/reforge-catchup-leftovers`
@ `33babf0`.

**VERDICT: revise.** The plan is careful, well-cited, and mostly correct about
the codebase. Three findings are blocking: the Q1 probe cannot answer Q1 as
constructed, its exact-equality test is refuted by this repo's own committed
measurement, and C17's provenance conclusion — which redirects ticket 351 — is
unsupported by the evidence given.

## Findings

| ID | Severity | Where | What breaks | Evidence |
| --- | --- | --- | --- | --- |
| F1 | blocking | Plan § Q1 probe design (C9/C10), Step 3 | **The probe measures a spec that has no off hand.** The fixture player is `feralCatDruid`, and `pool.ts:373-378` excludes feral from `DUAL_WIELD_SPECS` with the comment "Ret and feral are absent deliberately: neither can put anything in the off hand." Ticket 350 is reachable *only* for enh/warrior/hunter (the ticket's own table). Writing 13385 into index 15 of a feral request builds a set the ranker would never compose, so whatever the engine does with it, the result does not describe our path — the same defect the plan's own rejected-alternative rebuttal uses to reject the fury-warrior probe ("the result would not describe our path"). The probe answers "what does the Go equip layer do with an arbitrary 2H+OH proto", which is *related* to Q1 but is not the composed request ticket 350 is about. | `packages/core/src/pool.ts:369-378`; fixture player key `feralCatDruid` |
| F2 | blocking | C12, Step 3.3, Step 4 | **"B avg == A avg exactly" is refuted as a test, and the degraded fallback cannot resolve the effect.** The sim splits iterations across `runtime.NumCPU()` goroutines with per-shard offset seeds and merges by weighted float summation, so bit-equality holds only per-machine — and this repo already measured and committed that. `compute-topology.md:177` records "Reproducible across different core counts? **No, bit-identical**", and the repo's own standing rule is "Live-binary float assertions must use `toBeCloseTo`". Worse, the fallback is unsound at this effect size: fixture `stdev = 127.966` at 3000 iterations gives `3·stdev/√3000 = 7.01 DPS`, while a +8 Agility swap on a ~2152 DPS feral is a fraction of that. Both "drops" and "counts" would land inside the threshold, so the degraded test returns "no difference" either way and Step 4's mapping fires the wrong branch. Step 3 runs A twice on *one* machine, which will show equality and wrongly certify the exact test. | `F/sim/core/sim_concurrent.go:500,530,39-46`; `docs/plans/compute-topology.md:176-177,207-209`; `stdev` from `shredzepelin-cat.raid-sim-result.json` |
| F3 | blocking | C17, Step 6, Step 7 ticket 364 | **C17's evidence does not support its conclusion.** `merge-base --is-ancestor db05fed93 ec5c5f2` → rc 0 is true, but ancestry in the *pin's* history does not establish upstream provenance. The `upstream` remote (`wowsims/tbc-new`) is configured and **has never been fetched** — no `refs/remotes/upstream/*` exists — so nothing local can distinguish upstream commits from fork-native ones. `db05fed93` is authored by a fork contributor and is reachable only via `origin/*` (= the fork). This is precisely the AGENTS.md "property measured against one option is not a comparison" trap. Filing 364 as "upstream's defect" would record a false provenance claim. | `git -C F remote -v`; `git -C F for-each-ref refs/remotes/` (only `origin/*`); `git -C F log -1 db05fed93` |
| F4 | material | Step 4, "drops" branch | The drops→Option 2 mapping contradicts the plan's own conditional-code rule and misreads the recorded position. The plan says drops means "no engine code this branch", yet commits 350 to Option 2 — the option the codebase comment argues *against*. The rebuttal is reasonable but is decided before the measurement and on a probe (F1) that cannot support it. Under drops, the honest recording is that the DPS column is right by accident while `statDeltaBetween` still overstates — an argument about the *delta column*, not a selection between Options 1 and 2. | `packages/core/src/rank.ts:907-920`; ticket 350 § "The decision this ticket owes" |
| F5 | material | Step 2 | Step 2's acceptance is weaker than the handoff's and drops its sharpest check: the handoff pre-registers **467 eligible items** for ret, "so a different number is itself the finding", plus the header check ("Phase 3 (2.2 - T6) - Alpha"). Without a pre-registered number, "ranked rows appeared" is close to vacuous. | `HANDOFF-leftovers.md:128-133` |
| F6 | material | Job 1 framing, ticket 362 | The plan inherits a "never run" framing the current handoff corrects: the fork Go suite (22 packages, all `ok`) and a browser load *did* run during the catch-up but were never written to a repo file. 362 should record them as run-but-unrecorded (weaker evidence, cheap to repeat) rather than never-run, or it files a false statement. | `HANDOFF-leftovers.md:76-94` |
| F7 | minor | C5 / Step 1 | C5 understates the finding: newest artifact 13:12 vs merge commit `16f8fba` at 13:25, so the built tree predates the merge. `lib.wasm.gz` (11:07) predating `index.html` (13:12) by two hours also means the prior browser load ran against a partially stale bundle, weakening F6's evidence further. | `ls -la` on `F/dist/tbc/` |
| F8 | minor | Step 7, ticket 363 | The 363/358 boundary is thinner than the plan implies — 358 §2 already states the cap mechanism, citing `candidate-order.ts` and `rank.ts:1100`. 363 must carry the *exposure and candidate fixes*, not the mechanism narrative. | `358-…md:41-53` |
| F9 | minor | Paths manifest | The "no fan-out" claim checks out. No file appears in two independently-runnable slices; serial execution correctly asserted. | Paths manifest vs Steps 1–8 |

## Register verdicts

Stands: C1, C2, C4, C5 (understated), C6, C7, C9, C10, C11, C13, C14, C15,
C16, C19, C20, C21, C23, C24, C25.
**Refuted: C12, C17.**
Untestable in a read-only pass (not re-run): C3, C8, C18, C22, C26.

Note on C10: a subagent claimed it refuted on the item's *name*; that reasoning
was discarded — the admission predicate governs, and `itemFitsSimSlot`
(`pool.ts:401-405`) admits `HandTypeOffHand`.

## On the `air` question

C4 stands, and more cleanly than the handoff suggests. `$(OUT_DIR)/.dirstamp`
(`makefile:18-23`) has four prerequisites — `lib.wasm.gz`,
`ui/core/proto/api.ts`, `$(ASSETS)`, `$(OUT_DIR)/bundle/.dirstamp` — none
routing through `air`; `host` (`:296`) lists `air` as a direct prerequisite and
`.dirstamp` does not. The target genuinely avoids the dependency rather than
deferring it. Separately the `air` recipe (`:152-159`) is gated inside
`ifeq ($(WATCH),1)`, so even `make host` only fails on missing `air` when
`WATCH=1`. `node_modules` and `$(AUTO_GEN_FILES_TS)` are transitively covered
via `bundle/.dirstamp` (`:25-36`).

## What must change before execution

1. **Rebuild the Q1 probe on a dual-wield spec** (enh/warrior/hunter) — or, if
   no committed skeleton supports one, record Q1 as **unmeasurable from
   committed inputs** and say so, exactly as the plan already does for the swing
   half. The probe cannot be repaired by swapping the item; the spec is wrong.
2. **Replace the exact-equality test.** Compare with a tolerance, and pick an
   effect size the run can resolve — a +8 Agi off-hand cannot be distinguished
   at 3000 iterations. Either raise iterations substantially or choose a
   high-stat off-hand whose expected contribution clears the noise floor.
3. **Drop C17's provenance conclusion.** Either fetch the `upstream` remote and
   re-measure against a real `upstream/feature/backend-reforge` ref, or file 364
   as "defect in the pinned engine, provenance unestablished".
4. Re-scope Step 4's drops branch to record the delta-column finding rather than
   pre-selecting Option 2; restore the 467-item and header checks to Step 2;
   correct 362's framing per F6.

The unconditional `disclosure.ts` work (Step 6.2), the ticket-filing procedure
(Step 7), and the serial-execution claim are sound and can proceed as written.
