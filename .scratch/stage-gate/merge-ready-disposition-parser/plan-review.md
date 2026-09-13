VERDICT: REVISE — F1 (Step 1's candidate-pool acceptance criterion cannot fail as written and hides a real result), F2 (Step 7's two skill-file line anchors are both wrong), F3 (Step 10 makes this branch's own merge gate depend on the parser it is changing, inside one command), F4 (Q1 is decided against its own measured evidence).

## Summary of what I did

I re-derived every number independently — my own probe (`rev_probe.py`, `rev_probe2.py`, both in my scratchpad, never in the repo), not the plan's appendix script. The corpus arithmetic is **correct in full**: 749 current / 867 candidates / 854 parsed, all four per-file figures, the 15 out-of-vocabulary rows in 8 files, the 9 no-finding rows in 4 spellings, the two non-bare headings, C13, C7, C12. The planner measured honestly and the inherited "exactly one out-of-vocabulary row" really is wrong. The approach is sound and I do not recommend changing it.

What fails is a layer above the measurements: four acceptance criteria and anchors that will mislead the executor, and one decision that argues against its own table.

## Findings

| ID | Severity | Where | What breaks | Evidence |
| --- | --- | --- | --- | --- |
| F1 | material | Step 1 acceptance | "reports 46 or more rows (was 36; the round-3 table stays unparsed until Step 4)" — the real Step-1-only figure is **56**, and the round-3 table is unparsed at *every* stage, not just before Step 4. A ">= 46" criterion passes on 46 and on 56 alike, so it cannot distinguish a correct Step 1 from one that silently drops ten rows. | CONFIRMED. New section anchor + **old** row regex over the corpus: candidate-pool `56`, dedup `59`, total `836`. The +18 that Step 2 adds (836→854) is escaped-pipe and permissive-cell rows, none of them in candidate-pool. Fix: assert exactly `56` and `59`, and drop the "until Step 4" clause — it is wrong about why those ten lines are unparsed. |
| F2 | material | Step 7, C15, Q1 trade-off text | Both skill-file anchors are wrong. `pre-merge-review/SKILL.md:118` is a table header row; the vocabulary sentence is at **line 131** (`` `Disposition` is exactly `fixed`, `defer`, or `wontfix`. ``). `parallel-phase/SKILL.md:72` is a completion-criteria bullet naming no vocabulary; the list is at **line 64**. An executor editing line 118 under Q1=C corrupts an example table and leaves the real rule saying "exactly three". | CONFIRMED. `Select-String -Path .claude\skills\pre-merge-review\SKILL.md -Pattern 'fixed\|wontfix\|defer'` → `120: | A1 | Adversarial | fixed |`, `131: \`Disposition\` is exactly \`fixed\`, \`defer\`, or \`wontfix\`.` `parallel-phase` → `64: … \`fixed\`, \`defer\` with a ticket path, or \`wontfix\` with a reason.`, `72: Every actionable \`Notes / concerns\` bullet is dispositioned…`. |
| F3 | material | Step 10 + Verify step 7 | Circularity, and it is real rather than theoretical. `scripts/merge_to_dev.py:139` runs `pnpm run verify`, then line 146 calls `check_merge_ready.check(...)` **in the same process**. Step 10 puts `--self-test` inside `verify`. So `pnpm merge-to-dev --check-only` becomes: the changed parser's self-test gates the run, then the changed parser gates its own branch's review file. A regression in `scan_disposition` can fail this branch at the gate with no green baseline to compare against, and the executor cannot tell a genuine review-file problem from a parser bug. Not unsafe, but Step 10 should land *after* Step 11's review file is green, not before. | CONFIRMED. `Select-String -Path scripts\merge_to_dev.py -Pattern 'verify\|check_merge_ready'` → `137-139: if not args.no_verify: … run(["pnpm","run","verify"])`; `146: ready = check_merge_ready.check(`. Also `grep -c 'self-test' package.json` → 0 today, so the coupling is new. Fix: reorder 10 after 11, or keep the self-test out of `verify` (the plan already offers this escape). |
| F4 | material | Q1 recommendation | The plan picks C and spells it `n/a` — the one spelling its own table shows **loses**. Candidate A was rejected on the pre-registered condition "`n/a` is the spelling reviewers already reach for", measured at 1 of 9. C then adopts the same losing spelling on a different argument (needs no file rewrite), while the plan simultaneously says no historical review file is rewritten under either choice. So "needs no rewrite" separates nothing: under C *and* B the corpus is untouched except, under B, the single `Sp1` cell. The measured majority spelling is `no change needed` / `no finding` (5 of 9) versus `n/a` (1). Either pick the spelling the evidence supports, or state plainly that the spelling is chosen for concision and not for established practice. | CONFIRMED, then judgment. Measured spellings: `n/a` 1, `—` 3, `no finding` 2, `no change needed` 3. The `—` rows (feat-finish-the-tab D3/D4/D7) are em-dashes, unspellable as a keyword. |
| F5 | material | Q1 recommendation, second half | "The gate treats it exactly like `wontfix` (prints `ok`, requires nothing)" collapses a distinction the plan just argued is real. `wontfix` means *a finding existed and was declined*; `n/a` means *no finding existed*. If the gate prints them identically, the vocabulary grew by a word that changes nothing a reader can see — and the plan's own case for C ("the gate should name it rather than pretend it is absent") is unmet. Print it distinctly: `ok  <id>: n/a (no finding)`. | Judgment, resting on the plan's own §Q1 argument. |
| F6 | minor | C6 / Step 2 | C6 says three escaped-pipe rows exist. There are **six** `\|` lines in `docs/reviews/`; three are the disposition rows named, three are prose/command lines elsewhere (`feat-342-learn-from-upstream.md:212`, `fix-carry-forward-backlog.md:209`, `fix-ticket-257-box-marker.md:36`). The claim is true as stated (three *rows*) but the grep in its `Verified by` column only looks at three files, so it cannot have established the count. The conclusion holds; the evidence does not reach it. | CONFIRMED. `Select-String -Path docs\reviews\*.md -Pattern '\\\|'` → 6 hits across 6 files. |
| F7 | minor | Step 2 acceptance | "`--review docs/reviews/fix-worn-item-pool-coverage.md` now lists `A4` (it was absent)" — the premise is right but understated: the new pattern adds **two** rows there (15→17), A4 and D1. D1's disposition is `fixed, then **superseded by measurement**`, which is out-of-vocabulary, so Step 2 also produces an unexpected `FAIL: D1: unknown disposition` on that file. The plan warns about this for touchpoints/Sp1 but not here; an executor will read it as a regression. | CONFIRMED. Probe: worn `cur/new/cand = (15, 17, 17)`; current gate output lists `A3`, `A5`, no `A4`. OOV row `('fix-worn-item-pool-coverage.md', 206, 'D1', 'fixed, then **superseded by measurement**')`. |
| F8 | minor | Step 2 acceptance, second clause | Same class, larger: once the vocabulary check is live (Step 3), **eight** review files gain `unknown disposition` FAILs, not one. The plan's Q1 text acknowledges the 15 rows but no step tells the executor that running the gate against those files is *expected* to fail afterwards. Since none of those branches will be re-gated (all merged), this is cosmetic — but an executor spot-checking the corpus will think it broke something. | CONFIRMED. 15 OOV rows across `docs-fork-upstream-touchpoints`, `feat-content-hash`, `feat-finish-the-tab`, `feat-layout-gate-merge-to-dev`, `feat-reforge-catchup-leftovers`, `feat-tickets-369-370`, `feat-two-hander-clears-offhand`, `fix-worn-item-pool-coverage`. |
| F9 | minor | Step 2 / brief's "Done means" | Step 2 knowingly leaves the touchpoints review failing until Step 8. I judge this **acceptable**: `docs/fork-upstream-touchpoints` is an ancestor of `dev` (verified), so no gate will ever run on that file again, and the only file whose gate must be green is this branch's own — which Step 11 creates. No commit is stranded that cannot pass its own gate. Raised only so the acceptance is conscious. | CONFIRMED. `git merge-base --is-ancestor docs/fork-upstream-touchpoints dev` → rc=0. |

Two risks I went looking for and could **not** find — the chosen approach's candidate-line definition survives both:

- **Fenced code blocks inside Disposition sections.** A `|`-containing line inside a ``` fence would be counted as a row-shaped candidate and produce a false FAIL. Measured across every Disposition section in the corpus: **zero** such lines. The risk is latent for future files, not present. Worth one sentence in `known-traps.md`; not a finding today.
- **`###` subheadings inside Disposition sections.** `SECTION_RE`'s `(?=^## |\Z)` terminator does not stop at `###`, so a subsection's tables would be swallowed. Measured: **zero** Disposition sections contain any `###`-or-deeper heading. Not refutable today.

## Register verdicts

| Claim | Verdict | Evidence |
| --- | --- | --- |
| C1 | **stands** | `parse_disposition` at `scripts/check_merge_ready.py:156` is `re.search(r"(?ms)^## Disposition\s*\n…")`. Current gate on dedup prints `disposition rows: 9`; the file has 6 sections and 59 rows. |
| C2 | **stands** | Line 48 is `(fixed\|defer\|wontfix)`; line 476 is the `else: errors.append(f"{row['id']}: unknown disposition …")` branch, unreachable because a non-matching word fails the whole row pattern. |
| C3 | **stands — every figure** | My independent probe: `TOTALS {'cur': 749, 'cand': 867, 'new': 854}`. Per file `cur/new/cand`: dedup `9/59/59`, candidate-pool `36/56/66`, fix-75-82 `23/32/32`, reforge-leftovers `9/20/20`. Exact match to the plan. |
| C4 | **stands** | `Select-String -Path docs\reviews\*.md -Pattern '^\s{0,3}#{1,6}\s+Disposition'` → 68 headings, exactly two non-bare: `feat-candidate-pool.md:339 ## Disposition (round 3)` and `fix-75-82-review-tickets.md:260 ## Disposition (second pass — …)`. |
| C5 | **stands** | 15 OOV rows in 8 files; 9 no-finding rows in 4 spellings (`n/a` 1, `—` 3, `no finding` 2, `no change needed` 3); 6 decorated (`fixed (proven, round 2)` 3, `fixed (follow-up)` 1, `fixed, then **superseded by measurement**` 1, `minor, accepted` 1). The ticket-381 claim of "exactly one" is confirmed wrong. |
| C6 | **stands (evidence thin — F6)** | The three named rows all fail the old pattern and parse correctly under the new one, including `fix-worn-item-pool-coverage.md:203` `A4`, a `defer`. The new pattern extracts disposition `defer` and the ticket path intact. |
| C7 | **stands** | `git merge-base --is-ancestor docs/fork-upstream-touchpoints dev` → rc=0. |
| C8 | **stands** | The 13 unparsed candidates are exactly where the plan says: candidate-pool Slice table lines 382/384/385/386 (4, 3-column) and round-3 5-column lines 487-492 (6), plus `feat-upgrades-ui-fit.md` 112/113/114 (3, 3-column). The Slice table under a Disposition heading with no `Disposition` header cell is real, so the header-driven parser's silent path is real. |
| C9 | **stands** | `--self-test` → `check_merge_ready.py relevance logic ok (19 checks)`, rc=0. `verify` chain in `package.json:14` contains no self-test entry. |
| C10 | **stands** | `known-traps.md:127-133` already says the parser reads only the first section; line 135 carries "Until 85 and 381 land". Delegated check, quoted verbatim. |
| C11 | **stands** | Delegated audit: 315 is `Status: open`, carries Execution D with CDP proof, and the proof file `.scratch/stage-gate/wowsims-tab-tickets/d-cdp-proof.json` **exists on disk**. `human-inspection-checklist.md:44` parks 313+315 on sign-off ("these two close together"). `feat-upgrades-dedup-wowsims.md:428` Sp3 is a `defer` naming 315 in prose with no path — it will hard-FAIL once parsed, exactly as the Verify recipe expects. |
| C12 | **stands** | `git ls-files --eol docs/reviews | Select-String 'crlf|mixed'` → 0. |
| C13 | **stands** | Full heading census across `docs/reviews/*.md`: all 68 `Disposition`-initial headings are level 2. |
| C14 | **stands** | Convention confirmed in `map.md` (`368 CLOSED 2026-09-10, …`, `374 CLOSED invalid 2026-09-11, …`); tickets flip line 1 to `Status:`. |
| C15 | **stands as a rule, refuted as anchors** | `AGENTS.md:35` requires proposing skill-file changes and waiting for approval. But both line numbers the claim depends on are wrong — see F2. |
| C16 | **stands** | `[^|]+?` requires at least one character, so an empty cell fails and a whitespace-only cell matches; the plan's mitigation (strip, then treat empty as invalid) is the right one and Step 5 tests it. |
| C17 | **untestable before execution** | Explicitly `hypothesis, untested`. It is not load-bearing for the approach, but F3 shows the untested part is the coupling, not the mechanics — reorder rather than test. |
| C18 | **stands** | I ran only read commands; `git status --porcelain` empty and HEAD still `5fd51c70c9242e83f606b640539b44ab66bb0958` at return. |

## Judgments on the questions you asked

**The approach is right.** The rejected header-driven parser genuinely does introduce a silent path, and the Slice table proves the mechanism is not hypothetical. The positional pattern's cell `(?:\\\||[^|])` handles every real escaped-pipe case in the corpus — I parsed all three and the cells come out correct, including a `defer` whose ticket path survives. The candidate-line definition neither over- nor under-counts on any real file: no fenced pipe lines, no `###` subheadings, and the 13 lines it flags are all genuinely unreadable tables that a human *would* read as rows. That is the honest behaviour for a gate.

**Q1 is framed on a correct C5** — the premise holds, so you are not being asked the wrong question. But the answer argues against its own table (F4) and then erases the distinction it fought for (F5).

**Q2 lands correctly.** The denominator counts the right thing and would have caught both defects plus the escaped-pipe rows nobody had filed.

**Q3 is answered soundly** and the proof file actually exists, which I checked rather than took on trust.

## For the owner, in plain English

The plan's measurements are all correct — I re-derived every number myself and found no discrepancy in any of the eighteen claims' substance. The approach is the right one and should proceed.

Four things need fixing first, none of them large. Two are wrong line numbers and a too-loose success check that would let the executor ship a half-working step without noticing. One is an ordering problem: as written, the branch wires its own gate into the command that checks the branch, so if the parser has a bug there is no clean baseline to see it against — move that step to last. The fourth is your decision to make.

On Q1, the plan recommends accepting `n/a` as a fourth word meaning "we reviewed this and found nothing". I agree with adding the concept — nine such rows already exist across five files, so reviewers clearly need it. But the plan rejects `n/a` on one page for being the rarest spelling (1 of 9) and then adopts it on the next, and it proposes the gate print it identically to `wontfix`, which means a reader of the gate's output still cannot tell "no finding" from "finding declined". If you want the concept named, name it visibly: pick the spelling your reviewers actually use (`no finding` is the plainest of the measured ones) and have the gate say so in its output. If you would rather keep three words, the fallback costs one cell edit in a file that will never be gated again.


---

# Round 2 — focused re-review of revision 2

Appended 2026-09-13. Reviewed at HEAD `67e058a91b7bd76ae0e70be880697ff90b234f08`.
Scope was deliberately narrow: only what revision 2 changed. C1-C18 were
re-derived in round 1 and stand; the approach was not re-opened.

VERDICT: PROCEED

Revision-2 guard passed: `## Revision 2` present at plan.md:7. Tree clean, HEAD `67e058a9…` unchanged at return (`git status --porcelain` empty).

I re-derived every figure with my own probe (`rv2.py`, scratchpad only, never in the repo), not the plan's appendix script. All four material findings from round 1 are fixed. Two new minor findings, neither blocking.

## Findings

| ID | Severity | Where | What breaks | Evidence |
| --- | --- | --- | --- | --- |
| G1 | minor | Step 4 / Q1 part 3 | The empty-table fix rests on "the template always writes the header", and that is true of the template but is **not** enforced anywhere the gate can see. The skill's template does write the header row, but `scan_disposition` recognises a header only by first cell `id` (case-insensitive). A reviewer who writes a clean review by deleting the body rows *and* the now-pointless header gets `header_rows == 0` and so `FAIL: ## Disposition section has no table` — a correct review failing the gate. The plan calls this out as intended behaviour, and I agree it is the right trade (it preserves "table missing" detection), but the failure message names the wrong cause: an author in that position is told the section has no table when what it lacks is a header row. Suggest the message say so. | CONFIRMED, then judgment. The template block is at `pre-merge-review/SKILL.md:118-122`; the vocabulary sentence at :131 says nothing about the header. Advisory only — the behaviour is correct, the wording is not. |
| G2 | minor | Step 10 acceptance | The claimed distinguishability is weaker than stated. The plan says a self-test failure prints check names while a review failure prints `FAIL: <id>`, so the two are distinguishable. Both are true, but both print a bare `FAIL:` prefix to stderr inside one `pnpm merge-to-dev --check-only` run: `self_test()` at `scripts/check_merge_ready.py:814` prints `  FAIL: {p}`, and `check()` at :476 prints `FAIL: <id>: unknown disposition …`. The real mitigation is not the output shape — it is the standalone green `pnpm verify` one commit earlier, which the step also requires and which genuinely does give the baseline round 1 asked for. | CONFIRMED. Line 811 prints the ok summary; line 814 prints the failure line to stderr. |

### Round-1 findings — disposition

| ID | Now | Evidence |
| --- | --- | --- |
| F1 | **fixed** | Step 1 asserts exactly 56 / 59 / 836 and the "until Step 4" clause is gone. My probe: candidate-pool `(cur 36, s1 56, s2 56, cand 66)`, dedup `(9, 59, 59, 59)`, `TOTALS {'cur': 749, 's1': 836, 's2': 854, 'cand': 867}`. 836 is right. The criterion can now fail: 46 no longer passes it. |
| F2 | **fixed, both halves** | The quoted sentence is unique — a `-SimpleMatch` search returns exactly one hit, at line 131. And `parallel-phase/SKILL.md` genuinely needs no edit: its only `wontfix` mention is line 64, which already reads "Every **actionable** worker concern … becomes a row … Soft observations need not." Three words, finding-driven. Dropping it from the manifest is correct. |
| F3 | **resolved, trade judged sound** | I judged the trade rather than accepting it. Landing Step 10 after Step 11 would leave `Reviewed range:` one commit short, and that is a worse defect than the coupling, because a short review range is a silent gap in what was reviewed while the coupling is loud. The standalone green `pnpm verify` before Step 11 exists is a real baseline and meets my actual round-1 concern. The step's secondary claim about output shape is overstated — see G2 — but the mitigation does not depend on it. |
| F6 | **fixed** | C6's `Verified by` is now a corpus-wide search returning 6 hits, which does reach the count it asserts. |
| F7/F8 | **fixed and complete** | The § Expected failures table lists all 8 out-of-vocabulary files and both new worn rows. I compared it row-for-row against my probe's 15 rows in 8 files: every one covered, none missing, none spurious. `fix-worn-item-pool-coverage.md` 15 to 17 with `A4` and `D1` confirmed; `D1` at line 206 is the decorated disposition. The later-step rows are correctly staged. Nothing here will surprise the executor. |
| F9 | accepted as written, unchanged | — |

## Register verdicts — C19 to C26

All eight executed. None refuted.

| Claim | Verdict | Evidence |
| --- | --- | --- |
| C19 | **stands** | Spot-checked five of nine, not three. `feat-finish-the-tab.md` rows 159/160/163 carry an em-dash and the note "Clean."; prose at 59/63/79 says `**D3 (clean).**`, `**D4 (clean).**`, `**D7 (clean).**` — the row is strictly less informative than the prose. `feat-tickets-369-370.md` rows 154-156 say "no change needed"; prose at 36/41/45 carries the same sentences at greater length. `feat-two-hander-clears-offhand.md:142` against prose :85 `**Spec: clean.**`. `feat-reforge-catchup-leftovers.md:271` against prose :219. `docs-fork-upstream-touchpoints.md:158` against prose :117 `**Spec.** Clean.` No row carries information its prose does not. The owner's decision loses nothing. |
| C20 | **stands** | The `pre-merge-review` template rows at :118-122 are `A1` fixed, `A2` defer, `D1` wontfix — findings, not one per axis; the only rule is at :131. `parallel-phase/SKILL.md:64` says only actionable concerns become rows. Neither forces a row per axis. |
| C21 | **stands, both halves** | First half read directly: `scripts/check_merge_ready.py:444-449` calls `parse_disposition` then `if not rows:` and reports "review has no parseable Disposition table", with no reference to sections. A legitimately all-clean review would indeed fail. Second half: my probe swept all 58 files — no file lacks a section, and none has a section with zero rows. The defect is real and latent exactly as claimed. **On the fix shape:** header-present-and-zero-body-rows passing, heading-with-no-table failing, is the right discrimination — it is the only signal in the file separating "author had nothing to report" from "author forgot the table". See G1 on the one rough edge. |
| C22 | **stands** | `TOTALS {'cur': 749, 's1': 836, 's2': 854, 'cand': 867}`; candidate-pool s1 = 56, dedup s1 = 59. The +18 from s1 to s2 touches neither of those two files. |
| C23 | **settled independently at 3 and 16** | I counted without reference to either prior figure. The em-dash as the disposition cell of a parsed four-column row inside a Disposition section: exactly 3, in `feat-finish-the-tab.md` at 159, 160, 163. The em-dash between pipes anywhere in any line of any file: 16, across 7 files. I could not construct a counting rule yielding 10 either. **3 is the figure for ticket 381**, and the no-finding total is 9. |
| C24 | **stands** | 15 out-of-vocabulary rows in 8 files, matching the § Expected failures table file-for-file; worn goes 15 to 17, gaining `A4` and `D1`. |
| C25 | **stands** | One `-SimpleMatch` hit at :131 for the vocabulary sentence (:118 is the template header row, as round 1 found). `parallel-phase/SKILL.md` has exactly one `wontfix` line, :64, already correct. No edit needed. |
| C26 | **stands** | Confirmed in round 1 and unchanged: `scripts/merge_to_dev.py:139` runs `pnpm run verify`, and :146 calls `check_merge_ready.check(...)` in the same process. The `verify` chain contains no self-test entry today, so the coupling Step 10 adds is new — which makes the standalone-green-first ordering load-bearing rather than decorative. |

### Carried forward by reference

C1 to C18 were all re-derived in round 1 and stand; revision 2 changes none of their substance. C6's evidence column improved (F6). C15's anchors are superseded by C25. C17 remains `hypothesis, untested` and is correctly labelled — Step 10's acceptance is its test, which is the right place for it.

## On the owner's decision

Noted once, briefly, as instructed: I argued in round 1 for a fourth word. The owner's reasoning — a Disposition row disposes of a finding, and "found nothing" disposes of nothing — is coherent and I do not re-open it. My round-1 F4/F5 are **withdrawn, not merely overruled**: C19 shows the nine rows are pure echo of prose, which is evidence I did not have when I argued they were load-bearing.

The implementation is complete against the decision. The one gap the decision introduced — the all-clean case — the planner found and fixed before I got to it, which is the honest stress-test the prompt asked for. The plan's own account of its stress-test is accurate: I checked each of the three tests it claims to have run and each holds. The skill sentence in Step 7c draws the right line (raised-then-refuted is `wontfix`; never-raised gets no row), and that distinction is already how the corpus behaves.

## Summary for the owner

The plan is ready to execute. All four things I flagged last round are genuinely fixed, and I checked each by re-running the measurement rather than reading the planner's account of it.

Your Q1 decision is implemented correctly and completely. I checked five of the nine "no finding" rows against the prose above them — every one just repeats a sentence the prose already says, so deleting them loses nothing, and my round-1 objection was wrong. The planner found the one real hole the decision opened (a review where every axis is clean would have failed the gate) and fixed it in the plan before I found it.

The em-dash dispute is settled at **3** — counted independently without looking at either previous figure. Neither agent's 10 is reproducible under any rule I could construct. 3 is what should go in ticket 381.

Two small things ride to the executor as advisories, neither worth another round: the "section has no table" failure message would be clearer if it told the author to write the header row even when there are no findings, and Step 10 slightly oversells how easy it is to tell a self-test failure from a review-file failure in the combined output — though the standalone green `pnpm verify` it also requires is a real fix for that.
