Status: resolved
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

- [x] Pick a free number in the §7 table for the P3 recall gate (or add a row
      for it), rename the describe block, and update every citation:
      `grep -rn "7\.3" packages/core docs .scratch/carry-forward/issues`.
- [x] Assertions in the renamed block are byte-identical
      (`git diff --numstat` deletions column 0 inside the block).
- [ ] `pnpm verify` green. **Blocked by ticket 232, not by this work.**

## Resolution (2026-08-19)

**`pnpm verify` is red at the branch tip for an unrelated reason** — see
ticket 232. `racing.test.ts` 7.0 fails with `expected 242 to be less than 228`
at base `017c0c6` with this work stashed, and identically at `57ec814^`, so it
predates both the re-record and this rename. Everything else is green: 853
tests pass, one fails. This ticket's own gate is
`npx vitest run packages/core/test/racing.test.ts -t P3-recall` → passes.

The gate is named **`P3-recall`**, not a §7 number, and §7 gains a row keyed
by that literal token. No number was free in the useful sense: `7.3` is
Determinism and `7.13` is matched by `-t 7.1` (§7's Cap row), because vitest's
`-t` is an unanchored regex.

Measured while picking the name — the regex's `.` also matches any character,
so the collision was wider than the ticket describes. At base
`017c0c6`, `-t 7.0` selected **three** blocks (7.0, 7.2 and 7.3):

```
npx vitest list packages/core/test/racing.test.ts -t 7.0   # base: 3 tests
npx vitest list packages/core/test/racing.test.ts -t 7.3   # base: 1 test
```

After the rename each committed selector picks one block, and `-t 7.3`
selects none:

```
npx vitest list packages/core/test/racing.test.ts -t P3-recall  # 1 test
npx vitest list packages/core/test/racing.test.ts -t 7.3        # none
npx vitest list packages/core/test/racing.test.ts -t 7.2        # 1 test (unchanged)
npx vitest run  packages/core/test/racing.test.ts -t P3-recall  # passes, 25.97 s
```

`-t 7.0` still also selects 7.2, since `.` matches the `.` position in "7.2".
That is a collision between two §7-numbered rows and is out of this ticket's
scope (which is the recall gate's name against the table); it is noted here
because the same regex property caused it.

Assertions unchanged: `git diff HEAD -- packages/core/test/racing.test.ts |
grep -c "^[+-].*expect"` → `0`. The file's numstat is `10 6`, not equal, only
because the naming-rationale comment at l.328 was rewritten and is longer.

Citations updated where they mean **recall**: `rank.ts:175`,
`fixtures/synthetic-offline.ts:165`, tickets 221/225/228, and
`docs/reviews/feat-candidate-pool.md` l.316/322. Citations meaning
**Determinism** were left alone: `rank.ts:1207,1502,1620`, `rank.test.ts:4128`,
`candidate-pool.md` §7 row 7.3, and the historical R3/R4/F3 findings in
`docs/reviews/feat-candidate-pool.md`. `packages/core/dist/**` is build output
and was not edited. Ticket 221's naming paragraph is marked superseded here.
