# Plan review — bulk-finalist-cost (round 3, final)

Reviewer seat, 2026-09-15. **Verdict: approve.** Three minor findings, none
blocking; all three are one-line corrections the executor absorbs without another
planning round.

## Findings

| ID | Severity | Where | What breaks | Evidence |
| --- | --- | --- | --- | --- |
| n1 | minor | C41, §"Why `cpuCount` is recorded" | **The rounding is attributed to the wrong component.** The plan says "the harness rounds `dps` to 0.1". It does not — `parseDelta` is a regex plus `parseFloat` with no rounding; the 0.1 granularity comes from the tab's own renderer. The conclusion (0.1 DPS granularity, so the golden is portable except at a rounding boundary) is correct; the mechanism is not, and the plan cites no evidence for the 0.1 figure. A reader who checks the harness finds no rounding and may conclude the portability argument is unfounded. Fix: attribute it to `upgrades_tab.tsx:250` and cite that line. | `sed -n '278,326p' run-tab-cdp.mjs` — no rounding anywhere in readback construction. `grep -n "toFixed" upgrades_tab.tsx` -> `:250 deltaDps.toFixed(1)` (row cells), `:1404 baseline.dps.toFixed(1)` (the `baselineDps` source text). Orchestrator-verified. |
| n2 | minor | §"What is compared, and what is ignored", C40 | **The ignore list is incomplete — six readback keys appear in neither list:** `forceFallbackRemaining`, `poolSizeSource`, `runFailed`, `runTimedOut`, `runnerBeforeRun`, `screeningFallbackTexts`. **Not a latent flap**, because the design is a whitelist in code (compare exactly three fields) and the ignore list is prose, not logic — an unlisted field is ignored by construction. But the plan presents the lists as exhaustive over 33 keys and they cover 27. Fix: add the six, or say the prose list is illustrative and the code compares a whitelist. | `python` enumeration of `smoke-release-cap20.json`: 33 keys; set difference against the plan's 3 + 24 leaves exactly those six. |
| n3 | minor | Step C5(4) | **Ticket 400 is already closed**, but C5(4) says to append a re-scoping note to 397, 400 and 401 and "do not close them; say which". Harmless but reads as contradictory at execution time; the executor should note 400 is already closed rather than treating it as open scope. | `head -2 .scratch/carry-forward/issues/400-*.md` -> `Status: closed`; 401 -> `Status: open`. Orchestrator-verified. |

## What the review could not break

**Exact equality is safe, and the dependency order is right.** S3 runs before C4
(S0→S1→S2→S3→C1..C6), re-runs cap 150 twice on the pre-fix binary, and carries an
explicit stop: if `rows`, `aboveCutoffItems` or `baselineDps` differ between the
two runs, the executor halts and the owner decides before C4 is written. A
genuine pre-condition, not a label.

**The portability worry is smaller than assumed, and here is why.**
`pnpm desktop-gate:check` is never invoked by CI, by `pnpm verify`, or by either
git hook — the only entry point in the repo is `package.json:70`. `verify:steps`
is a fixed chain of ~29 named checks and the gate is not among them;
`.github/workflows/verify.yml` never clones the fork (ticket 400 records exactly
this). So an exact-equality golden can only go red on a developer's own machine,
on demand, with the diagnostic in front of them. A CPU change would need one
deliberate `--update-golden` with a diff explainable by `cpuCount`. Adequate.

**The tamper test is meaningful.** `rows` is directly compared, a cap-40 golden
has a `rows[9]`, so adding 0.1 to its `dps` perturbs a compared field, and the
(h) diagnostic prints differing rows with the item name. The pre-registered
2/0/0/1 sequence tests what it claims to. One gap worth knowing: the restore path
re-runs the harness, so the restored golden is a *different* run's output — fine
given S3 proves determinism, but it depends on that determinism holding.

**Regressions the golden would miss are still covered.** `rowCount` by (e),
fallback warnings by (g), panics by (f), transport by (a)/(b)/(c). Those are the
shape regressions the golden cannot see, and they stay automatic.

**`--update-golden`'s (a)-(g) gate is weak, and that is acceptable.** A ranking
regression preserves shape and would pass (a)-(g), so `--update-golden` would
write a corrupted golden. The real controls are the printed diff, the committed
file (so `git diff` shows the same rows again at commit time), and the rider
demanding the reason in the commit body. Every stronger mechanism considered — a
`--force` flag, a reason string, a `.prev` file, a differing-row threshold —
reduces to making the developer type one more thing, which the same reflex
defeats. For a hand-run, never-CI'd gate in a solo repo this is proportionate.
**One line is worth adding for honesty rather than safety:** say that (a)-(g)
only stop a *broken run* (timeout, panic, wrong worker, wrong row count) from
becoming a golden, and that value-level correctness rests entirely on the
developer reading the diff.

**Rounds 1-2 findings are all discharged.** G1 → (h) is replaced, not deleted,
and `compare_readbacks` is reused rather than duplicated. G2 → S3 supplies the
artifact and C37 is labelled hypothesis in the table, the register and the verify
recipe. M1 → fabricated `decision-log.md` citations gone. M2 → C43 and Step C1
say `:1239` and name `WorkerPool` as the single import to remove.
M3 → band widened to 80-195 s, `readback-wasm-tip.json` cited in C44.
m1/m2 → six vitest files named in the C5 ticket; stale Track A manifest rows gone.

**Also confirmed clean:** nothing pushes the fork, merges to `dev`, or files
upstream. Constraint 5 holds — largest run is cap 150, and S2's failure branch
permits cap 60 while forbidding the full pool. Tickets 404 and 405 exist and the
plan forbids re-filing them.

## Register verdicts

Stands: C38, C39, C40 (with n2's undercount), C42, C43, C44, C45, C46.
C41 stands as to conclusion, refuted as to mechanism (n1). C37 stands as a
correctly-labelled hypothesis. C1-C36 carried forward from `plan-review-2.md`.

## What the executor is authorised to do

Approving this plan authorises a single serial executor, working in the one
shared fork tree and the core repo, to: measure a pre-fix cap-40 baseline pair
and two cap-150 loop runs against the current fork tip, **stopping and reporting
if the two cap-150 runs disagree**; change two fork files — `upgrades_tab.tsx`
(make `simRunner()` return `this.sim` unconditionally, delete the `WorkerPool`
probe and its import, replace a ~30-line comment with about four lines) and one
doc line in `bulk_request_builder.ts`; rewrite `scripts/check_desktop_tab.py` to
invert checks (b)/(c), drop the twin run and the `--force-fallback` /
`--no-screen-check` flags, and add a golden-readback check (h) plus an
`--update-golden` path; create `data/desktop-gate/golden-ret-p5-cap40.json` and
its README; update three docs and append notes to tickets 397/400/401 while
filing one new ticket; then commit once in the fork (no push), bump
`data/wowsims-fork.lock.json`, regenerate `data/sim-implemented-effects.json`
(`forkCommit` line only), and make one core commit.

It does **not** authorise pushing the fork, merging anything to `dev`, filing
anything upstream, re-running the full 601-candidate pool, deleting the now-dead
bulk screening code, or re-filing tickets 404/405.
