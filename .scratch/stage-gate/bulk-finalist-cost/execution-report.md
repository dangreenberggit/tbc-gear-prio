# Execution report — bulk-finalist-cost (Track C)

Executor seat, 2026-09-16. Base: core `bc6a6eb7b8d4a8e635dc6eac5a91d8a5dbb4bf2f`,
fork `e94d927af0ff7c31f071c961d1d7789980c8b8c9`. All steps S0-S3 and C1-C6 ran.

## Final SHAs

| Repo | SHA | State |
| --- | --- | --- |
| core `feat/desktop-transport-gate` | `182243daa3b6f8fe7e6855cfcd5bc36c0b5b88dc` (+ the Gate C correction commit) | clean, **not merged** |
| fork `feat/upgrades-tab` | `cfbd7fced7a3c7f94feb68071639eaa09650f94b` | clean, **not pushed** |

`ls-remote` returns the old `e94d927af...` for the fork branch — verified, not
assumed. Lock `commit` = fork HEAD, `pushed` false.

## Results

**S2 — pre-fix pair, cap 40.** Screened 263 s (`BulkHttpSimRunner`,
`bulkSimAsync` 3, `aboveCutoff` 14) against loop twin 19 s (`WasmSimRunner`,
`bulkSimAsync` 0). Finalist stage 174.5 s of 263 s (66%) over 2 stage starts.
`--compare` exit 0, reproducing C28 exactly (T2 max 8.1/32, T3 max 0.0/8).

**S3 — the load-bearing determinism check.** Two cap-150 loop runs, 134 rows,
201 `raidSimAsync`, 40 s each. Acceptance printed **`True True True 40 40 134
201`** — `rows`, `aboveCutoffItems`, `baselineDps` exactly equal across two runs
over all 134 rows. This is what licenses C4's exact equality. C37 refit over
three points: **0.2326 s/row on 8.96 s fixed**, within 0.6 s at every point; full
pool projects to **149 s, band 86-211 s**, still **hypothesis, untested**.

**C1/C2 — the change.** `simRunner()` unconditional; probe, `BulkHttpSimRunner`
construction and the `WorkerPool` import gone. Comment 29 lines → 4.
Post-fix desktop run: `WasmSimRunner`, `bulkSimAsync` **0**, `raidSimAsync` 87,
**19 s** — 13.8x faster than the 263 s screened run.

**C3 — judge lines.** Line 1 **`True True`** (post-fix rows byte-equal to the
pre-fix loop twin — the central Track C claim). Line 2 exit 0. Line 4: 0
`Bulk Sim` lines. **Line 3 exit 1 — flagged, see ledger.**

**C4 — the golden gate.** Pre-registered exit codes **2 / 0 / 0 / 1**, all four
as predicted. The tamper test (`Clutch of Demise` 17.3→17.4) produced `(h) FAIL`
naming the row **while T1-T4 all passed** (0.1 diff, inside T2's 12.0) — so the
golden catches what the comparison it replaced would have missed. Greps:
`force-fallback|no-screen-check|last-run-fallback` = 0, `"--compare"` = 1,
`update-golden` = 5, **`compare_readbacks(` = 3** (no second comparator).

**C5/C6.** 403 got its "Fix, 2026-09-16" section; 397 and 401 got notes; **400
untouched** (already closed); ticket **406** filed; `NEXT` → 407. Fork commit is
exactly 2 files. Regen moved **only** the `forkCommit` line (1+/1-), counts
unchanged at 221/451. `pnpm verify` exit 0, 1331 gates ran, 1 skipped
(pre-existing proto-generation skip). Live `desktop-gate:check --candidates 40`
exits 0 with `(h) pass`.

## Deviation ledger

| # | Step | Plan said | Found | Action | Disposition |
| --- | --- | --- | --- | --- | --- |
| 1 | C3 line 3 | cross-transport compare exits 0 | **exit 1**: T2 max 14.5 (limit 12.0), `baselineDpsDiff` **159.3** | flag | **accepted — plan defect, not an execution result.** See below. |
| 2 | S2 | C25 bound: max row shift <= 6.0 DPS | observed max **8.1** | flag | accepted. C25 was a Track A criterion; the plan states Track C does not need it (acceptance is byte-equality). T2's own limit here is 12.0. |
| 3 | C1 | remove only the `simRunner` comment + `WorkerPool` import | the `makeSimRunner` field comment (~:448) described the deleted probe | adapt | accepted. Leaving it would describe machinery that no longer exists. Two falsified sentences replaced with one accurate line. |
| 4 | C1 acceptance | `BulkHttpSimRunner` count 5 | transiently 6, then 5 | adapt | accepted. Self-resolved by #3. |
| 5 | C1 comment | plan's draft cites "257 s against 17 s" | wrote **"263 s against 19 s"** | adapt | accepted, and correct. The plan quoted older `gate-tip.log` values; these are this session's measurements. Stale figures in a permanent comment would be worse. |
| 6 | C5(1) | add a line to `fork-upstream-touchpoints.md` "if it has one" | no such entry — only a dated measurement snapshot | flag, no edit | accepted. The plan's "else nothing" branch applies; editing a dated snapshot would falsify it. |
| 7 | C5(4) | append a re-scoping note to 401 | 401 is about layout-gate skip paths, unrelated to screening | adapt | accepted. Wrote an accurate note saying the grouping was a wrong premise, rather than inventing a connection. Same class as the round-3 catch on 400. |
| 8 | C5 acceptance | status lists only manifest paths | three `.pid` files | adapt | accepted. Added `*.pid` to the stage `.gitignore`; bookkeeping, not deliverables. |
| 9 | C6(a) | commit body states three facts | body ran 12 lines | adapt | accepted. AGENTS.md requires independent review past six lines; a reviewer found most lines duplicated the code comment. Cut to 5. |
| 10 | C4 | golden records `forkCommit` | recorded `e94d927af` (pre-commit sha) | flag | **corrected at Gate C** — see below. |

## Gate C findings (orchestrator, after independent verification)

An independent verifier re-ran every completion claim. All twelve verified: SHAs,
fork-not-pushed, Go tree untouched (one pre-existing divergence only), S3
determinism, C3 line 1, the golden's contents and key order, the gate script
greps, the tab change, the tickets, the regen, and the `pnpm verify` evidence.
**No path was changed that is not in the plan's Paths manifest.**

It found two things the executor did not report, both now fixed:

1. **The golden's `forkCommit` was stale in the way that matters most.** It
   recorded the pre-commit fork sha while holding a post-fix run. That field
   exists so a future red gate is explainable, and the README tells a reader to
   check it first — a wrong value defeats its only purpose. Corrected to
   `cfbd7fced...` by editing the single line; `rows`, `aboveCutoffItems`,
   `baselineDps`, `_note` and the key order untouched, 0 CR / 350 LF preserved.
2. **`predictions.md` pointed twice at a "deviation ledger" that did not exist**,
   and carried a duplicate `## Gate` heading whose second copy was an unfilled
   `_(filled in at C4)_` placeholder. Both pointers now name this file's ledger;
   the empty placeholder section is deleted.

## The C3 line-3 finding, assessed independently

The executor's claim — pre-existing, owned by ticket 398, not caused by this
change — **is correct, and was verified rather than accepted.**

The verifier ran the cross-transport compare **both ways**. Against the pre-fix
loop twin: exit 1, T2 max 14.5, `aboveCutoffSymDiff` 2, `baselineDpsDiff` 159.3,
T4 median -2.25. Against the post-fix desktop run: **byte-identical diagnostic
output.** Ticket 398 documents the same 159.3 figure in the same terms, written
before this plan existed: native 2231.5 vs WASM 2072.2 on "the per-candidate loop
route with no screening involved". The inference is also sound on its own — line
1 proved side (a) is byte-equal pre- and post-fix and side (b) is literally the
same file, so the comparison is the same arithmetic by substitution.

No threshold was loosened to reach this: the `force-fallback` / `no-screen-check`
greps are 0 and T2's limit is still 12.0 in the failing output.

**Two things to keep visible.** First, 398's own resolution ruled out the
compilation hypothesis (native and WASM agree to 5.9e-12 DPS on P3 gear) and
concluded the gap must be a *configuration* difference that the readbacks do not
record. So "owned by 398" is right as to ownership, but 398 is open with the
cause unknown — not diagnosed and parked. Second, the reason this gate was green
before: the pre-fix screened path's finalist refinement pulled rows 9..N closer
to the WASM values. Removing it is exactly what this plan intends, with the
precision consequence pre-registered (C32) and restated in ticket 403. A
disclosed, intended trade — not a concealed regression.

**The plan defect stands as the executor named it:** Q3 listed the cross-transport
compare as a pass condition without reconciling it against ticket 398, which had
already documented why it could not pass at cap 40. Recorded here so the next
plan that reuses this measurement design does not inherit the same expectation.
