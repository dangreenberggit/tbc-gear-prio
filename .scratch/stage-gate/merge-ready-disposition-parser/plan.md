# Plan — merge-ready-disposition-parser

Branch `fix/merge-ready-disposition-parser`. Tip at revision time: `b34cd38033d0cd1fa947ec61c0bbee7e8dc08195` (revision 1 was written against `06d54cf`; the parser file is unchanged between them — `git diff 06d54cf b34cd38 --stat -- scripts/check_merge_ready.py` is empty, and the current-parser corpus total is still 749). Working tree clean at revision start and end (`git status --porcelain` empty).

Repo root: `C:\Users\dgree\Code\lulz\tbc-gear-prio`. All paths below are relative to it unless absolute.

## Revision 2

What changed from revision 1, and why. The reviewer should re-check only the claims named here.

| Change | Where | Why | Claims |
| --- | --- | --- | --- |
| Q1 is decided: three words, no fourth. An axis with no findings contributes zero rows and says so in prose. The old A/B/C table is superseded. | § Open questions Q1, Steps 3, 5, 7, 8 | Owner decision after review findings F4/F5. Stress-tested here on three points (below); it holds on all three, with one consequence that needed a code change. | C19, C20, C21 |
| The all-clean review case is handled: a section whose table has a header row and zero body rows passes; a section with no table at all fails. | Step 4, Step 5 | Under "zero rows", `check()` today would fail a legitimately all-clean review (`if not rows` at `scripts/check_merge_ready.py:445` does not look at sections). Real defect introduced by the decision; fixed in-plan. | C21 |
| Step 1 acceptance asserts exact figures: candidate-pool **56**, dedup **59**, corpus **836**. The "until Step 4" clause is gone. | Step 1 | F1. The ten unparsed round-3/Slice lines are unparsed at every stage. | C22 |
| Skill anchors are grep-able text, not line numbers. `parallel-phase/SKILL.md` needs no edit at all. | Step 7, C15, C25 | F2. Both rev-1 line numbers were wrong. | C25 |
| Step 10 (self-test in `verify`) stays before the review step, but its acceptance now requires a standalone green `pnpm verify` before Step 11 runs `--check-only`. Reason stated in the step. | Step 10 | F3. Moving it after Step 11 would leave the review's `Reviewed range:` one commit short; keeping it out of `verify` loses the only automated coverage of this parser. | C26, C17 |
| Expected gate failures on the historical corpus are listed by file; `fix-worn-item-pool-coverage.md` gains two rows (A4, D1), D1 out-of-vocabulary. | Step 2, Step 3, § Expected failures | F7, F8. | C24 |
| C6's `Verified by` now uses a corpus-wide command. | C6 | F6. | C6 |
| The em-dash count is settled: **3** disposition cells; no-finding total stays **9**. | § Part 3 note under Q1, Step 9, C23 | Two agents cited 3 and 10. Command and output shown. | C23 |
| F5 (print `n/a` distinctly) is moot — there is no fourth word. F9 accepted as written. | — | — | — |

## Goal

When this plan is done, `python scripts/check_merge_ready.py` reads every row in every `## Disposition` section of a review file — plain headings and headings with trailing text alike — and prints `disposition rows: N parsed of M row-shaped lines in S section(s)`. Any row-shaped line inside a Disposition section that the row pattern cannot read is a `FAIL` naming its line number and text. Any row whose disposition word is not exactly `fixed`, `defer`, or `wontfix` is a `FAIL` naming the row id. Rows whose note contains an escaped pipe (`\|`) parse. A review whose Disposition table has a header and no body rows (every axis clean) passes and says so; a review with a Disposition heading and no table fails. `--self-test` covers all of that from the `CHECKS` tuple. Tickets 85 and 381 are closed, `docs/agents/known-traps.md` describes the real behaviour, the Q1 decision is recorded in the review skill in one sentence, and Q3 is answered in writing. `pnpm verify` passes.

## Approach

**Chosen: fixed four-column positional row pattern, made permissive in the disposition cell and tolerant of escaped pipes, applied to every Disposition section, with a denominator that counts every row-shaped line in those sections.** Unchanged from revision 1; the reviewer confirmed every measurement behind it. Three code changes in `parse_disposition`'s neighbourhood, one output change in `check()`, no new harness.

- Section anchor: `re.finditer(r"(?ms)^## Disposition\b[^\n]*\n(.*?)(?=^## |\Z)")`, rows concatenated across matches (C1, C4).
- Row pattern: every cell is `(?:\\\||[^|])`-based so `\|` inside a cell no longer breaks the row (C6); the disposition cell is `+?` permissive and validated afterwards against a named three-word constant, which makes the existing `unknown disposition` branch reachable (C2).
- Denominator: candidate rows = lines inside a Disposition section that start and end with `|`, minus the header row (first cell `id`) and separator rows. `parsed < candidates` is an error per unparsed line, not a warning (C3, C8).
- Empty table: the scan also counts header rows. `sections >= 1`, `header_rows >= 1`, `rows == 0`, `unparsed == 0` is a pass ("no findings"); `sections >= 1` and `header_rows == 0` is a fail ("section has no table") (C21).

**Strongest rejected alternative: a header-driven table parser** — split each pipe line on unescaped `|`, find the header cell named `Disposition`, read the id from column 0 and the disposition from that column, and ignore tables with no such header. Measured against the corpus (C8): it parses 863 rows to the positional pattern's 854, with zero regressions against today's 749, and would read the two odd-shaped tables that exist (`feat-upgrades-ui-fit.md` 3-column, `feat-candidate-pool.md` round-3 5-column). It lost on the win condition written before measuring: *it must not introduce a new silent path.* It does — a table whose header cell is spelled anything other than `Disposition` is ignored, and the denominator it can compute only counts rows in tables it already recognised. The corpus already holds one table under a Disposition heading with no such header (the "Slice" table at `feat-candidate-pool.md:382-386`), so the mechanism is not hypothetical. The positional pattern plus "every row-shaped line is a candidate" flags such tables with a line number, which is the honest behaviour for a gate.

**Also rejected: `finditer` alone on the current anchor** (ticket 85's original fix). It leaves `## Disposition (round 3)` unmatched (C4); the two real non-bare headings in the corpus would still be skipped.

## Open questions

### Q1 — the accepted vocabulary (decided by the owner; stress-tested here)

**Decision: the vocabulary is exactly `fixed`, `defer`, `wontfix`. No fourth word.** A Disposition row disposes of a finding — fixed it, ticketed it, waived it. "This axis found nothing" disposes of nothing because there was no finding; it is the absence of an input, not a fourth outcome. An axis with no findings contributes zero rows and says so in that axis's prose. The owner accepts that the gate cannot then distinguish "axis ran clean" from "axis never ran" — it reads a word in a cell and could never tell those apart anyway.

The premise behind the decision is still C5: 15 out-of-vocabulary rows in 8 files, 9 of them "no findings" in four spellings. Revision 1's candidates A (accept `n/a`), B (rewrite `Sp1` to `wontfix`) and C (fourth word) are superseded. B is now rejected on the owner's own reasoning, not on cost: relabelling a no-finding row `wontfix` records a finding that never existed.

I was told to attack the decision before building on it. Three tests, each measured:

**1. Is any of the nine no-finding rows load-bearing?** No. I read all nine in place (C19). They are two kinds. Three are axis-level Spec rows — `Sp1` (`docs-fork-upstream-touchpoints.md:158`), `R2-P1` (`feat-reforge-catchup-leftovers.md:271`), `P1` (`feat-two-hander-clears-offhand.md:142`) — and in every case the axis prose above already says it: touchpoints:117 `**Spec.** Clean.`, reforge:219 `**Spec: clean.**`, two-hander:85 `**Spec: clean.**`. Six are item-numbered rows — `D3`/`D4`/`D7` "Clean." in `feat-finish-the-tab.md:159-163` and `A3`/`A4`/`A5` "no change needed" in `feat-tickets-369-370.md:154-156` — and each id already appears in the axis prose marked clean at source: finish-the-tab:59 `**D3 (clean).**`, :63 `**D4 (clean).**`, :79 `**D7 (clean).**`; 369-370:36 `**A3 — fixture and synthetic weights judged sound.**`, :41 `**A4 — pin bump self-consistent.**`, :45 `**A5 — every checkable claim in the divergence note holds.**`. None of the nine records a finding that was resolved without a ticket; none carries information a reader loses when the row goes. The six item-numbered rows do show one thing the skill sentence must say: an axis may number its checks, and a numbered check that came up clean is still not a finding — it stays in the prose, not the table. The corpus already handles the neighbouring case correctly: a concern that was raised and then refuted by checking (`A1` in 369-370 "Premise falsified by measurement", `R2-D1` "Checked: the string does not appear … Not a defect", `R2-S1` "The link resolves") is `wontfix`, because there a finding existed and was declined. That line — raised-then-refuted is `wontfix`; never-raised is no row — is the one the skill sentence draws.

**2. Does either skill force a row per axis?** No (C20). The `pre-merge-review/SKILL.md` template's example table has three rows `A1`, `A2`, `D1` — findings, not one per axis — and its only rule is the sentence `` `Disposition` is exactly `fixed`, `defer`, or `wontfix`. `` `parallel-phase/SKILL.md` already says `Every **actionable** worker concern (defect, risk, missing ticket, scope breach) becomes a row in that review's ## Disposition table … Soft observations need not.` So "omit the row" contradicts nothing; the nine rows are reviewers filling a cell the template never asked for. The skill change is therefore one sentence in `pre-merge-review/SKILL.md` making the implicit rule explicit, and no change to `parallel-phase/SKILL.md`.

**3. What happens to an all-clean review?** It would fail the gate as the code stands (C21): `check()` at `scripts/check_merge_ready.py:445` is `if not rows:` → `review has no parseable ## Disposition table`, with no look at whether a section exists. No corpus file is all-clean today (58 files, every one has a section and at least one row), so the defect is latent, but it is a direct consequence of the decision and the plan fixes it: a section whose table has a header row and no body rows passes with `disposition rows: 0 parsed of 0 row-shaped lines in 1 section(s) (no findings)`; a section with no table at all still fails. Keeping the header row mandatory is what preserves "table missing" detection — the template always writes the header, so an all-clean review costs the author nothing.

**Verdict: the decision holds.** Nothing in the corpus refutes it, the skills do not contradict it, and its one real consequence (the empty-table case) is handled in Steps 4 and 5.

**Em-dash count (Part 3).** The review says 3; the orchestrator's spot-check said 10. Measured (C23): the em-dash appears as the *disposition cell* of a parsed four-column row in a Disposition section exactly **3** times (`feat-finish-the-tab.md:159,160,163`). The string `| — |` appears on **16** lines across 7 files when counted in any column of any line, in or out of a Disposition section (`feat-agent-model-policy.md` 2, `feat-cursor-worker-composer.md` 3, `feat-finish-the-tab.md` 3, `feat-merge-ready-carry-forward.md` 3, `feat-parallel-phase.md` 3, `feat-phase-item-pool.md` 1, `phase-2-disclosure-and-caps.md` 1). Neither 10 nor 16 counts disposition cells. **The no-finding total is 9**, and that is the figure Step 9 writes into ticket 381.

### Q2 — denominator

**Lands here.** Unchanged from revision 1; the reviewer confirmed the arithmetic.

| Candidate | Win condition | Measurement | Result |
| --- | --- | --- | --- |
| (a) sections the anchor found | Would have made both defects visible | Sections count alone says nothing about rows dropped by the row pattern (defect B, escaped pipes) | Loses |
| (b) rows the strict row pattern rejected | Detects a future defect of the same class | Only counts what the strict pattern already saw; a line it does not match is not "rejected", it is invisible — exactly today's failure | Loses |
| **(c) every row-shaped line inside a Disposition section, minus header and separator** | Any line a human would read as a table row that the parser did not parse is reported by line number | Corpus: 867 candidates vs 854 parsed by the new pattern; the 13 unparsed lines are the Slice table (4) and 5-column round-3 table (6) in `feat-candidate-pool.md` and the 3-column table (3) in `feat-upgrades-ui-fit.md` (C3, C8) | **Wins.** |

What (c) cannot see: a heading the anchor does not recognise (`### Disposition`, `## Dispositions`). Mitigation in Step 4: a level-agnostic count of headings that start with `Disposition` (`(?im)^\s{0,3}#{1,6}\s+Disposition\b`) compared with sections parsed; a mismatch is an error. Measured on the corpus: all 68 such headings are level 2 (C13), so this adds zero false positives today. The reviewer also measured zero fenced pipe lines and zero `###` subheadings inside any Disposition section; both are latent risks, noted in `known-traps.md` by Step 7.

### Q3 — ticket 315 (Sp3)

**Answered: the concern Sp3 raised is satisfied; no new ticket; no parser action.** Unchanged from revision 1 (C11, confirmed by the reviewer including the existence of the proof file). `Sp3` at `docs/reviews/feat-upgrades-dedup-wowsims.md:428` defers "313 committed unmet". Ticket `315-*.md` (Status: open) carries an "Execution D" section: all four `setBonusLine` states rendered and read back from a live DOM via headless CDP, proof at `.scratch/stage-gate/wowsims-tab-tickets/d-cdp-proof.json`. Tickets 313 and 315 stay open deliberately: `.scratch/carry-forward/human-inspection-checklist.md:44-59` parks them on owner sign-off. The `Sp3` row is not rewritten. Step 9 records this in ticket 85's closing note.

## Expected failures on the historical corpus

None of these files will be gated again (every branch is merged; C7 for touchpoints, and the rule generalises — a review file exists only for a branch that reached the merge ask). The executor spot-checking with `--review <file> --branch <branch>` must read these as expected, not as breakage (C24):

| After step | File | Expected output |
| --- | --- | --- |
| 3+ | `docs-fork-upstream-touchpoints.md` | `FAIL: Sp1: unknown disposition 'n/a'` |
| 3+ | `feat-content-hash.md` | `A3: 'fixed (follow-up)'` |
| 3+ | `feat-finish-the-tab.md` | `D3`, `D4`, `D7`: `'—'` |
| 3+ | `feat-layout-gate-merge-to-dev.md` | `A1`, `A2`, `D1`: `'fixed (proven, round 2)'` |
| 3+ | `feat-reforge-catchup-leftovers.md` | `R2-D4: 'minor, accepted'`, `R2-P1: 'no finding'` |
| 3+ | `feat-tickets-369-370.md` | `A3`, `A4`, `A5`: `'no change needed'` |
| 3+ | `feat-two-hander-clears-offhand.md` | `P1: 'no finding'` |
| 3+ | `fix-worn-item-pool-coverage.md` | `D1: 'fixed, then **superseded by measurement**'` (row count 15→17: `A4` and `D1` are new) |
| 4+ | `feat-candidate-pool.md` | 10 `not parsed` lines (382/384/385/386, 487-492) |
| 4+ | `feat-upgrades-ui-fit.md` | 3 `not parsed` lines (112-114) |
| 1+ | `feat-upgrades-dedup-wowsims.md` | `FAIL: Sp3: defer with no ticket path` |

Plus whatever `defer` rows point at tickets whose status has since moved — outside this plan, as before.

## Claims register

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | `parse_disposition` (`scripts/check_merge_ready.py:156`) uses `re.search` with anchor `^## Disposition\s*\n`, so only the first section is read and a heading with trailing text matches nothing | yes | `grep -n 're.search' scripts/check_merge_ready.py` → line 156; `python scripts/check_merge_ready.py --review docs/reviews/feat-upgrades-dedup-wowsims.md --branch feat/upgrades-dedup-wowsims` prints `disposition rows: 9` |
| C2 | `DISPOSITION_RE` (lines 47-50) matches only `(fixed\|defer\|wontfix)`, so the `else` branch at line 476 is unreachable from a table row | yes | `grep -n 'fixed|defer|wontfix' scripts/check_merge_ready.py` → line 48; `grep -n 'unknown disposition' scripts/check_merge_ready.py` → line 476 |
| C3 | Across `docs/reviews/*.md` today's parser returns 749 rows; row-shaped candidate lines in all Disposition sections total 867; the chosen pattern parses 854. Per file: dedup 9→59 of 59, candidate-pool 36→56 of 66, fix-75-82 23→32 of 32, reforge-leftovers 9→20 of 20 | yes | Appendix script → `TOTALS {'cur': 749, 's1': 836, 's2': 854, 'cand': 867}` and the per-file lines. Reviewer reproduced independently |
| C4 | Exactly two non-bare `## Disposition` headings exist in the corpus: `feat-candidate-pool.md:339` `(round 3)` and `fix-75-82-review-tickets.md:260` `(second pass — …)` | yes | `grep -n '^## Disposition.' docs/reviews/*.md` → 2 lines |
| C5 | 15 four-column rows in 8 review files carry an out-of-vocabulary disposition; 9 of them are "no findings" in 4 spellings (`n/a` 1, `—` 3, `no finding` 2, `no change needed` 3); 6 are decorated real dispositions. The inherited/ticket-381 claim of "exactly one" is wrong | yes | Appendix script, `== OOV rows ==` block (15 lines, 8 file names) |
| C6 | A `\|` inside a cell makes the current row pattern fail, dropping the row silently. Six `\|` lines exist in `docs/reviews/`; three are Disposition rows — `fix-worn-item-pool-coverage.md:203` (`A4`, a `defer`), `feat-drift-warner-proven.md:209`, `feat-reforge-catchup-leftovers.md:268` — and three are prose outside any Disposition section (`feat-342-learn-from-upstream.md:212`, `fix-carry-forward-backlog.md:209`, `fix-ticket-257-box-marker.md:36`) | no | `Select-String -Path docs\reviews\*.md -Pattern '\\\|'` → 6 hits; the three row hits parse under the new pattern (appendix script `step2 > step1` on those files) |
| C7 | Branch `docs/fork-upstream-touchpoints` is an ancestor of `dev`; no gate will run on its review file again | yes | `git merge-base --is-ancestor docs/fork-upstream-touchpoints dev; echo $LASTEXITCODE` → 0 |
| C8 | A header-driven parser parses 863 rows with zero regressions but silently ignores any table lacking a `Disposition` header cell (1 such table in corpus: `feat-candidate-pool.md:382`) | yes (approach) | Revision-1 appendix (`planner_probe3.py`, `p2`/`ign` columns); reviewer confirmed the 13 unparsed lines and the Slice table |
| C9 | `--self-test` runs 19 checks in ~171 ms; `pnpm verify` does not run it today | no | `Measure-Command { python scripts/check_merge_ready.py --self-test }`; `grep -c 'self-test' package.json` → 0 |
| C10 | `docs/agents/known-traps.md:126-136` already says the parser reads only the first section and carries "Until 85 and 381 land" | no | `grep -n 'Until 85 and 381' docs/agents/known-traps.md` → 1 hit |
| C11 | Sp3's deferred concern is satisfied; tickets 313/315 stay open on owner sign-off; the CDP proof file exists | yes (Q3) | `grep -n 'Sp3' docs/reviews/feat-upgrades-dedup-wowsims.md`; `grep -n -i 'status\|execution d' .scratch/carry-forward/issues/315-*.md`; `grep -n '313\|315' .scratch/carry-forward/human-inspection-checklist.md`; `ls .scratch/stage-gate/wowsims-tab-tickets/d-cdp-proof.json` |
| C12 | No tracked review file has CRLF endings | no | `git ls-files --eol docs/reviews \| Select-String 'crlf\|mixed'` → 0 |
| C13 | All 68 headings starting with `Disposition` in the corpus are level 2 | no | `Select-String -Path docs\reviews\*.md -Pattern '^\s{0,3}#{1,6}\s+Disposition' \| Where-Object { $_.Line -notmatch '^## ' }` → 0 |
| C14 | Closing convention: flip line 1 to `Status: closed`; append `CLOSED <date>, <reason>` to the ticket's line in `.scratch/carry-forward/map.md` | no | `Select-String -Path .scratch/carry-forward/map.md -Pattern CLOSED \| Select -Last 3` |
| C15 | Skill files need owner approval before editing (`AGENTS.md` "Editing skills"). **Revision 1's line anchors (118, 72) are refuted** — see C25 for the real anchors. The rule stands; the owner's Q1 decision supplies approval for the one sentence in Step 7 | yes (Step 7) | `grep -n 'wait for approval before editing' AGENTS.md` |
| C16 | `[^|]+?` rejects an empty cell but accepts whitespace-only; the disposition must be stripped and an empty result treated as invalid | no | Python `re` semantics; Step 5 `check_empty_disposition_cell_is_invalid` proves it |
| C17 | Adding `--self-test` to the `verify` chain does not disturb other verify steps, and a standalone `pnpm verify` before Step 11 gives the self-test a green baseline that does not depend on any review file | no | hypothesis, untested — Step 10's acceptance is the test |
| C18 | Every parse of a review file in this plan reads files only; no step runs git write commands | yes | by construction; `git status --porcelain` in Verify recipe |
| C19 | None of the 9 no-finding rows is load-bearing: each echoes axis prose that already says clean at the cited line (touchpoints:117, reforge:219, two-hander:85, finish-the-tab:59/63/79, 369-370:36/41/45) | yes (Q1) | `grep -n -E '\bD[347]\b' docs/reviews/feat-finish-the-tab.md` → 6 lines (3 prose "(clean)", 3 rows); `grep -n -E '\bA[345]\b' docs/reviews/feat-tickets-369-370.md` → 6 lines; `grep -n -i 'spec.*clean\|clean\.' docs/reviews/docs-fork-upstream-touchpoints.md docs/reviews/feat-reforge-catchup-leftovers.md docs/reviews/feat-two-hander-clears-offhand.md` → one prose hit per file |
| C20 | Neither skill forces one row per axis: the `pre-merge-review` template's example rows are findings (`A1`, `A2`, `D1`), and `parallel-phase/SKILL.md` already says only actionable concerns become rows | yes (Q1) | `grep -n 'Soft observations need not' .claude/skills/parallel-phase/SKILL.md` → 1 hit; `grep -n -c 'per axis\|every axis\|each axis\|one row' .claude/skills/pre-merge-review/SKILL.md` → 0 |
| C21 | `check()` fails any review with zero parsed rows regardless of sections (`if not rows:` at line 445); no corpus file is all-clean today (58 files, all with ≥ 1 section and ≥ 1 row), so the case is latent | yes (Q1, Step 4) | `grep -n 'if not rows' scripts/check_merge_ready.py` → 445 (and 840, which is `--list-only`, unrelated); appendix script variant → `files: 58 no-section: [] section-but-zero-rows-today: []` |
| C22 | With the new section anchor and the **old** row regex (Step 1 only): candidate-pool 56, dedup 59, corpus 836. Step 2 then adds exactly 18 rows, none in those two files: touchpoints +1, content-hash +1, drift-warner +1, finish-the-tab +3, layout-gate +3, reforge +3, 369-370 +3, two-hander +1, worn +2 | yes (Step 1, 2) | Appendix script, per-file `step1`/`step2` columns and `TOTALS … 's1': 836, 's2': 854` |
| C23 | The em-dash is the disposition cell of exactly 3 parsed rows (`feat-finish-the-tab.md:159,160,163`); `\| — \|` appears on 16 lines across 7 files when counted in any column anywhere. No-finding total is 9 | yes (Step 9) | Appendix script, `== Part 3 ==` block: `count: 3` and `total: 16` |
| C24 | After Step 3, eight historical review files produce `unknown disposition` FAILs (the 8 files of C5); `fix-worn-item-pool-coverage.md` goes 15→17 rows, gaining `A4` and `D1` | no | Appendix script `== OOV rows ==` and the worn per-file line `cur=15 step1=15 step2=17` |
| C25 | The vocabulary sentence in `.claude/skills/pre-merge-review/SKILL.md` is the unique line matching `` `Disposition` is exactly `fixed`, `defer`, or `wontfix`. `` (line 131 today; 118 is the example table header). `parallel-phase/SKILL.md`'s only vocabulary mention is its step 8 (line 64 today), already three words and finding-driven — no edit | yes (Step 7) | `grep -n -F 'is exactly `fixed`, `defer`, or `wontfix`' .claude/skills/pre-merge-review/SKILL.md` → 1 hit; `grep -n -c 'wontfix' .claude/skills/parallel-phase/SKILL.md` → 1 |
| C26 | `scripts/merge_to_dev.py` runs `pnpm run verify` (line 139) and then calls `check_merge_ready.check(...)` (line 146) in the same process, so a self-test inside `verify` runs before the gate in every `merge-to-dev` invocation | yes (Step 10) | `grep -n 'pnpm", "run", "verify\|check_merge_ready.check' scripts/merge_to_dev.py` → 139, 146 |

## Steps

Commit after each green step (repo rule: a commit per green slice). Use PowerShell for git; prepend the Node 22 PATH line for any `pnpm` command. `python` here is the Windows-native Python on PATH; pass `C:/...` paths to it, never `/c/...`.

1. **Scan type and section anchor.** In `scripts/check_merge_ready.py` add a `@dataclass class DispositionScan` with fields `rows: list[dict]`, `sections: int`, `header_rows: int`, `candidates: int`, `unparsed: list[tuple[int, str]]` (1-based line number, stripped line), and `disposition_headings: int`. Add `SECTION_RE = re.compile(r"(?ms)^## Disposition\b[^\n]*\n(.*?)(?=^## |\Z)")` and `DISPOSITION_HEADING_RE = re.compile(r"(?im)^\s{0,3}#{1,6}\s+Disposition\b")`. Write `scan_disposition(text) -> DispositionScan`: normalise `\r\n` to `\n`, iterate `SECTION_RE.finditer`, run the row pattern per section, concatenate rows; `header_rows` counts rows whose first cell is `id` (case-insensitive). Keep `parse_disposition(text)` as `return scan_disposition(text).rows` so no caller changes shape. **Acceptance (exact, C22):** `python scripts/check_merge_ready.py --review docs/reviews/feat-upgrades-dedup-wowsims.md --branch feat/upgrades-dedup-wowsims` prints `disposition rows: 59` (was 9) and includes `FAIL: Sp3: defer with no ticket path`; `--review docs/reviews/feat-candidate-pool.md --branch feat/candidate-pool` prints `disposition rows: 56` (was 36 — not 46, not 66; the ten Slice/round-3 lines are unparsable by any four-column pattern and are reported, not parsed, from Step 4 on). Depends on C1, C3, C4, C12, C22.

2. **Row pattern.** Replace `DISPOSITION_RE` with one whose four cells use `(?:\\\||[^|])` — first three `+?`, note `*?` — and whose third cell has no word list. Keep the `fid.lower() in ("id", "---") or set(fid) <= {"-"}` guard. Store `disposition` stripped and lower-cased as today. **Acceptance:** `--review docs/reviews/fix-worn-item-pool-coverage.md --branch fix/worn-item-pool-coverage` prints `disposition rows: 17` (was 15) and its output names both `A4` (`defer`, ticket path intact) and `D1`; `D1` produces `FAIL: D1: unknown disposition 'fixed, then **superseded by measurement**'` — expected (C24). `--review docs/reviews/docs-fork-upstream-touchpoints.md --branch docs/fork-upstream-touchpoints` prints `disposition rows: 16` (was 15) with `FAIL: Sp1: unknown disposition 'n/a'` — expected and permanent (C7; the file is not rewritten). Depends on C2, C6, C16, C24.

3. **Vocabulary constant and validation.** Add `DISPOSITIONS = ("fixed", "defer", "wontfix")` near `KNOWN_STATUSES`; the error string at lines 446-449 and the `elif disp in ("fixed", "wontfix")` at line 473 read from the constant instead of literals. Add a pure `invalid_disposition_rows(rows) -> list[dict]` returning rows whose stripped disposition is empty or not in `DISPOSITIONS`; `check()` reports each as `FAIL: <id>: unknown disposition <word!r> (accepted: fixed, defer, wontfix)`. No fourth word, no `NO_FINDING` constant, no distinct print form. **Acceptance:** `python scripts/check_merge_ready.py --self-test` still passes (19 checks); the Step 2 probes behave as stated; the 8 files in § Expected failures each produce their listed `unknown disposition` lines and no others. Depends on C2, C16, C24.

4. **Denominator, unparsed-line reporting, and the empty-table case in `check()`.** Replace `print(f"disposition rows: {len(rows)}")` with `disposition rows: {parsed} parsed of {candidates} row-shaped lines in {sections} section(s)`. For each `scan.unparsed` entry append `FAIL: line {n}: disposition row not parsed — {line!r}`. If `scan.disposition_headings > scan.sections`, append `FAIL: {k} heading(s) start with 'Disposition' but only {sections} '## Disposition' section(s) were parsed`. Replace the `if not rows:` branch (line 445) with three cases: `sections == 0` → `FAIL: review has no ## Disposition section (rows: fixed|defer|wontfix; defer must link a ticket path)`; `sections >= 1 and header_rows == 0` → `FAIL: ## Disposition section has no table`; `sections >= 1 and header_rows >= 1 and not rows and not unparsed` → print the denominator line with a trailing ` (no findings)` and continue with no error (C21). Candidates are computed in `scan_disposition`: each line in a section matching `^\s*\|.*\|\s*$`, excluding the header row and lines whose cells are all `-`/`:`. **Acceptance:** `--review docs/reviews/feat-candidate-pool.md --branch feat/candidate-pool` prints `56 parsed of 66 row-shaped lines in 3 section(s)` and 10 `not parsed` FAIL lines with line numbers 382, 384, 385, 386, 487-492; `--review docs/reviews/feat-upgrades-dedup-wowsims.md --branch feat/upgrades-dedup-wowsims` prints `59 parsed of 59 … 6 section(s)` and `FAIL: Sp3: defer with no ticket path`; a scratch file (outside the repo) containing only `## Disposition`, the header row and separator, run with `--review <abs path> --branch x`, prints `0 parsed of 0 row-shaped lines in 1 section(s) (no findings)` and no `Disposition`-related FAIL; the same file with the two table lines deleted prints `FAIL: ## Disposition section has no table`. Depends on C3, C8, C13, C21.

5. **Self-tests.** Append checks to `CHECKS` in the existing style (one function, docstring says why, returns problem strings), all through `scan_disposition` / `invalid_disposition_rows` — no git, no IO:
   - `check_disposition_reads_every_section` — two bare sections, rows from both, `sections == 2`.
   - `check_disposition_heading_with_trailing_text` — `## Disposition (round 3)` as the only heading yields its rows.
   - `check_single_typo_row_is_reported` — three rows, one `defered`: all three parse; `invalid_disposition_rows` returns exactly that id (the silent case).
   - `check_all_typo_table_stays_loud` — every row invalid → every id returned.
   - `check_five_column_table_is_counted_not_dropped` — 5-column table: `rows == []`, `candidates == N`, `unparsed` has N entries with correct line numbers.
   - `check_escaped_pipe_in_note_parses` — note containing `` `a \| b` `` parses; disposition and id intact.
   - `check_header_and_separator_are_not_candidates` — header + separator only: `candidates == 0`, `header_rows == 1`.
   - `check_crlf_input_parses` — same fixture with `\r\n` gives identical rows.
   - `check_empty_disposition_cell_is_invalid` — `| X1 | Axis |   | note |` is either unparsed or invalid, never accepted.
   - `check_no_finding_spellings_are_rejected` — `n/a`, `—`, `no finding`, `no change needed` each returned by `invalid_disposition_rows` (Q1 decision, C5 spellings).
   - `check_all_clean_review_is_distinguishable_from_no_table` — fixture A (heading + header + separator) gives `sections == 1, header_rows == 1, rows == [], unparsed == []`; fixture B (heading only) gives `sections == 1, header_rows == 0` (C21).
   Update `self_test()`'s summary line so it no longer says "relevance logic". **Acceptance:** `python scripts/check_merge_ready.py --self-test` exits 0 with exactly 30 checks (19 + 11). Depends on C2, C5, C6, C12, C16, C21.

6. **Confirm the decision is in the executor's prompt.** The executor's prompt must state the owner's Q1 decision (three words; no-finding axis contributes zero rows) and approval for the one skill sentence in Step 7. If either is missing, stop after committing Step 5 and report; Steps 1-5 stand on their own. Depends on C15.

7. **Docs and the one skill sentence.** (a) Rewrite `docs/agents/known-traps.md` lines 126-136 (the block containing "does NOT parse all rounds" through "Until 85 and 381 land") to say: every `## Disposition` section is parsed including trailing-text headings; a row the parser cannot read and a disposition word outside `fixed`/`defer`/`wontfix` both fail with a line/id; the output reads `N parsed of M`; an axis with no findings writes no row; keep the "write defer rows as `path — note`" guidance; add one sentence that pipe-containing lines inside a fenced block within a Disposition section, and `###` subheadings inside one, are not handled (zero in the corpus today). (b) Update the module docstring of `scripts/check_merge_ready.py` (lines 5-7) if it names the vocabulary. (c) In `.claude/skills/pre-merge-review/SKILL.md`, directly after the sentence `` `Disposition` is exactly `fixed`, `defer`, or `wontfix`. `` (find it by that text; it is line 131 today), insert: `A row disposes of a finding. An axis with no findings writes no row — say so in that axis's prose (` `**Spec: clean.**` `) and leave the table to the findings. A concern that was raised and then checked and found not to be a defect is a finding: dispose of it as ` `wontfix` ` with the reason.` No other skill line changes; `.claude/skills/parallel-phase/SKILL.md` is not edited (C25). **Acceptance:** `grep -n 'Until 85 and 381' docs/agents/known-traps.md` → no hit; `grep -c 'An axis with no findings writes no row' .claude/skills/pre-merge-review/SKILL.md` → 1; `git diff --stat -- .claude/skills/parallel-phase/SKILL.md` → empty. Depends on C10, C15, C25.

8. **Corpus consistency with the decision.** No review file is edited. `docs/reviews/` is consistent with the decision in the only sense that matters for a gate: every file it will ever check again is this branch's own (Step 11), and every historical file's expected output is listed in § Expected failures. Rewriting merged judgment records to satisfy a parser that never runs on them is churn without a reader; relabelling the nine no-finding rows as anything would record findings that did not exist. **Acceptance:** `git diff --stat b34cd38 -- docs/reviews/` lists only `docs/reviews/fix-merge-ready-disposition-parser.md` after Step 11. Depends on C5, C7, C19.

9. **Tickets.** Set `Status: closed` on `.scratch/carry-forward/issues/85-merge-ready-parses-only-the-first-disposition-table.md` and `381-merge-ready-row-regex-silently-drops-unknown-dispositions.md`; tick each acceptance box; append a dated `## Resolution` paragraph to each naming this branch and the re-run command (`python scripts/check_merge_ready.py --self-test`). In 381, correct the sentence "The single out-of-vocabulary value is `n/a`" with the measured figure — 15 rows in 8 files; 9 of them "no findings" in 4 spellings (`n/a` 1, `—` 3, `no finding` 2, `no change needed` 3); 6 decorated real dispositions — and record the decision: vocabulary stays at three words; an axis with no findings contributes no row; historical files not rewritten. In 85's resolution, add one paragraph answering Q3: "Sp3 (dedup review :428) audited 2026-09-12: the deferred concern is satisfied per ticket 315's Execution D section and `d-cdp-proof.json`; 313/315 stay open on owner sign-off (human-inspection-checklist.md:44-59). No new ticket." Append `CLOSED 2026-09-13, fix/merge-ready-disposition-parser` to both tickets' lines in `.scratch/carry-forward/map.md`. **Acceptance:** `python scripts/check_merge_ready.py --list-only` no longer lists 85 or 381; `grep -c 'CLOSED 2026-09-13' .scratch/carry-forward/map.md` ≥ 2; `grep -c '9 of them' .scratch/carry-forward/issues/381-*.md` ≥ 1. Depends on C5, C11, C14, C23.

10. **Wire the self-test into verify, with an independent green baseline.** In `package.json` add `"merge-ready:selftest": "python scripts/check_merge_ready.py --self-test"` and append `&& pnpm run merge-ready:selftest` to the `verify` chain. **Why here and not after Step 11, and not left out:** `merge_to_dev.py` runs `verify` and then `check()` in one process (C26), so the self-test will always precede the gate. Landing this after the review file would leave Step 11's `Reviewed range:` one commit short of the tip, which is a worse defect than the coupling. Leaving it out of `verify` means the only automated test of this parser never runs in CI or pre-push. The reviewer's real concern — no green baseline — is met by this step's acceptance: `pnpm verify; echo "rc=$LASTEXITCODE"` → rc=0 with `check_merge_ready.py … ok (30 checks)` in the output, run standalone **before** Step 11 exists. After that, a `--check-only` failure in Step 11 is attributable to the review file, because the same parser code was green against fixtures one commit earlier; a self-test failure prints `check_merge_ready.py` check names, a review failure prints `FAIL: <id>` — the two are distinguishable in the output. Depends on C9, C17, C26.

11. **Review file for this branch.** Run `pre-merge-review` per the repo loop; the resulting `docs/reviews/fix-merge-ready-disposition-parser.md` keeps every row in one table under a bare `## Disposition` heading, 4 columns, no `\|` in notes, no no-finding rows (an axis with nothing says so in prose, per Step 7's sentence). **Acceptance:** `pnpm merge-to-dev --check-only; echo "rc=$LASTEXITCODE"` → rc=0, output contains `N parsed of N row-shaped lines in 1 section(s)` and `merge-ready: ok`. Do not merge. Depends on all.

## Paths manifest

Modified:
- `scripts/check_merge_ready.py`
- `docs/agents/known-traps.md`
- `.claude/skills/pre-merge-review/SKILL.md` (one inserted sentence, Step 7c — owner-approved via the Q1 decision)
- `.scratch/carry-forward/issues/85-merge-ready-parses-only-the-first-disposition-table.md`
- `.scratch/carry-forward/issues/381-merge-ready-row-regex-silently-drops-unknown-dispositions.md`
- `.scratch/carry-forward/map.md`
- `package.json` (Step 10)

Created:
- `docs/reviews/fix-merge-ready-disposition-parser.md` (Step 11, by the review skill)

Not touched (was in revision 1's manifest): `.claude/skills/parallel-phase/SKILL.md`, `docs/reviews/docs-fork-upstream-touchpoints.md`.

No partition — one executor, serial.

## Verify recipe

PowerShell, from the repo root, with `$env:PATH = "C:\Users\dgree\AppData\Roaming\fnm\node-versions\v22.16.0\installation;" + $env:PATH` first.

1. `python scripts/check_merge_ready.py --self-test; echo "rc=$LASTEXITCODE"` → rc=0, `ok (30 checks)`.
2. `python scripts/check_merge_ready.py --review docs/reviews/feat-upgrades-dedup-wowsims.md --branch feat/upgrades-dedup-wowsims` → `disposition rows: 59 parsed of 59 row-shaped lines in 6 section(s)` and `FAIL: Sp3: defer with no ticket path`.
3. `python scripts/check_merge_ready.py --review docs/reviews/feat-candidate-pool.md --branch feat/candidate-pool` → `56 parsed of 66 … 3 section(s)` and 10 `not parsed` lines.
4. `python scripts/check_merge_ready.py --review docs/reviews/fix-worn-item-pool-coverage.md --branch fix/worn-item-pool-coverage` → `17 parsed of 17`, `A4` present, `FAIL: D1: unknown disposition` present (expected).
5. `python scripts/check_merge_ready.py --review docs/reviews/docs-fork-upstream-touchpoints.md --branch docs/fork-upstream-touchpoints` → `16 parsed of 16`, `FAIL: Sp1: unknown disposition 'n/a'` present (expected).
6. All-clean and no-table scratch files per Step 4's acceptance → `(no findings)` and `section has no table` respectively.
7. Corpus totals: run the appendix script from the scratchpad → `TOTALS {'cur': 749, 's1': 836, 's2': 854, 'cand': 867}` (its `cur` column imports the parser, so run it against a copy of `git show b34cd38:scripts/check_merge_ready.py` saved outside the repo once the parser has changed, or run it before Step 1 and keep the output).
8. `pnpm verify; echo "rc=$LASTEXITCODE"` after Step 10 and before Step 11 → rc=0 with the self-test line in the output.
9. `pnpm merge-to-dev --check-only; echo "rc=$LASTEXITCODE"` after Step 11 → rc=0 (this runs `pnpm verify` itself; do not also run `pnpm verify` separately at this point).
10. `git status --porcelain` → empty after the last commit.

## Out of scope

- Duplicate-id checks (per section or otherwise) — multi-round files reuse ids by design; ticket 85 rejects the idea.
- Re-gating or re-litigating the historical merges; rewriting any historical review row, including the nine no-finding rows and `Sp1`.
- A fourth disposition word, a `NO_FINDING` constant, or a distinct print form for "no finding" — rejected by the owner's Q1 decision.
- Distinguishing "axis ran clean" from "axis never ran" — the owner accepted that the gate cannot tell these apart under any vocabulary.
- Editing `.claude/skills/parallel-phase/SKILL.md` — its vocabulary line is already correct (C25).
- `ticket_path_from_note` raising `ValueError` on an absolute path — a different function; file a ticket only if the executor trips over it.
- Recursive ticket discovery under `.scratch/carry-forward/issues/`.
- Header-driven table parsing or accepting 3- or 5-column tables — rejected in Approach; such tables now fail loudly with a line number.
- Handling pipe lines inside fenced blocks or `###` subheadings inside a Disposition section — zero instances in the corpus; noted in `known-traps.md` by Step 7.
- Any change to what `check()` does after parsing (status rules, relevant-ticket warning, merge mechanics).
- Closing tickets 313 or 315 — parked on owner sign-off by the human-inspection checklist.

## Appendix — measurement script

Planner copy at `C:\Users\dgree\AppData\Local\Temp\claude\C--Users-dgree-Code-lulz-tbc-gear-prio\ce93c1ad-6697-4f47-a813-95dfd1191b40\scratchpad\rev2_probe.py`. This is its full text; it reproduces C3, C5, C22, C23, C24 in one run. Save outside the repo, run with the Windows Python, path in `C:/` form.

```python
import re, sys, collections
from pathlib import Path
ROOT = Path(r"C:\Users\dgree\Code\lulz\tbc-gear-prio")
sys.path.insert(0, str(ROOT / "scripts")); import check_merge_ready as cmr
SECTION = re.compile(r"(?ms)^## Disposition\b[^\n]*\n(.*?)(?=^## |\Z)")
CELL = r"(?:\\\||[^|])"
ROW = re.compile(rf"^\|\s*({CELL}+?)\s*\|\s*({CELL}+?)\s*\|\s*({CELL}+?)\s*\|\s*({CELL}*?)\s*\|$", re.M)
PIPE = re.compile(r"(?m)^\s*\|.*\|\s*$")
OLD = cmr.DISPOSITION_RE          # pre-change pattern; import a saved copy after Step 2
VOCAB = ("fixed", "defer", "wontfix")
def cells(l): return [p.strip() for p in re.split(r"(?<!\\)\|", l.strip())[1:-1]]
def hdr(c): return not c or c[0].lower() in ("id", "---") or all(set(x) <= {"-", ":"} and x for x in c)
tot = collections.Counter(); oov = []; em3 = []; emany = collections.Counter()
for f in sorted((ROOT / "docs/reviews").glob("*.md")):
    t = f.read_text(encoding="utf-8")
    cur = len(cmr.parse_disposition(t)); s1 = s2 = cand = 0
    for m in SECTION.finditer(t):
        body = m.group(1)
        s1 += sum(1 for r in OLD.finditer(body) if not (r.group(1).strip().lower() in ("id","---") or set(r.group(1).strip()) <= {"-"}))
        cand += sum(1 for l in PIPE.findall(body) if not hdr(cells(l)))
        off = t[:m.start(1)].count("\n")
        for r in ROW.finditer(body):
            g = [x.strip() for x in r.groups()]
            if hdr(g): continue
            s2 += 1; ln = off + body[:r.start()].count("\n") + 1
            if g[2].lower() not in VOCAB: oov.append((f.name, ln, g[0], g[1], g[2], g[3][:70]))
            if g[2] == "—": em3.append((f.name, ln, g[0]))
    for l in t.splitlines():
        if re.search(r"\|\s*—\s*\|", l): emany[f.name] += 1
    tot["cur"] += cur; tot["s1"] += s1; tot["s2"] += s2; tot["cand"] += cand
    if cur != s1 or s1 != s2 or s2 != cand: print(f"  {f.name}: cur={cur} step1={s1} step2={s2} cand={cand}")
print("TOTALS", dict(tot))                       # {'cur': 749, 's1': 836, 's2': 854, 'cand': 867}
print("== OOV rows =="); [print("  ", r) for r in oov]; print("files:", len({r[0] for r in oov}))  # 15 rows, 8 files
print("== Part 3 =="); [print("  ", r) for r in em3]; print("count:", len(em3))                  # 3
[print(f"  {k}: {v}") for k, v in sorted(emany.items())]; print("total:", sum(emany.values()))  # 16
```

Output observed 2026-09-13 at `b34cd38`: the 13 per-file lines listed under C22, `TOTALS {'cur': 749, 's1': 836, 's2': 854, 'cand': 867}`, 15 OOV rows in 8 files, em-dash `count: 3`, any-column `total: 16`.

## Owner summary

**What changed.** Your Q1 decision is built in: three words, no fourth; an axis with no findings writes no row and says "clean" in its prose. That removed the `n/a` constant, the distinct print form, and the edit to `parallel-phase/SKILL.md`; what remains is one sentence added to `pre-merge-review/SKILL.md` after the existing vocabulary line, which your decision approves. The four mechanical fixes from the review are in: Step 1 asserts exact row counts (56 and 59, not "46 or more"), the skill anchors are quoted text instead of line numbers, the self-test wiring stays in `verify` but must be green standalone before the review file exists (I chose this over moving it after the review, which would leave the review one commit short), and every historical review file that will now print a failure is listed so the executor does not mistake it for breakage.

**What I found when I stress-tested the decision.** It holds. I read all nine "no finding" rows in place: every one repeats a sentence the axis prose already says (`**Spec: clean.**`, `**D3 (clean).**`, "judged sound"), so deleting the row loses nothing. Neither skill asks for a row per axis — the template's example rows are findings, and `parallel-phase` already says only actionable concerns become rows. The one real consequence is that the gate as written would fail a review whose every axis is clean, because it treats "zero rows" as "no table". No such review exists today, but the plan fixes it: a table with a header and no rows passes and prints "(no findings)"; a heading with no table at all still fails. The em-dash dispute is settled at 3 — the larger numbers counted em-dashes in other columns and other files — so the no-finding total stays 9 and that is what goes into ticket 381.

**What I could not determine.** Whether any review file on an unmerged branch other than this one is under-read (I swept the tracked tree only). Whether adding the self-test to `pnpm verify` disturbs anything else — labelled untested; Step 10's standalone `pnpm verify` is the test. I could not reproduce the orchestrator's figure of 10 for the em-dash with any counting rule; 3 (disposition cells) and 16 (any column, any line) are the two numbers I can show commands for.
