# Handoff — tickets 398 then 397

Written 2026-09-15 by an evidence-gathering session. Nothing was fixed and no
file outside this one was changed. Every number below was read out of the named
file and field. Where a number could not be confirmed from a primary artifact,
it says so.

Execute **398 first** (accuracy), then **397** (speed).

## How to read this document

- "Verified" means I opened the JSON or the source file and read the field.
- "Not verifiable from a primary artifact" means the claim exists only in prose
  written by an earlier agent, and I could not confirm it.
- Numbers quoted from earlier prose that I **did** confirm are marked with the
  file and field they came from.

---

## 1. Current state

**Branch:** `feat/desktop-transport-gate`. Five commits ahead of `dev`:

```
3cfc0b62 Review the desktop-transport gate and fix a stale-readback pass
44e2aac6 Track the desktop-transport-gate evidence
8019aa9c Add a -Desktop dev-tab switch and the re-pin gate rule
c4c91c69 Add the desktop-transport gate
10cfed48 Re-pin the fork to the desktop-transport harness commit
```

**Working tree:** one modified file, `.scratch/stage-gate/desktop-transport-gate/decision-log.md`.
That edit was already present when this session started. I did not make it and I
did not revert it. **Do not try to make `git status --porcelain` empty** — a
reviewer once reverted four files of live work doing exactly that (ticket 261).

**Not merged to `dev`, and the reason is specific.** `pnpm merge-to-dev --check-only`
was run by the previous session and exited 1. The sole failing gate is
`fork-universes:check`. Everything else was green: 1290 tests, engine-port-drift,
equip-eligibility, fork-lint, sim-implemented-effects. The merge is a deliberate
owner decision, not an oversight.

**A correction you need before you trust the decision log on this.** The decision
log (D7) and `docs/reviews/feat-desktop-transport-gate.md` (S1) both say the
`fork-universes:check` failure is "ticket 211's domain". **Ticket 211 is
`Status: closed`** — verified at
`.scratch/carry-forward/issues/211-fork-bundled-ret-p3-universe-diverges-from-this-repos.md:1`.
Its own tail records the gate being fixed **green** on 2026-08-29 by one
`python scripts/sync_fork_universes.py --write` (fork commit `6fca0d8bd`). So the
drift recurred *after* 211 was closed. I grepped every issue file mentioning
CRLF, line endings, or fork-universes: the open ones are 167 (engine-drift gate
line-ending sensitivity), 172 (no gate compares committed universes against a
regen) and 283 (Python generators write CRLF on Windows) — **none of them owns
this failure**. The red `verify` currently has no open ticket. Treat "ticket 211
owns it" as a stale pointer.

The mechanism itself is confirmed: `scripts/sync_fork_universes.py:168` compares
`source.read_bytes() == copy.read_bytes()`, a strict byte compare, so LF sources
against CRLF fork copies fail deterministically even with identical content.

**Fork state.** `vendor/tbc-new-fork` HEAD is `eb040855cb5c1607ddef1a499fc77bb8668c7e76`,
clean. `data/wowsims-fork.lock.json` names the same commit with `pushed: false`.
The fork commit exists on this disk only.

**What is committed as evidence.** `.gitignore:59` ignores `.scratch/stage-gate/*`,
but this stage directory is tracked by exception. `git ls-files` confirms these
are committed: `brief.md`, `plan.md`, `plan-review.md`, `plan-review-2.md`,
`decision-log.md`, `desktop-gate.md`, `build-findings.md`, `regen-prediction.md`,
and five JSON readbacks (`readback-3333-tip`, `readback-wasm-tip`,
`readback-3333-old`, `smoke-3333-cap20`, `smoke-3333-cap20-fallback`,
`smoke-release-cap20`). The stage's own `.gitignore` excludes `*.log`, `*.log.err`,
`served-sim_worker.js` and `run-tab-cdp.tip.mjs` — so **the `.log` files I quote
below are untracked and will not survive a fresh clone.**

This handoff file is new and untracked. `.scratch/handoffs/` is a tracked
directory (131 files), so it will show as an untracked addition.

---

## 2. Ticket 398 — the Go-native vs WASM baseline gap

`.scratch/carry-forward/issues/398-go-native-vs-wasm-baseline-gap.md`

### The question

The packaged Go-native `wowsimtbc` binary and the `GOOS=js GOARCH=wasm` build
report different baseline DPS for what should be identical gear. Is that two
compilations of one Go source genuinely disagreeing, or is it a configuration
difference between the two runs that nobody checked?

### Verified evidence

All from `.scratch/stage-gate/desktop-transport-gate/`, read field-by-field.

| Field | `readback-3333-tip.json` (Go native) | `readback-wasm-tip.json` (WASM) |
| --- | --- | --- |
| `baselineDps` | **2231.5** | **2072.2** |
| `statusText` | `Your current gear: 2231.5 DPS.\nTook 3419s.` | `Your current gear: 2072.2 DPS.\nTook 1668s.` |
| `elapsedS` | 3419 | 1668 |
| `wallClockS` | 3423.3 | 1672.5 |
| `rowCount` | 601 | 601 |
| `aboveCutoff` | 33 | 36 |
| `eligibleCount` | 617 | 617 |
| `candidatesRequested` | 0 (uncapped) | 0 (uncapped) |
| `phaseSet` | `'5'` | `'5'` |
| `runner` | `BulkHttpSimRunner` | `WasmSimRunner` |
| `requests.bulkSimAsync` | 29 | 0 |
| `requests.raidSimAsync` | 50 | 0 |
| `requests.asyncProgress` | 46503 | 0 |
| `workerSessionsAttached` | 11 | 9 |
| `poolSize` / source | 20 / `navigator.hardwareConcurrency` | 20 / `navigator.hardwareConcurrency` |
| `servedWorker.wasmRefs` | 0 | 6 |
| `screeningFallbackWarnings` | 0 | 0 |
| `done` / `runTimedOut` / `runFailed` / `panicHit` | true / false / false / false | true / false / false / false |
| `origin` | `http://localhost:3333` | `http://127.0.0.1:60417` |
| `recordedAt` | 2026-09-15T01:23:19Z | 2026-09-15T01:52:27Z |

The gap is **2231.5 − 2072.2 = 159.3 DPS**, 7.7% of the WASM baseline. Both
figures confirmed from two independent fields each (`baselineDps` and the
`statusText` string the tab rendered).

**The ticket's premise survives the checks the task asked for.** Same phase
(`phaseSet` `'5'` on both), same candidate pool (`eligibleCount` 617 on both),
same cap (`candidatesRequested` 0 on both), same row count (601), both runs
completed cleanly with no fallback warnings and no panic.

**Gear looks identical, within what these files can prove.** The readbacks do
not record an equipment list. They do record a `sample` of the page's rendered
text, 700 characters on each. The two strings first diverge at character 110,
and the divergence is the WASM page's "Did you know? You can download our local
sim…" banner, which the embedded desktop build does not render. The **stat
block is byte-identical** across both samples over the full captured window:
Health 10857, Mana 5883, Strength 632, Agility 551, Stamina 766, Intellect 214,
Attack Power 3895, Melee Hit 66 (10.19%), Melee Crit 286 (51.65%), Melee Haste
108 (6.85%), Expertise 73 (4.50%), Spell Damage 20, Spell Hit 3.00%, Spell Crit
12.01%. Identical derived stats are strong evidence of identical worn gear, but
it is **inference, not a direct gear comparison** — the readbacks contain no
item-id list for the worn set.

### The one thing you cannot verify from the readbacks — read this carefully

**Neither readback records a seed or an iteration count.** I searched the full
serialised JSON of both files for `iterations`, `seed` and `randomSeed`: all
absent. So the ticket's claim that "both runs used `DEFAULT_SEEDS = [11,22,33,44,55]`"
is **not verifiable from the readback artifacts**. It is an inference from source
code, and the source does support it:

- `vendor/tbc-new-fork/ui/core/.../upgrades/engine/rank.ts:411` — `const DEFAULT_SEEDS = [11, 22, 33, 44, 55];`
- `rank.ts:410` — `const DEFAULT_ITERATIONS = 5000;`
- `rank.ts:566-577` — `iterations = input.iterations ?? DEFAULT_ITERATIONS`,
  `seeds = input.seeds ?? DEFAULT_SEEDS`, `seed = seeds[0]`, then
  `runOpts = { seed, iterations }`.

Both transports go through this same `rank.ts` code path, and the harness
(`run-tab-cdp.mjs`) has **no flag to set a seed or an iteration count** — its
entire argument list is `--origin`, `--page`, `--phase`, `--candidates`,
`--timeout-ms`, `--out`, `--force-fallback` (verified at lines 36–61). So
neither run could have overridden them.

That argument is sound but it is a **code-reading argument, not a measurement**.
Record it that way. The direct evidence that the two runs shared a seed does not
exist in the committed artifacts.

### What the baseline route actually is — this narrows 398 usefully

The baseline (current-gear) sim is **not** part of the screening path on either
transport. Verified in `rank.ts`:

- `rank.ts:707-721` — the baseline is one `deps.sim.run(request, runOpts)` call,
  producing `observation`, and `baselineDps = observation.dps`.
- `BulkHttpSimRunner` (`adapters/bulk_http_sim_runner.ts`) **extends**
  `WasmSimRunner` and overrides only `runBulkScreen`. Its own header says:
  "`run()` — the accurate final pass (paired-seed replication) and the set-bonus
  sims — is inherited unchanged from `WasmSimRunner`. Only screening batches."
- `adapters/wasm_sim_runner.ts:110-131` — `run()` builds a `raidSimAsync`
  request with `iterations: opts.iterations` and `randomSeed: String(opts.seed)`
  and dispatches it through the worker pool.

So on both transports the baseline is one `raidSimAsync` at the same iteration
count and the same seed, through the same TypeScript. The **only** difference is
what the worker does with it: under the packaged server the worker is
`net_worker.js` and posts HTTP to the Go binary
(`ui/worker/worker_http.ts:32` issues a `fetch`); on the WASM page the worker
runs the sim in-process against `lib.wasm` (`ui/worker/sim_worker.ts:123-141`
instantiates a `WebAssembly.Instance`).

**This also explains the `requests` asymmetry**, which otherwise looks alarming.
The WASM run shows `raidSimAsync: 0` not because no sims ran, but because WASM
sims never cross the network, so CDP's network observer counts nothing. The
`workerSessionsAttached: 9` on that run is what makes the zero a real
measurement rather than a blind observer.

**Consequence for 398:** the 159.3 DPS gap is on a route with no screening, no
bulk chunking and no transport-specific TypeScript. Whatever causes it lives
below the seam — in the two Go compilations, or in their inputs. That is a
genuinely narrow target.

### What is already ruled out, and by what

1. **Not a screening artifact.** The baseline route has no screening in it
   (source reading above). Independently, the same-transport gate run priced
   screened-vs-loop on the one Go binary and recorded `baselineDpsDiff 0.0`
   (`desktop-gate.md` § "Screen check", step 7 output block).
2. **Not desktop-engine instability.** `readback-3333-old.json` (pre-Chunk-1
   fork sha `5e9013b78`) has `baselineDps: 2229.7` against the tip's 2231.5 —
   a 1.8 DPS difference across a fork-sha change. Both verified from the
   `baselineDps` field. The Go-native figure is reproducible to ~2 DPS.
3. **The WASM figure is corroborated by an independent run.**
   `.scratch/stage-gate/upstream-catchup-chunk1/baseline-1.json` has
   `baselineDps: 2071.9`, `rowCount: 601`, `aboveCutoff: 36`, `phaseSet: '5'`,
   `elapsedS: 1896`. That is within 0.3 DPS of the gate's 2072.2, from a
   different session with a different driver. **Caveat, and read the chunk-1
   README before citing this file:** `baseline-1.json` is run 1 of 5 of a
   *withdrawn* approach and feeds nothing. The README warns against treating it
   as a baseline for anything. Using it purely as a *corroborating second
   observation of the WASM number* is legitimate — it is a real measurement —
   but do not import any of the withdrawn method around it.
4. **Not a phase, pool, cap or completion difference.** All verified equal in
   the table above.

### What is NOT ruled out

- A seed difference. Argued away from source, never measured (see above).
- An iteration-count difference. Same status.
- `GOAMD64` / float-path differences between the two builds. The native
  `wowsimcli` build path sets `GOAMD64=v2` explicitly
  (`scripts/fetch_wowsimcli.py:178`), and the fork makefile's Windows
  `wowsimcli` line also sets `GOAMD64=v2` (`makefile:180`). What the **WASM**
  build uses is a different toolchain entirely. Nobody has compared them.
- A genuinely divergent code path between the two builds.

### The per-row picture, computed directly from the JSON

I recomputed these from the `rows` arrays rather than trusting the gate's
printed summary. 33 parseable rows in the desktop readback, 36 in the WASM one,
32 shared `(item, slot)` keys.

- Per-row delta (desktop − WASM): min −19.10, max +8.80, **median −0.35**,
  mean −1.03, max |d| **19.10**.
- Largest movers: Apolyon, the Soul-Render / Main Hand −19.10 (28.9 vs 48.0);
  Leggings of the Immortal Night / Legs +8.80; Felfury Legplates / Legs +8.20;
  Lightbringer Bands / Wrist −6.90; Cloak of Unforgivable Sin / Back −6.60;
  Shard of Contempt / Trinket 1 −5.30.
- Above-cutoff sets: 33 shared, **zero** items unique to the desktop run, three
  unique to WASM (Abacus of Violent Odds, Harness of Carnal Instinct, Steely
  Naaru Sliver). These are cutoff-boundary items, consistent with the WASM run
  having a lower baseline and therefore admitting three more rows.

These reproduce the gate's reported `T2 max 19.1` and `T4 median −0.35` exactly,
so the gate's arithmetic is confirmed.

**Note the shape of this, because it bears on the hypothesis.** The per-row
deltas straddle zero with a median near zero, while the *baseline* differs by
159.3. A uniform engine offset would move the baseline and leave deltas alone,
which is roughly what is observed. But the single largest row delta is the
main-hand weapon (−19.10 on Apolyon, a two-handed weapon) — and ADR-0033
Consequence 5 documents a weapon-type-conditional talent change worth −80.35 DPS
on one-handers. Whether those two facts connect is unexamined. It is worth one
thought before you measure, not a conclusion.

### A parsing caveat you must know before re-reading these rows

`readback-3333-tip.json` and `readback-wasm-tip.json` were produced **before**
the D6 harness fix. Below-cutoff rows render inside a collapsed `<details>`, and
`innerText` on collapsed content reads empty, so those rows parsed with empty
item and slot. Verified by counting:

| File | rows | rows with empty `item` | `belowCutoff` rows |
| --- | --- | --- | --- |
| `readback-3333-tip.json` | 601 | **568** | 568 |
| `readback-wasm-tip.json` | 601 | **565** | 565 |
| `readback-3333-old.json` | 601 | **0** | 568 |

So in the two full runs, only 33 and 36 rows carry real item names — exactly the
above-cutoff counts. `readback-3333-old.json` was produced later with the fixed
harness and parses all 601. **Any row-level comparison between the two full runs
is limited to the ~32 above-cutoff rows.** The baseline, elapsed time,
`eligibleCount` and above-cutoff counts are unaffected, because they come from
the status text and the shortlist rather than the collapsed table.

### The proposed measurement — written before measuring

The ticket names it and the pattern already exists. Imitate
`.scratch/stage-gate/upstream-catchup-chunk1/engine-delta.md`: one fixed gear
set, one fixed seed, one DPS scalar, ~25 seconds of simulation. ADR-0033
Consequence 5 is the worked example with binaries, input and seed inline.

**Run the same committed skeleton through a native `wowsimcli` and through the
WASM build, at the same seed and iteration count, and compare one number.**

The committed input is `data/presets/ret/p2.raid-sim-skeleton.json` —
verified: `simOptions` = `{iterations: 25000, randomSeed: '443754031',
debugFirstIteration: true}`, 17 equipment entries. This is **P2 gear, not P5**.
There is no committed P5 or P4 ret skeleton — `data/presets/ret/` holds only
`p2.raid-sim-skeleton.json`, `p2.individual-sim-settings.json`,
`p2.ep-weights.json` and `p3.ep-weights.json`. The tab's P5 baseline is live
page state and is not committed anywhere. Using the P2 skeleton is the right
call anyway: it is deterministic, committed, and already the input both ADR-0033
and `engine-delta.md` used, which makes your result comparable to theirs.

**Pre-registered interpretation** (decide this now, not after seeing the number):

- **They agree within the 3σ band** (the band at 25000 iterations was 3.107 DPS
  in ADR-0033's baseline case — recompute it for your own run rather than
  reusing that constant). Then the two compilations are numerically equivalent
  on this input, the "two distinct engines" hypothesis is **refuted for this
  gear**, and the 159.3 DPS gap in the tab runs came from something in the tab's
  configuration — most likely a seed or iteration difference that the readbacks
  do not record. That would make the unrecorded-seed gap a real bug in the
  evidence trail, and the next move is to make the harness record seed and
  iterations so the question is answerable at all.
- **They diverge by roughly 159 DPS.** Then it is a genuine compilation-level
  engine difference, the ticket's hypothesis is confirmed, and the follow-up
  question is which side is correct — which matters, because the tab ships the
  WASM number to users while the desktop path is offered as the faster option.
- **They diverge by some third amount.** Do not round it toward either story.
  A divergence that is real but not 159 means something differs in both the
  compilation *and* the tab configuration, and you have two effects, not one.

A null result on P2 gear does **not** clear P5 gear. Say so in whatever you
write. `engine-delta.md` § "What this test cannot detect" is the model for
stating limits honestly.

### What you can actually run — binary inventory, verified by listing

Present under `vendor/`:

| Directory | Binary | Size | Notes |
| --- | --- | --- | --- |
| `wowsimcli-17a8fb28c5ad14b649acecdaacd488594048f467-win32-x64/` | `wowsimcli-windows.exe` | 22519296 | **The current pin.** `data/wowsims.lock.json` names tag and commit `17a8fb28…`. |
| `wowsimcli-ec5c5f205e61049d730e460967f8488774a7fe2a-win32-x64/` | `wowsimcli-windows.exe` | 22511616 | The previous pin. ADR-0033's "old" binary. |
| `wowsimcli-v0.0.119-win32-x64/` | `wowsimcli-windows.exe` | 22305280 | older release |
| `wowsimcli-v0.0.101-win32-x64/` | `wowsimcli-windows.exe` | 22222336 | older release |
| `wowsimcli-feature/backend-reforge-win32-x64/` | `wowsimcli-windows.exe` | 22340608 | pre-ADR-0030 layout |

`vendor/tbc-new-fork/wowsimtbc.exe` also exists (114377728 bytes, built
2026-09-14 21:03). Note this is **not** the binary whose sha `build-findings.md`
records (`f0582d53b3…`, 106442752 bytes) — the file has been rebuilt since, at
step 11 / the `-Desktop` run. If the exact binary identity matters to your
measurement, re-hash it rather than citing `build-findings.md`.

**There is no `wowsimcli` built at the fork commit** (`eb040855c`) or at
`2781486d6` — I checked for `vendor/wowsimcli-eb*` and `vendor/wowsimcli-2781*`
and neither exists. If you need a native CLI matching the fork's engine, you
must build it. The fork has the source (`vendor/tbc-new-fork/cmd/wowsimcli/`)
and the makefile has the recipe (`makefile:180`, Windows target). The toolchain
is present on this machine: **`go1.25.4 windows/amd64`** and **`libprotoc 35.1`**,
both verified by running them.

`scripts/fetch_wowsimcli.py` builds from source for a sha pin: it clones or
worktrees the commit, runs `protoc` to regenerate Go bindings, then
`go build -trimpath --tags=with_db` with `main.Version` set to the commit and
`GOAMD64=v2`. It needs `protoc-gen-go` from `google.golang.org/protobuf` (the
script rejects the deprecated `github.com/golang/protobuf` plugin explicitly).
**I did not verify `protoc-gen-go` is installed** — check before relying on that
path.

The simplest route is probably the pinned `17a8fb28…` binary already on disk,
since `data/wowsims.lock.json` names that commit and ADR-0033 used exactly it.
Whether the fork's engine at `eb040855c` differs from `17a8fb28…` in sim code is
a question I did not settle — the fork's harness commit touched tab and tools
files, but the fork also carries a merge of upstream. **Measure it before
assuming they are the same engine**, per the AGENTS.md rule that a property
measured against one option is not a comparison.

---

## 3. Ticket 397 — desktop bulk screening is 2.05× slower

`.scratch/carry-forward/issues/397-desktop-bulk-screen-not-a-speed-win.md`

### The question

Bulk HTTP screening was expected to make the desktop path faster. It made it
slower. Is the multi-stage convergence per chunk doing redundant work, or is
per-chunk convergence simply what the bulk API costs?

### Verified evidence

| Measure | Desktop (`readback-3333-tip.json`) | WASM (`readback-wasm-tip.json`) |
| --- | --- | --- |
| `elapsedS` | **3419** | **1668** |
| `wallClockS` | 3423.3 | 1672.5 |
| `requests.bulkSimAsync` | 29 | 0 |
| `requests.raidSimAsync` | 50 | 0 |
| `requests.asyncProgress` | **46503** | 0 |
| `requests.other` | 428 | 949 |

Ratio 3419 / 1668 = **2.050**. Both elapsed figures confirmed twice each, from
`elapsedS` and from the `statusText` string. The ticket's headline numbers are
accurate.

The untracked `run-3333-tip.log` and `run-wasm-tip.log` carry epoch stamps that
corroborate the wall clock independently: desktop `1789431976 → 1789435399`
= 3423 s; WASM `1789435474 → 1789437147` = 1673 s. Those match `wallClockS` to
the second. **These log files are gitignored** and will not survive a clone.

**A third data point the ticket does not mention.** `readback-3333-old.json`
(pre-Chunk-1 fork sha, same desktop transport) has `elapsedS: 3551` and the same
`bulkSimAsync: 29`. So the desktop path was ~3500 s before Chunk 1 as well —
the slowness is not something Chunk 1 introduced. That is useful: it removes
"a recent change made it slow" from the hypothesis space.

**Smoke runs, for scale** (all capped at 20 candidates, verified from the smoke
JSONs and their logs):

| Run | runner | `elapsedS` | bulk | raid |
| --- | --- | --- | --- | --- |
| Smoke A, desktop cap 20 | `BulkHttpSimRunner` | 264 | 2 | 46 |
| Smoke B, desktop cap 20 forced fallback | `WasmSimRunner` | **13** | 0 | 64 |
| Release binary, cap 20 | `BulkHttpSimRunner` | 173 | 2 | 46 |

Smoke B is the sharpest single number in this ticket and the previous session
did not draw it out: **the same binary, the same 20 candidates, screening forced
off — 13 seconds against 264.** That is a 20× difference on the same server,
not a cross-transport comparison at all. It isolates the screening path itself
as the expensive part, with the transport held constant. I have not checked
whether Smoke B's 13 s run did equivalent work (the `raidSimAsync` count rises
46 → 64, so the loop dispatched more requests and still finished far sooner),
and that check is the first thing 397 should do.

### What the source says about the cost

- `engine/bulk/partition.ts:69` — `MAX_CANDIDATES_PER_BULK_REQUEST = 25`. With
  617 candidates that is ~25 chunks; 29 bulk requests were observed, consistent.
- `adapters/bulk_request_builder.ts:107-118` — each bulk request sets
  `topResults` to the candidate count and `highStageIterations` to `req.iterations`.
- `assertSingleStageChunk` (`bulk_request_builder.ts:49-55`) calls upstream's own
  `shouldUseLegacyBulkSim` and **throws** if a chunk would take the multi-stage
  culling path. Its comment states that at 25 candidates the request is
  single-stage "at every iteration count".

**This contradicts the ticket's own stated mechanism.** Ticket 397 says "the Go
bulk path runs multi-stage convergence sims per 25-candidate chunk", and the
decision log (D2) says the same. But the code asserts the opposite — chunks are
held at 25 precisely so they stay **single-stage**, and a multi-stage chunk
raises `BulkScreenIntegrityError` rather than running. The gate recorded
`screeningFallbackWarnings: 0` and no integrity error, so no chunk went
multi-stage.

I did not read the Go server's `sim/core/bulk/stage.go` to see what it actually
does with a single-stage request, so I cannot say what the real cost driver is.
**But "multi-stage convergence per chunk" is an unverified explanation that the
client-side code appears to rule out.** Do not start from it. This is the
clearest instance in this handoff of a summary that degraded: a plausible
mechanism was written into a deviation note, then copied into a ticket, and
nothing measured it.

**A more promising lead, from the readbacks.** `requests.asyncProgress` is
**46503** on the desktop run against 6786 on the old-sha desktop run — both with
`bulkSimAsync: 29`. Same transport, same chunk count, nearly 7× the progress
polls. `bulk_http_sim_runner.ts` documents that `/asyncProgress` is a polling
loop and that the server evicts progress after 10 minutes. 46503 polls is a lot
of round trips. Whether polling overhead is a real cost or just chatter on an
idle socket is unmeasured, but it is a concrete, observable difference between
two runs of the same transport and it is cheap to investigate.

### Also worth knowing

`bulk_http_sim_runner.ts` documents that this runner deliberately uses a
**single-worker pool** (`new WorkerPool(1)`), on the reasoning that one HTTP
request carries the whole batch to a server that threads it over NumCPU
internally. The WASM path, by contrast, spreads per-candidate sims across the
browser's worker pool (`workerSessionsAttached` 9–11). So the comparison is one
serialised HTTP batch stream against a parallel in-browser loop. That is a
plausible throughput story and it is **not** the story either the ticket or the
decision log tells.

### Suggested measurement

397 is a performance question, so keep it cheap and capped — do **not** re-run a
3419 s full pool to learn something a cap-20 run shows in minutes.

1. Re-run the cap-20 pair on the current binary: screened
   (`check_desktop_tab.py --no-build`) against `--force-fallback`. Confirm the
   264 s vs 13 s result reproduces, and check whether the two runs produce the
   same rows — if the fast one does less work, the 20× is not a fair comparison.
2. If it reproduces, the cost is in the screening path on one transport, and
   the cross-transport 2.05× is a downstream consequence rather than the finding.
   Reframe the ticket accordingly.
3. Only then look at the Go side (`sim/core/bulk/stage.go`) for what a
   single-stage bulk request actually costs per candidate, and at the
   `asyncProgress` poll volume.

Pre-register what each outcome means before running, the way the gate plan did
for Q2 — `desktop-gate.md` § Q2 shows the format, including the useful detail
that all three of its written candidates were wrong, which is how it was caught
as a finding rather than rationalised.

---

## 4. Traps and environment notes

**Shell.** `cd X && git …` breaks with an fnm error. Use `git -C <abs path>`.
Bare `pnpm` fails; use `fnm exec --using=22 -- pnpm.cmd <cmd>` as its own
command. Confirmed live this session: a `cat` of a lock file emitted
`error: We can't find the necessary environment variables to replace the Node
version` on stderr before the real output.

**Exit codes through pipes.** A pipe reports the last command's status. Append
`; echo "rc=${PIPESTATUS[0]}"` in the **same** call — a later tool call is a new
shell and has lost it. The previous session hit exactly this: Gate C's first
gate re-run "passed" while the gate had actually exited 1 inside a pipe.

**Recursive greps.** Scope them to a named directory. There are ~15 worktree
copies under `.scratch/` and an unscoped recursive grep times out.

**Node.** Tool shells default to Node 20. The harness is Node 22+ only (global
`WebSocket` and `fetch`, no npm deps). `fnm exec --using=22 -- node --version`
gave `v22.17.1` for the previous session.

**`make` from PowerShell.** The fork makefile shells out to `uname` and
`realpath`, which live in Git's `usr\bin`. That is on the Bash tool's PATH but
not PowerShell's, so `make wowsimtbc` succeeds from Bash and fails from
PowerShell with `CreateProcess(NULL, uname -s, ...) failed`. `dev-tab.ps1
-Desktop` now prepends Git's `usr\bin` itself (D8).

**`make release` fails on this machine.** `zip` is not on PATH. All seven
`go build` lines succeed first, so the binaries are produced and only the
archiving step fails. Not a blocker for either ticket.

**Before editing anything in the fork,** read `docs/agents/known-traps.md` — the
project rules require it before a ported-engine-file edit, a generated-file
edit, moving the wowsims pin, filing a ticket, or starting the dev servers.

**Do not run the two full pool runs again casually.** They cost 3419 s and
1668 s. Both tickets can be advanced with capped runs or with a ~25 s CLI sim.

**Readback fields that do not exist.** No seed, no iteration count, no worn-gear
item list. If your work depends on any of those, you must either add them to the
harness or derive them from source. Consider proposing the harness record them —
this handoff exists partly because they are missing.

### Claims from earlier prose that you should distrust

1. **"Ticket 211 owns the red `verify`."** 211 is closed and its tail records
   the gate going green. No open ticket owns the current `fork-universes:check`
   failure. (§1)
2. **"The Go bulk path runs multi-stage convergence sims per chunk."** The
   client asserts chunks are single-stage and throws if they are not. Unverified
   and apparently contradicted. (§3)
3. **"Both runs used `DEFAULT_SEEDS`."** True of the code path, not recorded in
   either artifact. Never measured. (§2)
4. **The `wowsimtbc.exe` sha in `build-findings.md`** is from the step-1 build;
   the file on disk now is a different size. Re-hash if it matters. (§2)
5. **The `T1 FAIL` in the cross-transport comparison** is substantially a
   parser artifact — 568 of 601 rows had empty keys before the D6 fix. The
   decision log says this; it is easy to miss, and it means the cross-transport
   T1 result carries almost no information. (§2)
6. **`baseline-1.json`** is run 1 of 5 of a withdrawn approach. Read
   `.scratch/stage-gate/upstream-catchup-chunk1/README.md` before citing it for
   anything beyond "a second observation of the WASM baseline". (§2)

### Files worth reading first

- `.scratch/stage-gate/upstream-catchup-chunk1/engine-delta.md` — the pattern
  398 should copy. Note especially its "What this test cannot detect" section.
- `docs/adr/0033-upstream-is-master-again.md` lines 111–158 — Consequence 5, the
  worked measurement with binaries, input, seed and numbers inline.
- `.scratch/stage-gate/desktop-transport-gate/desktop-gate.md` § Q2 — the
  pre-registered-candidates format.
- `scripts/check_desktop_tab.py` — the gate. `compare_readbacks` at line 253,
  thresholds `K_DPS = 12.0` and `T4_MEDIAN_DPS = 3.4` at lines 86–88,
  `EXPECTED_ELIGIBLE` / `FULL_ROWS` at lines 74–82. `--compare A B` runs T1–T4
  on two existing readbacks with no server and no Node, which is the cheapest
  way to re-derive any row comparison in this document.
