# Execution ledger — batch-sim-web

Executor seat, branch `feat/upgrades-tab-batch-sim`, base SHA
`d5d48a07ac3dc861d2134f2a9140bcbe383e0e2d`.

`$F` = `vendor/tbc-new-fork`; `$U` = `$F/ui/core/components/individual_sim_ui/upgrades`.

## LEDGER HANDOFF (local executor's preflight reads this section)

Written per reconciliation.md "Ledger handoff" (folds into Step 11).

**STATUS: shared modules EXIST and are committed** (fork tip `95088fd9d`, outer
`86bc23c`). The local track's Step 1(a) preflight has something to read and its
Step 2 something to import; **the shared contract below is stable and safe to
build against.**

**Steps 2 and 3 are complete and accepted** — all six arms landed, no
stop-and-escalate condition triggered.

**A defect was found in the Step 8 branch and has since been fixed and
verified.** `rank.ts`'s `screenCandidates` was sending the baseline-only
`SimDatabase` with swapped-gear candidates, so a real ranking panicked with
`No item with id: 28732`. The fix (`composeForBulk`, union database) is applied,
type-checks, and an ordinary ranking now runs past the failure point
("Simming 1/264"). Details and attribution in the Step 10 section.

The fix is committed with its full PROVENANCE cycle (fork `b8e7a566e`, outer
re-pin `685c47d`) and was still running a real full-pool ranking cleanly at the
time of writing.

**Still outstanding, and the only items:** Step 10's equivalence measurement has
not been run, and the temporary `?bulkSpike=1` / `?bulkEquiv=1` hooks in
`upgrades_tab.tsx` have not been removed (Step 11's final commit). The shared
contract below is unaffected: names, the constant, the four obligations and
`bulkScreenResultFrom`'s guard are correct, and obligation 3 is exactly the rule
the local builder must follow.

- `MAX_CANDIDATES_PER_BULK_REQUEST` = **25**, hard-coded in
  `engine/bulk/partition.ts` per the cross-track rule
  `min(measured web bound, 25)`.
  **Measured web bound = 32**, now confirmed by execution and not only derived:
  the n=32 arm returned 32/32 rows with `dpsMetrics` in a single stage with
  survivors == 32, i.e. nothing culled and nothing dropped.
  **A1-3 applied decision:** 32 > 25, so web capability is deliberately left on
  the table — 25 is the largest value inside *both* engines' single-stage
  regimes (Go engages Medium at 26), and one shared constant is worth more than
  web's extra 7. This is the cap being applied knowingly, not a silent floor.
  Arms confirm no culling at n=19, 25 and 32. Local's Step 1(a) assertion
  (bound ≤ 25) holds by construction.
- Working `RequestTypes` member = **`RequestTypes.BulkSim`** (`0x8`,
  `ui/core/sim_signal_manager.ts:1-5`). **CONFIRMED end-to-end**: a spike arm
  registered under it returned a complete `BulkSimResult` with
  `allCandidatesReturned: true` (quoted in the root-cause section). The earlier
  caveat is withdrawn — a per-arm `SimSignalManager` of our own is fine, and the
  signal manager is cleared as a hang suspect.
- Exported `BulkSimResult` → `BulkScreenResult` mapping function name =
  **`bulkScreenResultFrom`**, exported from
  `upgrades/adapters/bulk_wasm_sim_runner.ts`. Signature:
  `bulkScreenResultFrom(result: BulkSimResult, expectedCount: number, simVersion: string): BulkScreenResult`.
  R3 satisfied — the local runner imports this; it must not write its own copy.
  It carries R2's guard (throws unless `topResults.length === expectedCount` and
  every row has `dpsMetrics`).

Other shared names, all committed and importable:

- `engine/bulk/partition.ts` → `partitionForBulkScreen`,
  `MAX_CANDIDATES_PER_BULK_REQUEST`
- `adapters/bulk_request_builder.ts` → `buildBulkSimRequest`
- `engine/seams/sim-runner.ts` → `runBulkScreen?`, `BulkScreenCandidate`,
  `BulkScreenRequest`, `BulkScreenResult`, `bulkScreenCacheKey`,
  `RecordedSimRunner`'s optional third constructor argument
- `adapters/bulk_wasm_sim_runner.ts` → also `bulkPoolSizeFrom` and
  `makeSimRunner` (the R1 factory; local extends only its branch condition)
- `rank.ts` → `DEFAULT_ITERATIONS = 5000` and the `runBulkScreen` branch, both
  inherited by local, neither to be re-set or diverged

**Four builder obligations the local track inherits.** `buildBulkSimRequest` MUST:

1. set `simOptions` — `compose()` strips it, `validateBulkSimRequest` requires it;
2. set `requestId` — every per-candidate worker task id derives from it
   (`batch.ts:67`), and a falsy id throws `ApiCall with empty id!`;
3. carry a **union `SimDatabase`** covering every candidate's items, not just the
   baseline's. A bulk request is one request spanning *n* gear sets; the WASM
   registry starts empty and is filled per request, so an unregistered candidate
   id kills environment construction (ticket 212's bug — see the root-cause
   section). This one is invisible until a candidate item is not worn;
4. read the response index as `candidateIndex`, not `index`.

All four are now **measured**, not inferred. (3) in particular is confirmed by a
passing run on my own tip: with the union database the probe returns
`allCandidatesReturned: true`; without it the same request panics with
`No item with id: 32014`, surfacing only after the candidate queue drains
(`batch.ts:131-133` triggers abort, `index.ts:121-122` reports it after the
batch settles) — which is why it read as a hang rather than an error.

Detail for (3), because the naive version does not work: build the database
**per candidate** with `simDatabaseFor(candidateEquipment)` and merge the
repeated fields, keyed by row identity. Passing a flat id list to
`simDatabaseFor` fails inside `lookupEquipmentSpec` with
`No slots left to equip`, because that function assigns items to slots and
cannot place several same-slot items at once. Attach the result through
`compose` — the sim reads `player.database` (`compose.ts:48`), so a `database`
key spread onto the request root is silently ignored.

## Step outcomes

### Step 1 — Preflight (done)

Read `docs/agents/known-traps.md` § "Before editing a ported engine file" (the
five-step cycle) and § "Before any scripted or generated file edit" (Edit tool,
not sed; check `git diff --stat`).

PROVENANCE-tracked among the files this plan touches, from the "Ported files"
table in `$U/engine/PROVENANCE.md`:

| File | Tracked? | Evidence |
| --- | --- | --- |
| `engine/rank.ts` | YES | row `\| rank.ts \| rank.ts \| adapted … \| d00c65e7… \|` |
| `engine/seams/sim-runner.ts` | YES | row `\| seams/sim-runner.ts \| seams/sim-runner.ts \| adapted — cache key is canonical-JSON string, no node:crypto (D4) \| 7540cbc3… \|` |
| `engine/bulk/partition.ts` (new) | NO — deliberate | no core ancestor to trace; see L-new-3 below |
| `adapters/*` (incl. the two new adapter files) | NO | the table's "Fork file" column contains only `engine/`-relative paths; `tools/README.md:11` states files not under `engine/` carry no row |
| `upgrades_tab.tsx` | NO | outside `engine/`; project-owned file (R1) |

**L-new-3 confirmed, not re-opened:** new `engine/` files carry no PROVENANCE
row and will not fail `pnpm verify` — `scripts/check_engine_port_drift.py` is
table-driven (it iterates the PROVENANCE table's rows, so a file absent from the
table is never hashed). Recorded per round-2 N2 as a decision, not a derivation.

> The Step 1 hashes quoted above are the **pre-change** values. Both tracked
> files were edited in Step 4/8 and their PROVENANCE rows updated:
> `rank.ts` → `1a59c891ed34…`, `seams/sim-runner.ts` → `0f924c7ad40e…`.
> `check_engine_port_drift.py` passes on the new values.

### Step 2 / Step 3 — first-pass blocker (SUPERSEDED; kept for the record)

The plan's spike mechanism is refuted. C11 says the spikes "run under Node with
the outer repo's tsx loader + `tools/register.mjs`". They cannot.

`runConcurrentBulkSim` reaches a sim only through `WorkerPool`. `WorkerPool`'s
constructor immediately builds `SimWorker`s (`ui/core/worker_pool.ts:48-56`),
and `SimWorker.setupWorker` calls `new window.Worker(SIM_WORKER_URL)`
(`:309`), where `SIM_WORKER_URL = '/tbc/sim_worker.js'` (`:32`). That worker
boots by `WebAssembly.instantiateStreaming(fetch('lib.wasm'))`
(`ui/worker/sim_worker.ts:123`). None of that exists under Node.

**Measured**, after shimming every incidental blocker so the failure reported is
the real one:

1. Plain harness (`headless.mts` + `register.mjs`, the C11 recipe):
   `POOL_FAILED: Cannot read properties of undefined (reading 'DEV')`
   — `isDevMode()` reads Vite's compile-time `import.meta.env.DEV`
   (`ui/core/utils.ts:426-427`), in a wowsims-owned read-only file.
2. With `import.meta.env` rewritten by a throwaway loader hook:
   `POOL_FAILED: window.Worker is not a constructor`

Command (from the fork root, Node v22.17.1):

```
node --import file:///C:/Users/dgree/Code/lulz/tbc-gear-prio/node_modules/tsx/dist/loader.mjs \
     --import ./ui/core/components/individual_sim_ui/upgrades/tools/register.mjs \
     ./ui/core/components/individual_sim_ui/upgrades/tools/<probe>.mts
```

The probe files were throwaway and are deleted; only `tools/bulk-spike.mts`
remains, written for the browser.

Growing `headless.mts` to fix this is explicitly the wrong move by that file's
own doc comment: "If a shim ever needs to grow beyond an inert placeholder — if
an exporter starts depending on what a shim RETURNS — that is the signal that
the thing being borrowed is UI behaviour, not a pure decision, and the borrow is
no longer safe." A WASM sim worker is UI behaviour by that test.

A browser route does exist (`.claude/launch.json` `wowsims-fork` on 5173;
built `dist/tbc/lib.wasm`, 21.5 MB, present), so the measurement is *possible* —
but through a browser-driven harness the plan neither specifies nor budgets,
and which would have to drive real 3,000/5,000-iteration sims across 8 arms.

Because Step 2 sets `MAX_CANDIDATES_PER_BULK_REQUEST` (which Step 5 hard-codes
and the local track consumes), Step 3 is a named stop-and-escalate gate, and
Step 10's four pre-registered equivalence conditions are all sim-execution
measurements, this is a **stop**, not an adapt: the executor cannot choose the
gate's exit.

### Step 2 — partial result: the boundary is DERIVABLE, and the plan's model is wrong

`shouldUseLegacyBulkSim` (`estimate.ts:5-33`) and `shouldRunBulkSimStage`
(`stage.ts:69-76`) are **pure functions of the candidate count and
`highStageIterations`**. They need no sim, no worker, no WASM. I executed the
fork's own copies of them under Node (browser shims + the `import.meta.env`
rewrite described above), so this is measured against real upstream code, not
re-implemented.

`getBulkSimStageMinIterations` (`stage.ts:78-83`) reads only
`config.minIterations` (a module constant) and `request.highStageIterations`, so
nothing else in `baseRequest` enters the estimate — an otherwise-empty
`baseRequest` gives the same answer a full feral-p2 one would.

The plan's 8-arm grid, decided by upstream's own function:

| n | highStageIterations | legacy (High-only)? | stages that would run |
| --- | --- | --- | --- |
| 19 | 3000 | YES | High |
| 19 | 5000 | YES | High |
| 20 | 3000 | YES | High |
| 20 | 5000 | YES | High |
| 25 | 3000 | YES | High |
| 25 | 5000 | YES | High |
| 30 | 3000 | YES | High |
| 30 | 5000 | YES | High |

**N4 satisfied**: the two n=19 arms agree with each other (both legacy/High-only).

Sweeping n for the flip point:

- `highStageIterations = 3000`: first n taking the multi-stage path = **40**
- `highStageIterations = 5000`: first n taking the multi-stage path = **33**

Two consequences the orchestrator should weigh:

1. **The plan's expected value of 19 is wrong.** C3 read
   `BULK_SIM_MIN_COMBINATIONS = 20` as the gate, but that constant is only the
   *first* of two early-returns. Above it, the cost-estimate branch
   (`estimate.ts:14-32`) still returns `true` — i.e. still High-only, still no
   culling — all the way to n = 32 at 5,000. All eight of the plan's arms land
   in the no-culling regime, so the grid as specified cannot find the boundary:
   it has no arm on the other side of it.
2. **The iteration sensitivity runs the opposite way to the plan's expectation.**
   Raising `highStageIterations` 3,000 → 5,000 moves the boundary *down*
   (40 → 33), because `highStageIterations * candidateCount` on the right-hand
   side of `estimate.ts:32` grows faster than the pre-High estimate on the left.
   Since Step 8 raises the default to 5,000, the binding number for this plan is
   **33**, and `MAX_CANDIDATES_PER_BULK_REQUEST` would be **32** if the bound
   were taken from this derivation alone.

I am **not** writing 32 into the handoff as the measured answer. The plan's Step
2 acceptance is a row-count observation ("whether every candidate returned a
row"), not a stage-selection prediction, and R2 exists precisely because row
completeness has a second failure mode (`statistics.ts:107` drops rows lacking
`dpsMetrics`) that no amount of pure-function reasoning can rule out. Derivation
narrows the question; it does not close it. Per plan-web finding 11 and Step 2's
own rule, measured beats modelled — and this derivation is still a model.

> **Closed later in this pass.** The browser arms measured it: n=32 returns 32/32
> rows in a single stage, n=33 goes multi-stage and returns 5 of 33. The
> derivation was right to the candidate, and the row-completeness question the
> derivation could not answer is now answered by execution. 32 is therefore the
> measured web bound, and it is quoted in the handoff as such — reached the way
> the plan required, not by promoting a model.

### Incidental finding for Step 6 (the request builder the local track imports)

The fork type-check caught a real boundary problem in the protojson→typed
bridge, which is Step 6's whole job. The seam types a request as
`Readonly<Record<string, unknown>>` deliberately
(`engine/seams/sim-runner.ts:12-21`), but protobuf-ts's `fromJson` wants a
`JsonValue`, and an index signature of `unknown` does not satisfy it:

```
error TS2345: Argument of type 'Readonly<Record<string, unknown>>' is not
assignable to parameter of type 'JsonValue'.
```

`wasm_sim_runner.ts:112` never hits this, because it passes a freshly-built
object literal rather than a seam-typed value. So the cast is **new at this
boundary**, and `buildBulkSimRequest` will need it (and a comment saying why)
when Step 6 is built. Recorded here so the local executor is not surprised by
it in a module it imports.

## Deviation ledger

| Step | Plan said | Found | Action | Why |
| --- | --- | --- | --- | --- |
| (pre) | run git/node commands | Bash tool has no fnm env; `git` in Bash fails with the fnm error from known-traps.md | adapt | Used PowerShell with `git -C`; local to tooling, no plan intent affected |
| 1 | confirm PROVENANCE-tracked files among rank.ts / sim-runner.ts / new engine file / adapters | `engine/rank.ts` and `engine/seams/sim-runner.ts` tracked; `adapters/*`, `engine/bulk/partition.ts`, `upgrades_tab.tsx` untracked | none (plan matched) | Step 1 acceptance met; L-new-3 confirmed as decided, not re-opened |
| 1 | R1: `upgrades_tab.tsx` is project-owned, editable | Confirmed independently: sole construction site at `:446`, `git log` shows only project ticket commits (`Rework set-bonus lines`, `Add a token/gear-id flavour to the tab export (126)`, …) | none (plan matched) | R1's premise verified rather than inherited |
| 2, 3 | Spikes run under Node via the tsx loader + `register.mjs` (C11) | `WorkerPool` cannot construct under Node: `window.Worker is not a constructor`, after shimming `import.meta.env`. Fixing it needs a browser harness the plan does not specify. | **STOP** | Step 3 is a named stop-and-escalate gate; Step 2 sets a constant the local track consumes. Choosing the exit is the orchestrator's call, not the executor's. |
| 2 | Boundary expected 19 (C3), measured over n=19/20/25/30 x 3,000/5,000 | Every one of the 8 arms is High-only/no-culling by upstream's own `shouldUseLegacyBulkSim`. True flip point is n=40 at 3,000 and n=33 at 5,000. The grid has no arm past the boundary. | **flag** (feeds the STOP) | Refutes C3-as-applied and the "expected 19". The grid cannot answer the question it was designed to answer, so re-specifying it is a plan change, not a local fix. |
| 2 | Higher iterations expected to make culling *more* likely | Opposite: 3,000 → 5,000 moves the boundary DOWN (40 → 33), per `estimate.ts:32` | **flag** | Changes which bound Step 5 hard-codes and which the local track consumes |
| 10 | Four pre-registered equivalence conditions measured on feral-p2 | Not reached — every condition requires executing real WASM sims, blocked by the same finding | **STOP** | Cannot be evaluated; reporting them unmeasured would be a false-confidence claim |
| 4–9, 11 | Implement seam, partitioner, builder, runner, rank.ts branch, comment, verify | Not started | not reached | Step 5 hard-codes a constant Step 2 must measure, and Step 8 is gated on Step 3's stop-and-escalate. Building on an unmeasured bound is what the plan's own decision rule forbids. |
| 2/3 | Spike is `tools/bulk-spike.mts`, run per C11 | Written and committed, but as a **browser** harness with its precondition documented in its own doc comment | adapt | The file is in the Paths manifest and is the artifact Steps 2/3 asked for; only its execution environment changed. Keeping it makes the re-plan cheaper than deleting it. |
| 6 (early) | Builder bridges protojson to typed protos | Fork type-check found `fromJson` rejects the seam's `Readonly<Record<string, unknown>>` (TS2345); needs a cast that `wasm_sim_runner.ts:112` does not need | adapt (in the spike only) | Recorded for Step 6; no engine file touched |
| — | Fork edits follow the five-step PROVENANCE cycle | Cycle needed after all, even for a `tools/`-only commit: `pnpm verify` failed at `check_equip_eligibility.py` because clone HEAD `5ad56a5c9` ≠ pin `cab940cd6` | adapt (partly) | Not a judgement call in the end — a gate enforces it. Fast-forwarded `feat/upgrades-tab` onto the commit (it was made on a detached HEAD, so the pin would otherwise name an unreachable commit) and bumped the lock. |
| 11 | `pnpm verify` green on the tip | **RED (exit 2)**. Blocked finishing the cycle: `pnpm sim-implemented-effects:generate` was refused by the permission classifier. | **STOP / report** | AGENTS.md: a permission denial is evidence about that call, not a capability model — report the exact blocked command rather than working around it. |
| 11 | Fork type-check is `npm --prefix vendor/tbc-new-fork run type-check` | That form fails on Windows (`'node_modules' is not recognized…`); the package script is a bare relative path. Ran the same compiler via `node <path>/tsc --noEmit` → exit 0. | adapt | Same compiler, same flags; only the invocation changed |

### Deviation rows — second pass (Amendment A1 / A1.1)

| Step | Plan said | Found | Action | Why |
| --- | --- | --- | --- | --- |
| A1 env | C16: vite on 5173 serves real WASM | Refuted, as A1.1 says. `vite.config.mts:22` rewrites `sim_worker.js` → `local_worker.js` (0 `WebAssembly` refs, `.ready(false)`). Verified independently before relying on the amendment. | none (A1.1 correct) | Would have inverted the branch under test |
| A1 harness | Primary mount is `tools/bulk-spike.html` served by vite | `dist/` is compiled output with no TypeScript, so that mount cannot work on 4180. Used A1's documented fallback: a `?bulkSpike=1` hook in `upgrades_tab.tsx`. | adapt | The amendment names this fallback explicitly; the hook is temporary and uncommitted |
| A1.1 precondition | Assert `isWasm() === true` before any arm | **PASSED**: `{"isWasm":true,"numWorkers":4,"workerUrl":"/tbc/sim_worker.js","passed":true}` | none | Binding gate met and quoted |
| 6 (early) | Builder bridges protojson → typed protos | Three further obligations found by execution: `simOptions` must be re-attached, `requestId` must be set, and the response field is `candidateIndex` not `index` | adapt (spike only) | All three inherited by the shared builder; recorded for Step 6 and the local track |
| 2, 3 | Arms measure row completeness at n=19/25/32/33 and pool 4/1 | **NOT OBTAINED.** Precondition passes and the tournament starts, but arm 1 never completes: 0 arms after ~9 min, no candidate sim ever logs completion, while a fresh worker boots in 433 ms. **Root cause since found**: the spike's request carries a `SimDatabase` built from baseline gear only, so every candidate item the character does not wear is unregistered and kills environment construction (ticket 212's failure mode, stated verbatim in `adapters/sim_database.ts`'s doc comment). | **STOP** (arms still unmeasured) | The hang is my harness, not upstream — so Step 3's premise is not refuted. But the arms were never obtained, and the fix (union database) is itself a new Step 6 obligation, so the measurement still has to be re-run before Steps 4–9 can rest on it. |
| 10 | Four equivalence conditions | Not reached — depends on Steps 2/3 and on `BulkWasmSimRunner` (Step 7) | **STOP** | Same blocker |
| 4–9 | Seam, partitioner, builder, runner, rank.ts branch, comment | Not started | not reached | Would rest on a call that has never returned |
| — | PROVENANCE cycle after fork edits | Ran in full for `3b1af456c`: lock bumped, `sim-implemented-effects:generate` re-run (permission-blocked last pass, works now) | done | Cycle complete on my side |
| — | Re-pin names the real fork tip | **I typed a fabricated SHA** into `data/wowsims-fork.lock.json` from memory instead of reading `git rev-parse HEAD`. It matched the real tip for 8 characters and diverged after. Caught immediately, corrected to `9f1fc7ef088bd4c78918c0cebe82b9c733024410`, and confirmed by the gate (`equip eligibility check ok: 17 specs match the fork at 9f1fc7ef088b`). | adapt (self-caught) | Recorded because a plausible-looking wrong SHA is exactly the failure a lockfile cannot absorb — the abbreviated prefix would have looked right in review. AGENTS.md's rule stands: resolve refs with the command, never by hand. |
| 2, 3 | Six arms, row completeness + pool sizes | **ALL SIX LANDED, all matched pre-registration.** n=19/25/32 and pool4/pool1 complete (single stage, survivors == n); n=33 multi-stage with 5 of 33 rows, satisfying A1-4. Measured web bound **32**; applied constant **25**. | done | No stop-and-escalate triggered |
| 8 | Bulk screening branch in `rank.ts` | **DEFECT, since FIXED and VERIFIED.** `screenCandidates` passed the baseline-only `SimDatabase` with swapped-gear candidates → `No item with id: 28732` panic in `NewItem`. Obligation 3 violated in the engine path (fixed in the spike, missed here). `composeForBulk` now widens the database to the union; the previously-failing ranking runs past the failure point and sustains ~41 s/sim over a full 227-item pool. | fixed | Found from the ordinary tab path. I refused to ship an untested fix; the fix was then applied by another actor, and I reviewed it against `composeFor`, type-checked, rebuilt, ran the failing path, ran the PROVENANCE cycle, and committed it as fork `b8e7a566e` / outer `685c47d`. |
| 10 | Two full rankings + four conditions | **NOT RUN.** `?bulkEquiv=1` dispatch is inert (isolated by controlled test: same tab/server works without the flag). Harness + scorer built, validated, committed. | **STOP** | No numbers reported or estimated |
| 10 | (my first diagnosis) | I blamed worker saturation (20 workers vs 8) and was **wrong** — the controlled no-flag test refuted it. Struck in the ledger, both calls recorded. | corrected | A plausible-but-untested diagnosis left standing misleads the next reader |
| — | Executor owns the edits in its manifest | Both fork files modified by another actor at 12:16 and 12:23, after my 11:59 commit; no reflog activity. A `?bulkProbe=1` bisect probe plus tracing, and a guard relaxed from `< 33` to `< 2`. | **flag** | Sound on the merits but unattributed and behaviour-changing. Left uncommitted and unrun; adopting it would make the ledger wrong about who measured what. |

### Gate results on the tip (FIRST PASS — superseded)

The `pnpm verify` failure below was resolved by the orchestrator during the
loop-back: it ran the permission-blocked regen and committed the re-pin as outer
`d044e54`, with verify fully green. Kept for the record of why the re-pin was
needed at all.

- **Fork type-check** (`node vendor/tbc-new-fork/node_modules/typescript/bin/tsc
  --noEmit`, run from the fork root): **exit 0**. Note the plan's recipe
  `npm --prefix vendor/tbc-new-fork run type-check` does NOT work on this
  machine — the package script is `node_modules/typescript/bin/tsc --noEmit`,
  which Windows tries to run as a bare command
  (`'node_modules' is not recognized as an internal or external command`).
  Invoking the same compiler through `node` directly is the working form.
- **`pnpm verify`**: **FAILED, exit 2**, at `scripts/check_equip_eligibility.py`.
  Everything before it passed — typecheck, eslint, prettier, 1241 tests in 56
  files (including `wowsims-fork-parity`), engine-port-drift ("33 ported files
  match PROVENANCE.md"), and every data check up to that point.

The failure is caused by my own fork commit and is **not** a pre-existing break:

```
equip eligibility check: clone HEAD is 5ad56a5c90990e6ea95b034ba12756dacd61b40f
but data\wowsims-fork.lock.json pins cab940cd62c180083a695c30b37c8eb1562a8dc0.
The committed artifact describes the pinned commit, so re-deriving it from a
different commit compares two different questions. Reset the clone to the pin,
or bump the pin and regenerate.
```

This **settles the open question I had flagged**: the PROVENANCE cycle's
"a fork commit that touches nothing ported still needs steps 3–5" is enforced by
a gate, so the re-pin is mandatory even for a `tools/`-only commit.

Remediation done so far:

1. The spike commit was made on a **detached HEAD** (the clone was already
   detached before I touched it), orphaned from `feat/upgrades-tab`, which the
   lock names as the fork branch. Re-pinning to a commit reachable from no
   branch would point the pin at something `git gc` could collect, so I
   fast-forwarded `feat/upgrades-tab` onto `5ad56a5c9` first. The fork is now on
   that branch, clean.
2. Bumped `data/wowsims-fork.lock.json`'s `commit` to `5ad56a5c9`. **Uncommitted**
   in the outer repo.

**BLOCKED on the last cycle step.** `pnpm sim-implemented-effects:generate`
(cycle step 4, which regenerates the artifact embedding the pin) was refused by
the permission classifier:

> Permission for this action was denied by the Claude Code auto mode classifier.

So the tip is currently **red**, deliberately and recoverably. To finish, someone
with permission runs, from the repo root:

```
pnpm sim-implemented-effects:generate
pnpm verify
```

then commits the lock bump together with whatever the regen touches. The
alternative the checker offers — resetting the clone back to `cab940cd6` and
dropping the spike commit — is also valid and cheaper if the orchestrator
decides the spike should not land while the plan is being re-cut.

---

# Resumed under Amendment A1 (+ A1.1 corrections)

Tree state re-verified at resume: outer `d044e54` ("Re-pin fork to 5ad56a5c9 for
the bulk-sim spike harness") on `feat/upgrades-tab-batch-sim`, clean; fork tip
`5ad56a5c9` on branch `feat/upgrades-tab`, clean; lock pins `5ad56a5c9`. The
Step-11 blocker from the first pass is resolved.

### A1-1 verified independently before relying on it

The amendment says C16 is refuted and the measurement server must be
`wowsims-fork-prod` (4180), not vite (5173). Confirmed against the artifacts,
not taken on trust:

- `vendor/tbc-new-fork/vite.config.mts:20-25` maps
  `'/tbc/sim_worker.js': '/tbc/local_worker.js'` in `serveExternalAssets`'s
  `workerMappings`, applied in `configureServer` — dev-server only.
- `dist/tbc/local_worker.js`: **0** `WebAssembly` references, 3
  `makeHttpApiRequest`/`fetch(` references, and it calls `.ready(false)`
  (`:130`).
- `dist/tbc/sim_worker.js`: **5** `WebAssembly` references, calls `.ready(true)`
  (`:3440`).

`.ready(bool)` is the flag `SimWorker` reads into `this.wasmWorker`
(`worker_pool.ts:315`), which backs `isWasm()`. So on 5173 the pool would have
reported `isWasm() === false` and stayed at one worker — measuring the HTTP
transport while claiming to measure WASM. A1-1 is correct and load-bearing.

### Measurement environment stood up (A1.1)

`wowsims-fork-prod` semantics, port 4180, http-server over
`vendor/tbc-new-fork/dist`. The `preview_start` launch entry exited immediately,
so the server was started directly with the same binary and arguments the entry
names. Asset probe:

```
feralcat=200  sim_worker=200  lib_wasm=200
```

Browser check on `http://localhost:4180/tbc/druid/feralcat/` — the page's own
resource list shows 8 loads of `http://localhost:4180/tbc/sim_worker.js` and
**no** `local_worker.js`, confirming the prod server does not apply vite's
rewrite. This is the environment A1-1 requires.

### Harness route: the `upgrades_tab.tsx` hook (A1's documented fallback)

`dist/` is built output and contains no TypeScript, so a standalone
`bulk-spike.html` importing `./bulk-spike.mts` cannot be served from it. The
amendment's fallback route is used instead: a dev-only hook in
`upgrades_tab.tsx` (project-owned per R1) gated on `?bulkSpike=1`, added at the
point in `run()` where a real skeleton, gear source and pool already exist —
which is also what makes the request genuinely feral-p2 rather than synthetic.
**This edit is temporary and is removed before Step 11's final commit.**

### Corrections the type-checker forced (both matter downstream)

1. **`BulkGearResult.candidateIndex`, not `.index`** (`proto/api.ts:1920`). The
   request side (`BulkGearCandidate`) uses `index`; the response side uses
   `candidateIndex`. Step 7's mapping and the local track's importer must use
   the response name — a silent `undefined` here would have mis-keyed every row.
2. **Engine `Race` is the protojson string** (`"RaceHuman"`), not the proto
   enum. It must be read off the skeleton the way `rank.ts:1529-1537`
   (`raceFromSkeleton`) reads it, not from `player.getRace()`, which is the
   numeric proto enum and a different type.

Fork type-check after both fixes: **exit 0**.

Serving the hook needs the bundle rebuilt (`vite build`), since `dist/` holds
compiled entry chunks rather than sources. `dist` is **gitignored and untracked**
in the fork (`.gitignore:18`, `git ls-files dist` → 0 files), so rebuilding it
changes no tracked file and cannot leak into a commit. Checked before running the
build rather than after.

### A1.1 binding precondition — PASSED (quoted verbatim)

```
BULK_SPIKE_PRECONDITION {"isWasm":true,"numWorkers":4,"workerUrl":"/tbc/sim_worker.js","passed":true}
```

Measured on `http://localhost:4180/tbc/druid/feralcat/?bulkSpike=1`. `isWasm()`
is true, so the arms below describe the WASM transport, not the HTTP one. Had
this run on vite/5173 it would have read `false` and the spike would have
refused to run.

Setup line for the same run:

```
BULK_SPIKE_SETUP {"candidatesAvailable":33,"slotIndex":0,"poolSize":227}
```

### Harness bug found and fixed on the first real run (not a finding about upstream)

The first pass had every arm fail identically at
`validateBulkSimRequest` with `[Bulk sim] Sim options are empty`. Cause: the
engine's `compose()` deliberately strips `simOptions` (`engine/compose.ts:32`)
because the per-call runner supplies iterations and seed itself, but
`validateBulkSimRequest` requires the field (`index.ts:49`) and the tournament
reads `baseRequest.simOptions.iterations` for its baseline probe
(`index.ts:91,157`).

**This is a real obligation on Step 6**, not just spike scaffolding:
`buildBulkSimRequest` must re-attach `simOptions` to the composed request, or
every bulk request the local track posts will be rejected the same way. Recorded
here for the shared builder.

Second one, surfaced by the next run: `ApiCall with empty id!` on every arm.
`BulkSimRequest.requestId` must be set, because each per-candidate sim derives
its worker task id from it (`wasm/bulk_sim/batch.ts:67` builds
`` `${request.requestId}-${candidate.index}-${seedOffset}` ``) and
`SimWorker.doApiCall` throws on a falsy id (`worker_pool.ts:407`).
`buildBulkSimRequest` must set `requestId` too.

Both are **shared-builder obligations discovered by execution, not by reading** —
exactly what Step 3's spike exists to find. Neither is visible from the proto
definitions alone. With both applied, the arms stop failing instantly and begin
running real tournaments.

Third harness bug, same class: arms failed after ~10s each with
`No slots left to equip {"id":28672,"name":"Drape of the Dark Reavers",…}` — a
**back** item being forced into the **head** slot. My candidate generator asked
for head-legal ids but fell through to "any pool id" when fewer than 33 head
items existed, so it produced illegal gear. Fixed by choosing whichever slot
actually has ≥33 legal candidates and erroring loudly otherwise.

Worth noting for Step 7 even though it is a spike bug: **the bulk path fails the
whole request, not the offending candidate**, when one candidate's gear is
illegal (`index.ts:121-122` turns any candidate error into a request-level
error). The per-candidate loop today records a `candidateSkips` row and carries
on (`rank.ts:729-737`). That is a real behavioural difference the Step 8 branch
has to handle — a single bad candidate must not lose the whole partition.

### Step 2 + Step 3 arm results (union-database fix in place) — COMPLETE, all six arms

Pre-registered expectation: n = 19, 25, 32 return exactly n rows, every row
carrying `dpsMetrics`; n = 33 shows multi-stage metrics and/or fewer rows
(A1-4: `stageMetrics.length > 1`, else escalate).

| arm | n | rows | rows w/ dpsMetrics | all returned? | stages | iterations | survivors | secs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| step2-n19 | 19 | 19 | 19 | **yes** | 1 | 7,236 | 19 | 229 |
| step2-n25 | 25 | 25 | 25 | **yes** | 1 | 7,823 | 25 | 322 |
| step2-n32 | 32 | 32 | 32 | **yes** | 1 | 8,426 | 32 | 1,663* |
| step2-n33 | 33 | 5 | 5 | **no (expected)** | **2** | 1,000 → 5,220 | 5, 5 | 110 |
| step3-pool4 | 25 | 25 | 25 | **yes** | 1 | 7,091 | 25 | 332 |
| step3-pool1 | 25 | 25 | 25 | **yes** | 1 | 7,823 | 25 | 982 |

\* n=32's wall clock includes the ~22 min contention stall described above; its
per-sim rate was normal either side of it.

**The first pool-1 arm was lost, and is being re-run rather than reported.** The
http-server on 4180 was started inside a backgrounded tool call, and when that
call's timeout elapsed the harness killed the wrapper — taking the server with
it — while the pool-1 arm was mid-flight. Its workers could no longer fetch, so
that run produced nothing and **no result from it is reported**. Two fixes:

1. The server is now started with `Start-Process … -PassThru` (detached), so it
   outlives the tool call that starts it and a task timeout cannot kill it.
2. The spike gained a `?bulkArm=<label>` selector, so exactly the lost arm is
   re-run instead of paying tens of minutes to redo the whole grid. An unknown
   label throws rather than silently running everything.

This is a harness/infrastructure failure, not a finding about the batch path.
Recorded because "the arm did not report" and "the arm reported nothing useful"
would otherwise be indistinguishable in the table above.

### Step 3 — ACCEPTANCE MET (replacement Step 3, A1)

Both pool-size arms ran the same n=25 batch through
`runConcurrentBulkSim(request, pool, onProgress, signals)` called directly from
our own adapter with our own `WorkerPool`:

| pool | rows | w/ dpsMetrics | baseline populated | stages | secs |
| --- | --- | --- | --- | --- | --- |
| 4 | 25 | 25 | yes | 1 | 332 |
| 1 | 25 | 25 | yes | 1 | 982 |

Against the A1 acceptance text, item by item:

- **R4 wording** — a `BulkSimResult` whose `baseline` **field** is populated
  (`baselinePopulated: true`, and `baselineDps` is a real number) and whose
  `topResults` **array** has one row per candidate: 25 rows for 25 candidates,
  at both pool sizes. Baseline is a separate field, never an n+1th row.
- **R2 row count** — every row carries `dpsMetrics` (25 of 25) at both sizes.
- **`validateBulkSimRequest` passes** — it rejects a missing `simOptions` and it
  did so during development; with the builder's `simOptions` in place the call
  proceeds to the tournament.
- **`RequestTypes` member ledgered** — `RequestTypes.BulkSim` (`0x8`), confirmed
  end-to-end by these returns.
- **Pool size 1 does NOT fail.** The plan's contingency ("if pool-size-1 fails,
  record the failure mode — the runner then requires ≥2 workers") does not apply:
  a 1-worker pool works, it is simply serial (one sim every ~33 s with no
  overlap, ~4x the wall clock of pool 4 — 982 s vs 332 s).

That last point makes `bulkPoolSizeFrom`'s refusal below 2 workers a **deliberate
policy choice, not a workaround**: a serial tournament buys nothing over the
existing per-candidate loop, so Off/1 users stay on the loop because it is the
right answer for them, not because the bulk path is broken there. Worth stating
plainly, because "we don't offer it below 2" reads like a limitation and the
measurement shows it is a decision.

No stop-and-escalate condition was triggered at any point in Steps 2 or 3.

Every arm matches its pre-registration exactly. The four expected-complete arms
(n=19, n=25, n=32, and step3-pool4 at n=25) each ran a single stage with
`survivors == n` and returned a full row set with `dpsMetrics` on every row; the
n=33 arm went multi-stage and truncated, as registered.

**A1-4 — SATISFIED, and the derivation is confirmed to the candidate.** The
expectation (`stageMetrics.length > 1`) was recorded before the result landed;
the measured n=33 arm returned `stageCount: 2`, so the multi-stage tournament
engaged exactly where the derivation said it would.

The pair of arms is the whole boundary measurement in two rows:

- **n = 32** → 1 stage, 8,426 iterations, survivors 32, **32/32 rows**.
- **n = 33** → **2 stages** (1,000 then 5,220), survivors 5 then 5, **5 rows of
  33**. 28 candidates were culled and the response was truncated to the
  survivors.

So the flip from single-stage to culled sits precisely between 32 and 33 at
5,000 iterations, matching the offline derivation from upstream's own
`shouldUseLegacyBulkSim` exactly. Note the failure mode at n=33 is *silent*: 5
rows come back, every one carrying `dpsMetrics`, with no error — which is why the
partitioner bound (not a post-hoc row check) is what keeps the ranking complete,
and why `bulkScreenResultFrom` throws on a short response rather than trusting
the rows it received.

**R2's guard is therefore validated empirically, not just by reading.** The
guard was written from `statistics.ts:107`; the n=33 arm is exactly the case it
catches — 5 rows where 33 were requested, all carrying `dpsMetrics`, `error`
unset. A runner that trusted the response would have dropped 28 candidates from
the ranking silently. The failure R2 anticipated is real and reachable.

**n=25, the shared constant, is clean.** **n=32 is also clean**, which confirms
the derived bound empirically: the no-culling regime really does extend to 32 at
5,000 iterations, so the A1-3 decision to cap at 25 is leaving real capability on
the table rather than guarding against an unknown — exactly as the cross-track
rule intends, and now measured rather than modelled.

Note the adaptive pass raised the nominal 5,000 to 7,236 and 7,823 actual
iterations respectively — it targets a stage error percentage, so the number
rises with the candidate count.

### Superseded first-pass section: "arm results NOT OBTAINED (run wedges on arm 1)"

Fork type-check and `vite build` both exit 0 with all three harness fixes in.
The precondition passes and the tournament starts, but **no arm ever completes**.

State after **~9 minutes** on the first arm (n=19, pool 4, 5,000 iterations),
re-checked at page uptime 10.9 min and still zero arms — so this is a hang, not
slowness:

- `window.__bulkSpikeDone` = `false`, `window.__bulkSpikeResults.results.length`
  = **0** — not one `BULK_SPIKE_RESULT` line emitted.
- No `running N iterations took …s` line appears in the console for this run.
  The only such line in the buffer is from an earlier pass (`11:50:05 … 23.432s`,
  scrollback), so **zero candidate sims have completed** since this run began.
- The runtime itself is healthy, checked while the arm was stuck: a freshly
  constructed `new Worker('/tbc/sim_worker.js')` reaches `msg: 'ready'` with
  `outputData[0] === 1` (i.e. `isWasm`) in **433 ms**.

So this is not a broken WASM environment and not the transport inversion A1-1
warned about — the precondition explicitly passed with `isWasm: true`.

**ROOT CAUSE FOUND (by reading, after the fact — see the unattributed-edits
section below for what prompted the look).** It is my harness, not upstream, and
it is not any of the three suspects I originally ranked.

`adapters/sim_database.ts`'s own doc comment states it outright:

> `lib.wasm` is built without the `with_db` tag … so its item registry starts
> empty and is filled per request from `player.database`. … a candidate item the
> character does not wear appears in no database the page ever built, and
> **environment construction dies on its id before a single iteration runs**.
> … An item the Database cannot resolve produces no row, and the sim then panics
> on that id — deliberately.

My spike builds the request database with `simDatabaseFor(equipment)` where
`equipment` is the **baseline gear only**, then swaps in 19–33 candidate items
the character does not wear. Every candidate sim therefore references item ids
absent from `player.database`, and dies in environment construction — which is
exactly the measured signature: the tournament starts, the baseline is fine, and
no candidate sim ever completes.

This is ticket 212's bug re-created in the spike. `rank.ts` avoids it because it
calls `composeFor(swapped)` per candidate — composing the database from the
*swapped* equipment, so each candidate's own item is registered. My spike
composes once from the baseline and never re-composes.

**The fix is a union database**: resolve `simDatabaseFor` over every candidate's
equipment and merge the rows, so one request carries every id the tournament
will touch. That is what Step 6's `buildBulkSimRequest` must do too — a bulk
request is one request covering *n* gear sets, so it needs the union, not the
baseline's rows. **This is a fourth shared-builder obligation**, and the most
consequential of the four, because it is invisible until a candidate item is
one the character does not wear.

Superseded three-suspect list, kept for the record — all three were wrong:

1. **`SimSignalManager` scope.** The spike creates its own `SimSignalManager`
   per arm (`bulk-spike.mts` `runSpikeArm`), while the page's `Sim` owns another.
   `registerRunning`/`abortType` coordinate across a manager instance, so a
   second manager may not be wired to whatever the pool expects.
2. **Pool ownership.** The spike constructs its own `WorkerPool(4)` alongside the
   page's existing 8 workers. `runConcurrentBulkSim` calls
   `workerPool.getNumWorkers()` and `runConcurrentSim` for the baseline probe;
   worth confirming a second pool services requests when the page already has one.
3. **The baseline probe specifically.** It is the first thing the stage does
   (`stage.ts:288-294`) and it uses `SplitAcrossWorkers` → `runConcurrentSim`,
   a different code path from the per-candidate `raidSimAsync`. A hang here
   would produce exactly this signature: tournament started, no candidate sims,
   no result.

(3) is the most likely and is testable cheaply by calling
`runSingleBulkSimCandidate` on the baseline alone before any arm.

**Consequence for the plan.** Steps 2, 3 and 10 remain **unmeasured**. The
environment question A1.1 raised is fully settled (4180 is right, `isWasm` is
true, the precondition passes), and three request-shape defects that would have
blocked the shared builder are found and fixed. What is not settled is whether
the tournament, driven from an adapter-owned pool the way Step 7 intends to
drive it, completes at all. That is exactly the risk Step 3 exists to retire,
and it is not retired.

Per the plan's stop-and-escalate semantics, I am not adapting around this: an
unexplained hang in the very call the whole design rests on is a finding to
report, not a detail to work around. Steps 4–9 stay unstarted, because building
the seam, partitioner, builder and `rank.ts` branch on top of a call that has
never once returned would be building on an untested premise.

### PROVENANCE cycle completed for the second fork commit

The reworked spike is fork commit `3b1af456c`. That moved the clone HEAD off the
pin, so `pnpm sim-implemented-effects:generate` refused with a clear ordering
instruction:

```
generate_sim_implemented_effects: clone HEAD is 3b1af456c… but
data/wowsims-fork.lock.json pins 5ad56a5c9…. forkCommit must name the commit the
artifact describes, so regeneration is valid only at pin-bump time: update the
lockfile (or reset the clone to the pin), then re-run.
```

Bumped the lock to `3b1af456c` first, then regenerated:

```
wrote data\sim-implemented-effects.json -- 217 implemented, 451 stub-only
(fork commit 3b1af456c0ad565f18b3f6e1939f80e41b334867)
```

Note this command was **permission-blocked in the first pass and runs now**, so
the earlier blocker is gone and the cycle is complete on my side.

### Gate results on the tip (second pass) — BOTH GREEN

- **Fork type-check**: `node node_modules/typescript/bin/tsc --noEmit` from the
  fork root → **exit 0**.
- **`pnpm verify`**: **exit 0**. 56 test files / 1241 tests pass (including
  `wowsims-fork-parity`), and the two pin-sensitive gates that failed in the
  first pass now pass at the new pin:

```
engine port drift check ok: 33 ported files match PROVENANCE.md; ItemSlot,
  ITEM_SOURCE_KINDS and SIM_ORDER match their sources member-for-member
equip eligibility check ok: 17 specs match the fork at 3b1af456c0ad;
  slug map total and injective
```

Outer commit for the re-pin: `c23129d`. Working tree clean in the outer repo;
the fork carries only the temporary `upgrades_tab.tsx` spike hook, uncommitted
by design (it is removed before Step 11's final commit).

### Root cause CONFIRMED and fix ADOPTED (resumed after coordinator diagnosis)

The independent diagnosis supersedes both my "hang" framing and my three
suspects. It was never a hang: a **WASM panic** (`No item with id: 32014`) that
surfaces only after the whole candidate queue drains, which at n=19 @5,000 takes
many minutes and reads as a wedge.

I verified the two load-bearing mechanics myself before adopting:

- **`compose.ts:48`** — `if (player.database) slot.database = player.database`.
  The database lands on the **player**, so spreading a `database` key onto the
  request root does nothing. The fix recomposes through `compose` rather than
  spreading; correct.
- **`batch.ts:131-133`** — a candidate error calls `signals.abort.trigger()`,
  but the function then `await Promise.race([candidateQueue.drain(), …])`, and
  `index.ts:121-122` only surfaces the error after the batch settles. That is
  precisely why the failure looked like a wedge rather than an error.

Both check out, and this explains the measured signature better than my
`SplitAcrossWorkers` theory did. **All three of my ranked suspects are cleared**:
my own `WorkerPool` and per-arm `SimSignalManager` are fine, so **Step 7 keeps
its own pool** — a real design answer, not just a cleared suspicion.

Adopted as my own attested work after review. My earlier objection to the
`< 33` → `< 2` guard relaxation is resolved in the applied version: the guard is
restored for real arms and only `?bulkProbe=1` may run short.

Demonstration quoted from the diagnosis: probe n=2 returned twice (38.5 s,
40.6 s), `allCandidatesReturned: true`, both rows carrying `dpsMetrics`,
baseline populated, `isWasm` true.

**Reproduced independently on my own run** after adopting the fix (`?bulkProbe=1`):

```
BULK_SPIKE_SETUP {"candidatesBuilt":2,"required":2,"slotsUsed":["mainhand"],
  "distinctItems":2,"poolSize":227,
  "dbRows":{"items":17,"enchants":10,"gems":1,"itemEffectRandPropPoints":8}}
BULK_SPIKE_PRECONDITION {"isWasm":true,"numWorkers":4,"workerUrl":"/tbc/sim_worker.js","passed":true}
BULK_SPIKE_RESULT {"arm":{"label":"probe-n2","candidateCount":2,"highStageIterations":200,"poolSize":4},
  "provenance":{"isWasm":true,"numWorkers":4,"workerUrl":"/tbc/sim_worker.js"},
  "stages":[{"stage":5,"iterations":5239,"survivors":2,"durationSeconds":40.618}],
  "stageCount":1,"rowsReturned":2,"rowsWithDpsMetrics":2,"allCandidatesReturned":true,
  "baselinePopulated":true,"baselineDps":2132.2188052420743,"baselineProgressEvents":1,
  "candidateIndices":[0,1],"elapsedSeconds":40.62269999992847}
```

**Cost fact (task 3):** a *nominal* 200 `highStageIterations` became **5,239**
actual — the adaptive pass raises iterations to hit the stage's target error
(`stage.ts:303`, `getBulkSimStageIterations`). So `highStageIterations` is a
floor, not a budget, and arm cost cannot be estimated from it. Worker log for the
same arm: `running 4448 iterations took 26.4s`. Budget Step 10 on measured
per-sim seconds, not on the nominal setting.

### Candidate supply for the boundary arms (task 2)

The page's best single slot supplies 29, short of the 33 the n=32/33 arms need,
so candidates are now drawn **across slots**: each item is placed into a slot
`simSlotsForPoolSlot` says it is legal for, slots taken in descending supply
order, and each item used at most once so no two candidates are identical gear.
Every candidate remains fully-slotted legal gear (a clone of the baseline with
one slot replaced), which is what `lookupEquipmentSpec` requires.

The loud-failure semantics are kept and strengthened: the guard now asserts the
**actual built count** rather than a per-slot supply, so an arm labelled n=33
can never silently run 29.

```
BULK_SPIKE_SETUP {"candidatesBuilt":33,"required":33,"slotsUsed":["mainhand","finger1"],
  "distinctItems":33,"poolSize":227,
  "dbRows":{"items":48,"enchants":10,"gems":1,"itemEffectRandPropPoints":13}}
```

33 distinct items over two slots, union database widened from 17 to 48 item rows.

**Contention warning for whoever re-runs this.** During arm 3 two sims logged
`running 7635 iterations took 21m33.9s` against a ~44 s norm — a ~30x stall,
followed by immediate recovery to 44 s. The cause was my own foreground work
(`vitest run`, `tsc --noEmit`, `vite build`) competing with four WASM workers for
the same 20 cores. It is not a code fault and not the batch path, but it does
mean **wall-clock arm timings are only trustworthy on an otherwise idle
machine**, and Step 10's timings must be collected without other work running.

Measured cost on the real grid: the adaptive pass raised the nominal 5,000 to
**6,486** actual iterations, ~39 s per sim on this machine (worker log:
`running 6486 iterations took 39.4s`). At 4 workers that is ~3.5 min for the
n=19 arm and roughly 25–30 min for the six-arm grid. Step 10's two full
`rankUpgrades` runs are a much larger multiple of that and must be budgeted from
these measured seconds, not from `highStageIterations`.

### UNATTRIBUTED WORKING-TREE EDITS — flagged, then reviewed and adopted (see above)

After I committed `3b1af456c` (11:59:28) and while I was running verify and
writing my report, **both fork files were modified by something other than me**:

| File | mtime | Added |
| --- | --- | --- |
| `upgrades/tools/bulk-spike.mts` | 12:16:57 | +27 lines |
| `upgrades_tab.tsx` | 12:23:44, then 12:24:22 | 90 → 137 → 141 lines |

The tab file was edited **again** after I filed the first flag, which is how the
union-database hypothesis came to my attention.

`git reflog` on the fork shows no activity after my commit, so these were
direct working-tree writes, not a git operation.

What they contain, read in full:

- **`bulk-spike.mts`**: a `?bulkProbe=1` bisect probe that runs, at 200
  iterations, (1) `runSingleBulkSimCandidate` with `SingleWorker`, (2) the same
  with `SplitAcrossWorkers`, (3) a full `runConcurrentBulkSim` at n=2 — logging
  before and after each so the last line printed names the await that never
  resolves. Plus a `BULK_SPIKE_ARM_START` line.
- **`upgrades_tab.tsx`**: my own `runBulkSpike` with `BULK_SPIKE_TRACE` logging
  interleaved, **and one behavioural change**: the candidate-count guard is
  relaxed from `itemIds.length < 33` to `< 2`.

A **third** edit (12:24:22) added a union-`SimDatabase` build plus a
`BULK_SPIKE_DBCHECK` line reporting which wanted item ids are missing from it.

Assessment on the merits: the bisect probe is well-targeted, and the
union-database edit **identifies the actual root cause** — I confirmed it
independently by reading `adapters/sim_database.ts`'s doc comment, which states
the failure mode verbatim (see the root-cause section above). My own
three-suspect list was wrong. Credit where due: that edit found what I did not.

**Why it is flagged rather than adopted.** I did not write it, I cannot verify
its provenance, and it changes behaviour (the `< 2` guard would let arms run
with fewer than 33 candidates, which silently weakens the n=32/n=33 arms — the
guard exists so a short pool fails loudly instead of measuring the wrong n).
Reporting these as my measurements, or committing them under my attestation,
would make this ledger wrong about who established what. The plan's own standard
is that an accurate ledger is the deliverable.

**Left in the working tree, uncommitted, unrun.** Nothing in my reported results
depends on them: every quoted figure above predates 12:16. What I *have* taken
from them is the **hypothesis**, which I then verified against upstream's own
doc comment and recorded as the root cause in my own words — that is evidence I
can stand behind, whereas their measurements would not be.

Recommended disposition for the orchestrator:

1. **Adopt the union-database fix** — it is correct and it is a real obligation
   on Step 6, not just spike scaffolding. Fold it into the plan.
2. **Adopt the bisect probe** if a confirming run is wanted; with the root cause
   in hand it is now mostly redundant.
3. **Revert the `< 33` → `< 2` guard relaxation.** It is the one behavioural
   change among the edits, it is not instrumentation, and it would let the
   n=32/n=33 arms run with fewer candidates than they claim — silently measuring
   the wrong `n`, which is the same class of error as the back-item-in-head-slot
   bug that already cost this pass two rebuild cycles. If the probe needs 2
   candidates, give the probe its own guard.

I did not apply any of this myself: the diagnosis arrived after I had filed a
report attesting to a tree state, and re-running now would mean presenting a
run I did not set up as my own measurement.

Observed cost, from the worker's own log line on this machine:

```
2026/09/01 11:50:05 running 5000 iterations took 23.432s
```

That is **one** candidate sim at the High-stage setting. The six arms total
19+25+32+33+25+25 = 159 candidate sims plus a baseline probe each, and the
pool-1 arm serialises its 25. This is the "minutes of in-browser compute, not a
quick spike" the amendment anticipated — and it prices Step 10, which needs two
full `rankUpgrades` runs over the whole feral-p2 candidate set on top of this.

Driving note for anyone re-running this: the Upgrades pane must be **activated**
before clicking `button.upgrades-run-button`. While the pane is inactive the
button exists in the DOM but has no `offsetParent`, and a scripted `.click()` on
it silently does nothing — which looks exactly like a run that started and
hung. Click the Upgrades tab link first, confirm `btn.offsetParent` is truthy,
then click Run and confirm a fresh `BULK_SPIKE_PRECONDITION` line appears.

C15 sharpened by reading `stage.ts:279-321`: a single stage runs up to
**two** baseline sims, not one — a *probe* at the stage minimum
(`:288-294`), then a second segment if the adaptive target raises iterations
above the probe (`:315-321`), which is what `maxBaselineSims = 2` (`:279`)
budgets. Adaptive re-runs (`rerunConcurrentBulkSimStageAdditionalIterations`,
`:196`) can add more. So per chunk the cost is `n + 2` sims in the common
single-stage case, and N3's "lower bound, not upper bound" wording is right.
This is the number that prices the 25-vs-32 chunking tradeoff: each extra chunk
costs about two extra baseline sims, not one.

One more thing Step 7/8 must know, found while reading the batch path: the
tournament's **baseline probe** runs with
`BulkSimCandidateTransport.SplitAcrossWorkers`, which calls `runConcurrentSim`
(`wasm/bulk_sim/batch.ts:64-65`; `index.ts:88-95,154-161`). That is precisely
the function `wasm_sim_runner.ts`'s doc comment says it deliberately avoids,
because sharding one request's iterations across workers changes the result with
the worker count (its comment cites `docs/plans/compute-topology.md` §3.1:
same seed, different core count, different float). Consequence: **the bulk
baseline is not reproducible across pool sizes**, so screening deltas computed
against it inherit that. It does not threaten the ranking — Step 8 keeps
paired-seed replication for the accurate pass — but it does mean a bulk
screening delta is not a stable number the way a loop delta is, and Step 10's
condition (b) is measuring across that.

Measurement machine, for reading the timings and the pool-sizing arm:
`navigator.hardwareConcurrency = 20`, `navigator.deviceMemory = 32`. So
`memoryCapFromDeviceMemory()` = floor((32*1024/2)/183.8) = 89, far above the
pool sizes used — on this machine the memory cap is not the binding term in
Step 7's `min(setting, hardwareConcurrency, memCap)`, and a low-RAM machine
would behave differently.

### Steps 4–9 built (fork type-check exit 0 throughout)

- **Step 4 — seam.** `engine/seams/sim-runner.ts` gains `BulkScreenCandidate`,
  `BulkScreenRequest`, `BulkScreenResult`, optional `runBulkScreen?`, and
  `bulkScreenCacheKey`, all in protojson vocabulary so the engine stays
  proto-unaware. `RecordedSimRunner` takes an optional bulk-recordings map and
  attaches `runBulkScreen` as an **own property** only when given one — a
  prototype method could not be hidden, and `rank.ts` treats the member's
  presence as the capability check, so a fixture without bulk recordings must
  look exactly like a runner that never had the capability.
- **Step 5 — partitioner.** New `engine/bulk/partition.ts` with
  `MAX_CANDIDATES_PER_BULK_REQUEST = 25` and `partitionForBulkScreen`. Unit
  tested directly at `packages/core/test/bulk-partition.test.ts`: **7/7 pass**,
  covering the bound for sizes 1..60, index round-trip, oversized-slot splitting
  ([25,25,10] for 60), gear preservation, empty input, and a loud throw on a
  nonsensical bound.
- **Step 6 — builder.** New `adapters/bulk_request_builder.ts` carrying all four
  measured obligations with the evidence for each in the doc comment.
- **Step 7 — runner.** New `adapters/bulk_wasm_sim_runner.ts`. Exports
  **`bulkScreenResultFrom`** (R3's named mapping — the local runner imports this,
  never duplicates it), which enforces R2's guard: it throws unless
  `topResults.length` equals the chunk's candidate count *and* every row carries
  `dpsMetrics`. Pool sizing honours Off: `bulkPoolSizeFrom` returns undefined at
  0 or 1 so the factory yields a plain `WasmSimRunner` with no capability,
  otherwise `max(2, min(setting, hardwareConcurrency, memoryCap))`.
- **Step 8 — `rank.ts`.** `DEFAULT_ITERATIONS` 3000 → **5000**, and a screening
  branch that satisfies N1: `screenCandidates` prices each (item, slot) attempt
  through `runBulkScreen`, but the per-candidate loop still calls `composeFor`,
  computes `statDeltaBetween`, `isHitDriven`/`hitRegression`, `setBreakNote`, and
  populates `individualDeltasByItemId`, `candidateSkips` and `winningRequests`
  exactly as before — **only the DPS observation changes route**. Paired-seed
  replication and the set-bonus sims are untouched, so the estimand is unchanged.
  Absent capability or an already-raised abort means no screening pass at all.
- **Step 9 — comment.** At the `runConcurrentBulkSim` call site, naming
  `ui/worker/sim_worker.ts:15-18,107` as the stub to switch away from.
- **R1 — factory.** `upgrades_tab.tsx:447` now calls `makeSimRunner()`. This
  plan owns introducing the factory; the local plan extends only its branch
  condition.

**Known residual risk in the Step 8 branch, recorded rather than papered over.**
`index.ts:121-122` turns any single candidate error into a request-level error,
so one candidate the sim rejects fails its whole chunk — up to 25 candidates —
whereas the per-candidate loop records one `candidateSkips` row and continues
(`rank.ts:729-737`). The screening pass mitigates this partly by skipping
attempts whose gem repairs throw (so those never enter a batch), and the
`bulkScreenResultFrom` throw means such a chunk surfaces loudly rather than
silently losing rows. But a chunk-level failure currently aborts the screening
pass rather than degrading to the loop for that chunk.

This did not fire in any arm (every candidate the harness built was legal), so it
is untested in practice. The obvious hardening — catch per chunk and fall back to
`run()` for that chunk's candidates — is deliberately **not** added here: it is
beyond what Step 8 specifies, and adding an untested fallback path on the way out
would be worse than naming the gap. Flagged for the plan owner.

**Index preservation across chunks, checked deliberately** because it is the one
place a multi-chunk batch could silently corrupt the mapping. `partitionForBulkScreen`
slices candidate objects without renumbering, `buildBulkSimRequest` passes
`candidate.index` through unchanged, and the response echoes it as
`candidateIndex`. So a row from chunk 2 carries its *original* index, not a
chunk-local one, and rows from different chunks cannot collide. Worth stating:
had the builder renumbered per chunk (the obvious-looking simplification), every
batch past the first would have mis-keyed its rows onto chunk 1's candidates.

**Fixture fallout from `DEFAULT_ITERATIONS` (C14, as predicted).** The full
suite went to `1 failed | 1247 passed`, the single failure being
`wowsims-fork-parity` with `RankError: no recording for sim key …`. Cause is
exactly C14: `simCacheKey` embeds the iteration count, the fixture's recordings
are keyed at 3,000, and the test relied on `DEFAULT_ITERATIONS` rather than
stating its own.

Fixed by **pinning the test to its own conditions** — `iterations: ITERATIONS`
is now passed explicitly at the `rankUpgrades` call — rather than by re-recording
fixtures. Re-recording would have been the wrong move here: the parity test's
job is to prove the ported fork engine reproduces this repo's deltas, and that
comparison is only meaningful at the iteration count both sides recorded at. The
test now describes its own conditions instead of inheriting a constant that the
bulk work legitimately changed. `packages/core/test/wowsims-fork-parity.test.ts`
passes again (1 passed | 1 skipped).

### Step 10 — attempted; blocked by a defect in my own `?bulkEquiv=1` branch

The equivalence run would not launch: with `?bulkEquiv=1` the Upgrades Run button
is inert — no state change, no `run()` progress, no unhandled rejection, nothing
in the console.

**I first blamed worker saturation and that was wrong.** A fresh page showed 20
`sim_worker.js` loads against the 8 seen in earlier working runs, and I wrote
that up as the cause. The controlled test refutes it: on the **same** tab and
server, loading the page **without** the flag and clicking Run works normally
(state advances to "Building the candidate…", button disables), while
`?bulkEquiv=1` does not. A fresh tab at 12 workers was still inert with the flag.
So the variable is the flag, not the worker count — the high worker count is a
real observation but not the cause, and the earlier entry claiming otherwise is
struck.

Recording the wrong call as well as the right one because the ledger's job is to
be accurate about what was established, and a plausible-but-untested diagnosis
left standing is exactly the kind of thing that misleads the next reader.

**Where the defect must be**, given `run()` reaches `?bulkSpike=1` fine from the
same position: the `?bulkEquiv=1` dispatch sits immediately after the spike
dispatch (both in `run()`), and `runBulkEquivalence` differs from `runBulkSpike`
in that it `await`s two dynamic `import()`s of adapter modules
(`wasm_sim_runner`, `bulk_wasm_sim_runner`) before doing anything observable. A
rejected dynamic import inside the handler's `.catch` would set an `error` state
— which is not what is rendered — so the more likely shape is that the promise
never settles. Unverified: I ran out of budget before isolating it.

**Not run, not estimated.** No equivalence numbers are reported.

### DEFECT FOUND IN THE SHIPPED Step 8 BRANCH — the real path has the ticket-212 bug

Stopping the plain (no-flag) ranking surfaced this, from the **ordinary tab
path** with the committed `rank.ts` branch and `BulkWasmSimRunner` — no harness
involved:

```
Ranking failed: bulk screen failed: No item with id: 28732
Stack Trace: goroutine 17 [running]: … github.com/wowsims/tbc/sim/core.NewItem(…)
  sim/core/sim.go:130 … panic(…)
```

**Cause.** `screenCandidates` (`rank.ts`) builds its request as
`{ baseRequest: request, candidates: … }`, where `request` is the **baseline**
composed request — whose embedded `SimDatabase` covers only the worn gear. The
candidates it then sends are swapped equipment containing items the character
does not wear, so the WASM registry has no row for them and `NewItem` panics.
That is exactly obligation 3 (union `SimDatabase`), which I identified, wrote
into the builder's doc comment, and fixed **in the spike harness** — but the
engine path composes its own request and never got the same treatment.

**This is my defect, in shipped code**, and it means the bulk screening branch
as committed cannot complete a real ranking. It also explains why it was not
caught earlier: every arm measured the *runner* directly with a spike-built
union database; nothing exercised `rank.ts`'s own request composition end to end.
The recorded-fixture test does not catch it either, because a recorded runner
never reaches the sim.

**The fix** is for `screenCandidates` to compose a request whose database is the
union over the baseline and every screened attempt's gear — the same merge the
spike does (`simDatabaseFor` per candidate, merge repeated fields by row
identity, attach through `compose` so it lands on `player.database`). `rank.ts`
already has `composeFor` and receives `deps.simDatabaseFor`, so the pieces are
in hand; it needs the union built across `attempts` before the `runBulkScreen`
call, and a PROVENANCE cycle for the edit.

I did not make that change myself (an untested engine-file edit at the end of a
session would have been worse than the report). **It was then applied in the
working tree by another actor, and I have reviewed and verified it.**

### The union fix — reviewed, tested, and CONFIRMED WORKING

The applied change adds `composeForBulk(candidateGear)` beside `composeFor` and
passes its output as `baseRequest` to `runBulkScreen`. Reviewed before trusting
it:

- **Shape matches `composeFor` exactly** — same `name: input.character.name
  .toLowerCase()`, same `race`, same `equipment` (the baseline). Passing the
  baseline is correct: the candidates ride in the `candidates` array, not in the
  base request, so widening only the *database* is precisely the intended change.
- **Union built per gear set and merged by row identity**, with the
  `lookupEquipmentSpec` trap ("No slots left to equip" on a flat id list) called
  out in the comment — matching what I measured in the spike.
- **Fork type-check: exit 0.**

**Verified by execution, which is what the defect demanded.** Rebuilt the bundle
and ran an ordinary ranking (no harness flag) on the same page that produced the
panic:

```
before fix: Ranking failed: bulk screen failed: No item with id: 28732
after fix:  Simming 1/264… (0 rows landed)
```

The run proceeds past the exact point it previously died. The bulk screening
branch now composes a request whose database covers every item it can ask the
sim to equip, and obligation 3 is satisfied in the engine path as well as in the
builder's documentation.

**Sustained under a real full-pool ranking**, not just the first batch: with 227
eligible items (264 total sims planned) the run keeps completing candidate sims
at ~41 s each, four at a time, well past the point the panic used to fire. Since
the screening pass prices every candidate before the first row lands, the UI
sits at "Simming 1/264" throughout — that is the expected shape of the bulk
branch, not a stall.

**PROVENANCE cycle run and committed** as fork `b8e7a566e`: parity test green
first (12 tests pass across parity + partitioner + seam suites), `rank.ts` hash
updated to `b68e2fff0e20…`, adaptation note extended to name `composeForBulk`,
`check_engine_port_drift.py` green, then re-pinned (outer `685c47d`,
`equip eligibility check ok … at b8e7a566ea43`).

**Attribution:** the fix is not my authorship. I reviewed it against
`composeFor`, type-checked it, rebuilt, confirmed the defect is gone by running
the path that failed, and only then took it through the PROVENANCE cycle and
committed it under my own verification. The ledger says who wrote what so the
record stays accurate.

### Step 10 — STATUS: harness built and validated, measurement NOT RUN

The compute cost was approved, and the harness plus its offline scorer are
complete, type-checked and self-tested (see below). What was not possible inside
this seat is the run itself: two full feral-p2 rankings at 5,000 iterations.
Scale, from the measured arms — a single 25-candidate screening batch takes
~5.5 minutes at pool 4, and a full ranking screens the whole eligible pool (227
entries after phase filtering) across every legal slot, then adds paired-seed
replication over five seeds. Two such runs, back to back, on an idle machine.

**No equivalence numbers are reported and none are estimated.** The four
conditions are pre-registered so that they cannot be waved through; asserting
"probably equivalent" from the boundary arms alone would be precisely the
false-confidence claim the stop rule exists to prevent.

Everything the run needs is in place and committed: both runners, the shared
partitioner and builder, the branching `rank.ts`, the `?bulkEquiv=1` harness, and
`scratchpad/equiv.mjs` (validated against a known-bad case, so it demonstrably
reports FAIL when it should). Running it is `?bulkEquiv=1` on an idle machine,
then `node equiv.mjs <dump.json>`.

### Step 10 — harness design (compute cost approved by the orchestrator)

A second temporary mode, `?bulkEquiv=1`, runs the **same** feral-p2 ranking twice
at 5,000 iterations — once with a plain `WasmSimRunner` (no capability, so the
per-candidate loop) and once with `BulkWasmSimRunner` (bulk screening) — and
dumps both as `BULK_EQUIV_RUN` JSON lines plus `window.__bulkEquiv`.

Two design points that decide whether the comparison means anything:

- **A fresh `MemoryStore` per run.** The store dedupes identical sim requests, so
  a shared one would let the bulk run replay the loop run's cached observations
  and the comparison would be vacuous — it would compare a run against itself.
- **The harness does not judge.** It dumps `itemId`, `rank`, `deltaDps`, `se`,
  `seMethod` and `belowCutoff` per row and nothing else; the four conditions are
  computed offline from the quoted JSON. A harness that scored itself could not
  be trusted to report a miss.

`hasBulkCapability` is recorded per run so the dump proves on its face that the
two runs really did take different routes.

**The scorer is validated against a known-bad case before use.** A scorer that
only ever prints PASS proves nothing, so `scratchpad/equiv.mjs` was run twice on
synthetic input: an identical-rankings case (all four PASS, Spearman 1.000000)
and a fully-inverted case, which correctly reports (a) FAIL on row count,
(b) FAIL with rho = **-1.000000**, and (d) FAIL naming all four mis-ordered
items with their gaps against the error band.

That exercise also showed why (c) and (d) are not redundant: on the inverted
case **(c) PASSES at 100% overlap** — the same items are selected — while (d)
catches that their order is reversed. Set membership and ordering are genuinely
different questions, and the pre-registration was right to ask both.

Formulas used, stated so the numbers can be checked by hand:
Spearman is Pearson on midranks (the tie-free
`1 - 6·Σd²/(n(n²-1))` shortcut is invalid with ties and is deliberately not
used); overlap is `|A ∩ B| / k` over the first `k` ranked rows of each run; the
(d) band is `se_loop + se_bulk` for the row pair being compared.

**Hook removal boundaries** (Step 11), mapped against the current file so the
removal is surgical rather than a re-read-and-guess:

- **Remove** lines 1127–1348 — the two temporary methods, `runBulkSpike` and
  `runBulkEquivalence`, contiguous and self-contained.
- **Remove** lines 1362–1379 — the two dispatch blocks inside `run()`
  (`?bulkSpike=1` and `?bulkEquiv=1`).
- **Keep** line 21 (`import { makeSimRunner } …`) and line 451
  (`private readonly sim = makeSimRunner();`) — those are R1's factory, which is
  permanent plan work, not harness.

### Superseded: "Step 10 NOT ATTEMPTED" (budget call, since reversed)

Step 10 wants two full `rankUpgrades` runs over feral-p2 at 5,000 iterations,
loop vs bulk, then Spearman / overlap / error-bar comparisons. The measured cost
makes the scale plain: a single **32-candidate** screening batch is taking tens
of minutes on this machine, and a real feral-p2 ranking screens the whole
eligible pool (227 entries survive the phase filter here) across several slots
each — hundreds of sims per run, twice over, plus paired replication.

That is hours of uninterrupted in-browser compute on an otherwise idle machine.
It is genuinely runnable, and nothing found so far argues it will fail; it is
simply not something this seat could finish inside one session alongside the
build. **No equivalence numbers are reported, and none are guessed** — Step 10's
four conditions are pre-registered precisely so they cannot be waved through, and
a "probably fine" here would be exactly the false-confidence claim the plan's
stop-and-escalate rule exists to prevent.

What Step 10 needs from whoever runs it, all now in place: the bulk runner, the
loop runner, the shared partitioner and builder, a `rank.ts` that branches
between them, and the harness pattern for driving a long run
(`window.__bulkSpikeDone` polling, quiet machine).

## Where this leaves the plan after the A1 pass

The amendment retired the questions it was written to retire. The measurement
environment is settled and proven (4180, `isWasm: true`, precondition quoted).
The boundary question is settled by derivation, and the cross-track rule fixes
the shared constant at 25 regardless of how the arms land. Three request-shape
defects that would each have blocked the shared builder are found, fixed and
recorded — and every one of them was invisible to reading.

What A1 did **not** retire is the thing Step 3 is for: that
`runConcurrentBulkSim`, called from our own adapter with our own pool, returns.
It has not returned once. Until that is diagnosed, Steps 4–9 are building on a
premise no measurement supports, and Step 10 cannot even be attempted.

The next move is now known rather than speculative: build the request's
`SimDatabase` as the **union** over every candidate's equipment, not from the
baseline alone, then re-run the arms. That is a small change to the spike and a
one-line addition to Step 6's spec.

Good news for the design: the hang was **my harness, not upstream**, so nothing
here refutes the approach. `runConcurrentBulkSim` was never given a runnable
request. The three suspects I ranked — signal-manager scope, second-pool
ownership, the `SplitAcrossWorkers` baseline path — are all cleared, which also
means Step 7 has no reason to avoid owning its own pool.

The cost, though, is real and should be priced before Step 10 is attempted: at
23.4 s per 5,000-iteration sim, the six arms alone are ~15 minutes of wall clock,
and Step 10's two full `rankUpgrades` runs are a different order of magnitude
again.

## What the re-plan has to decide (first pass — largely superseded by A1)

Not a menu — the two findings pull in different directions and the second one
partly rescues the first.

**The measurement environment.** Steps 2, 3 and 10 all need real WASM sims, and
the only place those run is a browser. `.claude/launch.json` already has a
`wowsims-fork` vite entry on 5173 and a built `dist/tbc` with `lib.wasm`
(21.5 MB) present, so the capability exists; what does not exist is any plan
step that budgets a browser-driven harness. Step 10 in particular wants two full
`rankUpgrades` runs over feral-p2 at 5,000 iterations, which is a large amount of
in-browser compute, not a spike. This is the expensive half of the re-plan and
it is the part I cannot decide: it changes what Steps 2/3/10 *are*.

**The boundary.** This one got cheaper, not more expensive. Because upstream's
stage-selection is pure, the "which stages run / is anything culled" half of
Step 2 is answerable exactly, offline, today — and the answer is that the plan's
whole 8-arm grid sits in the no-culling regime, with the real flip at 33
candidates at 5,000 iterations. A re-planned Step 2 could keep a much smaller
browser measurement: it only has to confirm row completeness near n = 32 (the
`dpsMetrics`-drop failure mode from R2), not rediscover the stage boundary.

**What I would not do.** Take 32 as the bound on the strength of the derivation
and carry on building Steps 5–8. The plan's own rule is that measured beats
modelled, and the derivation is a model; R2 exists precisely because row
completeness has a failure mode the stage logic cannot see. Shipping a
partitioner bound that has never had a row counted against it would put an
unverified constant into both tracks at once.

---

# Finishing seat (Steps 10–11)

Fresh executor, opened on outer `f0f5883` as briefed; on arrival the tree had
already advanced to outer `86bc23c` / fork `95088fd9d`, lock pinning
`95088fd9d`, working tree clean apart from the temporary `upgrades_tab.tsx`
hook. That is the expected end-of-Step-9 state, so this is a resume, not a
mismatch. Verified with `git -C … rev-parse HEAD` and `git status --porcelain`,
not assumed.

## Item 1 — arm 6 (`step3-pool1`) recovered and quoted

The arm was lost twice (the http-server died mid-run once, and the page was
re-navigated once). It was re-run alone through the committed `?bulkArm=` single
-arm selector (fork `4a2d75757`) at
`http://localhost:4180/tbc/druid/feralcat/?bulkSpike=1&bulkArm=step3-pool1`,
and completed at 13:58:00. Read from `window.__bulkSpikeResults` and quoted
verbatim:

```
BULK_SPIKE_RESULT {"arm":{"label":"step3-pool1","candidateCount":25,"highStageIterations":5000,"poolSize":1},
  "provenance":{"isWasm":true,"numWorkers":1,"workerUrl":"/tbc/sim_worker.js"},
  "stages":[{"stage":5,"iterations":7823,"survivors":25,"durationSeconds":982.419}],
  "stageCount":1,"rowsReturned":25,"rowsWithDpsMetrics":25,"allCandidatesReturned":true,
  "baselinePopulated":true,"baselineDps":2131.5777334247286,"baselineProgressEvents":1,
  "candidateIndices":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24],
  "elapsedSeconds":982.4353000000715}
```

**Result: complete at pool size 1.** 25/25 rows, every row carrying
`dpsMetrics`, single stage, survivors 25, and `provenance.numWorkers: 1` proving
the arm really ran on a one-worker pool rather than silently reusing the 4-worker
probe pool. Step 3's conditional ("if pool-size-1 fails, the runner then requires
≥2 workers") therefore **does not fire**: no failure mode to record.

Consequence for Step 7, stated so it is not misread later: `bulkPoolSizeFrom`
returning `undefined` at 0 or 1 is a **deliberate policy choice**, not a
workaround for a broken path. A serial tournament demonstrably works; it simply
buys nothing over the existing per-candidate loop (982 s versus 332 s for the
identical n=25 batch at pool 4 — 3.0x, close to the 4x the worker count would
predict, the shortfall being the single-threaded baseline probe both arms pay).
Honouring a user's "Off" by staying on the loop is the right call on those
numbers, and it is now measured rather than assumed.

Cross-check against the pool-4 arm, same n and same iterations setting: both
report `stageCount: 1`, `survivors: 25`, `rowsReturned: 25`, and a baseline DPS
agreeing to 11 significant figures (2131.577733424731 vs 2131.5777334247286).
The pool size changes the wall clock and nothing about completeness.

## Coordinator redirect — two defects found by the prior seat's final verification

### Defect 1 (shipped, engine path): `screenCandidates` sent a baseline-only database

`rank.ts`'s `screenCandidates` passed `baseRequest: request`, where
`request = composeFor(equipment)` (`:459`) builds its `SimDatabase` from the
**baseline** gear. Every screened candidate swaps in an item the character does
not wear, so its id is in no database the request carries. Builder obligation 3
— the union `SimDatabase` — was satisfied in the spike and in
`buildBulkSimRequest`, but **violated in the engine path**, which composes its
own base request and never went through the builder's union.

**Reproduced live before fixing** (not inferred). Real ranking through the bulk
branch, stale bundle:

```
[error] No item with id: 28732
  github.com/wowsims/tbc/sim/core.NewItem({0x703c, 0x0, 0xbbb, ...})
  ...core.NewEquipmentSet -> ProtoToEquipment -> NewCharacter -> NewAgent
  -> NewParty -> NewRaid -> (*Environment).construct -> NewEnvironment -> NewSim
```

`0x703c` = 28732, and the panic is in **environment construction**, before any
iteration — the exact signature `adapters/sim_database.ts`'s doc comment
describes and the same failure mode as ticket 212.

**Fix**: a `composeForBulk(candidateGear)` helper beside `composeFor`. It
resolves `deps.simDatabaseFor` over the baseline **and every attempt's gear**,
merges the repeated fields keyed by row identity, and composes the baseline
equipment with that union. Two properties worth stating, both learned the hard
way earlier in this plan and preserved here:

- it recomposes through `compose` rather than spreading a `database` key onto
  the request root, because the sim reads the database off the **player**
  (`compose.ts:48`);
- it resolves **per gear set** and merges, rather than handing `simDatabaseFor`
  a flat id list, which fails inside `lookupEquipmentSpec` with "No slots left
  to equip" (that function assigns items to slots and cannot place several
  same-slot items at once).

With no `deps.simDatabaseFor` (the CLI path, built `with_db`) it returns
`composeFor(equipment)` unchanged, so CLI requests stay byte-identical.

**Confirmed fixed by execution.** After rebuilding, the same ranking runs
without the panic — four candidate sims completing per batch at concurrency 4
(`14:16:34 running 5000 iterations took 26.3s` x4, then `14:17:02` x4), where
the pre-fix run died within seconds. Fork type-check exit 0.

### Defect 2 (harness, not code): `?bulkEquiv=1` looked inert because `run()` was never called

Diagnosed rather than patched, and the diagnosis changes the disposition: the
dispatch block is **correct and symmetric** with the working `?bulkSpike=1`
branch, and the flag parses (`new URLSearchParams(location.search).get('bulkEquiv')`
returns `"1"`, measured). The reason nothing happened is that `run()` itself is
only entered when the Upgrades **Run button is clicked**, and while the Upgrades
pane is inactive that button exists in the DOM with `offsetParent === null`, so a
scripted `.click()` silently does nothing.

Measured, before and after activating the pane:

```
{"btnExists":true,"btnVisible":false,"btnDisabled":false}   <- pane inactive
{"btnVisible":true,"btnDisabled":false}                      <- after clicking the Upgrades nav-link
```

This is precisely the trap the earlier "Driving note" section of this ledger
records. So **no code fix was warranted**: the earlier controlled test (works
without the flag, fails with it) is explained by the two runs having been driven
differently, not by the flag handling. Patching the dispatch would have been a
fix to something that was never broken.

Both the wrong diagnosis (inert dispatch) and the right one (unreachable
`run()`) are recorded here per the coordinator's instruction.

**Ordering decision.** The `rank.ts` fix is a tracked engine file and needs the
full PROVENANCE cycle, whose parity test competes for cores with the running
sims — and this ledger already records a ~30x stall caused by exactly that. The
equivalence run is the long pole and needs an idle machine, so it runs first and
the cycle follows it, rather than corrupting both.

### PROVENANCE cycle for the screening-database fix — completed by the coordinator

I had deferred the cycle deliberately (parity test competes for cores with the
running sims). While the equivalence run was in flight the coordinator ran it:

- fork `b8e7a566e` "Widen the screening request's database to every candidate" —
  carries **both** `engine/rank.ts` and `engine/PROVENANCE.md` (the sha256 row
  updated in the same commit, as the cycle requires);
- outer `685c47d` "Re-pin fork to b8e7a566e for the screening database fix" —
  carries `data/wowsims-fork.lock.json` **and** the regenerated
  `data/sim-implemented-effects.json`.

Verified rather than assumed: `git -C vendor/tbc-new-fork rev-parse HEAD` =
`b8e7a566ea437895652211887bceac27aceb8c4e`, and the lockfile's `commit` field
holds the same 40 characters. Outer tree clean; fork tree carries only the
temporary `upgrades_tab.tsx` hook, which Step 11 removes.

The committed code is the fix I wrote and confirmed by execution; only the
commit/re-pin was performed by another actor, so the attestation for the
*measurement* (panic before, clean screening pass after) remains mine.

### Equivalence run lost a third time — cause identified, and it is not the harness

Third loss, and the first two were mine to absorb (server death; my own
re-navigation). This one was neither:

| observation | value | meaning |
| --- | --- | --- |
| URL | `…/feralcat/` — **no `?bulkEquiv=1`** | the query string is gone, so the equiv dispatch cannot fire |
| `btnDisabled` | `true` | an **ordinary ranking** is running (the equiv branch returns before touching the buttons) |
| iterations | **7,096**, adaptive | the bulk *screening* signature, not the loop path's flat 5,000 |
| `window.__bulkEquiv` | absent | nothing of my run survived |

So the tab was navigated to the plain page and a normal ranking started on it —
almost certainly the confirmation run for the fix above, which is a reasonable
thing to have done and does confirm the fix end-to-end. It simply also destroyed
~28 minutes of Step 10 compute.

**Recorded as a process finding, not a code finding.** Step 10 needs an
uninterrupted browser tab for hours; this ledger already documents that wall
clock is only trustworthy on an idle machine, and the same is now demonstrated
for the *tab*. Three losses in one session is a pattern about shared access to
one browser tab, not about the harness, which behaved correctly every time.

**Contention question (coordinator item 2) — does not apply, and the reason
matters.** The suggestion was that the cycle's parity/verify builds may have
contended with my sims and biased the comparison. There is nothing to assess:
the equivalence run did not survive to produce a single row. Measured at
14:49:18 — URL `…/feralcat/` with `bulkEquiv` parsing to `null`,
`window.__bulkEquiv` absent, and a plain ranking at `1/264` holding the tab.

So the honest statement is **no Step 10 data exists yet**, not "data exists and
may be contaminated". Had the run survived, the analysis would have been: a CPU
stall inflates wall clock but does not bias DPS, because each sim runs its full
iteration count and reports its own error bars regardless of how long it waited
for a core — so conditions (a)-(d) would have been safe and only the timing
commentary suspect. That reasoning is recorded for whoever re-runs it, but it is
**not** a finding about this session, because the premise (surviving data) is
false.

### Step 10 restarted under exclusive machine ownership (attempt 4)

Ownership of the machine and browser granted by the coordinator; the prior
executor and the diagnoser are stood down and nothing further will be dispatched
against the checkout or browser until this seat reports.

Reclaiming the tab, in order, each step verified rather than assumed:

1. Clicked Stop on the stray ranking. It began draining but the Run button stayed
   disabled (in-flight sims finish before the run releases), so a graceful stop
   was not decisive on its own.
2. Navigated to `?bulkEquiv=1`, which tears down the page context and kills its
   workers outright. Confirmed the flag parses (`bulkEquiv` -> `"1"`), Run
   re-enabled, `window.__bulkEquiv` absent, page uptime 0.19 min.
3. Confirmed the machine was genuinely idle before starting: last stray sim line
   `14:50:33 running 7096 iterations`, nothing after it, and my navigation
   landed at 14:51. No leftover worker was competing.
4. Activated the Upgrades pane (the `offsetParent` trap), asserted the Run button
   was visible — the harness throws if it is not, rather than clicking into the
   void — and started the run at **14:51:48**.

Confirmed running, and confirmed it is the right arm: sims completing at a flat
**5,000** iterations (`14:52:59 … took 29.3s`, four at a time), which is the
loop arm's signature. The stray run was adaptive **7,096**, the bulk-screening
signature — so the console alone distinguishes which run owns the machine, and
this one does.

**Run progress, read off the console signatures** (no partial results are
readable until both arms finish and `__bulkEquiv` is set, so phase is inferred
from the sim pattern — which is unambiguous here):

| time | pattern | phase |
| --- | --- | --- |
| 14:52-15:21 | flat **5,000**, four concurrent | loop arm, screening pass |
| 15:21-15:24 | flat **5,000**, one every ~24s serially | loop arm, paired-seed replication |
| 15:38+ | adaptive **7,091**, four concurrent | **bulk arm** (adaptive iterations = the bulk tournament's signature) |

The loop arm therefore took roughly 30 minutes of screening plus a replication
tail; the bulk arm began somewhere in the 15:24-15:38 window. The flat-vs-adaptive
iteration count is what distinguishes the two routes on sight, and it is the same
signature that identified the stray run earlier.

## Step 10 — MEASURED. Three conditions pass, condition (c) MISSES.

Run completed 16:56, page uptime 124.9 min, no reload and no competing work for
its whole duration. Both arms dumped to
`<scratchpad>/equiv-dump.json` (69,995 bytes) before anything else was done,
because this data had already been lost three times.

**Provenance — the two runs really did take different routes:**

```
loop: hasBulkCapability=false rows=220 elapsed=2699.5s baselineDps=2131.7093840892107
bulk: hasBulkCapability=true  rows=220 elapsed=4333.1s baselineDps=2131.7093840892107
```

Identical baseline DPS to all 16 digits, which is the expected result: the
baseline is composed and simmed the same way on both routes. The capability flag
differs, so the dump proves on its face that one run screened through
`runBulkScreen` and the other did not.

### The four pre-registered conditions, measured

| # | Condition | Threshold | Measured | Verdict |
| --- | --- | --- | --- | --- |
| (a) | identical screened-candidate count | equal | loop **220**, bulk **220** | **PASS** |
| (b) | per-partition Spearman of screening deltas | >= 0.95 | **rho = 0.999229** (n=220) | **PASS** |
| (c) | top-N selection overlap | >= 90% | **88.89%** (8 of 9) | **FAIL** |
| (d) | shared top-N ordering within error bars | 0 outside | **0 of 8 outside** | **PASS** |

Computed by the offline scorer (`<scratchpad>/equiv.mjs`), which I re-verified
in both directions before trusting it: it passes a clean fixture and fails an
inverted one on (a), (b) and (d).

### Condition (c) — the miss, characterised but NOT rationalised

Per the plan's stop-and-escalate rule this is reported, not adapted around. The
numbers, so the decision can be made on evidence:

Ranks 1-8 are **identical in both runs, item for item and rank for rank**, with
deltas agreeing to two decimals (49.96, 33.92, 13.75, 10.21, 7.36, 6.66, 5.68,
5.07). The entire disagreement is at the tail:

- loop ranked **9** items, ending with `29995 Leggings of Murderous Intent`
  (dDps 3.57 +/- 1.09)
- bulk ranked **10**, ending with `32814 Veteran's Leather Bracers` (3.56 +/-
  1.08) and `32647 Shard-bound Bracers` (3.22 +/- 1.08)

All three disputed items sit at dDps ~2.4-3.6 with se ~1.08 — error bars three
times the size of the gaps between them. Each run measured every disputed item
**and agreed within combined 1-sigma**:

| item | loop | bulk | gap | combined band | |
| --- | --- | --- | --- | --- | --- |
| 29995 Leggings of Murderous Intent | rank 9, 3.572 | below cutoff, 2.419 | 1.154 | 2.180 | agree |
| 32814 Veteran's Leather Bracers | below cutoff, 3.113 | rank 9, 3.564 | 0.451 | 2.161 | agree |
| 32647 Shard-bound Bracers | below cutoff, 2.473 | rank 10, 3.219 | 0.746 | 2.154 | agree |

So no item is ranked differently *because the two routes disagree about its DPS*
— they agree on all three within noise. What differs is which side of the
**ranked/below-cutoff boundary** each landed on, and that boundary is being
decided by differences far smaller than the measurement error at that depth.

Stated several ways, because the metric is asymmetric and a single number would
flatter or damn it arbitrarily:

```
loopRanked=9 bulkRanked=10
as scored (first k=9 of loop vs bulk set):  8/9  = 88.89%   <- the registered metric
symmetric intersection / union:             8/11 = 72.73%
intersection / loop set:                    8/9  = 88.89%
intersection / bulk set:                    8/10 = 80.00%
```

**The registered metric reads 88.89% against a 90% threshold. That is a miss,
and I am not calling it a pass.** One item either way flips it: 9/9 would be
100%, and the threshold sits between "8 of 9" and "9 of 9", so at this ranked-set
size (9-10 items) the metric cannot even express 90% — the achievable values are
88.89% and 100%. That is a property of the registered condition meeting a much
smaller ranked set than it was written for, and it is the orchestrator's call
what to do about it, not mine.

What I can say on evidence, and no more: conditions (a), (b) and (d) pass
decisively; the top-8 are identical; and every disputed item agrees between the
routes within its own error bars. What I cannot say is that (c) met its
pre-registered threshold, because it did not.

**Cost, measured:** loop 2,699.5 s (45.0 min), bulk 4,333.1 s (72.2 min) for the
same 220-row ranking. The bulk route was **1.6x slower**, not faster, on this
machine at pool 4 — see the note below.
