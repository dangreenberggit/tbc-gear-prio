# Brief — 411 desktop bulk-screening wall-clock, finalist stage fixed

Base SHA: `59431bf5c16d4e4df563670522e9e0571fa51cfc`
Branch: `feat/406-keep-bulk-dead-note`
Ticket: `.scratch/carry-forward/issues/411-measure-desktop-bulk-wallclock-with-finalist-stage-fixed.md`
Opened: 2026-09-17

## Goal (what exists when this is done)

A committed, reproducible **measurement** that answers one question and a
**verdict** that follows from it:

> Does desktop (HTTP / Go-server) bulk screening beat the per-candidate loop on
> **wall-clock** — specifically **first-row latency** and **end-to-end time** —
> once the finalist-stage defect is fixed (403's lever 1, the stage **fixed not
> bypassed**), at **matched accuracy**?

The verdict is the deliverable: **keep** the bulk-screening substrate (406's
current ruling stands) or **land 406's measured-clean delete** (throwaway shas
fork `5c2b1d7f9`, core `ca5c7040`). The measurement must state, explicitly: the
metric (wall-clock, not worker-seconds), the transport (desktop / HTTP / Go
server), the cap, and how accuracy was matched.

## The fix under test

403's **lever 1**: decouple `topResults` from the finalist-stage size. `topResults`
currently carries two unrelated meanings — it truncates the HTTP response (why the
builder sets it to the chunk size) **and** it sizes the Go finalist refinement set.
The finalist stage must be **fixed, not bypassed**: bypassing it (403's Track C,
which shipped) is what made the route dead; this ticket asks what the route costs
when the stage is correct. The Go finalist stage today refines every one of ~25
candidates to budget exhaustion and discards the statistical product — that ungated
refinement is 66–73% of every prior "desktop is slower" figure (397: 72.9% of
3419 s; 403 at cap 40: 174.5 s of 263 s).

## Environment (settled by research 2026-09-17, ticket corrected in 59431bf5)

- **Runs natively on this Windows box.** `make --version` = ezwinports GNU Make
  4.4.1 on PATH (verified), which routes `$(shell ...)` through Git Bash `sh.exe`;
  the `wowsimtbc` target builds clean and `pnpm desktop-gate:check` has passed
  end-to-end here across 397 / 403 / bulk-finalist-cost. go / protoc / Node 22 /
  Playwright Chromium all present. **WSL is a documented non-option; CI cannot
  produce these numbers.** The ticket's old "does not run on Windows" premise was
  the GnuWin32 Make 3.81 state and is corrected.
- **The Go edit goes through the fork queue.** `vendor/tbc-new-fork` is a single
  shared working tree, strictly serial — never two agents at once. Confirmed clean
  and unheld at stage open (2026-09-17). A ported-engine edit drags the re-pin
  cycle: PROVENANCE hash, fork commit, lock re-pin, `sim-implemented-effects:generate`,
  `pnpm verify`. See `docs/agents/known-traps.md` before the edit and before moving
  the pin.
- **Do not re-run the 3419 s full pool** (397's standing constraint). Capped runs
  only.

## Constraints

- The finalist stage is **fixed, not bypassed** — bypassing it is out of scope and
  is the exact mistake that made the route dead. A plan that bypasses fails the goal.
- Any "bulk is slower / cheaper" number must be re-derived under the fix; prior
  figures (397, 403, 346) are contaminated by the defect, the wrong metric
  (worker-seconds), or the wrong transport (WASM/web) and cannot be reused as-is.
- Matched accuracy is a precondition of any wall-clock comparison — an unmatched
  comparison is not evidence. The plan must say how it is matched and how that is
  checked (the golden `data/desktop-gate/golden-ret-p5-cap40.json` is the anchor).

## Open questions (each carries: candidate, pre-registered win condition, measurement)

### Q1 — What is the cap / pool size for the measurement?

- **Candidate A:** cap 40, matching the golden fixture (`golden-ret-p5-cap40.json`)
  — the natural size, lets accuracy be checked against a committed anchor.
- **Candidate B:** a cap-20 pair (screening-on vs screening-off), matching 403's
  check, plus cap 40 — two points instead of one, at ~2× the run cost.
- **Win condition (pre-registered):** Candidate B wins **only if** one cap could
  give a misleading verdict — i.e. if there is a prior reason to expect the
  first-row / end-to-end ordering to flip between cap 20 and cap 40. If no such
  reason is stated, Candidate A wins on cost (one capped run, not two).
- **Measurement:** state the prior evidence on cap-sensitivity of the ordering
  (from 397/403/346) and whether it forces two points. The plan picks A or B with
  that reason written down; a dropped candidate carries its stated reason.

### Q2 — How is "the finalist stage fixed, not bypassed" verified in the built binary?

- **Candidate A:** assert on the finalist-stage share of wall-clock — after the fix
  it must fall well below the 66–73% seen when ungated, while the stage still runs
  (share > 0, and statistical product retained), proving fixed-not-bypassed.
- **Candidate B:** assert only that the run completes and rows match the golden —
  cheaper, but cannot distinguish "fixed" from "bypassed."
- **Win condition (pre-registered):** Candidate A wins unless there is no way to
  observe the finalist-stage share from the harness/readback, in which case the
  plan must name the alternative signal that proves the stage still runs (else the
  goal's "fixed not bypassed" is unfalsifiable and the plan fails Gate B).
- **Measurement:** the plan states what the readback / harness exposes about the
  finalist stage and picks the check that proves fixed-not-bypassed.

### Q3 — What decides the keep-vs-delete verdict from the two numbers?

- **Candidate A (keep):** desktop bulk beats the loop on **both** first-row latency
  **and** end-to-end wall-clock at matched accuracy → the substrate earns its place,
  406's keep stands.
- **Candidate B (delete):** desktop bulk loses on first-row **or** end-to-end (or
  ties within noise) → the route does not win even with the stage fixed, and 406's
  measured-clean delete is the honest follow-up.
- **Win condition (pre-registered, written before measuring):** "beats" means a
  clear margin on the number a user feels, outside run-to-run noise. The plan must
  fix the noise bar (e.g. spread across N repeats, or a minimum % margin) **before**
  the run, so the verdict is not chosen to fit the result. First-row latency is the
  number 346 found decisive (loop 112 s vs batch 3399 s on WASM); end-to-end is the
  tiebreak.
- **Measurement:** the desktop wall-clock + first-row for loop and for bulk, at
  matched accuracy, stage fixed. The plan pre-registers the decision rule; the
  executor records the numbers and the verdict falls out of the rule, not the other
  way round.

## Done when

A committed measurement (numbers + how-run + the pre-registered decision rule)
and a verdict — keep or delete — that the numbers force under that rule. The
result names metric (wall-clock), transport (desktop/HTTP/Go), cap, and the
accuracy-match method, and says whether desktop bulk beats the loop on first-row
and end-to-end. `pnpm verify` green on the tip; desktop gate re-run and its (a)–(h)
assertions pasted into the measurement record per the re-pin discipline.
