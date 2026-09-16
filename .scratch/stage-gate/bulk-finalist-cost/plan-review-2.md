# Plan review — bulk-finalist-cost (round 2, Track C)

Reviewer seat, 2026-09-15. **Verdict: revise.** Two blocking, three material, two
minor.

> **Provenance note.** This file was written to disk late, by the orchestrator,
> from the reviewer's returned report. Revision 3 of the plan was produced before
> it landed and worked from the orchestrator's prompt plus `decision-log.md`
> lines 101-162, which carry the same findings. Recorded so the gap is visible
> rather than papered over; the content below is the reviewer's verbatim finding
> table and verdicts.

## Findings

| ID | Severity | Where | What breaks | Evidence |
| --- | --- | --- | --- | --- |
| G1 | blocking | Step C4, C31 | **Deleting (h) leaves the desktop gate with zero automatic ranking coverage, and the plan's claim that Step C3 takes over the invariant is false.** Assertions (a)-(g) check only shape: served-worker bytes, runner string, request counts, `done`/`runTimedOut`, `rowCount`, `panicHit`, `screeningFallbackWarnings`. **None inspects DPS values, row order, or the above-cutoff set.** All content comparison (T1 key-set, T2 rows 9..N, T3 top-8, T4 median) lives in `compare_readbacks`, reached only from (h) at `check_desktop_tab.py:514-537` — which runs automatically inside `main()` — or from `--compare` at `:481-489`, which only compares two pre-existing JSON files passed by hand and is never invoked by the gate. Step C3 is a one-time executor action during this ticket, not a standing check. After C4, `desktop-gate:check` becomes a single-run shape check: a regression that silently ranks wrong on desktop passes it. | `check_desktop_tab.py` (a) `:409-411`, (b) `:412-413`, (c) `:414-421`, (d) `:422-424`, (e) `:426-444`, (f) `:446`, (g) `:448-457`, (h) `:514-537`, `--compare` `:481-489`. Gate invokes the harness twice today (`:510`, `:518`); after the deletion, once. |
| G2 | blocking | C37, Measured-expectations table, S1 | **The cap-150 measurement is unreproducible — no artifact exists.** C37 says "cap-150 run measured 2026-09-15 (134 rows, 37 s, 201 raidSimAsync)" but names no file. No JSON under `.scratch` has `rowCount` 134 or 150. `decision-log.md`'s bullet still reads "a subagent **is measuring**" — the result was never written back. The 134-row point is the entire basis for the slope (the 20/40 pair gives a 4.6 s spread over 20 rows, far too short a lever) and therefore for the headline 130-160 s. Neither a reviewer nor the executor can re-run it. | `python` walk of `.scratch/**/*.json` for `rowCount in (134,150)` -> no match; `find .scratch -name "*cap150*"` -> no match. Plan cites no path, unlike every other measured claim. |
| M1 | material | C28, C29, §"fixture question" | **Three citations point past the end of the file they name.** The plan cites `decision-log.md:275` twice and `:279-300` once; that file is **99 lines**. The underlying facts are in it (Gate B round 2 bullet), but the line numbers are fabricated and an executor following them finds nothing. | `wc -l decision-log.md` -> 99. |
| M2 | material | Step C1 | **Wrong line number, and "remove any import that becomes unused" is a trap next to it.** The `data-runner` line is **1239**, not 1234. `BulkHttpSimRunner` is still used at `:465` and `:1239` and must **stay**; only `WorkerPool` (`:12`, used solely by the deleted probe at `:1162`) becomes unused. An executor told to keep 1234 and strip unused imports can strip both and break `:1239`. | `grep -n "BulkHttpSimRunner\|WorkerPool" upgrades_tab.tsx` -> WorkerPool at 12, 1162 only; BulkHttpSimRunner at 19, 449, 465, 1159, 1166, 1239. |
| M3 | material | C37 uncertainty (i) | **The honest range should be wider than 130-160, and the plan has an unused 601-row loop datapoint it never mentions.** If loop variance is unmeasured, the band cannot be tighter than the only variance figure in evidence (bulk's 42% of mean). Separately `readback-wasm-tip.json` **is** a 601-row loop run (`runner` `WasmSimRunner`, 601 rows, **1668 s**) — in-browser WASM, so it does not transfer, but its absence makes the extrapolation look better-supported than it is. | `readback-wasm-tip.json`: `runner WasmSimRunner`, `rowCount 601`, `elapsedS 1668`, `requests {bulkSimAsync:0, raidSimAsync:0, other:949}`. |
| m1 | minor | §Dead code, C5(5) | Six vitest files keep passing while testing code the tab no longer reaches — green but dead. One line in the C5(5) ticket. | The bulk test files; none routes through `simRunner()`. |
| m2 | minor | Paths manifest | Residual Track A rows survive as live-looking instructions after "Track A: dropped — no paths". Delete them. | Contradictory manifest rows. |

## What the review could not break

**Criterion 2 (byte-equality) is sound — round 1's F1 does not recur.** `--force-fallback` installs a one-shot `window.Worker` subclass (`run-tab-cdp.mjs:337-349`): the counter is 0 at page load so the **factory pool constructs normally**, is armed to 1 after the page settles and before Run (`:500`), so the next construction — the probe `new WorkerPool(1)` at `upgrades_tab.tsx:1162` — throws into the bare `catch`, `simRunner()` returns `this.sim`, and the counter decrements back to 0 (`:343`). Track C returns the same `this.sim` with the probe deleted. The probe's throwaway `WorkerPool(1)` only calls `setNumWorkers(1)` on **its own** `concurrencyPool` (`worker_pool.ts:88-96`) — no shared or static state. C30 stands.

**C37's arithmetic is correct and under-sold.** Recomputed all three pairwise fits from (20,13), (40,17), (134,37): slopes 0.2000 / 0.2105 / 0.2128, fixed 9.00 / 8.79 / 8.49, predicting 129.2 / 135.3 / 136.4 at 601 — exactly the plan's stated figures. The request-count corroboration is stronger than claimed: fitting `raidSimAsync` against rows gives fixed **39.96**, slope **1.2018**, and seconds-per-request is stable at 0.203 and 0.184 across a 6.7x row range. Linearity over 20-134 is not coincidence. The 4.5x extrapolation is the real exposure and the plan names it.

**Also confirmed clean:** nothing pushes the fork, merges, or files upstream. Constraint 5 holds. Tickets 404/405 exist and the plan forbids re-filing them; `NEXT` is 406. Step C1's comment instruction is unambiguous and its acceptance criterion is mechanically checkable. Step C6's ordering is correct given `check_sim_implemented_effects.py:147`; round-1 F6 resolved. Only `check_desktop_tab.py` and `run-tab-cdp.mjs` consume `--force-fallback`. `check_engine_port_drift.py` hashes only `upgrades/engine/` files and is unaffected.

## Register verdicts

Stands: C30, C31, C36, C4, C33, C23, C16, C18, C24, C26, C35. Stands (arithmetic)
/ refuted (reproducibility): **C37** — see G2. Stands (facts) / refuted
(citation): **C28**, **C29** — see M1. Refuted round 1, correctly retained as
superseded: C22. All other claims carried forward from round 1 unchanged.

## What would clear the verdict

G1 needs a decision the plan does not offer: keep (h) with the twin inverted, or
replace it with a committed reference JSON compared automatically, or say plainly
that the gate is demoted to a shape check and let the owner accept that. G2 needs
the cap-150 artifact committed and cited by path, or the claim relabelled
`hypothesis, untested` with the headline table marked accordingly. M1-M3 are
corrections an executor can absorb; m1-m2 are advisory.
