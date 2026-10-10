# Pre-merge review — fix/hook-sonnet-cache-price

Reviewed range: `b4bc9475cf78acac9775d72a5c0c6c5fb5504d8e..348fc5953efac7dbd71616746ca932ff4e2ed98d`

One commit, one line: the Sonnet 5.5 cache-read price in
`.claude/hooks/log-agent-run.py` changes from 0.20 to 0.10 USD/MTok, to
match <https://platform.claude.com/docs/en/about-claude/pricing> fetched
2026-10-08 (row "Claude Sonnet 5.5", footnote 2: cache hits on Opus 5.5 and
Sonnet 5.5 cost 0.05x base input). `codex` is not on `PATH`, so the three
axes ran as fresh `general-task` subagents on Opus (review lane), in
parallel.

## Adversarial

The new value is right, and all eight `PRICES` rows match the page in all
five columns. One medium finding (A1): `report` adds up the `est_cost_usd`
each run-log line stored when it was written (`report`, line ~294), and a
line keeps no per-class token counts, so lines written before this fix
keep the 0.20 price. The reviewer re-priced the main checkout's
`.scratch/agent-runs/*.jsonl` from their transcripts with the hook's own
`read_calls`/`call_cost`: 33 Sonnet 5.5 agents, stored $7.18, re-priced
$6.28. One low finding (A2): the source comment above the table still said
2026-10-01. No tests exist for this hook (`git grep log-agent-run`).

## Domain

No game-domain facts (TBC, WCL, wowsims) are touched. Every row of the
table matches the page, including the cache multipliers in footnotes 1 and
2 and the Sonnet 5 standard-price note in footnote 3. D1 (low): the source
date, same as A2. D2 (info): six run-log files in the main checkout's
gitignored `.scratch/agent-runs/` name `claude-sonnet-5-5` and were priced
at 0.20; same root cause as A1.

## Standards + Spec

**Spec: clean.** Only the Sonnet 5.5 row disagreed with the page, and no
other part of the script changed. S1 (low): the source date, same as A2.
The commit subject is 47 characters, imperative, no body, no attribution.

## Summary

The fix is correct. The stale source date was fixed on the branch in
8f46bb07 (round 2 below). The stored-cost limitation in `report` is older
than this branch and needs a design choice, so it is ticket 599.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                     |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | defer       | `.scratch/carry-forward/issues/599-run-log-report-keeps-stale-prices.md` — report sums stored costs, so old lines keep old prices |
| A2  | Adversarial | fixed       | source date changed to 2026-10-08 in 8f46bb07                                                                                     |
| D1  | Domain      | fixed       | same as A2, 8f46bb07                                                                                                              |
| D2  | Domain      | defer       | `.scratch/carry-forward/issues/599-run-log-report-keeps-stale-prices.md` — same root cause as A1                                  |
| S1  | Standards   | fixed       | same as A2, 8f46bb07                                                                                                              |

## Round 2 — source date (2026-10-08)

Reviewed range: `348fc5953efac7dbd71616746ca932ff4e2ed98d..8f46bb07d10d5ab9076666215ade88923d391377`

One fresh `general-task` subagent on Opus reviewed this one-line comment
change on all three axes. **Round 2: clean.** All eight rows match the page
re-fetched the same day (byte-identical to the saved copy), so the new date
is true. The `CONTEXT_WINDOWS` comment keeps its own 2026-10-01 read date
for a different table, and its values still hold. The commit changes one
line in one file; the subject is 39 characters, subject-only.

## Disposition (round 2)

| ID  | Axis | Disposition | Ticket / note |
| --- | ---- | ----------- | ------------- |
