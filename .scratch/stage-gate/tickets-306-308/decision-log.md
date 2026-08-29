# Decision log: tickets 306 and 308

Stage opened 2026-08-27.

- Base SHA at stage open: `b1d4467bfeae86310f33f29a5dd93dc6bd6e0a2f`
  (`git rev-parse HEAD`, branch `feat/upgrades-dedup-wowsims`).
- Tree clean at stage open: `git status --porcelain` empty.
- Fork HEAD at stage open: `38cb8ff80b438c8c31cbd8a868b7a6d45fe747bd`
  (`feat/upgrades-tab`), matching the pin in `data/wowsims-fork.lock.json`.

## Measurements taken before the brief was written

Recorded here so the plan builds on them rather than re-deriving them.

| Measurement | Command | Result |
| --- | --- | --- |
| oxfmt at our tip | `node ./node_modules/oxfmt/dist/cli.js --check ./ui` in the fork | 194 files fail |
| oxfmt at **pristine upstream** `cbf6b75a889e` | same command against a temp worktree | **157 files fail** |
| our own `upgrades_tab.tsx` | same, one file | fails |
| formatting that one file | `oxfmt` without `--check` | 53 lines (21+/32−), purely `arrowParens: "avoid"` |
| typecheck after that formatting | `tsc --noEmit` | exit 0 — safe |

The decisive one is the second row: **157 of the 194 failures are upstream's own
files on a commit this repo never touched**, and `.oxfmtrc.json` is upstream's
file (their commit `7e8fcb3d2`) with `oxfmt` pinned `^0.62.0` and 0.62.0
installed. So 306 is not our drift and not a version mismatch — it is an
inherited condition, which changes what a sensible answer looks like.

The formatting was applied only to measure the diff, then reverted; the tree was
confirmed clean afterwards.

For 308: the `wornAt` guard exists in **two** copies — the fork's
`upgrades/engine/rank.ts:680-681` and the main repo's
`packages/core/src/rank.ts:941-942` — so it is a ported engine file, gated by
`packages/core/test/wowsims-fork-parity.test.ts` and by `PROVENANCE.md` hashes.
`docs/agents/known-traps.md` prescribes a five-step cycle for editing one.

| Date | Gate | Outcome | Reason | Rounds |
| --- | --- | --- | --- | --- |
| 2026-08-27 | Stage open | opened | Owner asked to close 306 and 308. Brief written with two open questions (Q1 what 306's answer is given the redness is upstream's; Q2 whether second-copy placement is in scope at all). Two independent tracks, no shared files. | — |
| 2026-08-27 | Q2 input: item uniqueness | measured | The brief told the planner to verify whether the item DB carries item uniqueness, since `usedUnique` (rank.ts:1615) tracks gems only and missing data could have settled Q2 on its own. It does not: `data/items/index.json` carries a `unique` boolean on **every one of 8,253 items** (6,844 False / 1,409 True, no nulls), and **163 of the 735 rings/trinkets are non-unique** — a real population a player could wear two of. Sent to the planner. This removes the "no data, therefore out of scope" answer; it does not decide Q2, whose cost side (ported-file change across two copies + parity test + the owned-row filter) is unchanged. | — |
| 2026-08-27 | Gate A (mechanical) | pass | All template sections present; Claims register 12 rows; Paths manifest present; Q1 and Q2 each answered with a chosen candidate, a pre-stated win condition, a strongest-rejected alternative and dropped candidates with reasons; tree clean and SHA unchanged (planner edited nothing). | 1 |
| 2026-08-27 | Brief correction accepted | noted | The brief asserted 306 and 308 share no files. **Wrong, and the planner caught it:** 308 edits the owned filter at fork `upgrades_tab.tsx:1439` and 306 would format that same file (it fails oxfmt today). Verified by grep. The plan's serial sequencing — semantic change first, mechanical format second — follows from the correction and is the right call. | — |
| 2026-08-27 | Orchestrator pre-review check: B6 | concern raised | B6 says to drop a below-cutoff owned row "only when the row targets the slot the item is already worn in". Checked whether a row can know that: `owned` is a bare boolean from `equippedIds.has(entry.itemId)` (rank.ts:897, 1075) and records *that* an item is worn, never *where*. The row does carry its own target slot (`slot`/`slotChoice` via `effectiveSlot`, tab:1829), so the comparison is possible — but it needs the current equipment, and the tab has no equipment lookup at the render site (only `this.simUI.player` upstream). So B6 is implementable but under-specified as worded. Held for the reviewer rather than pre-empting its finding. | — |
| 2026-08-27 | Gate B (judgment) | loop back | Reviewer returned `revise` with six blocking findings. Three verified independently by the orchestrator. **F1 is the important one and it invalidates Track B's whole approach:** `rankUpgrades` emits one row per *item*, not per placement (`rank.ts:903-1075`, `let best` + `if (!best \|\| deltaDps > best.deltaDps)` + a single `RankedItem`), so relaxing the guard would make the second-copy placement *overwrite* the owned row rather than add one — silently changing that row's meaning. The guard condition itself traces correct on all four cases; the danger is one level above it. **F2/F3 are mine to own:** the brief's C3 input (157 files at base) was measured with oxfmt resolving no config ("No config found, using defaults", 674 files scanned). Run correctly from inside the worktree it is **85** over 529 files, so the owned set is 109, not ~37 — and 65 of those are generated `upgrades/data/` artifacts A2 would have hand-reformatted. Genuinely-ours set is **9 files**. Sequencing correction (F12), cycle ordering (F14) and A4 (F13) carry forward unchanged. | 1 |
| 2026-08-27 | Revision round 2 | received | Planner reversed Q2 on the corrected evidence: **308 becomes deliberately out of scope**, recorded as comments at the guard in both copies and at the owned-row filter, plus a follow-up design ticket carrying the redesign shape. 306 becomes a **9-file** scoped format plus a new `fmt` row in `fork-gates.md` (it has no fmt row today — C17). No ranking behaviour changes; the filter expression at 1439 is explicitly untouched. Register grew to C13-C19 covering the refuted claims. Held at Gate B pending an owner decision — see the next row. | 2 |
| 2026-08-27 | Owner decision pending | held | Orchestrator measured the real payoff of implementing 308 before recommending: of 163 non-unique rings/trinkets, **152 are Phase 1**, and the **actual ret-p3 pool contains exactly 3** (Band of Devastation, Ring of Ancient Knowledge, Blessed Band of Karabor). That is new information the plan did not have, and it argues the out-of-scope choice is right on payoff as well as on cost. Not executing until the owner rules, since they asked for both tickets 'taken care of' and out-of-scope is a narrower outcome than that phrasing implies. | — |
| 2026-08-27 | Gate B (judgment, round 2) | proceed | Reviewer returned `revise` narrowly: all ten round-1 findings genuinely resolved, Q2 reversal judged **sound, not evasion**, with the reviewer stating explicitly that C13/C14/C15 carry Q2 on their own and it would stand unchanged if C20 were deleted. Two new defects, both applied by the orchestrator rather than spending a third planner round: **G1** (owned set is 10 files not 9 — `upgrades/engine_provenance.ts` sits above `upgrades/engine/` so neither exclusion catches it; verified ungated and ours, C16 corrected to 34/10, all stale counts swept) and **G2** (A1's config guard checked for a string oxfmt never prints, so it passed on exactly the run it should reject; now verifies by scan counts). Reviewer also independently re-ran C20 and reproduced it exactly, while correctly holding it non-load-bearing. | 2 |
| 2026-08-27 | Execution | NOT started | Owner instruction: stop after the plan is done and hand off to a fresh agent. Plan is cleared; no code written; both trees clean at base SHA `b1d4467`. | — |
| 2026-08-27 | Execution | started | Owner asked to run the orchestration and pointed at `HANDOFF.md`, whose whole premise is that the out-of-scope ruling for 308 stands — taken as the ruling the previous row was waiting on. `gate-executor` spawned with `model: "opus"`, shared checkout, base SHA `7da81963939c0fe84d0a6265f6548e608b3283b8` resolved fresh (one commit ahead of the handoff's `b1d4467`; the extra commit is the stage artifacts themselves, and the executor was told so). Tree clean, fork at the pin. | — |
| 2026-08-27 | Execution | complete | Executor returned complete; final message written verbatim to `execution-report.md`. Two commits main (`8d94174`, `4b948e4`), two fork (`ada242cb`, `342f6a74`), fork not pushed. | 1 |

## Gate C — deviation ledger dispositions

Seven ledger rows, all dispositioned. Nothing sent back for rework. One
disposition was revised after the fact — see the `lint:css` row.

| Row | Disposition | Orchestrator check |
| --- | --- | --- |
| B5 oxfmt probe reformatted `engine/rank.ts` | **accepted** | Self-reported error, caught pre-commit and reverted; exactly the flagged-not-papered-over behaviour this seat exists for. Verified the outcome rather than the story: `git diff --name-only 38cb8ff..HEAD` under `upgrades/(engine\|data)/` returns only `PROVENANCE.md` and `rank.ts` — the intended Track B edit. No generated artifact was reformatted. Track A touched 0 files under `engine/`. |
| B6 fnm hook failure | **accepted** | Documented trap, documented fix. Reproduced it myself twice during Gate C (a `cd` into the fork in a compound Bash command), which corroborates the report. |
| B6 BOM in commit subject | **accepted** | `git log --oneline` shows clean subjects on all four commits. |
| A2 line-endings heuristic false positive | **accepted** | The plan's heuristic was a proxy; the executor measured the underlying property (0 CR bytes, diff survives `--ignore-cr-at-eol`) instead of satisfying the proxy. Better evidence than the plan asked for. |
| A2 `lint:js` warnings name touched files | **accepted** | Judged by before/after count (265 both ways) rather than by whether warnings mention touched files. Measures the right thing — introduced vs pre-existing. |
| A3 `lint:css` path defect | **fixed in place** | Verified independently: `ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss` exists, `ui/core/components/individual_sim_ui/_upgrades_tab.scss` does not. Executor correctly declined to edit a row outside both tickets' scope. I first filed it as ticket 310 — **wrong call, corrected on owner challenge:** a one-line doc fix does not warrant a board entry, and filing one is bureaucracy dressed as rigour. Row now spells the path out in full, verified `CSS_EXIT=0` before writing it, with a note that the scss tree does not mirror the `ui/core/...` layout of its neighbours. Ticket 310 deleted; `NEXT` back to 310. |
| Stashed the orchestrator's dirty `decision-log.md` | **accepted** | My row, written after the executor sampled status. Restored exactly as found and still the only dirty file. Correct handling given lint-staged runs against `*` with `--no-stash`. |

## Gate C — paths manifest cross-check

`git diff --stat 7da8196..HEAD` yields 9 files. Eight are ticket/stage artifacts
plus the two regenerated data files (`sim-implemented-effects.json`,
`wowsims-fork.lock.json`) that the B6/A4 re-pin cycle is required to move. The
ninth, `packages/core/src/rank.ts`, is **comment-only**: the diff adds 14 lines
above `const wornAt = ...` and changes no expression. All in-manifest; no
out-of-manifest path needed a new ledger row.

## Gate C — independent gate verification

Re-ran rather than trusting the pasted output:

- `pnpm verify` on the tip — `VERIFY_EXIT=0`.
- `packages/core/test/wowsims-fork-parity.test.ts` — 1 passed, 1 skipped,
  `PARITY_EXIT=0`. The two engine copies still agree after the comment edits.
- Scoped fmt gate, PATH pinned, from inside the fork —
  `All matched files use the correct format. Finished in 237ms on 10 files`,
  `SCOPED_FMT_EXIT=0`.
- Lock pin `342f6a74e68bfb5604d043bc32c0bca324a2f1de` equals fork HEAD;
  `pushed: false` untouched.
- Track B diff on `upgrades_tab.tsx` has **zero deletion lines**, confirming the
  owned-row filter expression is byte-identical.

| Date | Gate | Outcome | Reason | Rounds |
| --- | --- | --- | --- | --- |
| 2026-08-27 | Gate C | pass | Every ledger row dispositioned (6 accepted, 1 fixed in place); every changed path in-manifest; `pnpm verify`, parity, engine byte gate and the new scoped fmt gate all re-run green by the orchestrator. Tickets 306 and 308 closed, 309 open. Stage complete — `pre-merge-review` is next, then the owner is asked about merging. | 1 |
| 2026-08-27 | Gate C follow-up | corrected | Owner challenged the new-ticket pattern ("sounds sus"). Re-read 309 and 308 against the challenge. **309 stands:** 308's first acceptance box named "deliberately out of scope" as a sanctioned outcome when it was filed, before this pipeline existed, and the close is honest that no behaviour changed. **310 did not:** a one-line doc-path fix filed as a board entry is over-processing, so it was fixed in place and the ticket deleted. Recorded because the failure mode the owner named — closing tickets by filing tickets — is real, and one of the two instances was it. | — |
