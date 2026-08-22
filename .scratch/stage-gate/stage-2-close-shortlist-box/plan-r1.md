# Plan — stage-2-close-shortlist-box (revision 1)

Revised after Gate B review (`plan-review.md`, verdict `revise`). Every finding F1–F13 is addressed below; none is rebutted. The coordinator's corrected intent on F3 (live re-sim, not fixture replay) and F7 (the no-second-seat reading was wrong) is folded in.

## Goal

PLAN.md §14 Stage 2's last gate box — `☐ ≥3 real characters produce believable shortlists` — is either checked, amended to a named reduced set, or left open with evidence, and `docs/verification-log.md` carries a dated entry that says which and why. The entry quotes fresh SME verdicts produced on rankings regenerated at this tip (engine pin v0.0.119, owner-export feral skeleton) by a **live re-sim against the pinned binary** — the CLI's real execution path — not the stale 2026-08-06/08/14/18 verdicts. Ticket 250 is closed or updated with a domain verdict and either a cleanly attributed replacement measurement or an explicit **superseded-and-unreproducible** ruling on its old pair. Ticket 227 carries a disposition note. Non-blocking findings are carry-forward tickets. `pnpm verify` is green on the tip.

## Approach

Order: establish the binary and its verification chain first (it is a hard precondition for everything — F3), re-measure ticket 250's question on the current pin at the honest attribution level (F1/F2), regenerate the three shortlists by live re-sim with the cost stated (F3), then spend **two** `gate-sme` spawns on **different questions over different inputs**: seat 1 reads the three shortlists cold (Q1 + Q3's unprompted watch); seat 2, afterwards, judges the Q2 measurement and the above-cutoff movement (ticket 250). Documentation reconciliation last.

**Why two seats now (F7).** The brief's "do not run the SME pass twice" forbids re-reading the *same output* twice, not spawning twice. Ticket 250's framing — "a rotation rewrite moved which items read as upgrades" — hands a seat a ready-made explanation for exactly the rows Q3 needs raised unprompted. So the three-character believability read runs first and clean; the rotation/movement question runs second, on the Q2 arms and the set-delta, with an explicit instruction not to re-issue shortlist verdicts. This deviates from the stage-gate skill's spawn-once default on the coordinator's instruction; the executor logs it as an accepted deviation, and the contested-verdict re-spawn rule still applies on top.

**Anchoring (F8), addressed rather than assumed away.** One seat still reads all three characters, and its verdicts will share a calibration. Accepted, with reason: Gate C dispositions caveats across characters, and a shared caveat threshold is what makes those dispositions comparable — the rejected per-character-spawn design trades that for independence Q1 mostly does not need, because Q1-B's win condition ("structurally unjudgeable") is a property of the *input* (wrong fight, missing capture), not of a calibrated quality threshold, so it survives anchoring. Mitigation: the seat is instructed to complete each character's findings table and verdict before opening the next report, in fixed order slamaltman → shredzepelin → nexess, and to name per character what evidence would have flipped the verdict.

**Strongest rejected alternative:** trust the existing SME handoffs and close on paper. `.scratch/handoffs/` holds twelve `sme-rank-judgment-*.md` files (F6/C7) — including two 2026-08-14 ret-p3 judgments at `trust-with-caveats` and four ticket-scoped feral judgments from 2026-08-18 — but every one predates the 2026-08-21 pin moves (`0c1902e`, `0dc29b4`), rotation adoption (`d41c46c`), and owner-export skeleton (`25e8173`, `b7bcf51`). The rankings they judged no longer exist. Rejected on dates, not verdict contents.

### What the stale write-up gets wrong now

Corrected in Step 7's new log entry (the 2026-08-08 section is not edited in place):

1. "only shredzepelin was ever put through `sme-rank-review`" — false. Twelve SME handoffs exist; per-character latest before this branch: slamaltman `do-not-trust` (2026-08-06), later ret-p3 pool judged `trust-with-caveats` twice (2026-08-14); nexess `do-not-trust` (2026-08-06); shredzepelin `trust-with-caveats` (2026-08-08); plus ticket-222/223/224/225 judgments (2026-08-18). Verified: `ls .scratch/handoffs | grep sme-rank-judgment` and per-file `git log -1 --format='%h %ad'`.
2. "the count of usable characters is 2, not 3 … needs a genuine cat capture for shredzepelin" — resolved by `78ca9af` (`test/fixtures/shredzepelin-cat.raw.json`, Void Reaver; `cli.ts:372` routes to it). Phase-2 ticket 06 closed.
3. PLAN.md:859 — stale on its first clause ("only shredzepelin has been through `sme-rank-review`") and on "the feral universe … does not exist on `dev`". Its operative conclusion — a fresh pass is needed — was and remains correct (F12); the log entry says exactly that, no more.

### Open questions

**Q1 — does the box close?** Candidates A (close), B (close on a named reduced set — changes what the box asserts), C (leave open), win conditions exactly as pre-registered in the brief: A — all three verdicts `trust`/`trust-with-caveats`, every caveat fixed here or SME-agreed-ticketed; B — one character structurally unjudgeable and the other two `trust`; C — any `do-not-trust`, or a finding that the ranking is wrong in a non-disclosure way. Two plan-added refinements: (i) B's anticipated blocker was fixed by `78ca9af`, so B needs a *new* structural finding to win; (ii) per F10, a `do-not-trust` traced to replicate-seed spread is a **C win via open ticket 236**, recorded as such — not a new ticket, and a thing seat 1's handoff must make traceable (its findings cite which rows sit inside the replicate spread the report discloses). **Measurement:** seat 1's verdict strings on Step 4's regenerated reports. The committed fixtures cannot pre-measure a judgment — that is why the box is open; the plan pre-registers the decision rule, not a winner.

**Q2 — is the ~18 DPS feral regression expected, or a mismatch?** Short circuit first: the 740.67/722.55 pair predates both the v0.0.119 pin and the owner-export skeleton (C5), so it is re-measured before any explanation is chosen. The review's F1 changes what can be measured: tip's rotation is **coupled to tip's consumables** — `selectedPotion`/`selectedConjured` reference itemIds `22788, 22832, 31677` that exist only in tip's `potions`/`conjuredItems` arrays, and `scripts/build_feral_skeleton.py:92-97` says dropping those lists "silently disarms the rotation's Dark Rune and Flame Cap branches while the sim still returns a confident number". So a rotation-only splice in either direction moves two variables (C16), and **no arm set over these two skeletons isolates the rotation alone**. Consequences, pre-registered:
- **The unit of comparison is the adoption package** (rotation + the consumables block it is coupled to) — which is also exactly what `d41c46c` adopted. Two arms, one variable (the package), binary and everything else held at tip: Arm 1 = tip skeleton; Arm 2 = whole `d41c46c^` skeleton (old rotation with its native, internally consistent consumables; the reviewer's diff walk confirms the package is the *only* difference). Both on the v0.0.119 binary, 20k iterations, `randomSeed:"42"` (explicit overrides — tip's skeleton carries `25000`/`"443754031"`, per the review's C4 note).
- **Ticket 250's rotation-only attribution is recorded as superseded-and-unreproducible**: its pair was itself a whole-skeleton comparison on a binary we no longer pin, and the coupling makes a clean rotation-only re-measure impossible on these artifacts. That ruling is written into the ticket regardless of what the arms show.
- **Candidate C (mid-rework upstream): retired.** The lock pins `feral_default.apl.json` at tag v0.0.119 and the synced file carries the same 22-action `priorityList` (C3) — upheld by the review. Stated reason for dropping: measured refutation at content level.
- **Candidate B (unmet preconditions)** is tested *within Arm 1*, independent of any comparison: extract per-action cast counts from the result JSON; zero-cast actions — the Dark Rune (`22788`) and Flame Cap (`31677`) branches specifically — tied to an unset input decide B.
- **Candidate A (expected on its own terms)** wins if Arm 1's actions all fire and any remaining Arm-1-vs-Arm-2 gap tracks a nameable difference; if the gap is unnameable it is recorded as `hypothesis` in the ticket, not asserted.
- **Hypothesis, untested at 20k (C14, rescoped):** on the current pin the adoption package is not materially worse — directional only, from the planner's 100-iteration whole-skeleton probe (774.87 vs the old pair's 740.67; both whole-skeleton numbers, per F2 not attributable to the rotation).
- Seat 2 (not seat 1) reads the arms plus the above-cutoff movement (ticket 250's 15→27/36→55, superseded at tip by 20/43 per C11) and gives the domain verdict.

**Q3 — disclosure scope for ticket 227's healer rows?** Candidate A (surface the per-row mechanism) wins if seat 1, unprompted, calls a feral shortlist misleading because of those rows; Candidate B (nothing this branch, 227 stays open) wins if it does not raise them. **Measurement:** seat 1's handoff, produced before seat 2 exists and from an input note containing neither ticket 250's framing nor any healer/mana wording — frame-level separation (F7), plus the word-level check as a backstop. The committed fixtures cannot measure this any other way: it is defined as an unprompted-judgment observation. Consequences: A → handled under Q1-A's caveat rule (fix on-branch only if the SME says the shortlist misleads without it; else an SME-agreed carry-forward ticket); B → dated note on 227, stays open.

## Claims register

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | Engine pin at tip is tag v0.0.119, commit `3267f8d` | yes | `grep -E '"(tag|commit)"' data/wowsims.lock.json` (review: stands) |
| C2 | Pinned binary at `vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe` (22,305,280 bytes); `vendor/` is gitignored, so a fresh worktree must regenerate it (`pnpm fetch:wowsimcli`, `pnpm sync:wowsims`) and no committed artifact may assert its presence without the regen command and a verification (F9) | yes | `ls -la vendor/wowsimcli-v0.0.119-win32-x64/`; `git check-ignore vendor/wowsims/db.json` (review: stands) |
| C3 | v0.0.119 ships the 22-action feral APL `d41c46c` adopted (lock sha256 `e74dfb1a…`/17209 bytes matches on-disk; `priorityList` length 22) — retires Q2-C | yes | `python -c "import json;print(len(json.load(open('vendor/wowsims/feral_default.apl.json'))['priorityList']))"`; `pnpm sync:wowsims:check` (review: stands) |
| C4 | The skeleton is a well-formed `RaidSimRequest` directly consumable by `wowsimcli sim --infile`; tip `simOptions` already carries `iterations: 25000, randomSeed: "443754031"`, so Step 3 sets explicit overrides rather than filling blanks. Planner probe (100 iters) ran and returned dps 774.87 — whole-skeleton, directional only | yes | probe command in Step 3's `commands.md` once re-run by the executor at 20k; skeleton keys: `python -c "import json;print(list(json.load(open('data/presets/feral/p2.raid-sim-skeleton.json'))))"` |
| C5 | The 740.67/722.55 pair predates the v0.0.119 pin and the owner-export skeleton, was measured on a binary we no longer pin (`cbf6b75`), compared whole skeletons rather than rotations, and no literal invocation for it is recorded | yes | ticket text; `git log --oneline -4 -- data/wowsims.lock.json`; `git log -1 d41c46c --stat` (review: stands, sharpened per F2) |
| C6 | `pnpm rank` hard-errors without `--offline` (`cli.ts:265-270`), but `--offline` gates **only the gear source**; the CLI always constructs `CliSimRunner` (`cli.ts:52,408`) and live-sims every candidate at `DEFAULT_ITERATIONS=3000` × `DEFAULT_SEED_COUNT=5` (`rank.ts:502,527`). Routing: slamaltman→`slamaltman.raw.json`, shredzepelin→`shredzepelin-cat.raw.json` (Void Reaver, `cli.ts:372`), nexess→`nexess.raw.json`. `--report` writes `.html`+`.json` only — **no `.run.log` exists anywhere**. Ranking order is deterministic given binary+seeds; report bytes are not (`generatedAt`, `cli.ts:585`) | yes | `grep -n 'CliSimRunner\|RecordedSimRunner' packages/core/src/cli.ts`; `grep -n 'DEFAULT_ITERATIONS\|DEFAULT_SEED_COUNT' packages/core/src/rank.ts`; `grep -rn 'run\.log' packages/core/src/ scripts/ package.json` → none (replaces refuted old C6; F3/F5/F11) |
| C7 | Twelve SME handoffs exist under `.scratch/handoffs/`; per-character latest as listed in "stale write-up" item 1, including two 2026-08-14 ret-p3 `trust-with-caveats`. **All twelve predate the 2026-08-21 pin/rotation/skeleton commits, so none is usable for the gate** | yes | `for f in .scratch/handoffs/sme-rank-judgment-*.md; do git log -1 --format='%h %ad %s' --date=short -- "$f"; done` vs dates of `0c1902e d41c46c 25e8173 b7bcf51` (F6 fixed; conclusion upheld by review) |
| C8 | The stale-write-up statements are false at tip as itemised above (item 3 only on its first clause and the universe claim — F12) | yes | commands cited per item |
| C9 | PLAN.md:857 carries the sole ☐ in the Stage 2 gate block | yes | `grep -n '≥3 real characters' PLAN.md` (review: stands) |
| C11 | Tip feral above-cutoff sets: 20 rows (p2) / 43 (p3), baseline 2145.6, per `b7bcf51`, sourced from `synthetic-roster-recordings.json` — superseding ticket 250's 27/55; re-observed by Step 4 before any artifact cites it | no | `git show -s b7bcf51`; Step 4 reports (review: stands) |
| C12 | `git show d41c46c^:data/presets/feral/p2.raid-sim-skeleton.json` retrieves the old skeleton (12-action `priorityList`), whose **only** non-rotation difference from tip is the `consumables` block — usable as a whole-package comparator, **not** as a rotation-only one | yes | that command; the review's diff walk (F1 evidence); re-runnable: python compare of the two JSONs excluding the rotation subtree |
| C13 | Open tickets bearing on this work: 227, 236 (replicate seeds overlap RNG streams — touches `rank.ts:502-537`, can move the cutoff seat 1 reads), 240 (vendor-gated tests can silently skip — bears on what a green verify proves), 241, 250, 251, 252; 234 parked `wontfix`; phase-2 06 closed | no | `pnpm issues:open` (F10 fixed) |
| C14 | On the current pin, the adopted rotation+consumables **package** is not materially worse than the old package | no | **hypothesis, untested at 20k** — decided by Step 2's two arms; rotation-only attribution excluded by C16 |
| C15 | `packages/core/test/fixtures/synthetic-roster-recordings.json` is uniformly `simVersion: v0.0.119`; the per-character `test/fixtures/*.raid-sim-result.json` files remain `v0.0.101` and are read by no TS code (Python-composer outputs). No artifact may claim "all fixtures re-recorded" | no | `grep -o '"simVersion": *"[^"]*"' <each file> \| sort -u` (F4 fixed) |
| C16 | Tip's rotation is coupled to tip's consumables: `selectedPotion`/`selectedConjured` appear twice each in tip's rotation referencing `22788, 22832, 31677`, present only in tip's `potions`/`conjuredItems`; dropping the lists silently disarms the Dark Rune / Flame Cap branches. Therefore no rotation-only splice between these skeletons is clean | yes | `grep -c 'selectedPotion\|selectedConjured'` on the rotation subtrees of both skeletons; `sed -n '82,97p' scripts/build_feral_skeleton.py` |
| C17 | The CLI prints a fight-provenance line per run — `fightProvenanceLines` (`disclosure.ts:176`) emitted at `cli.ts:453`, format `gear read from <encounterName> (<report> fight <id>, <route> route)` — so a captured stdout transcript proves which fixture/fight fed a ranking | yes | `grep -n 'fightProvenanceLines' packages/core/src/cli.ts packages/core/src/disclosure.ts`; observed in Step 4 transcripts |
| C18 | ~~C10~~ withdrawn: `feral-skeleton-apl:check` validates APL field names against the pinned proto only; it does **not** gate rotation↔consumables consistency, so a green verify would not catch a confounded splice | no | review's C10 refutation; `scripts/check_build_feral_skeleton.py` / `apl_schema.py`; ticket 250's own "fields, not preconditions" line |

## Steps

Serial; single writer; no fan-out. Commit per green slice (Steps 2, 3, 4, 6, 7 each end in a commit).

**1. Baseline and binary chain.** `git rev-parse HEAD` (must be on `feat/stage-2-close-shortlist-box`, descendant of `9a4b932`; note `1ecd2e5` — ticket 252 — is already on the branch). If `vendor/` is missing: `pnpm fetch:wowsimcli && pnpm sync:wowsims` (hard precondition — Steps 2 and 4 are live-sim, F3). Record in `.scratch/stage-gate/stage-2-close-shortlist-box/binary-provenance.md`: binary path, byte size, its sha256 (`sha256sum vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe`), the lock's tag/commit, and the regen commands — every later artifact cites this file instead of asserting the binary exists (F9). Run `pnpm verify`; then confirm the vendor-gated tests **executed rather than skipped** (ticket 240): inspect the test output for skip markers on the vendored-path suites and record the observed test/skip counts in the same file.
*Done when:* verify exits 0 and `binary-provenance.md` is committed with hash, regen commands, and the skip-check observation. *Depends:* C1, C2, C13.

**2. Q2 re-measure — package-level, two arms, one variable.** Files: `.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/` — two request JSONs, two result JSONs, `commands.md` with literal invocations (ticket 250's pair had none — C5).
 a. Arm 1: tip `data/presets/feral/p2.raid-sim-skeleton.json`, overriding `simOptions.iterations=20000`, `randomSeed="42"` (overrides of existing values — C4), through `vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe sim --infile … --outfile …`.
 b. Arm 2: the **whole** `d41c46c^` skeleton (`git show d41c46c^:data/presets/feral/p2.raid-sim-skeleton.json`), same overrides, same binary. No splicing in either direction (C16); the package is the single moved variable (C12).
 c. Candidate-B instrument on Arm 1's result JSON: per-action cast counts; specifically whether the `selectedPotion`/`selectedConjured` branches (`22788` Dark Rune, `31677` Flame Cap) fired. Zero-cast actions tied to an unset input → Candidate B, name the input.
 d. `commands.md` states: both DPS means and their stated iteration/seed; the attribution level (**package, not rotation** — cite C16 and `build_feral_skeleton.py:92-97`); the pre-registered ruling that 250's rotation-only pair is **superseded-and-unreproducible**; and which of Candidates A/B the numbers plus cast counts point at (or `hypothesis` if the residual gap is unnameable). A green `pnpm verify` is **not** cited as evidence of skeleton consistency (C18).
*Done when:* both arms' request+result files and `commands.md` committed; `commands.md` names attribution level and candidate. *Depends:* C2, C3, C4, C5, C12, C14, C16, C18.

**3. State and bound the regen cost, then pick the protocol.** Step 4 is a live re-sim: 3000 iterations × 5 seeds **per pool candidate** per character (C6). Protocol decision, pre-registered: **run at product defaults** — the SME must judge the output the product produces, and C11's 20/43 counts came from the same machinery; a cheaper override would put a non-product artifact in front of the seat. Before committing to it, the executor times one character end-to-end (start with slamaltman); record wall time in `commands.md`. If a single character exceeds ~90 minutes, stop and escalate to the gatekeeper with the measurement (choice between accepting the cost and a *recorded, disclosed* override) rather than silently downscaling.
*Done when:* the first character's wall time is recorded and the protocol (defaults, or an escalation) is written down. *Depends:* C6.

**4. Regenerate the three shortlists, capturing provenance.** On the tip, per character (flags per C6; if the CLI rejects one, read `--help`, adapt, ledger the deviation):
```
pnpm rank --region US --realm dreamscythe --character slamaltman   --offline --spec ret   --max-phase 3 \
  --report .scratch/rank-reports/stage2-close-slamaltman.html   2>&1 | tee .scratch/rank-reports/stage2-close-slamaltman.stdout.txt
# same shape for shredzepelin and nexess, --spec feral --max-phase 2
```
The stdout transcripts are the provenance artifact (C17, replacing the nonexistent `.run.log` — F5). Note each feral report's above-cutoff count next to C11's 20/43.
*Done when:* three `.html`+`.json` reports and three `.stdout.txt` transcripts committed; each transcript contains a `gear read from …` line, and shredzepelin's names Void Reaver (not Morogrim); each transcript also records the invocation and is cross-referenced from `binary-provenance.md` (F9). If the provenance line turns out not to name the encounter, add `sourceFixture`/`encounterName` to the report `meta` (`cli.ts:578-588`) as a ledgered code step — not silently. *Depends:* C6, C11, C17.

**5. Seat 1 — the three-character read (Q1, Q3).** Assemble `.scratch/stage-gate/stage-2-close-shortlist-box/sme-input-shortlists.md`: the three report paths, transcripts, regen commands, pool files, and `binary-provenance.md`. It must contain **neither ticket 250's framing nor any rotation-movement narrative, nor any healer/mana wording** (frame separation, F7). Backstop: `! grep -qiE '250|rotation|regression|227|healer|mana|intellect|spirit|mp5' <file>`. Spawn `gate-sme` (model `opus`): verdict per character, findings tables, fixed reading order slamaltman → shredzepelin → nexess, each character's section completed before the next is opened, and per character the evidence that would have flipped the verdict (F8). Findings that turn on cutoff-adjacent rows must state whether the row sits inside the report's disclosed replicate spread (ticket 236 tracing, F10). Handoff: `.scratch/handoffs/sme-rank-judgment-stage2-close-shortlists.md`, committed verbatim.
*Done when:* handoff committed with three verdict strings and the flip-evidence notes. *Depends:* C6, C7, C13, C17.

**6. Seat 2 — the ticket-250 question (Q2 domain half).** Only after Step 5's handoff is committed, spawn `gate-sme` a second time on a **different question and input**: Step 2's two arms, the cast-count evidence, and the above-cutoff movement (27/55 → 20/43). Its prompt states it must not re-issue shortlist believability verdicts (that output is already judged — the brief's actual rule). Handoff: `.scratch/handoffs/sme-rank-judgment-stage2-close-ticket-250.md`. The executor ledgers the second spawn as the coordinator-approved deviation from the skill's spawn-once default.
*Done when:* handoff committed with a verdict on ticket 250's acceptance items (regression expected / mismatch / superseded, with reasoning). *Depends:* Step 2, C11, C14, C16.

**7. Disposition and documentation.** Apply the pre-registered rules:
- Q1 from seat 1's verdicts: A → check the box at PLAN.md:857; B → amend the line to name the trusted set with the third's blocker recorded (Stage 0 ☒ `race` precedent); C → stays ☐ with the blocking finding named; a `do-not-trust` traced to replicate spread cites ticket 236, no new ticket (F10).
- Q3: seat-1-raised-unprompted → Q1-A caveat rule; not raised → dated note on ticket 227, stays open.
- New `docs/verification-log.md` entry (dated; the 2026-08-08 section corrected by reference, not edited): verdicts quoted with both handoff paths; regen and re-measure commands; binary provenance per `binary-provenance.md` (regen command + hash — F9); the three stale-statement corrections with their citing commands; the C15 scoping (only `synthetic-roster-recordings.json` is v0.0.119; the two `v0.0.101` composer outputs named as such — F4); the ticket-236 and 240 caveats as named limits on what the entry claims.
- PLAN.md: line 857 per the Q1 outcome; line 859's prose corrected only on its false clauses (F12).
- Ticket 250: close or update — domain verdict from seat 2; old pair marked superseded-and-unreproducible (or superseded-by, if Step 2 attributed cleanly at package level) with the literal replacement commands; all three acceptance boxes resolvable from the ticket text.
- Ticket 227: note per Q3. Carry-forward tickets for other non-blocking findings, linked from the log entry.
*Done when:* `grep -n '≥3 real characters' PLAN.md` shows the dispositioned line; the log entry exists and cites both handoffs; tickets updated. *Depends:* C7, C8, C9, C13, C15, Steps 2, 5, 6.

**8. Final gate.** `pnpm verify`; `git status --porcelain` empty; `git diff --stat 9a4b932..HEAD` touches only manifest paths (plus `1ecd2e5`'s ticket 252, already on-branch); anything else becomes a ledger row.
*Done when:* verify exits 0 and the diff check passes.

## Paths manifest

Create:
- `.scratch/stage-gate/stage-2-close-shortlist-box/binary-provenance.md`
- `.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/` (2 requests, 2 results, `commands.md`)
- `.scratch/stage-gate/stage-2-close-shortlist-box/sme-input-shortlists.md`
- `.scratch/rank-reports/stage2-close-{slamaltman,shredzepelin,nexess}.{html,json}` and `.stdout.txt`
- `.scratch/handoffs/sme-rank-judgment-stage2-close-shortlists.md`
- `.scratch/handoffs/sme-rank-judgment-stage2-close-ticket-250.md`
- `.scratch/carry-forward/issues/<new-number>-*.md` (zero or more)

Modify:
- `docs/verification-log.md`
- `PLAN.md` (lines 857 and 859 area only)
- `.scratch/carry-forward/issues/250-feral-rotation-regression-unreviewed.md`
- `.scratch/carry-forward/issues/227-healer-role-items-score-above-the-feral-cutoff.md` (note only)
- **Conditional (Step 4 fallback only, ledgered):** `packages/core/src/cli.ts` (report `meta` fields) and its test

No partition — serial, single-writer; no `parallel-phase` fan-out.

## Verify recipe

```
pnpm verify
git status --porcelain                      # must print nothing
git diff --stat 9a4b932..HEAD               # only manifest paths + 1ecd2e5's ticket file
grep -n '≥3 real characters' PLAN.md
grep -n 'stage2-close' docs/verification-log.md
grep -l 'gear read from' .scratch/rank-reports/stage2-close-*.stdout.txt | wc -l   # 3
grep -i 'void reaver' .scratch/rank-reports/stage2-close-shredzepelin.stdout.txt
! grep -qiE '250|rotation|regression|227|healer|mana|intellect|spirit|mp5' \
    .scratch/stage-gate/stage-2-close-shortlist-box/sme-input-shortlists.md
pnpm issues:open                            # 250 closed or updated per Step 7
```

## Out of scope

- The role-relevance product question (ticket 234, `wontfix`) — no re-opening, no re-running 227's diagnostics.
- Fixing tickets 236 (seed overlap) and 240 (vendor-gated skips) — they are **named caveats** in the log entry and Q1 tracing rules here, not work items; likewise 241, 251, 252 stay open and untouched.
- Re-recording `test/fixtures/{slamaltman,shredzepelin-cat}.raid-sim-result.json` to v0.0.119 — unread by TS code (C15); if the SME or executor finds that misleading, it is a carry-forward ticket.
- A rotation-only attribution for ticket 250 — established unreachable on these artifacts (C16); do not attempt splices.
- `WclGearSource` / going live; any Stage 3 web-shell work.
- Editing the historical 2026-08-08 verification-log section in place.
- Merging to `dev`; `pre-merge-review` and the merge ask follow this pipeline.
- Changing skeleton, rotation, pool, or ranking code beyond the single ledgered Step-4 fallback — a `do-not-trust` demanding a code fix is a loop-back to the gatekeeper, not scope growth.
