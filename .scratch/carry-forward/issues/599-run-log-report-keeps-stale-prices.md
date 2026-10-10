Status: open
Type: task
Origin: pre-merge review of fix/hook-sonnet-cache-price, finding A1 (also D2), 2026-10-08
Blocks: none
Related: docs/reviews/fix-hook-sonnet-cache-price.md

# Run-log report keeps the price each line was written with

## What is wrong

`.claude/hooks/log-agent-run.py` prices each subagent's calls in hook mode
(`call_cost`) and stores only the total, `est_cost_usd`. `report` mode adds
up the stored totals and never prices anything again. A line does not keep
its token counts per price class (input, 5m write, 1h write, cache read,
output), so a price fix cannot reach lines written before it.

Branch fix/hook-sonnet-cache-price changed the Sonnet 5.5 cache-read price
from 0.20 to 0.10 USD/MTok. The adversarial reviewer re-priced the main
checkout's `.scratch/agent-runs/*.jsonl` from their transcripts with the
hook's own `read_calls`/`call_cost`: 33 Sonnet 5.5 agents, stored total
$7.18, re-priced total $6.28 (9,030,583 cache-read tokens). That figure
comes from the reviewer's scratch script, which is not committed; re-run
by re-pricing the transcripts named in each line's `agent_transcript_path`.

Nothing reports the mismatch: `report` prints the old totals as if current.

## Options

- Store per-class token totals in each line and have `report` price them
  from `PRICES`. Old lines without the totals stay at their stored cost.
- A one-time script that recomputes `est_cost_usd` for existing lines from
  their transcripts. Claude Code deletes transcripts after
  `cleanupPeriodDays` (default 30), so this only works while they exist.
- At minimum, have `report` print that old lines use the prices in force
  when they were written.

## Done when

`report` either prices from current `PRICES` or says plainly that it does
not.
