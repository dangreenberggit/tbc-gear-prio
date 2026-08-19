Status: open
Type: task (naming; no behaviour change)
Origin: pre-merge review of feat/candidate-pool round 3, 2026-08-18 — spec axis
Blocks: none
Blocked by: none

# `racing.test.ts` names the P3 recall gate "7.3", which §7's table assigns to Determinism

`docs/plans/wowsims-tab/candidate-pool.md` §7 lists 7.3 = Determinism
(`concurrency` 1 vs 4 identical; `fullPool` identical to the pre-M2 fixture).
Ticket 221 added the P3 recall gate to `racing.test.ts` under the describe name
"M2 racing — 7.3: …", and tickets 222/224/225 now cite "7.2 and 7.3" meaning
recall. The ambiguity is live in committed text.

Renaming a describe block does not weaken any assertion (candidate-pool.md §7),
but every `-t 7.3` citation in tickets and doc comments must move with it.

## Acceptance criteria

- [ ] Pick a free number in the §7 table for the P3 recall gate (or add a row
      for it), rename the describe block, and update every citation:
      `grep -rn "7\.3" packages/core docs .scratch/carry-forward/issues`.
- [ ] Assertions in the renamed block are byte-identical
      (`git diff --numstat` deletions column 0 inside the block).
- [ ] `pnpm verify` green.
