# START HERE — upstream cleanup + gem/meta repair fix (issue #1)

You are on `feat/set-bonus-value`. This directory drives the pre-Phase-3 cleanup. You should not need to read anything else to start; everything below says where to look only when you reach the step that needs it.

## The story in five sentences

We believed upstream wowsims had no gem optimizer, so Phase 2 built its own gem repair. That belief was false twice over: the optimizer exists (named `suggest_reforges` — TBC has no reforging, the component name is inherited), and its active development lives on the `feature/backend-reforge` branch, not the tag we pin. Comparing our shipped code against upstream's found real bugs in ours, one bug in *theirs* (prismatic gems), and a trap for the next upstream bump (their new feral rotation uses a field our pinned binary **silently drops** — no error, just wrong numbers). We stay pinned to tag `v0.0.101` for building and treat the branch as reference only; re-pin happens when upstream tags a release. The fixes below are ordered and the order matters.

## Do this, in this order

**0. Feral noise floor (independent — can run while anything else happens).**
Run a five-seed spread on a feral character and re-derive the tie cutoff for feral. The current cutoff (`3.4 dps / 0.15%`) was measured once on *ret* and applied to feral, whose rotation is noisier — feral rankings may be treating noise as real upgrades today. Ret's derivation: `docs/five-seed-spread.json` + `scripts/five_seed_spread.py`.

**1. Failing tests first.**
Each fix below gets a test that would have caught the bug. This whole effort exists because a wrong belief went unchallenged; tests are the guard rail.

**2. Socket-match fix.**
`socketsMatch` (in `packages/core/src/meta-repair.ts`) and `allSocketsMatched` (in `candidate-gems.ts`) both treat an unfilled *meta* socket as breaking an item's socket bonus. The game only requires the coloured sockets to match; upstream skips non-coloured sockets (`sim/core/reforge_optimizer/gear.go`, `socketBonusActive`). Fix both predicates to skip meta sockets. **Then measure**: this changes repair pricing on every ranking, not just meta-socket items — run ≥2 real characters before/after and eyeball the diffs.

**3. Regem-minimization pass (blocked on step 2).**
After a repair, put the player's original gems back wherever the repaired layout allows, so recommendations use gems they already own. Full spec: `investigation2-comment.md` §1 in this directory (search "minimizeRegems spec"). Two traps written there: the pre-repair layout is currently overwritten in place (`rank.ts`, around the `repairMeta` call) and must be captured first; and the user-facing swap report must be rewritten, not appended to.

**4. Separate "gave up" from "impossible", stop killing whole rankings.**
The repair loop throws the same `MetaUnsolvableError` for "no legal gem layout exists" and "hit the 32-attempt limit". Make them distinct errors. Both should fail only the affected result — today `RankError("meta-unsolvable")` aborts the entire ranking, at **two** sites in `rank.ts` (baseline path and per-candidate path; fixing one leaves the other live).

**5. Quality cap into a chokepoint; close ticket 114.**
The rare-gem cap is enforced by call-site discipline (two palettes on one context, easy to grab the wrong one). Move it inside the palette accessor so no caller can bypass it. While there: `null` quality passes a `<=` check in JS where `undefined` doesn't — add the type guard (carry-forward ticket 114, the only gem-area ticket still open).

**6. Spike: how is the meta gem chosen for non-ret specs?**
Today it's hardcoded (`PREFERRED_META_IDS = [32409]` in `candidate-gems.ts`) — correct for ret, silently wrong for everyone else, and EP weights cannot rank meta gems. This is a design question, not a fix. Output: a short note proposing the mechanism, then an implementation item.

**7. Prismatic documentation (not a code fix).**
We count prismatic gems toward all three meta colours; upstream counts them as nothing. **We are right** — that is the game rule — and an earlier draft of this plan wrongly ordered a "fix" to match upstream. Add a code comment at the prismatic mapping in `meta.ts` and a test pinning our behavior. Optionally file the bug upstream. Low impact either way: both prismatic gems are resistance-only (zero EP), so the solver never picks them.

**8. Upstream-connection guard rails (Part A — independent of 1–7, do anytime).**
- `scripts/sync_wowsims.py`: add a `--ref`/commit mode (it is tag-only today; a branch name exits with an error) and make it fail loudly when `vendor/` is empty — an empty vendor dir is how "the source isn't here" got reported as "the feature doesn't exist".
- Add `feature/backend-reforge` to `data/wowsims.lock.json` as a watched ref so drift checks cover it.
- Skeleton schema gate: `build_feral_skeleton.py` copies APL JSON blindly and the pinned binary **silently discards** fields it doesn't know (`DiscardUnknown: true`). Reject unknown APL fields at generation time. Upstream's new feral APL uses `timeToNextEnergyTick`, which our pin doesn't have — without the gate, the next regen produces plausible wrong numbers with no signal.

**9. Doc corrections — LAST, after 1–7 settle.**
Fix `PLAN.md:650` (keep "the Go sim does not enforce meta activation" — true; delete "there is no upstream optimizer to borrow" — false). Write ADR-0025 recording the whole correction. Stamp rot-prone upstream claims with "as of `wowsims/tbc-new` @ v0.0.101 (`8aa378b3`)". Done last so the ADR records post-review conclusions, not superseded ones.

**Later, when upstream tags a release:** re-pin checklist is in `impact-comment.md` (bottom section) — lockfile bump, 2-row item regen, feral skeleton + APL round-trip check, feral EP re-derivation, fixture re-recording, cache invalidation, 4-step determinism check.

## Then triage

Carry-forward tickets not resolved above: `111, 107, 103, 29, 20, 06, 04` in `.scratch/carry-forward/issues/`. `103` (delta reads low vs a regemmed wowsims run) is plausibly explained by the missing regem-minimization — recheck it after step 3.

## Files in this directory

Snapshots of [issue #1](https://github.com/dangreenberggit/tbc-gear-prio/issues/1), which is canonical if they disagree. Read them only when a step above points into one:

- `issue-body.md` — Parts A/B/C framing and the settled pin decision
- `impact-comment.md` — first investigation (proto/db/sim/CLI impact of the branch); has the re-pin checklist
- `investigation2-comment.md` — second investigation; has the regem-minimization spec and the oracle comparison table. **Its checklist and line numbers are superseded** — cite symbol names, not its line numbers
- `review-corrections.md` — the independent review that produced the ordering above; authoritative on any conflict among the comments

Acceptance criteria for all gem work: PLAN.md §9 — repair not re-optimize, socket-bonus cost priced inside the cost function, every adjustment disclosed as a substitution.

Refs compared throughout: pinned tag `v0.0.101` = `8aa378b3`; branch `feature/backend-reforge` head = `d09edaaf8`, fetched 2026-08-12, clean fast-forward from the tag.
