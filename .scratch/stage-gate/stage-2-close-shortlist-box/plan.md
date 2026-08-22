# Plan — stage-2-close-shortlist-box (revision 2)

Revised after Gate B round-2 review (`plan-review-r1.md`, verdict `revise`). R1–R8 are addressed; none is rebutted. Per the coordinator, the plan's shape, the two-seat SME design, the frame separation (F7), and the anchoring treatment (F8) are unchanged from revision 1 — the edits are confined to Step 2's arm design and decision rules, C6/C12/C16/C17, Step 3's cost arithmetic, Step 4's transcript, Step 8's diff base, and Out of scope.

## Goal

PLAN.md §14 Stage 2's last gate box — `☐ ≥3 real characters produce believable shortlists` — is either checked, amended to a named reduced set, or left open with evidence, and `docs/verification-log.md` carries a dated entry that says which and why. The entry quotes fresh SME verdicts produced on rankings regenerated at this tip (engine pin v0.0.119, owner-export feral skeleton) by a **live re-sim against the pinned binary** — the CLI's real execution path — not the stale 2026-08-06/08/14/18 verdicts. Ticket 250 is closed or updated with a domain verdict and a **corrected, rotation-attributable measurement** of its DPS pair on the current pin (the rotation is isolable — see C16). Ticket 227 carries a disposition note. Non-blocking findings are carry-forward tickets. `pnpm verify` is green on the tip.

## Approach

Order: establish the binary and its verification chain first (hard precondition for everything live-sim), re-measure ticket 250's question on the current pin with a **three-arm design that isolates the rotation as a single variable**, regenerate the three shortlists by live re-sim with the cost bounded by a real prior measurement (ticket 200), then spend **two** `gate-sme` spawns on **different questions over different inputs**: seat 1 reads the three shortlists cold (Q1 + Q3's unprompted watch); seat 2, afterwards, judges the Q2 arms and the above-cutoff movement (ticket 250). Documentation reconciliation last.

**Why two seats (F7, upheld at round 2).** The brief's "do not run the SME pass twice" forbids re-reading the *same output* twice, not spawning twice. Ticket 250's framing — "a rotation rewrite moved which items read as upgrades" — hands a seat a ready-made explanation for exactly the rows Q3 needs raised unprompted. So the three-character believability read runs first and clean; the rotation/movement question runs second, on the Q2 arms and the set-delta, with an explicit instruction not to re-issue shortlist verdicts. This deviates from the stage-gate skill's spawn-once default on the coordinator's instruction; the executor ledgers it, and the contested-verdict re-spawn rule still applies on top.

**Anchoring (F8, upheld at round 2).** One seat reads all three characters and its verdicts share a calibration. Accepted, with reason: Gate C dispositions caveats across characters, and a shared caveat threshold is what makes those dispositions comparable; Q1-B's win condition ("structurally unjudgeable") is a property of the *input*, not of a calibrated quality threshold, so it survives anchoring. Mitigation: fixed reading order slamaltman → shredzepelin → nexess, each character's findings table and verdict completed before the next report is opened, and per character a note of what evidence would have flipped the verdict.

**Strongest rejected alternative:** trust the existing SME handoffs and close on paper. `.scratch/handoffs/` holds twelve `sme-rank-judgment-*.md` files (C7) — including two 2026-08-14 ret-p3 judgments at `trust-with-caveats` and four ticket-scoped feral judgments from 2026-08-18 — but every one predates the 2026-08-21 pin moves (`0c1902e`, `0dc29b4`), rotation adoption (`d41c46c`), and owner-export skeleton (`25e8173`, `b7bcf51`). The rankings they judged no longer exist. Rejected on dates, not verdict contents.

### What the stale write-up gets wrong now

Corrected in Step 7's new log entry (the 2026-08-08 section is not edited in place):

1. "only shredzepelin was ever put through `sme-rank-review`" — false. Twelve SME handoffs exist; per-character latest before this branch: slamaltman `do-not-trust` (2026-08-06), later ret-p3 pool judged `trust-with-caveats` twice (2026-08-14); nexess `do-not-trust` (2026-08-06); shredzepelin `trust-with-caveats` (2026-08-08); plus ticket-222/223/224/225 judgments (2026-08-18). Verified: `ls .scratch/handoffs | grep sme-rank-judgment` and per-file `git log -1 --format='%h %ad'`.
2. "the count of usable characters is 2, not 3 … needs a genuine cat capture for shredzepelin" — resolved by `78ca9af` (`test/fixtures/shredzepelin-cat.raw.json`, Void Reaver; `cli.ts:372` routes to it). Phase-2 ticket 06 closed.
3. PLAN.md:859 — stale on its first clause ("only shredzepelin has been through `sme-rank-review`") and on "the feral universe … does not exist on `dev`". Its operative conclusion — a fresh pass is needed — was and remains correct; the log entry says exactly that, no more.

### Open questions

**Q1 — does the box close?** Candidates A (close), B (close on a named reduced set — changes what the box asserts), C (leave open), win conditions exactly as pre-registered in the brief: A — all three verdicts `trust`/`trust-with-caveats`, every caveat fixed here or SME-agreed-ticketed; B — one character structurally unjudgeable and the other two `trust`; C — any `do-not-trust`, or a finding that the ranking is wrong in a non-disclosure way. Two refinements: (i) B's anticipated blocker was fixed by `78ca9af`, so B needs a *new* structural finding to win; (ii) a `do-not-trust` traced to replicate-seed spread is a **C win via open ticket 236**, recorded as such — seat 1's findings on cutoff-adjacent rows must state whether the row sits inside the report's disclosed replicate spread. **Measurement:** seat 1's verdict strings on Step 4's regenerated reports. The committed fixtures cannot pre-measure a judgment — that is why the box is open; the plan pre-registers the decision rule, not a winner.

**Q2 — is the ~18 DPS feral regression expected, or a mismatch?** The old pair (740.67/722.55) predates both the v0.0.119 pin and the owner-export skeleton, was measured on a binary we no longer pin, and compared whole skeletons (C5) — so it is re-measured first. The round-2 review corrected round 1's premise: the rotation↔consumables coupling is **one-directional** (C16). Tip's rotation needs tip's `potions`/`conjuredItems` arrays; the old 12-action rotation references none of the coupled ids (`selectedPotion`/`selectedConjured`/`22788`/`31677`/`22832` all zero), and `registerPotionCD`/`registerConjuredCD` make a consumable *available*, not *used* — so **old rotation + tip consumables is internally coherent and differs from tip in the rotation alone**. With `rotation` and `consumables` both removed the two skeletons are byte-identical, so nothing else moves. Three arms, all on the v0.0.119 binary at 20k iterations, `randomSeed:"42"`:
- **Arm 1** — tip skeleton (new rotation, tip consumables).
- **Arm 2** — whole `d41c46c^` skeleton (old rotation, old consumables): the package/adoption number, kept because it prices what `d41c46c` actually did on the current pin.
- **Arm 3** — old rotation spliced into the tip skeleton (tip `potions`, `conjuredItems`, `potId: 22832` retained): **Arm 3 vs Arm 1 is the rotation main effect**, single variable.
- A fourth arm (tip rotation + old consumables) is added **only if** Arm 3 vs Arm 1 shows a material rotation effect *and* seat 2 needs the disarming mechanism (`build_feral_skeleton.py:92-97`) priced to answer ticket 250's acceptance item 2 — "should the skeleton or the rotation change" — since that choice turns on how much of the gap is starvation versus rotation logic. Otherwise skipped; the reviewer confirms three suffice for the ticket.
- **Candidate C (mid-rework upstream): retired** — the lock pins `feral_default.apl.json` at v0.0.119 with the same 22-action `priorityList` (C3, upheld twice). Stated reason for dropping: measured refutation at content level.
- **Candidate A (expected on its own terms)** wins if Arm 3 ≥ Arm 1 by a material margin (the new rotation really is worse on our setup) *and* the gap tracks a nameable gear/tier difference — with ticket 250's "do not assume the first one" enforced by requiring the nameable difference, not just the sign.
- **Candidate B (unmet preconditions)** wins if specific Arm-1 actions show zero casts tied to a specific unset input. Cast counts are **supporting evidence, not the attribution instrument** (R3): branches firing at tip cannot arbitrate the original pair, because that pair's skeleton had no consumables arrays at all — both "rotation fine, starved then" and "rotation bad" predict tip firing. Arm 3 vs Arm 1 is the instrument.
- **If Arm 3 ≈ Arm 1** (gap within the pre-registered noise bound): there is no rotation regression on the current pin — the old pair's ~18 DPS is attributed via Arm 2 to the superseded inputs (starved consumables and/or the old binary), and ticket 250 is closed with the Arm 1/Arm 3 pair as the **corrected measurement** its acceptance box asks for. "Superseded-and-unreproducible" is no longer pre-registered; it survives only as the fallback ruling if the arms themselves cannot be run, with the blocker named (R2).
- **Hypothesis, untested at 20k (C14):** the rotation main effect (Arm 3 − Arm 1) is within noise. Directional support only: the planner's 100-iteration whole-skeleton probe (774.87 vs the old pair's 740.67) — a package number, not attributable to the rotation.
- Seat 2 (not seat 1) reads the arms plus the above-cutoff movement (27/55 → 20/43 at tip, C11) and gives the domain verdict.

**Q3 — disclosure scope for ticket 227's healer rows?** Candidate A (surface the per-row mechanism) wins if seat 1, unprompted, calls a feral shortlist misleading because of those rows; Candidate B (nothing this branch, 227 stays open) wins if it does not raise them. **Measurement:** seat 1's handoff, produced before seat 2 exists, from an input note containing neither ticket 250's framing nor any healer/mana wording — frame-level separation, word-level grep as backstop. The committed fixtures cannot measure this any other way: it is defined as an unprompted-judgment observation. Consequences: A → handled under Q1-A's caveat rule (fix on-branch only if the SME says the shortlist misleads without it; else an SME-agreed carry-forward ticket); B → dated note on 227, stays open.

## Claims register

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | Engine pin at tip is tag v0.0.119, commit `3267f8d` | yes | `grep -E '"(tag|commit)"' data/wowsims.lock.json` (upheld r0, r1) |
| C2 | Pinned binary at `vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe` (22,305,280 bytes); `vendor/` is gitignored, so a fresh worktree must regenerate it (`pnpm fetch:wowsimcli`, `pnpm sync:wowsims`) and no committed artifact may assert its presence without the regen command and a verification | yes | `ls -la vendor/wowsimcli-v0.0.119-win32-x64/`; `git check-ignore vendor/wowsims/db.json` (upheld) |
| C3 | v0.0.119 ships the 22-action feral APL `d41c46c` adopted (lock sha256 `e74dfb1a…`/17209 bytes matches on-disk; `priorityList` length 22) — retires Q2-C | yes | `python -c "import json;print(len(json.load(open('vendor/wowsims/feral_default.apl.json'))['priorityList']))"`; `pnpm sync:wowsims:check` (upheld) |
| C4 | The skeleton is a well-formed `RaidSimRequest` directly consumable by `wowsimcli sim --infile`; tip `simOptions` carries `iterations: 25000, randomSeed: "443754031"`, so Step 2 sets explicit overrides. Planner probe (100 iters) returned dps 774.87 — whole-skeleton, directional only | yes | skeleton keys via `python -c "import json;print(list(json.load(open('data/presets/feral/p2.raid-sim-skeleton.json'))))"`; probe re-run at 20k by Step 2 (upheld r1) |
| C5 | The 740.67/722.55 pair predates the v0.0.119 pin and the owner-export skeleton, was measured on a binary we no longer pin (`cbf6b75`), compared whole skeletons rather than rotations, and no literal invocation for it is recorded | yes | ticket text; `git log --oneline -4 -- data/wowsims.lock.json`; `git log -1 d41c46c --stat` (upheld) |
| C6 | `pnpm rank` hard-errors without `--offline` (`cli.ts:265-270`), but `--offline` gates **only the gear source**; the CLI always constructs `CliSimRunner` (`cli.ts:52,408`) and live-sims the pool: `totalSims = 1 + simCandidates.length + (seeds.length−1) × (1 + min(PAIRED_REPLICATE_TOP_N, simCandidates.length))` (`rank.ts:1028-1032`) — one sim per candidate, 5-seed replicates capped to the top N, at `DEFAULT_ITERATIONS=3000`, default `concurrency: 4` (`cli.ts:129`). Measured cost bound: ticket 200 (closed), ret maxPhase 2, 246 candidates, this machine — **~2.1 min at concurrency 4** (127,853 ms), ~4.0 min at concurrency 1. Routing: slamaltman→`slamaltman.raw.json`, shredzepelin→`shredzepelin-cat.raw.json` (Void Reaver, `cli.ts:372`), nexess→`nexess.raw.json`. `--report` writes `.html`+`.json` only — no `.run.log` exists. Ranking order deterministic given binary+seeds; report bytes are not (`generatedAt`, `cli.ts:585`) | yes | `sed -n '1020,1035p' packages/core/src/rank.ts`; `sed -n '120,132p' packages/core/src/cli.ts`; `sed -n '50,70p' .scratch/carry-forward/issues/200-cli-runs-candidates-serially.md`; `grep -rn 'run\.log' packages/core/src/ scripts/ package.json` → none (R4/R5 fixed) |
| C7 | Twelve SME handoffs exist under `.scratch/handoffs/`; per-character latest as itemised above. **All twelve predate the 2026-08-21 pin/rotation/skeleton commits, so none is usable for the gate** | yes | `for f in .scratch/handoffs/sme-rank-judgment-*.md; do git log -1 --format='%h %ad %s' --date=short -- "$f"; done` vs dates of `0c1902e d41c46c 25e8173 b7bcf51` (upheld r1) |
| C8 | The stale-write-up statements are false at tip as itemised (item 3 only on its false clauses) | yes | commands cited per item (upheld r1) |
| C9 | PLAN.md:857 carries the sole ☐ in the Stage 2 gate block | yes | `grep -n '≥3 real characters' PLAN.md` (upheld) |
| C11 | Tip feral above-cutoff sets: 20 rows (p2) / 43 (p3), baseline 2145.6, per `b7bcf51`, sourced from `synthetic-roster-recordings.json` — superseding ticket 250's 27/55; re-observed by Step 4 before any artifact cites it | no | `git show -s b7bcf51`; Step 4 reports (upheld) |
| C12 | `git show d41c46c^:data/presets/feral/p2.raid-sim-skeleton.json` retrieves the old skeleton (12-action `priorityList`); its only non-rotation difference from tip is the `consumables` block, and with both subtrees removed the skeletons are byte-identical — usable as the whole-package comparator (Arm 2) **and**, via C16's one-directional coupling, as the rotation donor for Arm 3 | yes | that command; python compare of both JSONs with `rotation`+`consumables` popped → `rest identical: True` (review r1 evidence; re-runnable) |
| C13 | Open tickets bearing on this work: 227, 236 (replicate seeds overlap RNG streams — `rank.ts:502-537`, can move the cutoff seat 1 reads), 240 (vendor-gated tests can silently skip), 241, 250, 251, 252; 234 parked `wontfix`; phase-2 06 closed | no | `pnpm issues:open` (upheld r1) |
| C14 | On the current pin the rotation main effect (Arm 3 − Arm 1) is within the pre-registered noise bound | no | **hypothesis, untested at 20k** — decided by Step 2; directional support only from the whole-skeleton probe (C4) |
| C15 | `packages/core/test/fixtures/synthetic-roster-recordings.json` is uniformly `simVersion: v0.0.119`; the per-character `test/fixtures/*.raid-sim-result.json` files remain `v0.0.101` and are read by no TS code. No artifact may claim "all fixtures re-recorded" | no | `grep -o '"simVersion": *"[^"]*"' <each file> \| sort -u` (upheld r1) |
| C16 | The rotation↔consumables coupling is **one-directional**: tip's rotation references `selectedPotion`×2, `selectedConjured`×2, ids `22788`/`31677`/`22832` (needs tip's arrays); the old rotation references **none** of them, and `registerPotionCD`/`registerConjuredCD` make a consumable available, not used. Therefore **old rotation + tip consumables (Arm 3) is internally coherent and isolates the rotation as the single moved variable**; only the reverse splice (tip rotation + old consumables) silently disarms branches | yes | token counts over both rotation subtrees (0 across all five tokens in old; 2/2/2/1/1 in tip — review r1 R1 evidence, re-runnable via `python` grep of the two subtrees); `sed -n '82,97p' scripts/build_feral_skeleton.py` (conclusion corrected per R1) |
| C17 | The CLI prints a fight-provenance line per run — `fightProvenanceLines` (`disclosure.ts:176`) emitted at `cli.ts:453`, `encounterName` populated from the fixture's `fight.name` (`feral-offline.ts:119`; shredzepelin-cat carries `"Void Reaver"`) — so a captured stdout transcript **proves which WCL report and fight** fed a ranking. It does **not** print the local fixture path; Step 4 echoes the resolved fixture path into the transcript itself | yes | `grep -n 'fightProvenanceLines' packages/core/src/cli.ts packages/core/src/disclosure.ts`; `sed -n '115,122p' packages/core/src/fixtures/feral-offline.ts`; observed in Step 4 transcripts (narrowed per R6) |
| C18 | (withdraws r0's C10) `feral-skeleton-apl:check` validates APL field names against the pinned proto only; it does **not** gate rotation↔consumables consistency, so a green verify is never cited as splice-consistency evidence — Step 2's Arm 3 consistency rests on C16's measured one-directionality instead | no | review r0 C10 refutation, upheld r1; `scripts/check_build_feral_skeleton.py` / `apl_schema.py`; ticket 250's "fields, not preconditions" line |

## Steps

Serial; single writer; no fan-out. Commit per green slice (Steps 2, 3, 4, 6, 7 each end in a commit).

**1. Baseline and binary chain.** `git rev-parse HEAD` (on `feat/stage-2-close-shortlist-box`, tip `1ecd2e5` or descendant). If `vendor/` is missing: `pnpm fetch:wowsimcli && pnpm sync:wowsims` (hard precondition — Steps 2 and 4 are live-sim). Record in `.scratch/stage-gate/stage-2-close-shortlist-box/binary-provenance.md`: binary path, byte size, sha256 (`sha256sum vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe`), the lock's tag/commit, and the regen commands — every later artifact cites this file instead of asserting the binary exists. Run `pnpm verify`; confirm the vendor-gated tests **executed rather than skipped** (ticket 240) and record the observed test/skip counts in the same file.
*Done when:* verify exits 0 and `binary-provenance.md` is committed with hash, regen commands, and the skip-check observation. *Depends:* C1, C2, C13.

**2. Q2 re-measure — three arms, rotation isolated.** Files: `.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/` — three request JSONs, three result JSONs, `commands.md` with literal invocations (ticket 250's pair had none — C5). All arms: v0.0.119 binary, `simOptions.iterations=20000`, `randomSeed="42"` (explicit overrides — C4).
 a. **Arm 1**: tip `data/presets/feral/p2.raid-sim-skeleton.json` unmodified (plus overrides).
 b. **Arm 2**: whole `git show d41c46c^:data/presets/feral/p2.raid-sim-skeleton.json` — the package/adoption number.
 c. **Arm 3**: tip skeleton with only `players[0].rotation` replaced by the old skeleton's rotation (tip `consumables` — `potions`, `conjuredItems`, `potId: 22832` — retained). Coherent per C16; the splice script and a diff proving only the rotation subtree changed go in `commands.md`. Verify consistency by C16's token check, not by `pnpm verify` (C18).
 d. **Pre-registered noise bound:** "material" = |Arm 3 − Arm 1| > 2× the combined standard error reported in the two results (fallback if the result JSON lacks an SE field: re-run one arm at a second seed and use the spread; record which).
 e. **Decision rules** (conditional, not pre-registered outcomes — R2):
  - Arm 3 ≈ Arm 1 (within bound): no rotation regression on the current pin. Ticket 250's pair is **superseded by a corrected measurement** (the Arm 1/Arm 3 pair); the old ~18 DPS is attributed via Arm 2 to the superseded inputs, with the split stated or marked `hypothesis` if the arms cannot separate binary from consumables.
  - Arm 3 materially above Arm 1: the rotation regression is real on our setup → Candidates A vs B. Candidate B: zero-cast Arm-1 actions tied to a named unset input (cast counts are supporting evidence only — R3). Candidate A: requires a nameable gear/tier difference, else recorded as `hypothesis` — never assumed (ticket 250's own rule). Add the fourth arm (tip rotation + old consumables) only if seat 2 needs the disarming mechanism priced to answer "skeleton or rotation should change" (acceptance item 2); say so in `commands.md` if added or skipped.
  - Arms cannot be run at all: fallback ruling **superseded-and-unreproducible**, with the exact blocker named.
*Done when:* three arms' request+result files and `commands.md` committed; `commands.md` names the noise bound, the splice diff, which decision branch fired, and the candidate it points at. *Depends:* C2, C3, C4, C5, C12, C14, C16, C18.

**3. Confirm the regen cost, then run at product defaults.** Step 4 is a live re-sim; the measured bound is ticket 200's **~2.1 minutes** for 246 candidates at the default `concurrency: 4` on this machine (C6). "Run at product defaults" therefore needs no cost rationale. Trip-wire set near the measurement so it can actually fire (R4): if the first character (slamaltman) exceeds **15 minutes** wall time — ~7× the measured bound — stop, record the timing, and escalate to the gatekeeper rather than downscaling silently. Record each character's wall time in `commands.md`.
*Done when:* first character's wall time recorded and within the wire (or an escalation filed). *Depends:* C6.

**4. Regenerate the three shortlists, capturing provenance.** Per character (flags per C6; if the CLI rejects one, read `--help`, adapt, ledger the deviation):
```
{ echo "invocation: pnpm rank ... --character slamaltman ..."; \
  echo "resolved fixture: test/fixtures/slamaltman.raw.json"; \
  pnpm rank --region US --realm dreamscythe --character slamaltman --offline --spec ret --max-phase 3 \
    --report .scratch/rank-reports/stage2-close-slamaltman.html 2>&1; } \
  | tee .scratch/rank-reports/stage2-close-slamaltman.stdout.txt
# same shape for shredzepelin (feral, max-phase 2, fixture shredzepelin-cat.raw.json) and nexess (feral, max-phase 2)
```
The transcript is the provenance artifact: the CLI's `gear read from …` line proves the WCL report/fight, and the echoed header supplies the local fixture path the CLI does not print (C17, R6). Note each feral report's above-cutoff count next to C11's 20/43.
*Done when:* three `.html`+`.json` reports and three `.stdout.txt` transcripts committed; each transcript contains its invocation, its resolved fixture path, and a `gear read from …` line; shredzepelin's names Void Reaver (not Morogrim); all cross-referenced from `binary-provenance.md`. The revision-1 fallback (adding `sourceFixture`/`encounterName` to report `meta`) is **expected-unused** (R7) — it exists only for the case the provenance line unexpectedly lacks the encounter, and any use is ledgered. *Depends:* C6, C11, C17.

**5. Seat 1 — the three-character read (Q1, Q3).** Assemble `.scratch/stage-gate/stage-2-close-shortlist-box/sme-input-shortlists.md`: the three report paths, transcripts, regen commands, pool files, and `binary-provenance.md`. It must contain **neither ticket 250's framing nor any rotation-movement narrative, nor any healer/mana wording**. Backstop: `! grep -qiE '250|rotation|regression|227|healer|mana|intellect|spirit|mp5' <file>`. Spawn `gate-sme` (model `opus`): verdict per character, findings tables, fixed reading order slamaltman → shredzepelin → nexess, each section completed before the next report is opened, flip-evidence note per character; cutoff-adjacent findings state whether the row sits inside the disclosed replicate spread (ticket 236 tracing). Handoff: `.scratch/handoffs/sme-rank-judgment-stage2-close-shortlists.md`, committed verbatim.
*Done when:* handoff committed with three verdict strings and the flip-evidence notes. *Depends:* C6, C7, C13, C17.

**6. Seat 2 — the ticket-250 question (Q2 domain half).** Only after Step 5's handoff is committed, spawn `gate-sme` a second time on a **different question and input**: Step 2's three arms, the splice diff, the cast-count evidence, and the above-cutoff movement (27/55 → 20/43). Its prompt states it must not re-issue shortlist believability verdicts. Handoff: `.scratch/handoffs/sme-rank-judgment-stage2-close-ticket-250.md`. The executor ledgers the second spawn as the coordinator-approved deviation from the skill's spawn-once default.
*Done when:* handoff committed with a verdict on ticket 250's acceptance items (regression expected / mismatch / no regression on current pin, with reasoning tied to the Arm 3 comparison). *Depends:* Step 2, C11, C14, C16.

**7. Disposition and documentation.** Apply the pre-registered rules:
- Q1 from seat 1's verdicts: A → check the box at PLAN.md:857; B → amend the line to name the trusted set with the third's blocker recorded (Stage 0 ☒ `race` precedent); C → stays ☐ with the blocking finding named; a `do-not-trust` traced to replicate spread cites ticket 236, no new ticket.
- Q3: seat-1-raised-unprompted → Q1-A caveat rule; not raised → dated note on ticket 227, stays open.
- New `docs/verification-log.md` entry (dated; 2026-08-08 section corrected by reference, not edited): verdicts quoted with both handoff paths; regen and re-measure commands; binary provenance per `binary-provenance.md`; the three stale-statement corrections with citing commands; the C15 scoping (only `synthetic-roster-recordings.json` is v0.0.119; the two `v0.0.101` composer outputs named as such); tickets 236 and 240 as named limits on what the entry claims.
- PLAN.md: line 857 per the Q1 outcome; line 859's prose corrected only on its false clauses.
- Ticket 250: close or update per Step 2's decision branch — domain verdict from seat 2; the old pair kept, or superseded by the Arm 1/Arm 3 corrected measurement with literal commands, or (fallback only) marked superseded-and-unreproducible with the blocker named; all three acceptance boxes resolvable from the ticket text.
- Ticket 227: note per Q3. Carry-forward tickets for other non-blocking findings, linked from the log entry.
*Done when:* `grep -n '≥3 real characters' PLAN.md` shows the dispositioned line; the log entry exists and cites both handoffs; tickets updated. *Depends:* C7, C8, C9, C13, C15, Steps 2, 5, 6.

**8. Final gate.** `pnpm verify`; `git status --porcelain` empty; `git diff --stat 1ecd2e5..HEAD` touches only manifest paths (R8); anything else becomes a ledger row.
*Done when:* verify exits 0 and the diff check passes.

## Paths manifest

Create:
- `.scratch/stage-gate/stage-2-close-shortlist-box/binary-provenance.md`
- `.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/` (3 requests, 3 results, `commands.md`; a 4th request/result pair only under Step 2e's named condition)
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
- **Conditional, expected-unused (R7):** `packages/core/src/cli.ts` (report `meta` fields) and its test — only if Step 4's provenance line unexpectedly lacks the encounter; ledgered if used

No partition — serial, single-writer; no `parallel-phase` fan-out.

## Verify recipe

```
pnpm verify
git status --porcelain                      # must print nothing
git diff --stat 1ecd2e5..HEAD               # only manifest paths
grep -n '≥3 real characters' PLAN.md
grep -n 'stage2-close' docs/verification-log.md
grep -l 'gear read from' .scratch/rank-reports/stage2-close-*.stdout.txt | wc -l   # 3
grep -i 'void reaver' .scratch/rank-reports/stage2-close-shredzepelin.stdout.txt
grep -l 'resolved fixture' .scratch/rank-reports/stage2-close-*.stdout.txt | wc -l # 3
! grep -qiE '250|rotation|regression|227|healer|mana|intellect|spirit|mp5' \
    .scratch/stage-gate/stage-2-close-shortlist-box/sme-input-shortlists.md
ls .scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/                   # 3 request/result pairs + commands.md
pnpm issues:open                            # 250 closed or updated per Step 7
```

## Out of scope

- The role-relevance product question (ticket 234, `wontfix`) — no re-opening, no re-running 227's diagnostics.
- Fixing tickets 236 (seed overlap) and 240 (vendor-gated skips) — named caveats in the log entry and Q1 tracing rules, not work items; likewise 241, 251, 252 stay open and untouched.
- Re-recording `test/fixtures/{slamaltman,shredzepelin-cat}.raid-sim-result.json` to v0.0.119 — unread by TS code (C15); if found misleading, a carry-forward ticket.
- The reverse splice (tip rotation + old consumables) as a *default* arm — it silently disarms branches (C16) and is run only under Step 2e's named condition, never as evidence of tip behavior.
- `WclGearSource` / going live; any Stage 3 web-shell work.
- Editing the historical 2026-08-08 verification-log section in place.
- Merging to `dev`; `pre-merge-review` and the merge ask follow this pipeline.
- Changing skeleton, rotation, pool, or ranking code beyond the single expected-unused Step-4 fallback — a `do-not-trust` demanding a code fix is a loop-back to the gatekeeper, not scope growth.
