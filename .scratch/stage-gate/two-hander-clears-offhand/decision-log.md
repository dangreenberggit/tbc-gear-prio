# Decision log — two-hander-clears-offhand

One dated line per gate: gate, outcome, reason, round count.

## 2026-09-10 — Stage opened

Branch `feat/two-hander-clears-offhand`, cut from `dev` at
`d4fdca5bec61cdccadd7f1fb6095eb3c98df0b4b` (the merge commit that brought
`feat/reforge-catchup-leftovers` into `dev`). `git status --porcelain` empty at
open.

This is the implementation half of ticket 350. The previous stage recorded the
decision; this one builds it. The owner's words on why it is being done now:
"I thought it was obvious it was supposed to be done."

**Settled before planning — not open questions:**

- **Option 2 is the fix.** Clear the off-hand slot when a two-hander lands in
  the main hand, and price that swap honestly. Option 1 (skip the attempt) was
  rejected because two-handers are a genuine upgrade path for enh, warrior and
  hunter.
- **The engine measurement is declined.** Establishing what the Go sim does
  with an impossible 2H+off-hand set was ruled "a waste of processing" by the
  owner, and the fix is identical under all three possible behaviours.
- **Option 2 does not override the existing guard comment.** The guard covers a
  two-hander already *worn* with a one-hander offered for the off hand; ticket
  350 is the mirror case, a two-hander as *candidate*. The scope statement
  making that explicit is already in the comment, merged to `dev`. The plan
  must not describe this as an override.

**Standing constraint, owner ruling 2026-09-10:** we do not modify upstream
wowsims code. The two files this fix touches — `packages/core/src/rank.ts` and
the fork's `upgrades/engine/rank.ts` — are two copies of **our own** ranking
engine, not upstream's. Nothing under `sim/` (Go) or `ui/core/` outside our
`upgrades/` tree may change. If the fix appears to require it, the executor
stops and reports.

A separate read-only audit is running against the fork to inventory every
upstream file our branch has modified, and will produce ticket 369. It does not
block this stage.

**Known cost carried into the plan:** the ported-engine cycle
(`docs/agents/known-traps.md`) is mandatory — edit the fork copy, update its
PROVENANCE sha, commit in the fork, re-pin the lock, re-verify — and the
resulting fork commit must be **pushed**, or ticket 355's single-disk risk
silently re-opens.

## Gates

| Date | Gate | Outcome | Reason | Rounds |
| --- | --- | --- | --- | --- |
| 2026-09-10 | Stage open | done | brief + log written, branch cut from `dev`, tree clean, SHA logged | — |
| 2026-09-10 | Q3 i18n scope | allowed | the two upstream i18n files are additive-only in our own `upgrades_tab` namespace; the owner's ruling targets their engine, not a locale string our tab needs | — |
| 2026-09-10 | Gate A | pass | every template section present, claims register C1–C24, Paths manifest split repo/fork, Q1–Q4 each answered with candidates differing in kind and a pre-registered winning condition; both trees clean | 1 |
| 2026-09-10 | Gate B | loop back (1 revision) | no blocking findings; 4 material (F1–F4) accepted, C8 reclassified load-bearing, 3 minor accepted as corrections | 1 |
| 2026-09-10 | Gate B (re-judged) | pass | revision 1 applies F1–F7 and the C8 reclassification; no finding stands; both trees clean | 1 |
| 2026-09-10 | Gate C (part 1, ticket 350) | pass | all 7 ledger rows dispositioned; C8 ordering, anchor count and guard-untouched verified by the orchestrator; `pnpm verify` rc=0 | 1 |
| 2026-09-11 | Gate C (part 2, fork lint gate) | pass | all 5 ledger rows dispositioned; red-proof and scoping-proof reproduced by the orchestrator; `pnpm verify` rc=0 with the gate at chain position 22 | 1 |

## 2026-09-10 — Gate C, part 1 (ticket 350)

Executor reported complete: 6 commits, `pnpm verify` rc=0, 1199 tests passing,
E-W3 green both before and after the fork hash moved.

**Orchestrator's own verification of the load-bearing claims** (not taken on the
report's word):

- **C8 ordering holds in both copies.** `clearOffHandForTwoHander` at core 2107 /
  fork 2030; `swapItemAt(cleared, …)` at core 2112 / fork 2035. The clear runs
  first *and* the swap receives the cleared array — the thing the reviewer
  identified as silently corruptible.
- **Anchor count is 1 per copy**, so `removedItems?:` did not leak into the
  package type the plan excluded.
- **The existing guard is untouched** — the diff filter over
  `mainHandIsOneHanded|slotName === "offhand"` returns nothing.
- **Pin consistency three ways** at that point: remote, lock `commit`, and
  `forkCommit` all `812db29d`, `pushed: true`.
- **Ticket 350** reads `Status: closed`.

### Ledger dispositions

| Row | Deviation | Disposition | Reason |
| --- | --- | --- | --- |
| 1 | T4 relaxed from "exactly 1" to `<= 1` differing index | **accepted** | A test bug, not an engine bug: identity swaps differ in 0 because 16 of 17 worn fury items are in `warrior-p2` and owned rows survive the cap. The property forbids a candidate moving a slot it never claimed; it does not require an identity swap to move one. The `twoHanderAttempts > 0` guard keeps it from passing vacuously. |
| 2 | `PoolEntry` import path corrected | accepted | Mechanical. Vitest strips type imports so tests ran either way, but `tsc` would have failed — catching it was right. |
| 3 | Byte-identical digest re-pinned 32565 → 32575 | **accepted** | +10 is exactly 2 rows x ("\n" + 4-space indent) from the new template slot, and the executor confirmed no markup renders because neither test row carries `removedItems`. Arithmetic, not a silent re-baseline. |
| 4 | `prettier --write` on one file | accepted | Formatting only. |
| 5 | Fork copy restyled to match its surroundings | accepted | The fork has no `.prettierrc`, so nothing would have caught quote/paren drift. |
| 6 | "override" already present in ticket 350 | **accepted, flagged correctly** | Verified: the two hits in core `rank.ts` are pre-existing (both at base `d4fdca5b`, zero added by this branch — one a doc comment on a gem-phase parameter, one prose about `RankInput.fight`). Ticket 350's own instance is the owner's recorded negation, "Option 2 is not an override of that comment". Deleting a negation that forms part of the decision record would falsify it. Nothing new was written. |
| 7 | Fork tab not linted or type-checked by any gate | **accepted, and closed by part 2** | Reported rather than hidden. Became the next piece of work. |

## 2026-09-11 — Gate C, part 2 (fork lint gate)

Prompted by row 7 above and by the owner's direction: gate our fork files only,
because "they may add things that fail our lint" and "we don't want to be
rearranging others files with linting junk."

**Orchestrator's own verification** — both proofs reproduced rather than quoted:

- **The gate can go red on our code.** `oxlint --deny-warnings -D no-console`
  over `upgrades_tab.tsx` → rc=1, four `no-console` errors. A gate never proven
  red is theatre; this one is not.
- **Our paths are clean under the real gate flags** → rc=0.
- **Scoping proof, stronger than an injection.** Upstream
  `ui/core/components/gear_picker` fails `--deny-warnings` *standing, today* →
  rc=1 with six warnings, while `python scripts/check_fork_lint.py` → rc=0. The
  owner's hypothetical is already the present state, and the gate correctly does
  not care.
- **Wiring**: `fork-lint:check` present in `package.json` and in the `verify`
  chain; the script reuses `_fork_gate.require_pinned_fork` like its siblings,
  and carries two `return 0` skip branches for an absent clone and an absent
  `node_modules` — important, since `vendor/` is gitignored and CI may lack it.
- **Pin consistency three ways**: remote, lock `commit`, `forkCommit` all
  `f90b12a7`, `pushed: true`. Both trees clean.

### Ledger dispositions

| Row | Deviation | Disposition | Reason |
| --- | --- | --- | --- |
| 1 | `oxlint --fix` cleared 23 of 24; the duplicate import needed hand-merging | **accepted** | My measurement said "resolves them cleanly" on a one-file sample and over-generalised. The executor measured the real set, found the non-autofixable case, and fixed it within the step's own intent rather than reporting a blocked gate. |
| 2 | Typecheck measured at 21s, kept in the chain | accepted | The brief's split-out condition ("if too slow") was tested and not met, so the default stood. Measured twice. |
| 3 | 14 PROVENANCE rows rewritten, not one or two | **accepted** | My brief said "any ported engine file you touched" and implied a small number; an import-sort pass touches many. Same action, larger scope, and the drift gate re-validates all 33 rows. |
| 4 | `ENGINE_FORK_COMMIT` deliberately left at `8db275d7d` | **accepted** | A deliberate non-action with a stated reason: that constant's own convention names the last commit that changed engine *behaviour*, and an import reorder changes none. E-W3 proves it. Correct restraint. |
| 5 | Upstream already fails `--deny-warnings` today | **accepted** | Did the requested injection *and* reported the standing failure as better evidence. I reproduced it independently. |

**Two inherited claims corrected by measurement**, both worth keeping: the fork's
PROVENANCE prose asserts `core.autocrlf=true` and calls the drift gate
"unpassable across a checkout/merge cycle" — measured `false` in both trees, and
the gate passes. And a first PROVENANCE grep returning nothing was a wrong
regex, not a missing table; the executor said so rather than building edits on
it.

**The one open item, correctly escalated rather than decided.** The type-check
is the fork's whole-project `tsc --noEmit`, because a type error in our tab
usually surfaces in the file that imports it. It passes today, but if upstream
lands a type error of their own, this gate goes red for a reason that is not
ours. The script's failure message says exactly that and tells the reader to
report it rather than edit upstream's file. The alternative — scoping the
typecheck to our paths and losing cross-file coverage — was not taken
unilaterally. Left as-is; revisit if it ever actually fires.

**Next:** `pre-merge-review` over the whole branch, then merge if it checks out
(owner's standing instruction, 2026-09-11), run sequentially.

## 2026-09-10 — Gate B re-judgment on revision 1

Both trees clean, repo HEAD `b7e224f`, fork HEAD `0b50f402`. One revision round,
the skill's norm. No blocking finding stands, so execution proceeds without a
second review round.

**C8 — cleared, and it is now enforced rather than asserted.** The register
marks it `yes`, and step 3 carries the ordering as acceptance criterion (iv):
the executor must show by grep that `clearOffHandForTwoHander(` sits at a lower
line number than the `swapItemAt(` call inside `candidateSwapWithRepairs`, and
that the `swapItemAt(` call's first argument is the helper's returned
`equipment` rather than the function parameter — quoting both lines in the
commit message. That converts the reviewer's finding from prose into something
a reader can re-check.

**F1 — cleared.** C14's stats clause now carries every stat of all four items,
and T2 asserts the **whole sparse delta object**
(`{0: 49, 1: 28, 2: 32, 17: -40, 18: -40, 20: -20, 31: -168}`) with the
arithmetic spelled out — Str +49 and Sta +32 from the main-hand swap, Agi +28
and the four negatives including the off-hand debit. The revision also adds the
right instruction for a surprise: if the red run's actual object differs by keys
other than the off-hand stats zeroing, the executor reports the actual object
and its cause rather than editing the expectation to match. That is the
difference between a test and a rubber stamp.

**F2 — cleared, and the fix is better than the plan it replaces.** Rather than
inventing a stdout-capturing harness, the row note goes through a pure formatter
`formatRemovedItemsLines` in `rank-report-rules.ts`, tested on hand-built rows
in `cli-shortlist.test.ts`. Orchestrator-verified that this is the file's real
precedent: `grep -c 'formatSetPotentialLine' packages/core/test/cli-shortlist.test.ts`
→ **4**. C26 confirms the module already imports `getItem` and is already
imported by both `cli.ts` and `rank-report.ts`, so no new import edges. A
stdout harness is explicitly listed Out of scope.

**F3 — cleared, anchor verified by the orchestrator.**
`grep -c 'emptyMetaSocket?: boolean;'` returns **1** in core's `rank.ts` and
**1** in the fork's copy, so the anchor is unambiguous where
`gemSubstitutions` was not. Step 3 acceptance (v) additionally requires
`grep -c 'removedItems?:'` → 1, which would catch an accidental second
insertion into the package type.

**F4 — cleared.** The schema `required` edit is now mandatory, with C16
measuring the object at 18 properties / 18 required / `additionalProperties:
false`, and step 6's acceptance asserting `19 19` after the edit. The plan also
records that only `en/` exists, so there is no other-locale breakage.

**F5, F6, F7 — cleared.** Step 4 now states the correct reason it passes (the
clone HEAD has not moved and core's `rank.ts` is in no hash table), and warns
against generalising that to step 7. C23's red window is narrowed to steps 8→9.
The `pushed: true` flip-back at step 12 is marked mandatory, with a defect
defined if it is skipped. Counts corrected: four fork files at step 6, five at
steps 7 and 8.

**Ready for execution.** The plan's own final step runs the `dont-be-stupid`
checklist before reporting, which is the right last move for a stage that
touches two engine copies, a pinned lock and a remote push.

## 2026-09-10 — Gate B judgment

Reviewer verdict **revise**. Zero `blocking`, four `material` (F1–F4), three
`minor` (F5–F7), plus one register reclassification. Both trees clean after the
review seat ran; repo HEAD still `b7e224f`, fork HEAD still `0b50f402`.

**The approach survives, and that is the important half.** The reviewer
attacked Q1's site choice directly and could not break it: `screenCandidates` in
the fork really does take `outcome.equipment` from `candidateSwapWithRepairs`
and hand it to `runBulkScreen`, so a clear placed beside the existing guard
would have left the screening pass pricing illegal 2H+OH sets while the loop
priced legal ones — the exact drift the shared `attemptEligibility` exists to
prevent. It also cleared the `equipmentForCandidateSwap` worry I flagged at
Gate A: its callers are head/shoulder/belt swaps, never `mainhand`, so a silent
off-hand clear cannot fire there. Q2 holds — no gem or stat stage reads the
off-hand slot specifically.

**C8 reclassified to load-bearing — the most useful catch.** The plan marked it
`no`. The reviewer verified that `candidateSwapWithRepairs` calls
`swapItemAt(equipment, …)` as its first statement and `swapItemAt` computes
`fillOptsForSwap(equipment, slotIndex, gemCtx.spec)` from that same input array.
So the entire Q2 answer depends on the clear running **before** `swapItemAt`.
Clearing afterwards would leave a unique gem on the removed off-hand still
blocking the two-hander's socket — wrong output, and no test on this path
asserts gem internals, so nothing would catch it. The revision must make that
ordering an explicit acceptance criterion of step 3.

**F1 — accepted, verified independently by the orchestrator.**
`python` over `data/items/index.json`: Gorehowl (28773) carries
`{0: 49, 1: 43, 2: 51}` (Str/Agi/Sta), Dragonstrike (28439) `{2: 19}`, Talon of
Azshara (30082) `{1: 15, 17: 40, 18: 40, 20: 20, 31: 168}`. So T2's two asserted
values survive by luck — AP and melee hit happen to be the two stats neither
main-hander carries — while the stated reason ("carry neither stat") is false
and C14's stats clause omits Talon's Agi 15 and Armor 168. A whole-object
`toEqual` on the delta would fail. The revision states the full expected delta.

**F2 — accepted, verified independently.**
`grep -rln 'runCli\|printShortlist' packages/core/test/` returns nothing. The
CLI-output test the Paths manifest promises does not exist, so step 4's
acceptance is vacuous for the CLI half and the executor would either invent an
unplanned harness or ship the render uncovered.

**F3 — accepted, verified independently.** `gemSubstitutions` is declared twice
per copy: core `rank.ts` at 289 (row type) and 402 (package type); fork at 245
and 297. "Next to `gemSubstitutions`" names four possible insertion points, one
of which is the package type the plan's own Out-of-scope excludes. Re-anchor on
a row-only neighbour.

**F4 — accepted.** The schema's `upgrades_tab.results.required` lists all 18
existing keys, so the `required` edit is mandatory rather than the conditional
the plan describes. An omitted entry is invisible to `test-locales.mjs`, since
AJV only checks that required keys are present.

**F5, F6, F7 — accepted as corrections.** F5 fixes a wrong *reason* behind a
right conclusion (the drift check hashes only fork files; step 4 passes because
the clone HEAD has not moved, not because "the fork gates are untouched"), and
narrows the red window to steps 8→9. F6 is advisory. F7 is a miscount: five
fork paths, four at step 6.

**Q3 ruling upheld.** The reviewer explicitly did not object to allowing the two
i18n files, and confirmed the alternative would break `test-locales.mjs`.

One revision round, as the skill's norm allows. No blocking finding stands, so
execution proceeds once the revision clears.

## 2026-09-10 — Q3 ruling: the two i18n files are in scope

The plan escalated this rather than assuming, which was correct. It proposes
adding one key to `vendor/tbc-new-fork/assets/locales/en/translation.json` and
one property to `schemas/translation.schema.json`, and asks whether the owner's
"do not touch upstream code" ruling covers them.

**Ruling: allowed.** Measured, not assumed:

- `upgrades_tab.tsx` does **not** exist at the upstream base —
  `git -C vendor/tbc-new-fork cat-file -e ec5c5f2…:ui/core/components/individual_sim_ui/upgrades_tab.tsx`
  fails with rc=128. That file is ours outright.
- `assets/locales/en/translation.json` **does** exist upstream (same command,
  rc=0) and carries **44** commits from our branch;
  `schemas/translation.schema.json` carries 22.

So these are upstream files we have been adding to all along, in a namespace we
own (`upgrades_tab.*`). Ticket 369's audit classifies both as "additive, our
namespace, low risk" and neither appears among its two high-conflict paths
(`item_list.tsx`, `sim_header.tsx`).

The owner's concern, in his words, was "we should not be fucking with their
code" — raised about their **engine**. The audit answered that: one Go file
touched, no sim output moved. A locale string our own tab renders is not that.
Refusing it would mean hard-coding English into the tab, which is worse: it
breaks their i18n gate (`test-locales.mjs`) and makes the tab the only
untranslatable surface in the app.

**Constraint carried to the executor:** additive only. One key, one schema
property, no edit to any string upstream owns. If the schema's `results` object
lists its keys as `required`, add the new key there too — that is the file's own
convention, not a change to theirs.

## 2026-09-10 — Gate A detail

Mechanical checks pass on the first round; no respawn.

- **Template sections:** Goal, Approach (with Q1–Q4), Claims register, Steps,
  Paths manifest, Verify recipe, Out of scope — all present.
- **Claims register:** 24 rows, load-bearing flags set, each carrying a
  re-runnable command or marked `hypothesis, untested` (C13, C24).
- **Paths manifest:** 9 repo paths and 5 fork paths, correctly separated, with
  the fork clone's distinct git noted.
- **Both trees clean:** `git status --porcelain` empty in repo and fork. Repo
  HEAD is `b7e224f` — the orchestrator's own ticket-369 commit on this branch,
  not seat drift; the plan's base `d4fdca5b` is its ancestor.

**Two things the plan does well enough to record.** Q1 rejects the site that
sits beside the existing guard — the obvious-looking choice — because the fork's
`screenCandidates` and the package loop compose through
`candidateSwapWithRepairs` directly, so a guard-site clear would leave the
screening pass pricing illegal 2H+OH sets while the loop priced legal ones. That
is a drift the fork's own PROVENANCE row exists to prevent. And Q4's T4 is a
property test over the whole `warrior-p2` universe asserting every candidate
request differs from baseline in exactly one index unless the candidate is a
two-hander — a real containment proof rather than a spot check.

**Carried to Gate B for the reviewer to attack:** C13 is `hypothesis, untested`
(the ret fixture's off hand being empty) and the plan says so; C8, C11, C20,
C21, C23 and C24 are marked not load-bearing — the reviewer should confirm that
classification rather than accept it, since C8 underwrites the gem-fill ordering
the whole Q2 answer rests on.
