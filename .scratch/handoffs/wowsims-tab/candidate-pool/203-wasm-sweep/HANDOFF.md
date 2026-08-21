# Worker handoff

## Status
success

## Branch
feat/candidate-pool (main working tree, no worktree used — per task instructions)

## Base
- spawned at `c5e29183b4e915dbe44ac14fb50a08de41875c4f` · expected `feat/candidate-pool` HEAD · corrected: no

## What I did
- Wrote `scripts/ew5_overhead_wasm.mjs`, modelled on `scripts/ew5_overhead.mjs`: same sweep `{100,300,1000,3000,5000}`, 5 repeats, median, same `iterationsDone` assertion, but running against `vendor/tbc-new-fork/dist/tbc/lib.wasm` under Node via the Go WASM runtime shim instead of spawning the native CLI binary.
- Ran the sweep and confirmed the DPS sanity check (median 5000-iteration DPS = 2042.3926145882178, matching both the CLI's ~2042.4 and E-W1's exact recorded WASM figure) before publishing any timing.
- Added a second table to `docs/plans/wowsims-tab/candidate-pool.md` §3.3, labelled WASM, alongside (not replacing) the existing CLI table. Left §3.4 untouched — that is the orchestrator's decision to write.
- Added `performance`, `WebAssembly`, `TextDecoder`, `TextEncoder`, `globalThis`, `fetch`, `crypto` to the `scripts/**/*.mjs` ESLint globals block in `eslint.config.js` (the existing block only declared `process`/`console`/`setInterval`/`clearInterval`).
- Ran `pnpm verify`, captured the real exit code explicitly (not inferred): first run failed at `format:check` (my 3 new files weren't Prettier-formatted); ran `prettier --write` on them, re-ran `pnpm verify`, exit code **0**.
- Committed as `b4c245ae02a884a2b0331b4b6bb1b33f37a459f7`, touching only the 5 files this ticket owns (`docs/plans/wowsims-tab/candidate-pool.md`, `eslint.config.js`, `experiments/e-w5-overhead-wasm.{json,md}`, `scripts/ew5_overhead_wasm.mjs`).

## The numbers (what §3.4 needs)

- **`t_fixed`** = 748.4 ms
- **`t_iter`** = 3.2446 ms/iteration (~51× the CLI's 0.0637 ms/iteration — in the range E-W1 predicted, ~46×)
- **`cost(5000)`** = t_fixed + t_iter × 5000 = 16,971.4 ms
- **Floor = t_fixed / cost(5000) = 0.0441** — **below 0.25**, by more than 5×
- **DPS sanity check: 2042.3926145882178** — matches CLI (~2042.4) and E-W1's recorded value exactly; script asserts this before writing output, so a published file means the check passed
- **Per-worker memory: 402.7 MB** — `WebAssembly.Memory` linear buffer size (`instance.exports.mem.buffer.byteLength`) for one fresh instance after a 5000-iteration call, sampled in a separate pass from the timing sweep. This is more than double the CLI's native-process RSS proxy (183.8 MB) — WASM linear memory only grows, so this reflects the allocator, not just working-set size. Replaces `MEASURED_MB_PER_SIM_PROCESS` in `wasm_sim_runner.ts` as a measured (not proxied) browser number.

**What this implies:** per §3.4's own decision rule, floor `< 0.25` on the tuning fixture combined with §3.2's already-measured `max K* = 25 ≤ 60` (both fixtures) satisfies both legs of the M2 go/no-go gate. This measurement is a **go** signal for M2 on the WASM/browser path — the orchestrator's call to record in §3.4, per the ticket's instruction not to write that section here.

## Paths touched
- `scripts/ew5_overhead_wasm.mjs` (new)
- `experiments/e-w5-overhead-wasm.json` (new)
- `experiments/e-w5-overhead-wasm.md` (new)
- `docs/plans/wowsims-tab/candidate-pool.md` (§3.3 only — new subsection added after the existing CLI "Scope" paragraph, before §3.4; no existing content edited)
- `eslint.config.js` (`scripts/**/*.mjs` globals block, additive)

## Verification
- `npx eslint scripts/ew5_overhead_wasm.mjs` → clean, no output, both before and after the eslint.config.js globals addition (confirms the new globals were actually needed and now resolve).
- `npx tsx scripts/ew5_overhead_wasm.mjs` → exit 0, wrote `experiments/e-w5-overhead-wasm.{json,md}`, all 25 sweep calls' `iterationsDone` matched the requested count (script throws otherwise — none thrown), DPS sanity check passed.
- `pnpm verify` (via `pnpm -C <repo> verify`, captured with an explicit trailing `echo EXIT_CODE=$?` rather than trusting a bare exit code) → first run: exit 1 at `format:check` (3 unformatted new files). Fixed with `prettier --write`. Second run: **exit 0**, full 19-step chain including typecheck/lint/format/test (799 tests passed)/all the data-pipeline `*:check` steps.

## Notes / concerns

- **Ticket's field-attachment instructions were corrected during the work.** The ticket says to build `SimDatabase` and set it as `RaidSimRequest.database` (proto field 50). Reading `sim/core/proto/api.pb.go:172` against the `RaidSimRequest` struct at `:2024-2033` shows `database` is a field on `Player`, not on `RaidSimRequest` — the Go side rejects a request-root `database` key with `protojson`'s "unknown field \"database\"". Fixed by attaching to the fixture's one real player instead.
- **Not all 25 raid slots need the database.** A first working version attached the 2.26MB database JSON to every player object across all 5 parties × 5 slots (matching a literal reading of "inject per player" in the ticket's gotcha note). 24 of those 25 slots are empty `{}` filler in this fixture. `addToDatabase` (`sim/core/database.go:26`) is a global first-write-wins registry populated in `NewCharacter` construction order, so the duplication was pure overhead: it inflated the request to 56.6MB and every `raidSimJson` call took ~24s **regardless of iteration count** (100-iteration and 300-iteration calls took roughly the same wall-clock as each other) — this would have silently dominated and corrupted `t_iter` had it not been caught by comparing 100- vs 300-iteration wall-clock and finding them suspiciously close. Attaching to only the one real player cut the 100-iteration call from ~24s to ~1.35s with an **identical DPS**, confirming correctness. Documented in the script's `buildRequest` comment and in candidate-pool.md §3.3's new subsection.
- **Harness boots a fresh WASM instance per call**, not one resident instance serving all 25 sweep×repeat calls. This matches what a worker pays on its first request against a cold module (the conservative/upper-bound case for `t_fixed`); a warm worker serving a second candidate in the same tab would skip instance boot entirely. Noted explicitly in both the script's `runOnce` comment and the candidate-pool.md write-up so a reader doesn't take `t_fixed` as a pure per-request floor with no module-load component.
- **`lib.wasm` is a gitignored build artifact** under `vendor/tbc-new-fork/dist`, not committed. Rebuild command and the toolchain provenance used for this run (`go version go1.25.4 windows/amd64`, GOROOT `C:\Program Files\Go`) are recorded in both the script header and the candidate-pool.md write-up, per the durable-claims rule.
- Did not touch `.scratch/carry-forward/issues/200-cli-runs-candidates-serially.md` or `packages/core/src/cli.ts` — both were already modified (uncommitted) in the working tree before this session started (ticket 200 / CLI concurrency work, referenced in §3.4's "accept" ruling). Confirmed via `git log -1 -- packages/core/src/cli.ts` that the last commit touching that file predates this session, and left both files as-is; `git status` was clean of everything except those two both before and after my commit.
- Did not write §3.4 — that is explicitly the orchestrator's call per the ticket.

## Suggested follow-ups
- §3.4 needs the go/no-go verdict written using the floor above (0.0441 < 0.25) and the already-recorded §3.2 K* result (max 25 ≤ 60) — both legs of the gate are now satisfied and the ticket's own "Done when" criteria for this measurement are met.
- If M2 resumes, `wasm_sim_runner.ts`'s `MEASURED_MB_PER_SIM_PROCESS` (currently 183.8, explicitly flagged there as a CLI proxy) should be updated to the measured 402.7 MB WASM figure — that constant's own comment says to do this once a WASM-side sample exists.
- Ticket 200's in-progress CLI-concurrency changes (`packages/core/src/cli.ts`, `.scratch/carry-forward/issues/200-*.md`) are still uncommitted in this working tree from a prior session — flagging in case the orchestrator expected them committed or wants them stashed/reviewed separately; I left them untouched as out of this ticket's scope.
