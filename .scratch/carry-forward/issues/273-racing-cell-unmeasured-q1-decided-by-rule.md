Status: open
Type: coverage gap (a planned measurement was never taken)
Origin: stage-gate finish-the-tab, Step 9 cell 3, 2026-08-23
Blocks: none
Blocked by: none

# The racing-vs-full-sweep cell was never measured

Step 9 of the finish-the-tab plan called for six timed runs. Four were taken.
The two that would have measured **candidate (a), M2 racing** — ret and feral on
the pre-removal build — were not, because that build would not load gear.

Q1 was therefore decided by the plan's pre-stated rule rather than by numbers:
candidate (a) wins only if its elapsed is `<= 0.8 x` candidate (c)'s on both
specs and its shortlist superset-covers (c)'s on both. An unmeasured candidate
cannot satisfy that, so **(c) full sweep wins by default**. That is the state
the code is already in (racing deleted in fork commit `f70378155`, porting
ADR-0026), so nothing was reverted and nothing is broken. This ticket records
that the fork-side comparison behind the decision is missing.

## What justifies the deletion today

ADR-0026's own core-side measurements: racing took 1.407, 1.476 and 1.098 times
the full sweep's wall-clock on ret-p2, feral-p2 and feral-p3, never clearing the
20 % saving it needed, and missing the bar even under an oracle promotion rule.
Those are core measurements, not fork ones.

The fork-side prediction (plan claim C14: racing ~8 % faster, still under the
20 % bar) remains **untested on this fork**.

## The archive

`C:/Users/dgree/AppData/Local/Temp/finish-the-tab-builds/racing/`

Built from fork commit `a2ddf2a` — the elapsed-status commit, before
`fullPool: true` and before racing was deleted. Confirmed to be the right build:
the served bundle carries `Screening ` strings, and the tab has no prune or
BIS-filter control (both were added later). It is a temp directory and will not
survive indefinitely; rebuild rather than trust it.

## The symptom that blocked the cell

The ret share link applied and **persisted** — 16 non-empty item ids in
`__tbc_new_retribution_paladin__currentSettings__`, hash intact at 1485 chars —
but the character never received them: `Strength 0` after ~45 s with the window
visible.

This looks like the stale-wasm fault that blocked the earlier cells, but it is
**not** that: the two files the wasm/glue pairing depends on are byte-identical
between the two archives.

```
                sim_worker.js                       lib.wasm
full    effb816a61b8be3faaa5634f2104cabb   393bee733c304016472af3589a57225f
racing  effb816a61b8be3faaa5634f2104cabb   393bee733c304016472af3589a57225f
```

What differs is the rest of the `racing` bundle, built on 2026-08-22 from
`a2ddf2a`. **Why that build does not apply a share link when `full` does is not
diagnosed.** No run was started rather than time a 0-stat character.

## What a future run would decide

Whether the fork's racing implementation beats its full sweep by the 20 % that
ADR-0026 requires — i.e. whether C14's prediction holds on this fork as it did
on core. It cannot reopen the deletion on its own: that is settled by ADR-0026
and by the E-W3 parity the removal passed. A measurement here would either
confirm the fork matched core's result, or reveal that the fork's variant behaved
differently, which would be worth knowing before anyone ports a screening pass
back.

## What would close this

Rebuild the racing archive from `a2ddf2a` with the corrected recipe below, get
gear onto the character by whatever route works on that build, and run the two
cells against the figures already recorded for candidate (c):

```
ret prune-off   1017 s   (an earlier run of the same cell gave 866 s)
feral prune-off  395 s
```

Judge with the pre-stated rule. Record in `docs/verification-log.md` alongside
the finish-the-tab entry.

### Corrected build recipe

Supersedes plan claim C21, which omitted the wasm step and the working
directory. From `.scratch/stage-gate/finish-the-tab/measurements.md`:

```
eval "$(fnm env --shell bash)"; fnm use 22.17.1
export PATH="<fork>/node_modules/.bin:/c/Program Files/Go/bin:/c/Users/dgree/go/bin:$PATH"
cd <fork>                       # required: vite.config.mts:128 resolves
                                # i18nextLoader paths against the process cwd
protoc -I=./proto --ts_opt generate_dependencies --ts_out ui/core/proto proto/api.proto
protoc -I=./proto --ts_out ui/core/proto proto/test.proto
protoc -I=./proto --ts_out ui/core/proto proto/ui.proto
protoc -I=./proto --go_opt=Mgoogle/protobuf/descriptor.proto=google.golang.org/protobuf/types/descriptorpb \
       --go_out=./sim/core ./proto/*.proto
GOOS=js GOARCH=wasm go build -o ./dist/tbc/lib.wasm ./sim/wasm/    # NOT optional
npx tsx vite.build-workers.mts
npx vite build
```

**Rebuild the wasm even when no Go file changed** (this run's C22 refutation):
rebuilding `sim_worker.js` with a newer Go `wasm_exec.js` obsoletes a wasm built
by an older toolchain, and the failure is silent — `instantiateStreaming(...)`
has no `.catch`, so the workers never post `ready`, `waitForInit()` never
resolves, and the page renders with no gear and no presets. Verify the engine
with `Worker[0] Ready, isWasm: true` in the console before trusting any run.
A fresh worktree also needs the gitignored generated inputs seeded
(`ui/**/index.html`, `ui/core/proto/`, `dist/tbc/*.wasm`,
`upgrades/adapters/local.wcl-credentials.ts`) — see ticket 272 for the related
lockfile defect.
