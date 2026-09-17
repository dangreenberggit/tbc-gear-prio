# 411 — Measure desktop bulk-screening wall-clock with the finalist stage fixed

Status: open
Type: task
Origin: 406 keep ruling (2026-09-17) + the 346/397/403 contamination finding surfaced by the owner and verified by an agent
Blocks: —
Blocked by: none

## What

Does desktop (HTTP / Go-server) bulk screening beat the per-candidate loop on
**wall-clock** once the finalist-stage defect is fixed? Nobody has measured it.
Every "bulk is slower" number on record is either the wrong metric, the wrong
transport, or dominated by a fixable defect. This ticket is the measurement that
would actually decide whether the bulk-screening code (kept alive under 406) earns
its place, or whether the delete measured under 406 should be taken.

The fix under test is **403's lever 1**: decouple `topResults` from the
finalist-stage size, so the Go finalist stage stops refining all 25 candidates and
discarding the result. `topResults` currently carries two unrelated meanings — it
truncates the response (why our builder sets it to the chunk size) **and** it sizes
the finalist refinement set. The finalist stage must be fixed, **not bypassed**:
bypassing it (403's Track C, which is what shipped) is what made the route dead;
this ticket asks what the route costs when the stage is correct.

## Why the existing numbers do not answer it

Three figures have been read as "desktop/bulk is slower." None measures the
question this ticket owns.

1. **397's 2.05x (3419 s desktop vs 1668 s WASM)** and **403's 13.8x (263 s vs
   19 s at cap 40)** are desktop-slower figures, but **66-73% of that time is the
   ungated Go finalist stage** refining every one of 25 candidates to budget
   exhaustion and discarding the statistical product (397: finalist = 72.9% of
   3419 s; 403 at cap 40: 174.5 s of 263 s = 66%). That is the defect this ticket
   proposes to fix, not a property of the batch route. `git ls-files` shows the
   Go code (`sim/core/bulk/`) is byte-identical to upstream/master — the stage is
   upstream's, ungated since it landed.
2. **346's "batch is ~3.8x cheaper" is worker-seconds, not wall-clock**
   (3,352 vs 12,814 worker-seconds at matched accuracy), and worker-seconds is
   machine cost, not the number a user waits through. 346's own decision says the
   saving "never reaches the user as time": the loop shows its first row at 112 s,
   batch at 3,399 s, and end-to-end the loop finished sooner (5,551 s vs 6,055 s).
3. **346 scoped its keep-the-loop decision to the WASM/web transport only** —
   "The local Go-server default (batch on) is unchanged — this decision is about
   the WASM/web transport only." So 346 says nothing about desktop wall-clock, and
   it never had the finalist stage fixed.

Put together: the desktop bulk route has only ever been measured **with the
finalist-stage defect present**, and the one "cheaper" figure is the wrong metric
on the wrong transport. The experiment that would settle it — desktop bulk
wall-clock, matched accuracy, finalist stage fixed — has never been run.

## Scope and blast radius

- This is a **Go change in `vendor/tbc-new-fork`** (`sim/core/bulk/` and/or the
  builder in `upgrades/adapters/bulk_request_builder.ts`), separating
  `topResults`' response-truncation meaning from its finalist-stage-sizing meaning.
  A Go edit diverges from upstream/master (currently byte-identical there), so it
  carries a sync cost across future catch-ups and goes through the **fork queue**
  (single shared working tree, strictly serial) and **likely stage-gate** given
  the re-verify cost.
- The measurement needs the **desktop gate** (`scripts/check_desktop_tab.py`,
  `run-tab-cdp.mjs`), which builds the packaged `wowsimtbc` binary with
  `make wowsimtbc`. This **runs natively on the Windows box this repo is
  developed on** — verified 2026-09-17: `make --version` is **ezwinports GNU
  Make 4.4.1** on PATH, which routes `$(shell ...)` through Git Bash's `sh.exe`,
  and `pnpm desktop-gate:check` (which shells `make wowsimtbc`) has passed
  end-to-end here across the 397 / 403 / bulk-finalist-cost stages. go / protoc /
  Node 22 / Playwright Chromium are all present too.
  - **Correction (2026-09-17).** An earlier draft of this ticket said the build
    "does not run on the Windows box ... run it in Git-Bash-driven make, WSL, or
    CI." That reflected the **old GnuWin32 GNU Make 3.81**, which does not honour
    its own `SHELL` on Windows and silently computes empty source lists (a build
    that "looks fine and is not," per `.scratch/handoffs/wowsims-reforge-catchup/
    AUDIT-wsl-feasibility.md`). The audit's fix — install Make 4.4.1, drop
    GnuWin32 from PATH — has already been applied, so the disarming move is done.
    WSL is documented as a **non-option** (same audit: repo not in WSL, `/mnt/c`
    git ops ~75× slower, go/protoc missing, a Linux clone silently disarms six
    `pnpm verify` gates). CI cannot produce these numbers either (`verify.yml`
    runs on ubuntu-latest with no go, no Chrome, no fork clone). **This Windows
    dev box is the only viable, proven environment.** Note the `make proto`
    target still assumes a POSIX shell (`docs/agents/upstream-catch-up.md` § run
    protoc from Python instead), but the `wowsimtbc` target itself builds clean
    under Make 4.4.1.
- Do **not** re-run the 3419 s full pool (397's constraint). A capped run
  (cap 40, matching the golden) is the natural size; a cap-20 pair matches 403's
  screening-on-vs-off check.

## The substrate is already in place

The bulk-screening code (runner, request builder, `screenCandidates`,
`composeForBulk`, the `runBulkScreen` seam capability, `engine/bulk/partition.ts`)
stays in both trees precisely so this experiment has something to run against. Its
runtime-dead state and the measured-clean delete alternative are recorded in
ticket 406; if this ticket concludes the route does not win even with the stage
fixed, 406's delete (throwaway shas fork `5c2b1d7f9`, core `ca5c7040`, kept in git
history) is the honest follow-up.

## Done when

A measured **desktop bulk wall-clock and first-row latency** against the
per-candidate loop, at **matched accuracy**, with the **finalist stage fixed**
(not bypassed) so it no longer refines discarded candidates. The result must state
the metric explicitly (wall-clock, not worker-seconds), the transport (desktop /
HTTP / Go server), the cap, and how accuracy was matched — and must say whether
desktop bulk beats the loop on the two numbers a user feels (first row, and
end-to-end). That verdict decides whether the code stays or 406's delete lands.
