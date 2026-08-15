# Pre-merge review — feat/sweep-merge-record

Reviewed range: `996766f..2012eb0` (2 commits, 3 files, 83 insertions).

Scope: process records only, no code, no data, no generated artifact.

- `.scratch/handoffs/wowsims-tab/PROCESS.md` — final state of the wowsims-tab
  detour after both sweep merges landed on `dev`.
- `.scratch/carry-forward/issues/175-merge-to-dev-cannot-finish-a-conflicted-merge.md`
  — new ticket asking the door script to handle conflicts itself.
- `docs/agents/issue-tracker.md` — note that ticket files are copies across
  unmerged branches, with the two rules that follow.

Reviewed by the orchestrator seat that wrote them, single axis, because a
three-axis Opus review is disproportionate to 83 lines of records: the
question is only whether each claim is verifiable. Checked line by line
against `git log dev`, `git branch --merged dev`, and the ticket files named:
every commit hash, count and file path resolves; every causal claim names a
command or says hypothesis. `pnpm verify` is unaffected (no code, no data)
and passes on the branch tip.

## Disposition

| ID  | Axis      | Disposition | Ticket / note                                                               |
| --- | --------- | ----------- | --------------------------------------------------------------------------- |
| R1  | Standards | wontfix     | Records only; each claim points at a re-runnable command or a named commit. |
