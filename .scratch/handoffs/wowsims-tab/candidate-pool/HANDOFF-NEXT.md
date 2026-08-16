# Candidate pool — handoff to the next agent

Written 2026-08-15 by the execution orchestrator. Every fact below was checked
with the command shown, not recalled. Re-run anything you intend to rely on.

## 0. Start here

**If you read nothing else:** the branch is done, green, and gated on a single
decision — *should M2 (racing) ship enabled on the browser path for a ~15% win,
or should per-slot top-_j_ land first and make it ~65%?* §4 has the evidence and
my recommendation. Everything else is context for that call.

## 0.1 The one-paragraph version

`feat/candidate-pool` implements ticket 199. M0 (docs match the engine) and M1
(candidate cap, bounded concurrency, EP ordering, Stop, row-landed progress)
shipped. M2 (racing) was **cancelled on a CLI measurement, then resumed on a
WASM one**, and now ships in both engine copies — but it is worth only ~15% on
WASM and is correctly disabled on the CLI, where it *loses* 24%. Two three-axis
reviews ran; all blockers are fixed. `pnpm verify` is green and
`pnpm merge-ready` is ok. **Nothing has been merged to `dev` and the fork has
not been pushed — both need an explicit ask from the user.**

## 1. Where things stand, verified

```
git rev-parse HEAD                     -> 8867f5c5108377a88c7ddd6e0c49d7ce608d97d8
git branch --show-current              -> feat/candidate-pool
git status --porcelain                 -> (empty)
git -C vendor/tbc-new-fork rev-parse HEAD    -> 138fa77f59a0b708833fce5a4c587201502f9596
git -C vendor/tbc-new-fork branch --show-current -> feat/upgrades-tab
git -C vendor/tbc-new-fork status --porcelain    -> (empty)
```

- `data/wowsims-fork.lock.json` → `commit: 138fa77f5…`, **`pushed: false`**.
- 61 commits ahead of `dev`; 11 fork commits since the lockfile's old pin.
- `pnpm verify` → **exit 0**. `pnpm merge-ready` → **ok** (36 Disposition rows
  parse: 16 `R*` from round one, 20 `F*` from the fix round).

**Capture verify's exit code directly** (`pnpm verify; echo $?`). A
backgrounded run in this session reported `[exited with code 0]` while its own
log ended in `ELIFECYCLE … exit code 1`. Do not trust a wrapper's status.

## 2. Read these, in this order

| # | File | Why |
| - | ---- | --- |
| 1 | `docs/plans/wowsims-tab/candidate-pool.md` | The spec. §3.3 (CLI **and** WASM cost tables), §3.4 (plan author's judgment), §3.4.1 (my M2-resume decision), §6 (M2), §6.4 (the missed ratio), §8.1 (the carried disagreement) |
| 2 | `.scratch/handoffs/wowsims-tab/candidate-pool/REPORT.md` | §1–7 are round one; **§8 is the fix round and supersedes the headline**. §8.5 has the open disagreements verbatim |
| 3 | `docs/reviews/feat-candidate-pool.md` | Both reviews. `R1`–`R16` round one, `F1`–`F20` fix round, with the machine-parsed Disposition table at the end |
| 4 | `experiments/m2-net-win-arithmetic.md` | Whether racing actually pays. Read before touching M2 defaults |
| 5 | `.scratch/handoffs/wowsims-tab/candidate-pool/PROCESS.md` | Round-by-round execution state, worker bases, traps hit |

Per-slice handoffs are in sibling directories (`A-docs/`, `B-measure/`,
`Bprime-m1-5/`, `C-m1-core/`, `D-fork-port/`, `E-m2-racing/`, `F-m2-port/`,
`203-wasm-sweep/`).

## 3. The numbers that matter

| quantity | CLI (native process) | WASM (Node-hosted) |
| --- | --- | --- |
| `t_fixed` | 373.2 ms | 748.4 ms |
| `t_iter` | 0.0637 ms/iter | 3.2446 ms/iter |
| screening floor `t_fixed/cost(5000)` | **0.609** | **0.0441** |
| racing at shipped defaults | **1.24× slower** | **~15% faster** |
| break-even promoted ratio | 0.368 | 0.765 |

Shipped defaults: `screenIterations = 1000`, `promoteTopK = 150`, measured
promoted ratio **0.7042** against §6.4's ≤0.4 target — **the target is not
met**, and it is unreachable at any K that passes the recall gate (K=120, the
measured zero-miss floor, still lands ~0.58).

**Why the two runtimes disagree:** a native process pays 373 ms of spawn
against 0.064 ms/iteration, so a cheap screen saves nothing. A resident WASM
module pays no spawn and 51× more per iteration, so screening finally buys
something. **This is the single most load-bearing fact on the branch** — the
first round cancelled M2 by measuring the wrong runtime.

## 4. What is still open, and what I would do next

### The substantive decision (needs the user or plan author)

**Should M2 ship enabled on the browser path at ~15%?** My recommendation, in
REPORT §8.5: **take per-slot top-_j_ first.** Three independent measurements
now point at it, and it is quantified at roughly the difference between 6% and
65% on WASM:

1. **M1.5** — above-cutoff misses cluster by slot (on ret, all six
   worst-ranked upgrades are cloaks; on feral, belts and necks).
2. **§6.4** — a global K cannot reach the ratio target at any recall-passing
   value.
3. **`m2-net-win-arithmetic.md`** — the savings live at small promoted counts,
   which is exactly what a per-slot rule buys.

Carmack costed it: `bestDeltaBySlot` is **already computed** inside
`promotionRule` (`packages/core/src/promotion.ts`), so per-slot top-_j_ is a
sort per bucket — microseconds. At _j_=5 over 17 slots the ratio lands ~0.354,
under the target *and* under the CLI break-even — the only configuration where
racing pays on **both** runtimes.

Caveat to carry: _j_ has only ever been fit on the same two fixtures it was
judged against, and none of this is measured in a real browser. This is
§8.1's carried Dean-vs-Fowler/Beck disagreement; it is **not settled**, it just
has a price now.

### Open tickets from this work

| ticket | what |
| --- | --- |
| `199` | The originating ticket — still open; this branch closes it on merge |
| `201` | `memoryCapFromDeviceMemory` is a constant wearing a calculation. Now has its measured input: **402.7 MB** WASM linear memory, vs the stale 183.8 MB the fork still hardcodes |
| `202` | A `PartialRanking` carries no disclosure in its own data; the skipped-replication note lives only in a fork i18n string |
| `205` | Racing reuses nothing from the screen: the winning slot is re-derived by a second full sim (~13% of WASM wall-clock), `stdev` is dropped and rows ship `se: 0`. Also holds the unbounded `--concurrency` and the weak `fullPool` byte-for-byte assertion |
| `206` | ~240 screening sims — roughly 13 minutes on WASM — emit **no progress events at all**; `Progress` has no screening variant. Also `belowCutoffCount` counts screened rows |
| `207` | `t_fixed` is published to four figures but is an extrapolated intercept (RMSE 64% of it). **The go verdict is robust**; the number is not precise. Also: the WASM harness docstring promises a boot-vs-call split that does not exist |
| `156` | Still needs a human with a **real foregrounded browser tab**. Every number on this branch is Node-hosted. Its recipe was rewritten around the new Candidates cap |

### If the user asks to merge

`pnpm merge-to-dev` is the only supported door. It re-runs verify, checks the
review file's Disposition table, and does `git merge --no-ff` into `dev`.
**Never** `git merge` into `dev` by hand, never set `TBC_ALLOW_DEV_MERGE=1`.
The user must ask **after** seeing the review — a combined "review and merge"
request is not enough per `AGENTS.md`.

Pushing the fork is a **separate** ask again; `pushed: false` is deliberate and
records that nothing has left the machine.

## 5. Traps this session actually hit — do not re-learn these

- **Claude Code worktrees base at `origin/main` (`55b5a51`), not your current
  branch.** Every worker hit it. Always paste the base SHA into the prompt and
  make the worker assert it, then check `git worktree list` after spawning.
- **Address every repo by path, not by `cd`.** Bash cwd persists across calls:
  a stray `cd` into a worker's worktree made a `git merge` check out the slice
  branch there instead of merging. `git -C <path>` every time — especially for
  `vendor/tbc-new-fork`, a **nested, gitignored git repo with its own
  history**.
- **Write temp files to real Windows paths, and read `iterationsDone` back
  from every sim result.** Windows-native `node` cannot resolve Git Bash
  `/tmp/...`; an early timing run reported ~210 ms per point because the
  request file was never written and the binary failed instantly. The
  read-back is what proves work happened.
- **Concurrent instrumentation corrupts timing.** A 50 ms RSS poller inflated
  wall-clock 2–40×. Measure memory in a pass separate from timing.
- **Bash heredocs break on apostrophes.** Long markdown blocks with `'` in
  prose kill `<<'EOF'`. Write a file and append it with Python instead.
- **PROVENANCE ordering is mandatory**: port → re-run E-W3
  (`npx vitest run packages/core/test/wowsims-fork-parity.test.ts`, from *this*
  repo — the fork ships no TS runner) → confirm green → **then** update hashes.
  A hash moves only after parity is green on the content it describes.
- **The fork previously had `core.autocrlf=true`**, which wrote CRLF while git
  stored LF, so the byte-hash drift gate could never match. It is now `false`
  and the tree is renormalized. If a file reports "drifted" but looks
  identical, check `tr -d '\r' < file | sha256sum` before concluding anything —
  and do not paper over a real change as "just line endings".
- **Moving the fork tip invalidates two committed artifacts.** After any fork
  commit: bump `data/wowsims-fork.lock.json`, then
  `python scripts/generate_sim_implemented_effects.py`. Check the id sets are
  unchanged (215 implemented / 460 stub-only) — if they move, universes need
  reassembling too.
- **A `defer` disposition cannot point at a closed ticket.** `merge-ready`
  caught this when ticket 200 closed. Ticket 85 is a known related limitation:
  the parser reads only the first Disposition table, so **append rows to the
  existing table** rather than adding a second one.

## 6. Model and process rules that governed this work

- Lanes per `docs/agents/model-policy.md`: **workhorse = Sonnet** (all
  implementation workers), **review = Opus at effort `medium`**, **design =
  Fable** (plan author only). Name the model on every spawn — an unnamed
  subagent inherits the parent's, which on this harness is the top price tier.
- Fan-out via the `parallel-phase` skill: one worktree per slice, verify path
  disjointness by listing files before spawning, merge onto the **feature
  branch**, tear worktrees down **before** the integrated `pnpm verify`
  (`.claude/worktrees/` is inside the repo and vitest picks it up otherwise).
- **Do not background workers and end the turn** — that abandons fan-in. Hold
  ownership or write the next spawn into `PROCESS.md` first.
- Durable-claims rule (`AGENTS.md`): a causal claim in a committed artifact
  either points at a re-runnable command or says **hypothesis**/**untested** in
  the same sentence. This branch is heavy with measurements; keep that bar.
- Workers hit real errors in their own briefs three times and were right each
  time (slice F on `makeRaidSimRequest`, ticket 204 on the preset source, slice
  E on my §3.4.1 defaults). **Expect briefs to be wrong and verify claims
  before implementing them.**

## 7. Known-wrong things I said, corrected here

So the next agent does not inherit them:

1. **"The central bet lost"** (REPORT §1–7 headline) over-read a CLI-scoped
   result. §8 supersedes it; the header now carries a superseded note.
2. **§3.4.1's proposed defaults** (`screenIterations 300` / `promoteTopK 35`)
   were structurally impossible — derived from a fixture with 16 above-cutoff
   rows, applied to a gating fixture with 42 at contiguous ranks 1–42.
3. **§3.4.1 said M2 resumes "on the browser path"** without checking the code
   could distinguish runtimes. It could not — `fullPool` is one global switch —
   which is how the CLI ended up racing by default and 24% slower.
4. **My first net-win sum used 240 screens; the real count is 277** (paired
   slots screen twice), so it understated racing's cost.
5. **Round one claimed the ranking cache "structurally cannot" accept a
   partial.** `Store.put<T>` is generic; only a runtime `if` prevents it. Fixed
   in the code comments of both copies.
