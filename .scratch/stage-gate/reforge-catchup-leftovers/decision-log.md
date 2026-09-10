# Decision log — reforge-catchup-leftovers

One dated line per gate: gate, outcome, reason, round count.

## Stage open

- **2026-09-10 — Stage opened.** Branch `feat/reforge-catchup-leftovers`, cut
  from `dev` @ `66ab791f3f6dbad133d264d400a0a24328e71e56`. The two untracked
  handoff files that were the owner's input were committed onto the branch
  first (`595c997`), so the stage opens against a clean tree. **Base SHA for
  the pipeline: `595c997`** — `git status --porcelain` empty at that tip.

- **2026-09-10 — Scope shape decided: stage-gate, not parallel-phase.** Jobs 2
  and 3 both land in `rank.ts` / `pool.ts` / `compose.ts` in both engine copies.
  `parallel-phase`'s own rule is that two slices editing one module is a
  sequencing problem, not a fan-out, so a fan-out was rejected at partition
  time rather than after. Job 1 touches no source and job 4 is ticket files
  only; neither justifies a second pipeline.

- **2026-09-10 — Citation trust recorded in the brief.** Three file:line
  citations from the two handoff documents were checked against the tree this
  session and all three were wrong (`rank.ts:1100`, `upgrades_tab.tsx` path,
  `candidate-order.ts:36-67`), while the underlying findings survived. The
  brief instructs every seat to locate by symbol and treat handoff line numbers
  as untrusted. This is the operational form of the owner's "grain of salt".

## Gates

| Date | Gate | Outcome | Reason | Round |
| --- | --- | --- | --- | --- |
| 2026-09-10 | Plan (spawn) | lost fan-in | `gate-planner` (fable) dispatched four `Explore` researchers and ended its turn waiting on them. Background completions notify the parent session, not a finished manager, so the reports reached the orchestrator instead. No plan returned. | 1 |
| 2026-09-10 | Plan (respawn) | plan returned | `SendMessage` is **disabled in this session**, so the skill's normal recovery — resume the cut-off seat, which retains its context — was unavailable. The four reports were captured to `research-notes.md` and the seat respawned against brief + notes so the research is not re-paid for. | 2 |
| 2026-09-10 | Gate A (mechanical) | pass, with one flag | Every template section present; Claims register has 26 rows; Paths manifest present; all three brief questions answered with candidate/win-condition/measurement. `git status --porcelain` **empty** — the read-only planner wrote nothing. Flag: the branch tip moved from `595c997` to `33babf0` during the stage, not by any seat — see below. | 2 |

## Gate B (judgment) — 2026-09-10, round 2 → revision round 1

**Outcome: loop back to the planner.** Three blocking findings; I verified all
three myself rather than taking the reviewer's word, per the skill's rule that
a seat contradiction is settled by re-running the command.

| Finding | Verdict | What I ran |
| --- | --- | --- |
| F1 — probe measures a spec with no off hand | **holds, decisively** | `pool.ts:369-378` comment reads "Ret and feral are absent deliberately: neither can put anything in the off hand"; `DUAL_WIELD_SPECS` = `rogue, enh, warrior, hunter`. Fixture player key is `feralCatDruid`. The probe cannot be repaired by swapping the item — the spec is wrong. |
| F2 — exact-equality test unsound | **holds on effect size; its quotation is wrong** | See correction below. `stdev` confirmed at `127.9659250680645` on `avg 2152.0765440146747`, so the 3σ/√3000 floor is ~7.01 DPS and a +8 Agility off-hand cannot clear it. |
| F3 — C17's provenance conclusion unsupported | **holds** | Fork has an `upstream` remote for `wowsims/tbc-new`, but `refs/remotes/` holds only `origin/*` — no `upstream/*` was ever fetched. `db05fed93` is authored by `Bisonpasfuté`, a fork contributor. Ancestry in the pin's history says nothing about provenance. |

### Correction to F2, carried into the revision

The reviewer quoted `compute-topology.md:177` as "Reproducible across different
core counts? **No, bit-identical**", which is not what the file says and reads
as self-contradictory. The actual line is:

> **No, bit-identical — but equal to ~1e-12 DPS.**

So cross-core-count runs agree to about 1e-12 DPS, not arbitrarily. This does
**not** rescue the plan — an exact-equality test still breaks across core
counts, and the effect-size half of F2 is untouched and is the half that
blocks. But the revision must restate the claim with the real number rather
than inheriting the reviewer's garbled version.

Material findings F4–F6 and minor F7–F9 ride along to the revision as written.

## Gate B round 2 — 2026-09-10, revision 1 → proceed

**Outcome: proceed to execution.** One revision round, which the skill calls
the norm. No blocking finding still stands, so there is no second loop-back.

How each blocker was answered:

- **F1** → the feral probe is **withdrawn, not repaired**. Q1 is recorded as
  unmeasurable from committed inputs, with ticket 365 filing the missing
  dual-wield fixture. This is the honest answer: C13 and the new C27 (only
  `data/presets/feral/` has a loadable skeleton) mean any dual-wield request
  would be hand-authored, which is the very thing `direct-sim-support.ts` warns
  does not describe our path. The plan kept one real observation — the live
  enhancement page in Step 2.3 — and labelled its reach precisely
  (separates rejects from not-rejects; cannot separate drops from counts).
- **F2** → C12 restated with the repo's own numbers, and the reviewer's garbled
  quotation corrected: cross-core-count runs agree to ~1e-12 DPS. No
  exact-equality test survives. The 7.01 DPS noise floor is carried into ticket
  365 as a sizing constraint on the future measurement.
- **F3** → C17's conclusion dropped. Provenance became a *measured* step with
  three pre-written outcomes (`upstream` / `fork` / `unestablished`), and
  ticket 364 must carry whichever word the fetch yields. No claim of upstream
  provenance without a fetched `upstream/*` ref.

Material findings: F4 (Step 4 now records the delta-column finding and selects
no option), F5 (Step 2 restored the 467-item and header checks), F6 (ticket 362
reframed as "run but never recorded") — all fixed in the plan, none accepted
with a reason. Minor F7–F9 ride along; F9 confirmed the no-fan-out claim.

**Net effect on scope:** this branch now lands almost no code — one
`disclosure.ts` sentence and its test — and four tickets. That is the correct
outcome for a job whose two headline bugs both turned out to be unmeasured.

## Flag — a parallel writer on this branch

`33babf0` ("Write the leftovers handoff, sourced and failure-pathed", author
`daniel`, 2026-09-10 14:42) landed on `feat/reforge-catchup-leftovers` while the
planner was running. It rewrites
`.scratch/handoffs/wowsims-reforge-catchup/HANDOFF-leftovers.md` (+125/−31) —
the document this stage's brief was built from. No seat of this pipeline wrote
it; `git status` was clean before and after, and the planner is read-only.

Per stage-gate step 2, an unexplained tree change is **reported, never
reverted**, because another agent's live work looks identical from here
(ticket 261). It is left in place. The brief and plan were sourced from the
`595c997` version of that handoff; the rewrite is reconciled against them
before the Executor is spawned rather than after.

## Notes carried forward

- **`SendMessage` is disabled here.** Stage-gate's Recovery section assumes a
  cut-off seat can be resumed. It cannot be, in this session. Any seat that
  stops early must be respawned with its context reconstructed in the prompt.
  Budget for that when spawning the Reviewer and Executor.
- **Researcher output files on disk were zero bytes.** The reports existed only
  in the task notifications, so they were transcribed into `research-notes.md`
  by hand. Do not assume the task output directory preserves a subagent report.
- **The handoff's citation confusion is now explained, not just flagged.** The
  cap line genuinely is `rank.ts:1100` — in `packages/core`. It is `:1180` in
  the fork copy. The handoff cited the core line number against the fork file.
  The finding was right; the file was wrong.
