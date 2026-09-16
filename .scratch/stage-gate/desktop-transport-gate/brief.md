# Brief — desktop-transport gate (Chunk 2)

Stage opened 2026-09-14. Base SHA `c3ddcffe19b2ff4f6058c256caa214d7034f8a10`
on `dev`, tree clean. Plan: `.scratch/plans/upgrades-tab-finish-line.md`
revision 1, **Chunk 2**. Handoff:
`.scratch/handoffs/upgrades-tab-finish-line-HANDOFF.md`.

Read the plan's Chunk 2 section in full before planning. This brief does not
restate it; it records what the orchestrator verified today, the constraints,
and what done means.

## Goal

The upgrades tab is proven to run on the **packaged desktop binary**, over the
HTTP transport, with a scripted check a later session can re-run without
re-deriving any of this. When this is done:

- `make wowsimtbc` has been built and run on this machine for the first time.
- A durable CDP harness lives in the fork at
  `ui/core/components/individual_sim_ui/upgrades/tools/run-tab-cdp.mjs`,
  promoted from the throwaway driver, and drives a full ret run on a given
  origin.
- `pnpm desktop-gate:check` exists, exits 0 on the tip, and **cannot pass on
  the WASM fallback**.
- `scripts/dev-tab.ps1`'s stale "make is not installed" note is gone and it has
  a `-Desktop` switch.

## Why this is stage-gated

The deliverable is a gate other work relies on, and the failure mode is a false
"works on desktop" claim — a judgment failure, not a throughput one. Two things
make a false pass easy, and the plan's step 5 acceptance exists to make it
impossible:

1. **The embedded build has no precedent on this machine** (plan C9, C10). The
   only HTTP-transport run on record used `--usefs=true`, which serves `dist/`
   live from disk — a different mode, not a weaker embedded one.
2. **The tab silently falls back to the WASM runner when its transport probe
   fails.** Verified today at `upgrades_tab.tsx:1159-1169`:

   ```
   private simRunner(): Promise<WasmSimRunner | BulkHttpSimRunner> {
       this.simRunnerPromise ??= (async () => {
           try {
               if (await new WorkerPool(1).isWasm()) return this.sim;
           } catch {
               return this.sim;
           }
           return new BulkHttpSimRunner(this.sim.concurrency);
       })();
   ```

   The bare `catch { return this.sim }` means a probe that throws yields the
   WASM runner and a run that completes normally. **A gate that only trusts the
   tab's own choice, or only that a run finished, passes on the fallback.**
   Acceptance must assert the runner class *and* observe `/bulkSimAsync`
   traffic — two independent signals, because the fallback defeats either alone.

## Preconditions — verified today, do not re-assume

| Check | Result |
| --- | --- |
| Core repo clean | `git status --porcelain` empty at `c3ddcffe` |
| Fork clone clean, on `feat/upgrades-tab` | HEAD `2781486d6b324c3092c0c5dcd51a26bbb7103d78` |
| Fork HEAD == `data/wowsims-fork.lock.json` `commit` | equal |
| Fork tip on remote | **pushed today**: `5e9013b78..2781486d6`, `ls-remote` confirms |
| No other session in a worktree | owner confirmed exclusive use of the fork clone |
| `python scripts/sync_wowsims.py --check` | rc 0, `in sync.` |
| `go` / `make` / `protoc` | go1.25.4 windows/amd64, GNU Make 4.4.1, libprotoc 35.1 — all on PATH |
| `wowsimtbc*`, `binary_dist/` | absent — never built here |
| `scripts/check_desktop_tab.py`, `desktop-gate` in package.json | absent (0 hits) |
| `run-tab-cdp.mjs` | absent; the tools dir holds `bulk-spike.mts`, `equiv-campaign.mts`, `export_equip_eligibility.mts`, `headless.mts`, `hooks.mjs`, `register.mjs` |

Owner granted exclusive use of the fork clone for this stage. Step 3 checks out
an older fork sha in that one shared clone and must restore it — `fork-universes:check`
compares against the fork's **working tree**, so a checkout left on the wrong
sha turns `pnpm verify` red until restored.

## Open questions

**Q1 — Does the embedded vite bundle carry the tab's universe/EP data?**
Plan C20 holds that this data is bundled at build time with no runtime fetch, so
the embedded dist carries it; that the bundle reaches `binary_dist` intact is
explicitly *hypothesis, untested*. Step 2 settles it.
Candidate approaches, and the result that makes each win, written before
measuring: (a) the run on 3333 produces the same row count and per-row DPS as
the WASM page within SE — the bundle is intact; (b) the run produces rows but
the universe is empty or short — the bundle is stripped, and the gate needs a
data-presence assertion beyond row count. If the committed fixtures cannot
distinguish these, say so rather than asserting (a).

**Q2 — How long does a full ret run take on the desktop transport?**
The WASM page takes ~32 minutes (601 candidates × 5000 iterations, priced
individually because the fork's bulk-screening branch engages only on the HTTP
transport). The desktop path is where bulk screening actually runs, so the same
work may be far faster — untested. This shapes what any future regression can
afford, so measure it early. Candidate outcomes: substantially faster (bulk
screening engages as designed — record the factor); comparable (bulk screening
is not engaging even on HTTP, which is a finding against C8, not a shrug).

**Q3 — Does `make release` cross-compile on Windows?**
No evidence either way (C10). Step 4 tries it. A failure is recorded verbatim
as a finding, not a shrug; it does not block the gate, which rests on
`make wowsimtbc`.

## Constraints

- **Do not** push the fork again, merge to `dev`, or merge to `main`. The push
  done today was owner-authorised and is complete. Any further fork commit
  (the harness is one) needs a fresh owner ask.
- Every fork commit re-pins `data/wowsims-fork.lock.json` and forces a regen of
  five pin-derived artifacts (plan C17): `data/sim-implemented-effects.json`,
  `data/equip-eligibility.json`, `data/gems/meta-conditions.json`,
  `data/presets/*/*.ep-weights.json`. The harness commit is subject to this.
  Predict the regen list before running it (`data-pipeline-work` rule 2).
- `pnpm desktop-gate:check` is wired as its own script, **not** into
  `pnpm verify` — it needs go, make and CDP, and CI has none.
- Read `docs/agents/known-traps.md` before the scripted/generated file edits and
  before starting the dev servers.
- The local test fixture is still stamped `simVersion ec5c5f2` (the old pin), so
  a green `pnpm verify` is not engine evidence at the new pin (ADR-0033
  Consequence 7). Do not cite verify as proof of engine behaviour.
- Don't defer a ticket you could close: the test is not "is it in scope" but
  "is it small, do I know the fix, and does leaving it undone weaken something
  this branch claims?"

## Environment traps (paid for by the previous session)

- **`cd X && git ...` fails** — fnm emits an error that breaks the chain, and it
  breaks `cd X && grep` too. Use `git -C <abs path>`. Bare `pnpm` fails (Node 20
  in tool shells): `fnm exec --using=22 -- pnpm.cmd <cmd>` as its own command.
  The orchestrator lost two probes to this today; it is real.
- **A pipe reports the last command's status.** Append `; echo "rc=${PIPESTATUS[0]}"`
  in the *same* call — a later tool call is a new shell and has lost it.
- **`git add <paths>` does not scope a commit** — lint-staged sweeps everything
  dirty. `git status` before every commit.
- **Repo-wide recursive greps match 15 worktree copies** and can time out. Scope
  to a named directory.
- **Ticket collisions:** use the strict `^39[0-9]-` form; a bare `^39` matches
  ticket 39. `NEXT` is 397.
- **Prose must pass prettier** — `.scratch/` is ignored, `docs/` is not. This bit
  the last session twice, both times on a review file.
- **A same-length edit reverted within the same second** can leave a stale `.pyc`
  in use. Use `python -B`.

## Prior art to promote, not restart

`.scratch/stage-gate/upstream-catchup-chunk1/ret-p5-run.mjs` is a working
throwaway CDP driver that drove a full tab run end to end (601 rows, 36 above
cutoff, `panicHit: false`, 1896 s). Read that directory's `README.md` first — it
explains which leftover files belong to a **withdrawn** approach. In particular
`baseline-1.json` is run 1 of 5 of a regression that was withdrawn as
wrongly-shaped; nothing consumes it, and it is not a baseline for this chunk.

That withdrawal is the design lesson to carry: **design the test from the
question.** Ranking is an unstable derived observable; the replacement asked
"did the engine's numbers change?", simmed one fixed gear set at a fixed seed,
and answered it in 25 seconds with a cause attached. Prefer a direct observable
over a statistical apparatus that exists to manage instability a better
observable never produces.

## Definition of done

1. `make wowsimtbc` built here; a Windows build failure is diagnosed and recorded
   verbatim, not shrugged.
2. The body served at `sim_worker.js` by the packaged binary (no `--usefs`) is
   confirmed to be `net_worker.js`, recorded in the shape of
   `execution-ledger-local.md:79-99`.
3. `run-tab-cdp.mjs` exists in the fork, drives a full ret run on a given origin,
   and reads back rows, DPS, `panicHit`, **and the runner class actually used** —
   read from the tab instance or a purpose-added `data-runner` attribute, never
   inferred from the origin.
4. Both the embedded (3333) and WASM runs complete; per-row DPS deltas within the
   paired-replicate SE the tab shows; the 3333 readback names `BulkHttpSimRunner`
   **and** the network log shows `/bulkSimAsync` requests.
5. The pre-Chunk-1 fork sha is rebuilt and re-run on 3333 for comparison, and the
   fork clone is restored to `feat/upgrades-tab` afterwards. Any difference beyond
   SE is a ticket against Chunk 1's merge.
6. `scripts/check_desktop_tab.py` committed, wired as `pnpm desktop-gate:check`,
   asserting (a) served worker is `net_worker.js`, (b) runner readback is
   `BulkHttpSimRunner`, (c) ≥1 `/bulkSimAsync` request observed, (d) run completes,
   (e) row count ≥ the WASM run's, (f) no panic text. `pnpm desktop-gate:check`
   → rc 0 on the tip, **and** a deliberate run with the HTTP handler disabled →
   rc≠0, recorded. Readback JSON committed under this stage directory's path in
   the plan (note `.gitignore:59` ignores `.scratch/stage-gate/*` — if the readback
   must be committed, it needs a tracked home; flag this rather than silently
   leaving the gate's only evidence untracked).
7. `grep -c 'not installed' scripts/dev-tab.ps1` → 0, and a `-Desktop` switch runs
   the packaged binary.
8. The "hand-run before every fork re-pin" rule added to
   `docs/agents/upstream-catch-up.md`.
9. `pnpm verify` rc 0 on the tip, with the fork clone restored.
