# Plan — merge-ready-disposition-parser

Branch `fix/merge-ready-disposition-parser`. Tip at planning time: `06d54cfabd47e1c5e4edf70380df575bf9bdc8ad` (the brief names `fc98fdc4`, which is the parent; `git merge-base --is-ancestor fc98fdc4 HEAD` returns 0). Working tree clean at planning start and end (`git status --porcelain` empty).

Repo root: `C:\Users\dgree\Code\lulz\tbc-gear-prio`. All paths below are relative to it unless absolute.

## Goal

When this plan is done, `python scripts/check_merge_ready.py` reads every row in every `## Disposition` section of a review file — plain headings and headings with trailing text alike — and prints `disposition rows: N parsed of M row-shaped lines in S section(s)`. Any row-shaped line inside a Disposition section that the row pattern cannot read is a `FAIL` naming its line number and text. Any row whose disposition word is outside the accepted vocabulary is a `FAIL` naming the row id. Rows whose note contains an escaped pipe (`\|`) parse. `--self-test` covers all of that from the `CHECKS` tuple. Tickets 85 and 381 are closed, `docs/agents/known-traps.md` describes the real behaviour, Q1 is decided by the owner and recorded, and Q3 is answered in writing. `pnpm verify` passes.

## Approach

**Chosen: fixed four-column positional row pattern, made permissive in the disposition cell and tolerant of escaped pipes, applied to every Disposition section, with a denominator that counts every row-shaped line in those sections.** Three code changes in `parse_disposition`'s neighbourhood, one output change in `check()`, no new harness.

- Section anchor: `re.finditer(r"(?ms)^## Disposition\b[^\n]*\n(.*?)(?=^## |\Z)")`, rows concatenated across matches (C1, C4).
- Row pattern: every cell is `(?:\\\||[^|])`-based so `\|` inside a cell no longer breaks the row (C6); the disposition cell is `+?` permissive and validated afterwards against a named constant, which makes the existing `unknown disposition` branch reachable (C2).
- Denominator: candidate rows = lines inside a Disposition section that start and end with `|`, minus the header row (first cell `id`) and separator rows. `parsed < candidates` is an error per unparsed line, not a warning (C3, C8).

**Strongest rejected alternative: a header-driven table parser** — split each pipe line on unescaped `|`, find the header cell named `Disposition`, read the id from column 0 and the disposition from that column, and ignore tables with no such header. I measured it against the corpus (C8): it parses 863 rows to the positional pattern's 854, with zero regressions against today's 749, and it would read the two odd-shaped tables that exist (`feat-upgrades-ui-fit.md` 3-column, `feat-candidate-pool.md` round-3 5-column). It lost on the win condition I wrote before measuring: *it must not introduce a new silent path.* It does — a table whose header cell is spelled anything other than `Disposition` is ignored, and the denominator it can compute only counts rows in tables it already recognised. That is the same class of defect this plan exists to remove. The corpus already holds one table under a Disposition heading with no such header (the "Slice" table at `feat-candidate-pool.md:382-386`), so the mechanism is not hypothetical. The positional pattern plus "every row-shaped line is a candidate" flags such tables with a line number, which is the honest behaviour for a gate.

**Also rejected: `finditer` alone on the current anchor** (ticket 85's original fix). It leaves `## Disposition (round 3)` unmatched (C4); the two real non-bare headings in the corpus would still be skipped.

## Open questions

Each candidate carries its win condition (written before measuring) and the measurement.

### Q1 — `n/a` vocabulary (owner-facing)

The premise in the brief and in ticket 381 that there is "exactly one out-of-vocabulary row" is wrong (C5). In 4-column disposition rows across all Disposition sections of `docs/reviews/` there are **15 rows in 8 files** whose disposition cell is not `fixed|defer|wontfix`. Nine of them mean "this axis found nothing", in four spellings: `n/a` (1), `—` (3, note "Clean."), `no finding` (2), `no change needed` (3). The other six are decorated forms of a real disposition: `fixed (proven, round 2)` (3), `fixed (follow-up)` (1), `fixed, then **superseded by measurement**` (1), `minor, accepted` (1). The touchpoints branch that carries `Sp1` is already an ancestor of `dev` (C7), so no gate will run on that file again; the same holds for every file in the census. The decision is therefore purely about what future reviewers may write.

| Candidate | Win condition (pre-registered) | Measurement | Result |
| --- | --- | --- | --- |
| **A** — accept `n/a` as a fourth no-op disposition | `n/a` is the spelling reviewers already reach for when an axis has no findings (majority of no-finding rows) | 1 of 9 no-finding rows spell it `n/a` (C5) | Loses on its own criterion; the word is not established practice |
| **B** — keep three words, rewrite `Sp1` to `wontfix` | Exactly one out-of-vocabulary row exists and its branch will be re-gated | 15 rows, 8 files; touchpoints merged (C5, C7) | Zero immediate cost, but the corpus shows ~1 in 100 rows is a "no findings" row; under B each future one either fails the gate and gets relabelled `wontfix` (a finding that was declined — false) or is dropped from the table |
| **C** — a distinct "axis reviewed, nothing actionable" concept, one accepted spelling, documented in the review skill | No-finding rows exist across several files and authors in more than one spelling, so the concept is real and the gate should name it rather than pretend it is absent | 9 rows, 5 files, 4 spellings (C5) | **Wins.** |

**Recommendation: C, spelled `n/a`.** Meaning: "this axis was reviewed and produced no actionable finding; no ticket, no fix". The gate treats it exactly like `wontfix` (prints `ok`, requires nothing). Spelling `n/a` rather than a new word because it is the one spelling already in a 4-column table and it needs no rewrite of any review file. Trade-offs the owner is accepting: (1) the accepted vocabulary grows from three words to four, and `.claude/skills/pre-merge-review/SKILL.md:118` and `.claude/skills/parallel-phase/SKILL.md:72` change to say so — skill edits need owner approval per `AGENTS.md`, and the Q1 answer *is* that approval for those two lines only; (2) `n/a` can be misread as "not reviewed" — the skill text must define it; (3) the six decorated forms (`fixed (proven, round 2)` etc.) become gate failures for future writers — intended: decoration belongs in the note column. If the owner prefers B, Step 8 carries the delta. Historical review files are not rewritten under either choice (they are merged and never re-gated; rewriting a judgment record to satisfy a parser that never runs on it is churn without a reader).

**The executor must not pick.** If the executor's prompt does not carry the owner's Q1 answer, stop after Step 5 and report.

### Q2 — denominator

**Lands here.** Three candidates for what it counts:

| Candidate | Win condition | Measurement | Result |
| --- | --- | --- | --- |
| (a) sections the anchor found | Would have made both defects visible | Sections count alone says nothing about rows dropped by the row pattern (defect B, escaped pipes) | Loses |
| (b) rows the strict row pattern rejected | Detects a future defect of the same class | Only counts what the strict pattern already saw; a line it does not match is not "rejected", it is invisible — exactly today's failure (research agent, item 3) | Loses |
| **(c) every row-shaped line inside a Disposition section, minus header and separator** | Any line a human would read as a table row that the parser did not parse is reported by line number | Corpus: 867 candidates vs 854 parsed by the new pattern; the 13 unparsed lines are the Slice table (4) and 5-column round-3 table (6) in `feat-candidate-pool.md` and the 3-column table (3) in `feat-upgrades-ui-fit.md` (C3, C8) | **Wins.** Each unparsed line is an error with its number |

What (c) cannot see: a heading the anchor does not recognise (`### Disposition`, `## Dispositions`). Mitigation in Step 4: a level-agnostic count of headings that *start with* `Disposition` (`(?im)^\s{0,3}#{1,6}\s+Disposition\b`) compared with sections parsed; a mismatch is an error. Measured on the corpus: no heading outside level 2 starts with `Disposition` (the only loose hit is `## Findings and disposition`, which does not start with the word — C13), so this adds zero false positives today.

Without the denominator the plan's own acceptance ("under-read visible") cannot be checked, which is why it is not deferred.

### Q3 — ticket 315 (Sp3)

**Answered: the concern Sp3 raised is satisfied; no new ticket; no parser action.** Audit (C11): `Sp3` at `docs/reviews/feat-upgrades-dedup-wowsims.md:428` defers "313 committed unmet" — `setBonusLine`'s four display branches had never executed. Ticket `315-*.md` (Status: open) carries resolution sections dated 2026-08-28/29 and an "Execution D" section: all four states were rendered and read back from a live DOM via headless CDP, proof at `.scratch/stage-gate/wowsims-tab-tickets/d-cdp-proof.json`; display floor `SET_BONUS_MIN_DISPLAY_DPS = 10` added on the fork. Tickets 313 and 315 remain `open` deliberately: `.scratch/carry-forward/human-inspection-checklist.md:44-59` parks them on owner sign-off ("these two close together"). "Ticket still open" and "concern addressed" are different claims; the second is confirmed, the first is by design. The `Sp3` row itself is not rewritten (historical, merged). Step 9 records this answer in the closing note of ticket 85 so it is durable.

## Claims register

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | `parse_disposition` (`scripts/check_merge_ready.py:156`) uses `re.search` with anchor `^## Disposition\s*\n`, so only the first section is read and a heading with trailing text matches nothing | yes | `grep -n 're.search' scripts/check_merge_ready.py` → line 156; `python scripts/check_merge_ready.py --review docs/reviews/feat-upgrades-dedup-wowsims.md --branch feat/upgrades-dedup-wowsims` prints `disposition rows: 9` |
| C2 | `DISPOSITION_RE` (lines 47-50) matches only `(fixed\|defer\|wontfix)`, so the `else` branch at line 476 is unreachable from a table row | yes | `grep -n 'fixed|defer|wontfix' scripts/check_merge_ready.py` → line 48; `grep -n 'unknown disposition' scripts/check_merge_ready.py` → line 476 |
| C3 | Across `docs/reviews/*.md` today's parser returns 749 rows; row-shaped candidate lines in all Disposition sections total 867; the chosen pattern parses 854. Per file: dedup 9→59 of 59, candidate-pool 36→56 of 66, fix-75-82 23→32 of 32, reforge-leftovers 9→20 of 20 | yes | Appendix script (`planner_probe3.py`) — totals line `Counter({'p1c': 867, 'p2': 863, 'p2c': 863, 'p1': 854, 'cur': 749})`. Inherited figures (61/56/17 "file-wide") were not reproduced exactly; they counted a different thing (file-wide strict-regex matches). Direction and scale confirmed |
| C4 | Exactly two non-bare `## Disposition` headings exist in the corpus: `feat-candidate-pool.md` `(round 3)` and `fix-75-82-review-tickets.md` `(second pass — …)` | yes | `grep -n '^## Disposition.' docs/reviews/*.md` → 2 lines |
| C5 | 15 four-column rows in 8 review files carry an out-of-vocabulary disposition; 9 of them are "no findings" in 4 spellings. The inherited/ticket-381 claim of "exactly one" is wrong | yes | Appendix script (`planner_probe2.py`) — lines tagged `DISP=`; spot check `grep -n '| n/a \|| — \|| no finding \|| no change needed ' docs/reviews/*.md` |
| C6 | A `\|` inside a cell makes the current row pattern fail, dropping the row silently. Three such rows exist, one a `defer` (`fix-worn-item-pool-coverage.md:203` A4; also `feat-drift-warner-proven.md:209`, `feat-reforge-catchup-leftovers.md:268`) | no | `grep -n '\\\\|' docs/reviews/fix-worn-item-pool-coverage.md docs/reviews/feat-drift-warner-proven.md docs/reviews/feat-reforge-catchup-leftovers.md`; appendix `planner_probe2.py` tags them `NCOL=5/6` |
| C7 | Branch `docs/fork-upstream-touchpoints` is an ancestor of `dev`; no gate will run on its review file again | yes (Q1) | `git merge-base --is-ancestor docs/fork-upstream-touchpoints dev; echo $LASTEXITCODE` → 0 |
| C8 | A header-driven parser parses 863 rows with zero regressions but silently ignores any table lacking a `Disposition` header cell (1 such table in corpus: `feat-candidate-pool.md:382`) | yes (approach) | Appendix script `planner_probe3.py` — `p2` column and `ign` column; header-shapes list |
| C9 | `--self-test` runs 19 checks in ~171 ms; `pnpm verify` does not run it today | no | `Measure-Command { python scripts/check_merge_ready.py --self-test }`; `grep -c 'self-test' package.json` → 0 |
| C10 | `docs/agents/known-traps.md:126-136` was already corrected on 2026-09-12 to say the parser reads only the first section; the inherited claim that it asserts all rounds are parsed is stale | no | `grep -n 'does NOT parse all rounds' docs/agents/known-traps.md` |
| C11 | Sp3's deferred concern is satisfied; tickets 313/315 stay open on owner sign-off | yes (Q3) | `grep -n 'Sp3' docs/reviews/feat-upgrades-dedup-wowsims.md`; `grep -n -i 'status\|execution d\|reachab' .scratch/carry-forward/issues/315-*.md`; `grep -n '313\|315' .scratch/carry-forward/human-inspection-checklist.md`; `git log --oneline -8 -S"setBonusLine"` |
| C12 | No tracked review file has CRLF endings; `.gitattributes` gives `docs/reviews` `text=auto eol=lf` | no | `git ls-files --eol docs/reviews \| Select-String 'crlf\|mixed'` → 0 |
| C13 | No heading at a level other than 2 starts with `Disposition` in the corpus | no | Appendix script `planner_probe4.py` → only `## Findings and disposition` differs |
| C14 | Closing convention: flip line 1 to `Status: closed`; append `CLOSED <date>, <reason>` to the ticket's line in `.scratch/carry-forward/map.md` | no | `Select-String -Path .scratch/carry-forward/map.md -Pattern CLOSED \| Select -Last 3` |
| C15 | Skill files need owner approval before editing (`AGENTS.md` "Editing skills"); the owner's Q1 answer supplies it for the vocabulary lines only | yes (Step 7) | `grep -n 'wait for approval before editing' AGENTS.md` |
| C16 | `[^|]+?` rejects an empty cell but accepts whitespace-only; the disposition must be stripped and an empty result treated as invalid | no | research agent, item 4 (Python `re` docs); Step 5 self-test proves it |
| C17 | Adding `--self-test` to the `verify` chain does not disturb other verify steps | no | hypothesis, untested — proven by the Verify recipe |
| C18 | Every parse of a review file in this plan reads files only; no step runs git write commands | yes | by construction; `git status --porcelain` in Verify recipe |

## Steps

Commit after each green step (repo rule: a commit per green slice). Use PowerShell for git; prepend the Node 22 PATH line for any `pnpm` command.

1. **Scan type and section anchor.** In `scripts/check_merge_ready.py` add a `@dataclass class DispositionScan` with fields `rows: list[dict]`, `sections: int`, `candidates: int`, `unparsed: list[tuple[int, str]]` (1-based line number, stripped line), and `disposition_headings: int`. Add `SECTION_RE = re.compile(r"(?ms)^## Disposition\b[^\n]*\n(.*?)(?=^## |\Z)")` and `DISPOSITION_HEADING_RE = re.compile(r"(?im)^\s{0,3}#{1,6}\s+Disposition\b")`. Write `scan_disposition(text) -> DispositionScan`: normalise `\r\n` to `\n`, iterate `SECTION_RE.finditer`, run the row pattern per section, concatenate rows. Keep `parse_disposition(text)` as `return scan_disposition(text).rows` so no caller changes shape. Acceptance: `python scripts/check_merge_ready.py --review docs/reviews/feat-upgrades-dedup-wowsims.md --branch feat/upgrades-dedup-wowsims` reports 59 rows (was 9) and `--review docs/reviews/feat-candidate-pool.md --branch feat/candidate-pool` reports 46 or more rows (was 36; the round-3 table stays unparsed until Step 4 reports it). Depends on C1, C3, C4, C12.

2. **Row pattern.** Replace `DISPOSITION_RE` with one whose four cells use `(?:\\\||[^|])` — first three `+?`, note `*?` — and whose third cell has no word list. Keep the `fid.lower() in ("id", "---") or set(fid) <= {"-"}` guard. Store `disposition` stripped and lower-cased as today. Acceptance: `--review docs/reviews/fix-worn-item-pool-coverage.md --branch fix/worn-item-pool-coverage` now lists `A4` (it was absent); the same on `docs/reviews/docs-fork-upstream-touchpoints.md` lists `Sp1` with a `FAIL: Sp1: unknown disposition 'n/a'` line (this is expected until Step 8). Depends on C2, C6, C16.

3. **Vocabulary constants and validation.** Add `DISPOSITIONS = ("fixed", "defer", "wontfix")` near `KNOWN_STATUSES`; the error string at lines 446-449 and the `elif disp in ("fixed", "wontfix")` at line 473 read from constants instead of literals. Add a pure `invalid_disposition_rows(rows) -> list[dict]` returning rows whose (stripped) disposition is empty or not in the accepted set; `check()` reports each as `FAIL: <id>: unknown disposition <word!r> (accepted: …)`. Acceptance: `python scripts/check_merge_ready.py --self-test` still passes (19 checks) and the two probes from Step 2 behave as stated. Depends on C2, C16.

4. **Denominator and unparsed-line reporting in `check()`.** Replace `print(f"disposition rows: {len(rows)}")` with `disposition rows: {parsed} parsed of {candidates} row-shaped lines in {sections} section(s)`. For each `scan.unparsed` entry append `FAIL: line {n}: disposition row not parsed — {line!r}`. If `scan.disposition_headings > scan.sections`, append `FAIL: {k} heading(s) start with 'Disposition' but only {sections} '## Disposition' section(s) were parsed`. Keep the existing "no parseable table" error for `sections == 0`, reworded to name the vocabulary from `DISPOSITIONS`. Candidates are computed in `scan_disposition`: each line in a section matching `^\s*\|.*\|\s*$`, excluding lines whose first cell is `id`/`---` or whose cells are all `-`/`:`. Acceptance: `--review docs/reviews/feat-candidate-pool.md --branch feat/candidate-pool` prints `56 parsed of 66 row-shaped lines in 3 section(s)` and 10 `not parsed` FAIL lines with line numbers in 382-386 and 487-492; `--review docs/reviews/feat-upgrades-dedup-wowsims.md --branch feat/upgrades-dedup-wowsims` prints `59 parsed of 59 … 6 section(s)` and includes `FAIL: Sp3: defer with no ticket path`. Depends on C3, C8, C13.

5. **Self-tests.** Append checks to `CHECKS` in the existing style (one function, docstring says why, returns problem strings), all through `scan_disposition` / `invalid_disposition_rows` — no git, no IO:
   - `check_disposition_reads_every_section` — two bare sections, rows from both, `sections == 2`.
   - `check_disposition_heading_with_trailing_text` — `## Disposition (round 3)` as the only heading yields its rows.
   - `check_single_typo_row_is_reported` — three rows, one `defered`: all three parse; `invalid_disposition_rows` returns exactly that id (the silent case).
   - `check_all_typo_table_stays_loud` — every row invalid → every id returned.
   - `check_five_column_table_is_counted_not_dropped` — 5-column table: `rows == []`, `candidates == N`, `unparsed` has N entries with correct line numbers.
   - `check_escaped_pipe_in_note_parses` — note containing `` `a \| b` `` parses; disposition and id intact.
   - `check_header_and_separator_are_not_candidates` — a table with only header + separator has `candidates == 0`.
   - `check_crlf_input_parses` — same fixture with `\r\n` gives identical rows.
   - `check_empty_disposition_cell_is_invalid` — `| X1 | Axis |   | note |` is either unparsed or invalid, never `ok`.
   - `check_n_a_is_accepted` — only under Q1 = C (Step 8); otherwise `check_n_a_is_rejected`.
   Update `self_test()`'s summary line so it no longer says "relevance logic". Acceptance: `python scripts/check_merge_ready.py --self-test` exits 0 with 28 or more checks. Depends on C2, C6, C12, C16.

6. **Stop point for Q1.** If the executor's prompt does not state the owner's Q1 choice (`C` or `B`), stop here and report; Steps 1-5 are committed and green regardless. Depends on C15.

7. **Docs.** Rewrite `docs/agents/known-traps.md` lines 126-136 ("does NOT parse all rounds … Until 85 and 381 land …") to say: every `## Disposition` section is parsed including trailing-text headings; a row the parser cannot read and a disposition word outside the accepted set both fail with a line/id; the output reads `N parsed of M`; keep the "write defer rows as `path — note`" guidance. Update the module docstring of `scripts/check_merge_ready.py` (line 5-7) if it names the vocabulary. Under Q1 = C only: change `.claude/skills/pre-merge-review/SKILL.md:118` to `` `Disposition` is exactly `fixed`, `defer`, `wontfix`, or `n/a` (axis reviewed, no actionable finding — no ticket, no fix) `` and `.claude/skills/parallel-phase/SKILL.md:72` to add `n/a` to its list. Acceptance: `grep -n 'Until 85 and 381' docs/agents/known-traps.md` → no hit; `grep -n 'n/a' .claude/skills/pre-merge-review/SKILL.md` → 1 hit under C, 0 under B. Depends on C10, C15.

8. **Q1 landing.** Under **C**: add `"n/a"` to the accepted set as `NO_FINDING = "n/a"`; `check()` prints `ok  <id>: n/a` for it; add `check_n_a_is_accepted` (Step 5). No review file changes. Under **B**: leave the vocabulary at three; edit `docs/reviews/docs-fork-upstream-touchpoints.md:158` cell 3 from `n/a` to `wontfix` and prefix the note with `No findings — `; add `check_n_a_is_rejected`. Under either: no other review file is edited (C5, C7 — merged, never re-gated). Acceptance: `python scripts/check_merge_ready.py --review docs/reviews/docs-fork-upstream-touchpoints.md --branch docs/fork-upstream-touchpoints` prints `16 parsed of 16 row-shaped lines in 1 section(s)` and no `unknown disposition` or `not parsed` line (other FAIL lines about ticket statuses may appear and are outside this plan). Depends on C5, C7, C15.

9. **Tickets.** Set `Status: closed` on `.scratch/carry-forward/issues/85-merge-ready-parses-only-the-first-disposition-table.md` and `381-merge-ready-row-regex-silently-drops-unknown-dispositions.md`; tick each acceptance box; append a dated `## Resolution` paragraph to each naming this branch and the re-run command (`python scripts/check_merge_ready.py --self-test`). In 381, correct the sentence "The single out-of-vocabulary value is `n/a`" with the measured figure (15 rows, 8 files; 9 no-finding rows in 4 spellings) and record the owner's Q1 choice. In 85's resolution, add one paragraph answering Q3: "Sp3 (dedup review :428) audited 2026-09-12: the deferred concern is satisfied per ticket 315's resolution and Execution D sections; 313/315 stay open on owner sign-off (human-inspection-checklist.md:44-59). No new ticket." Append `CLOSED 2026-09-12, fix/merge-ready-disposition-parser` to both tickets' lines in `.scratch/carry-forward/map.md`. Acceptance: `python scripts/check_merge_ready.py --list-only` no longer lists 85 or 381; `grep -c 'CLOSED 2026-09-12' .scratch/carry-forward/map.md` ≥ 2. Depends on C11, C14.

10. **Wire the self-test into verify.** In `package.json` add `"merge-ready:selftest": "python scripts/check_merge_ready.py --self-test"` and append `&& pnpm run merge-ready:selftest` to the `verify` chain. Acceptance: `pnpm verify` output contains `check_merge_ready.py … ok (`. Depends on C9, C17. If the reviewer cuts this step, the Verify recipe still runs the self-test by hand.

11. **Review file for this branch.** Run `pre-merge-review` per the repo loop; the resulting `docs/reviews/fix-merge-ready-disposition-parser.md` keeps every row in one table under a bare `## Disposition` heading, 4 columns, no `\|` in notes. Acceptance: `pnpm merge-to-dev --check-only` prints `N parsed of N row-shaped lines in 1 section(s)` and `merge-ready: ok`. Do not merge. Depends on all.

## Paths manifest

Modified:
- `scripts/check_merge_ready.py`
- `docs/agents/known-traps.md`
- `.scratch/carry-forward/issues/85-merge-ready-parses-only-the-first-disposition-table.md`
- `.scratch/carry-forward/issues/381-merge-ready-row-regex-silently-drops-unknown-dispositions.md`
- `.scratch/carry-forward/map.md`
- `package.json` (Step 10)
- `.claude/skills/pre-merge-review/SKILL.md` (Q1 = C only)
- `.claude/skills/parallel-phase/SKILL.md` (Q1 = C only)
- `docs/reviews/docs-fork-upstream-touchpoints.md` (Q1 = B only, one row)

Created:
- `docs/reviews/fix-merge-ready-disposition-parser.md` (Step 11, by the review skill)

No partition — one executor, serial.

## Verify recipe

PowerShell, from the repo root, with `$env:PATH = "C:\Users\dgree\AppData\Roaming\fnm\node-versions\v22.16.0\installation;" + $env:PATH` first.

1. `python scripts/check_merge_ready.py --self-test; echo "rc=$LASTEXITCODE"` → rc=0, ≥ 28 checks.
2. `python scripts/check_merge_ready.py --review docs/reviews/feat-upgrades-dedup-wowsims.md --branch feat/upgrades-dedup-wowsims` → `disposition rows: 59 parsed of 59 row-shaped lines in 6 section(s)` and `FAIL: Sp3: defer with no ticket path` (the gate now sees the row that was invisible).
3. `python scripts/check_merge_ready.py --review docs/reviews/feat-candidate-pool.md --branch feat/candidate-pool` → `56 parsed of 66 … 3 section(s)` and 10 `not parsed` lines.
4. `python scripts/check_merge_ready.py --review docs/reviews/fix-worn-item-pool-coverage.md --branch fix/worn-item-pool-coverage` → `A4` present in output.
5. `python scripts/check_merge_ready.py --review docs/reviews/docs-fork-upstream-touchpoints.md --branch docs/fork-upstream-touchpoints` → `16 parsed of 16`, no `unknown disposition`, no `not parsed`.
6. Corpus totals: run the appendix script (or its copy in the executor's scratchpad) → `parsed 854, candidates 867` with the new parser and current rows 749 from the pre-change parser (use `git stash`-free comparison: run against `git show 06d54cf:scripts/check_merge_ready.py` copied to the scratchpad).
7. `pnpm merge-to-dev --check-only; echo "rc=$LASTEXITCODE"` on this branch after Step 11 → rc=0 (this runs `pnpm verify`; do not also run `pnpm verify` separately).
8. `git status --porcelain` → empty after the last commit.

## Out of scope

- Duplicate-id checks (per section or otherwise) — multi-round files reuse ids by design; ticket 85 rejects the idea.
- Re-gating or re-litigating the three historical merges; rewriting any historical review row other than the single `Sp1` cell under Q1 = B.
- `ticket_path_from_note` raising `ValueError` on an absolute path (investigation D1) — a different function; file a ticket only if the executor trips over it.
- Recursive ticket discovery under `.scratch/carry-forward/issues/` (investigation D2).
- Header-driven table parsing or accepting 3- or 5-column tables — rejected in Approach; such tables now fail loudly with a line number, which is the intended behaviour.
- Any change to what `check()` does after parsing (status rules, relevant-ticket warning, merge mechanics).
- Closing tickets 313 or 315 — parked on owner sign-off by the human-inspection checklist.

## Appendix — measurement script

Planner copies live in the session scratchpad (`C:\Users\dgree\AppData\Local\Temp\claude\C--Users-dgree-Code-lulz-tbc-gear-prio\ce93c1ad-6697-4f47-a813-95dfd1191b40\scratchpad\planner_probe{,2,3,4}.py`). If that directory is gone, this is `planner_probe3.py`'s core, enough to reproduce C3, C5, C8. Save outside the repo and run with `python <path>`.

```python
import re, sys, collections
from pathlib import Path
ROOT = Path(r"C:\Users\dgree\Code\lulz\tbc-gear-prio")
sys.path.insert(0, str(ROOT / "scripts")); import check_merge_ready as cmr
SECTION = re.compile(r"(?ms)^## Disposition\b[^\n]*\n(.*?)(?=^## |\Z)")
CELL = r"(?:\\\||[^|])"
ROW = re.compile(rf"^\|\s*({CELL}+?)\s*\|\s*({CELL}+?)\s*\|\s*({CELL}+?)\s*\|\s*({CELL}*?)\s*\|$", re.M)
PIPE = re.compile(r"(?m)^\s*\|.*\|\s*$")
def cells(l): return [p.strip() for p in re.split(r"(?<!\\)\|", l.strip())[1:-1]]
def hdr(c): return not c or c[0].lower() in ("id", "---") or all(set(x) <= {"-", ":"} and x for x in c)
tot = collections.Counter(); disp = collections.Counter()
for f in sorted((ROOT / "docs/reviews").glob("*.md")):
    t = f.read_text(encoding="utf-8")
    tot["cur"] += len(cmr.parse_disposition(t))
    for m in SECTION.finditer(t):
        tot["cand"] += sum(1 for l in PIPE.findall(m.group(1)) if not hdr(cells(l)))
        for r in ROW.finditer(m.group(1)):
            g = [x.strip() for x in r.groups()]
            if hdr(g): continue
            tot["new"] += 1; disp[g[2].lower()] += 1
print(tot)  # expect cur=749 cand=867 new=854
print([(k, v) for k, v in disp.items() if k not in ("fixed", "defer", "wontfix")])  # 15 rows
```

## Owner summary

**Q1 — what reviewers may write.** I recommend accepting `n/a` as a fourth disposition meaning "axis reviewed, nothing actionable; no ticket, no fix". The reason is not the one row in the touchpoints review — that branch is already merged and its file will never be gated again. It is that the review corpus already contains nine "no findings" rows in four different spellings across five files; the concept is real, and a gate that refuses to name it will push future reviewers to write `wontfix` for a finding that never existed, or to drop the row. The cost is one more word in two skill files and the risk that `n/a` reads as "not reviewed", which the skill text has to define away. The alternative (keep three words, rewrite that one cell to `wontfix`) is cheaper today and costs a small lie at roughly one row in a hundred from now on. Your call; the executor stops and asks if it is not told.

**Q2 — the denominator.** It lands in this branch. It counts every row-shaped line inside a Disposition section, and each one the parser cannot read is a failure with a line number. That would have exposed both defects and also the one nobody had filed: three rows, one of them a `defer`, were being dropped because their notes contain an escaped pipe.

**Q3 — ticket 315.** The concern behind `Sp3` was addressed: all four set-bonus display states have been rendered and read back from a live page, with proof files in the repo. Tickets 313 and 315 are still open on purpose, waiting for your sign-off per the human-inspection checklist. No new ticket.

**What I could not determine.** Whether any review file on an unmerged branch other than this one is currently under-read (I swept the tracked tree only). Whether adding the self-test to `pnpm verify` disturbs anything else (labelled untested; the verify recipe proves it). Two inherited numbers did not reproduce exactly (61/56/17 "file-wide" rows became 59/66/20 in-section candidates) and one inherited claim was wrong ("exactly one out-of-vocabulary row" — there are fifteen); neither changes the fix, both are corrected in the tickets.
