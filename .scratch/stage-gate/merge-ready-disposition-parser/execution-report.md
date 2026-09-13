# Execution report — merge-ready-disposition-parser

Executor seat, 2026-09-13. Base SHA `14af11a173c393983031d929a5312bc13a90069e`,
tip `f03d2c7747260cf6c20b68b976e18b6363eb4c19`, nine commits, tree clean.
Nothing merged.

## 1. What ran, step by step

**Pre-flight.** `git log -1 --format=%H` matched the base SHA; branch
`fix/merge-ready-disposition-parser`; tree clean.

**Baseline captured before touching the parser** (the Verify recipe warns the
`cur` column becomes unmeasurable once `parse_disposition` changes):

```
TOTALS {'cur': 749, 's1': 836, 's2': 854, 'cand': 867}
== OOV rows == 15 rows, files: 8
== Part 3 == count: 3   (any-column total: 16)
check_merge_ready.py relevance logic ok (19 checks)
```

Every load-bearing figure in the claims register reproduced on the executor's
own run.

**Step 1 — scan type and section anchor.** `DispositionScan` dataclass,
`SECTION_RE`, `DISPOSITION_HEADING_RE`, `ROW_SHAPED_RE`, `scan_disposition`;
`parse_disposition` reduced to a shim.

```
disposition rows: 59        (dedup, was 9)
FAIL: Sp3: defer with no ticket path
disposition rows: 56        (candidate-pool, was 36)
check_merge_ready.py relevance logic ok (19 checks)
```

Commit `e5453df`.

**Steps 2+3 — permissive row pattern, vocabulary constant, validation.**

```
disposition rows: 17        (worn, was 15)
  ok  A4: defer -> .scratch/carry-forward/issues/260-narrow-isunmeasuredslot-parameter-type.md (open)
FAIL: D1: unknown disposition 'fixed, then **superseded by measurement**'
disposition rows: 16        (touchpoints, was 15)
FAIL: Sp1: unknown disposition 'n/a'
disposition rows: 59 / 56   (dedup, candidate-pool — unmoved, per C22)
rows 854 cand 867           (corpus, exact match to banked s2/cand)
```

The invalid-row sweep returned exactly 15 rows across exactly 8 files, matching
C5/C24 file-for-file. Commit `43f5e93`.

**Step 4 — denominator, unparsed reporting, empty-table case.**

```
disposition rows: 56 parsed of 66 row-shaped lines in 3 section(s)
FAIL: line 382/384/385/386/487/488/489/490/491/492: disposition row not parsed
disposition rows: 59 parsed of 59 row-shaped lines in 6 section(s)
disposition rows: 0 parsed of 0 row-shaped lines in 1 section(s) (no findings)
FAIL: ## Disposition section has no table — write the header row (...) even when there are no findings
```

All ten line numbers match the plan's table exactly. Advisory **G1 implemented** —
the message names the missing header row. Commit `1cbd92b`.

**Step 5 — self-tests.** `--self-test` → `pure logic ok (30 checks)`, rc=0.
Exactly 30, unadjusted. Commit `a0a5231`.

**Step 6 — precondition.** Both required items were present in the prompt (the
Q1 decision in full; approval scoped to the one Step 7c sentence). No code
change.

**Step 7 — docs and the one skill sentence.**

```
Until 85 and 381  → no hit
An axis with no findings writes no row → 1 (each copy)
git diff --stat -- .claude/skills/parallel-phase/SKILL.md → empty
skill mirrors match (.claude/skills <-> .agents/skills)
```

7b needed no edit: the module docstring names `defer` only, in a sentence still
true. Commit `5e6d267`.

**Step 8 — corpus consistency.** `git diff --stat 14af11a1 -- docs/reviews/` →
empty. No review file edited.

**Step 9 — tickets.** Both `Status: closed`, all seven acceptance boxes ticked,
Resolutions appended (including the Q3 answer in 85 and the census correction in
381).

```
--list-only | 85|381  → neither listed
CLOSED 2026-09-13 count → 2
'9 of them' in 381 → 1
```

Commit `49f4efa`.

**Step 10 — self-test in verify.** `pnpm verify` → **rc=0**, ending
`check_merge_ready.py pure logic ok (30 checks)`. Standalone green, one commit
before the review file existed — the baseline F3 asked for. Commit `144ef58`.

**Step 11 — review.** Three axes, fresh context, one parallel batch (Opus;
`codex` not on PATH). The adversarial axis found a **blocking defect in the
executor's own code** (ledger row 8); fixed in `632cd8e` and reviewed as round 2.
Review file + ticket 382 committed `f03d2c7`.

```
pnpm merge-to-dev --check-only → rc=0
disposition rows: 7 parsed of 7 row-shaped lines in 1 section(s)
  ok  S2: defer -> .scratch/carry-forward/issues/382-merge-ready-comment-volume.md (open)
merge-ready: ok
check-only: ok (not merging)
```

## 2. Deviation ledger

| Step | Plan said | Found | Action | Why / measurement |
| --- | --- | --- | --- | --- |
| 1 | — | `body.index(raw)` reports the *first* occurrence, so two identical row-shaped lines both name one line | adapt | Caught by the executor's own probe before commit. Walk is now positional. Verified independently: fixture lines enumerated from text, single bad row at line 6, `unparsed -> [(6, ...)]` |
| 2/3 | § Expected failures stages `unknown disposition` FAILs at "step 3+" | They appear from Step 2 | adapt | `check()`'s `else` branch was already live; the row pattern's word list was the only thing making it unreachable. Behaviour correct, plan's staging off by one. Spec axis confirmed |
| 2/3 | Two steps, two commits | One commit | adapt | `lint-staged` runs `*` with `--no-stash`, so a staged subset cannot scope a commit (AGENTS.md states this). Spec axis judged no breach: nine commits, each a coherent slice |
| 4 | Run all-clean / no-table fixtures from a scratch file **outside the repo** | Impossible: `check()` calls `review.relative_to(ROOT)` and raises `ValueError` first | adapt | Ran from a path inside the repo, then deleted. Same code path; `check_all_clean_review_is_distinguishable_from_no_table` pins both halves permanently, which is stronger |
| 5 | — | The new `check_five_column_table` asserted lines `[4, 5]`; parser said `[5, 6]` | adapt | **Fixed the test, not the parser.** The parser's numbers match the corpus (382/384/385/386/487-492) and an independent text-derived fixture. The executor had miscounted a blank line |
| 7c | Manifest names `.claude/skills/pre-merge-review/SKILL.md` only | `pnpm verify` byte-compares it against `.agents/skills/` (`check_skill_mirrors.py`); editing one alone turns that gate red | adapt (outside manifest) | Copies were `IDENTICAL at HEAD`, so the divergence would have been self-inflicted. Identical sentence inserted; gate green. Spec axis: "right call" |
| 9 | Append CLOSED to **both** tickets' `map.md` lines | Ticket 381 has **no line at all**. Per-ticket em-dash bullets stop at 245; later tickets use a plain-space form | adapt (outside manifest shape) | Four searches (number, title phrase, both bullet patterns) all empty; `git show fc98fdc:map.md` confirms. New bullet written in the file's current style |
| 11 | — | **Adversarial A1 (blocking):** `ROW_SHAPED_RE` allowed leading whitespace, the unparsed test stripped before matching, but `DISPOSITION_RE` demanded `^\|` — so an indented row counted in the denominator, reached neither list, and passed as `merge-ready: ok` | adapt | The executor's own defect, the very class this branch exists to end. Fixed in `632cd8e`: widened pattern, one shared classifier, and `check()` now fails on `candidates - parsed - unparsed > 0`. Corpus unmoved: `rows 854 cand 867 unparsed 13 **leaked 0**`. 30→33 checks |
| 11 | — | Standards S2 (comment policy) deferred rather than fixed | flag→ticket | Filed 382 (number confirmed free; `NEXT` bumped to 383), linked from Disposition, resolving open |

## 3. Final state

```
f03d2c7 Record the pre-merge review
632cd8e Stop an indented row slipping past the gate
144ef58 Run the merge-ready self-test in verify
49f4efa Close tickets 85 and 381
5e6d267 Describe the parser's real behaviour, and when a row is owed
a0a5231 Cover the disposition parser with self-tests
1cbd92b Print a denominator and fail on lines that did not parse
43f5e93 Parse rows permissively, then validate the word
e5453df Read every Disposition section, not just the first

git status --porcelain → (empty)
HEAD → f03d2c7747260cf6c20b68b976e18b6363eb4c19
11 files changed, 801 insertions(+), 47 deletions(-)
```

Verify recipe re-run **against the tip**: self-test 33; dedup
`59 parsed of 59 … 6 section(s)` + Sp3 FAIL; candidate-pool
`56 parsed of 66 … 3 section(s)` + 10 unparsed; worn `17 parsed of 17` + A4 path
+ D1 FAIL; touchpoints `16 parsed of 16` + Sp1 FAIL; both fixtures correct;
corpus `854/867/13/leaked 0`; `pnpm verify` rc=0 (at `144ef58`);
`pnpm merge-to-dev --check-only` rc=0. **Not merged.**

## 4. What the executor could not verify

- **`pnpm verify` was run at `144ef58`, not at the tip.** The tip was proven by
  `merge-to-dev --check-only`, which runs verify itself — both were not run, per
  the plan and the brief.
- **A2 (informational, not fixed):** `merge_to_dev.py` runs verify as a
  subprocess then calls `check()` in-process, so the self-test inside verify
  exercises a different interpreter than the one gating the merge. Real,
  harmless, unaddressed by design.
- **The mirror-edit authority was the executor's judgment, not an explicit
  grant.** The owner scoped approval by content ("one sentence", "no other skill
  line changes"); the `.agents/` path was not named. The executor judged an
  identical insertion to be inside that scope because the gate requires
  byte-identity. Flagged as the one place it acted outside the manifest on a
  skill file. **Orchestrator disposition: accepted — see the decision log.**
- Corpus baseline `cur: 749` is unrecoverable now that the parser has changed; it
  rests on the pre-change probe run recorded above.
- Two open tickets (262, 382) name `scripts/check_merge_ready.py` — the gate's
  advisory warning, not blocking.

## 5. Summary for the owner

The parser now reads every `## Disposition` section, prints an honest
denominator, and fails loudly — by line number or row id — on anything it cannot
read. Both tickets are closed, the docs say what the code does, and the
three-word decision is recorded in the skill and enforced in code. The all-clean
review case the decision created is handled: a header with no rows passes and
says `(no findings)`.

The thing worth attention: **the review caught a blocker in the executor's own
fix.** An indented table row — legal Markdown — was counted but silently
dropped, and would have passed a `defer` with no ticket straight through the
gate. That is exactly the defect this branch existed to eliminate, reintroduced
in a narrower shape. It is fixed, and the fix closes the whole class: the gate
now fails whenever any row-shaped line reaches neither list, so a future
disagreement gets reported rather than trusted. Two axes found it independently —
the adversarial one by attacking the behaviour, the standards one by spotting the
duplicated logic that caused it.

One cleanup deferred to ticket 382 (comments that restate their code). Nothing is
merged; `--check-only` is green and awaiting the owner's merge ask.
