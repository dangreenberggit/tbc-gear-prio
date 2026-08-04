# Pre-merge review — fix/job-row-and-ticket-30

Diffed against: `dev...fix/job-row-and-ticket-30` (c142333 at dispatch; fixes
landed at 04714e8 and after)

**Scope.** Three commits, carrying the two deferred findings from
`docs/reviews/feat-content-hash.md`: ticket 29 (stranded job row) and ticket 30
(re-filed, not fixed). The source change is small — `git diff -w` shows 21
insertions / 9 deletions in `rank.ts` before this review's own fixes; the rest
of that file's line delta is re-indentation from wrapping the body in an inner
function.

**Dispatch.** `codex` was not on `PATH`. Two fresh subagents on the sharp lane
(Opus), each with the diff and its own brief, no access to the authoring
session: Adversarial from `.agents/reviews/adversarial.md`, and
Standards + Spec via the `code-review` skill. **Domain was deliberately not
run** — the branch touches no game facts, no WCL fields, no universe data. It
is error handling and ticket text, so a TBC/wowsims reviewer would have had
nothing in scope to check.

---

## Adversarial

Confirmed the stranding fix is structurally sound before looking for holes:
`rankAfterJobCreated` is a hoisted declaration so the call-before-definition is
legal; `return await` (not bare `return`) keeps the promise inside the `try`;
the cache-hit early return precedes `job.create`, so no row exists to strand;
`onProgress` throws are now caught where they were not before; every captured
binding is `const` and initialised before the call. Three findings.

**A1 — the `"sim-failed"` default wrote a confidently wrong `errorKind`, and
this branch's own test was the proof.** A `Store.put` failure — a blob-write
error, nothing to do with the sim — landed in the row as
`errorKind: "sim-failed"`, `errorDetail: "blob write exploded"`. Same for the
`slot mapping bug` throw, a `SIM_ORDER`/`slots-table.json` disagreement,
reported to an operator as a sim failure. This is the brief's highest-severity
shape at the ops altitude: a plausible wrong label with nothing flagging the
mislabel. `RankErrorKind` had no member for "our own fault", so nothing forced
the choice.

**A2 — the catch's own `job.update` was unguarded**, so a store whose job
writes fail stranded the row _and_ masked the original error. The invariant the
ticket claimed ("every exit reaches a terminal state") held only for stores
whose job writes always succeed.

**A3 — test theatre in the new test.** `rejects.toThrow()` with no argument
passes on _any_ throw, so it could not distinguish "the original error
propagated" from "the catch threw something else" — it would have passed under
A2. `expect(row?.status).not.toBe("running")` was dead, implied by the
preceding `toBe("error")`. And it asserted nothing about `errorKind` /
`errorDetail`: **zero** `errorKind` assertions existed in the whole file, which
is exactly why A1 was invisible to the suite.

## Standards + Spec

**Standards — no hard violations beyond one comment.** The new test's comment
half restated the code and contradicted itself (it said "a non-RankError from
deep in the candidate loop" while the throw was from `put`, after the loop),
against AGENTS.md's comment policy. Judgement calls: subclassing `MemoryStore`
for the fake was judged _appropriate_ rather than a smell — a purpose-built
fake would re-implement `job.create/update/read` and could drift from the real
adapter. The inner-function-after-`return` shape was judged the right trade
(a `finally` cannot distinguish success; a module-level extraction needs ~10
parameters — a Data Clump you would be inventing).

**Spec — ticket 29 genuinely satisfied**, and in the ticket's own preferred
shape ("or the whole post-create body"). Four claims from the doc commit were
audited; three held and one did not:

| Claim                                              | Verdict                                                                                                               |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Ticket 30's box is on the Phase 2 gate             | Confirmed                                                                                                             |
| `applyView` is unimplemented                       | Confirmed — zero matches under `packages/`, including `dist/`                                                         |
| Ticket 29 resolved by code, not just marked closed | Confirmed                                                                                                             |
| **Phase 1 gate is "nine boxes, all ☑"**            | **Wrong** — PLAN.md §14 renders 9, but `docs/verification-log.md` heads its 2026-07-29 entry "Phase 1 gate: 10 of 10" |

Also flagged: ticket 29's "Mutation-checked: …" was a causal claim in a
committed artifact with no re-runnable command, against AGENTS.md's durable-claims
rule; and the `docs/reviews/feat-content-hash.md` A3 row credited the fix to
branch `feat/phase-1-gate-close`, which no longer exists.

---

## Summary

Two axes, seven findings. The severe one was mine and self-inflicted: **fixing
the stranded-row bug introduced a new mislabel**, telling an operator the sim
had failed when the store had. Both reviewers found it independently, and the
test I had written to prove the fix was what demonstrated the defect.

The 9-vs-10 box count is a real discrepancy between PLAN.md §14 and the
verification log. Both sources agree the Phase 1 gate is **closed**, so the
conclusion drawn from it stands; only the count drifted, and the ticket now
cites the log's wording instead of a number.

`pnpm verify` green at the fixed tip — 196 passed, 2 skipped
(`cli-sim-runner`, which self-skips without the wowsimcli binary), 22 files.
Note a fresh worktree needs `pnpm sync:wowsims:restore` before `verify` passes:
`vendor/` is gitignored, so `skeleton:check` fails on a missing
`ret_default.apl.json` until the vendored files are restored from the committed
lockfile.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                            |
| --- | ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | New `internal` `RankErrorKind`; the catch no longer defaults to `sim-failed`. Mutation-checked (`expected 'sim-failed' to be 'internal'`)                                                                                                                |
| A2  | Adversarial | fixed       | Error-path `job.update` wrapped in a best-effort `try`/`catch` so a broken store cannot mask the original failure. Mutation-checked                                                                                                                      |
| A3  | Adversarial | fixed       | Test now matches the thrown message, asserts `errorKind` and `errorDetail`, and drops the dead assertion. Second test added for the masking case                                                                                                         |
| ST1 | Standards   | fixed       | Test comment trimmed to the load-bearing hazard; the self-contradicting half removed                                                                                                                                                                     |
| ST2 | Standards   | wontfix     | `MemoryStore` subclassing — reviewer judged it the narrower, less drift-prone choice                                                                                                                                                                     |
| SP1 | Spec        | fixed       | "Nine boxes" corrected in ticket 30 and the S4 row; both now cite the verification log's "10 of 10" wording, with the PLAN.md discrepancy recorded for whoever next touches §14                                                                          |
| SP2 | Spec        | fixed       | Ticket 29's mutation claim now carries a re-runnable command and a table of all three mutations; the overclaimed "every exit by construction" is qualified with the two real limits. Stale branch name corrected in the A3 row of `feat-content-hash.md` |
