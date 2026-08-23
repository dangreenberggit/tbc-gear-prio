# Measurements — finish-the-tab

Executor record, written as each step ran. Every figure below is either a
pasted command output or is labelled `hypothesis, untested`.

## Step 0 — preconditions (2026-08-22)

```
$ pnpm engine-port-drift:check
engine port drift check ok: 33 ported files match PROVENANCE.md

$ git rev-parse HEAD                       # this repo, feat/finish-the-tab
b64256e2696e7c53d50d1df8751011416958ee8a

$ git -C vendor/tbc-new-fork rev-parse HEAD
f359239572c38af9acb24c1ee178088bfe44692c   # branch feat/upgrades-tab

$ git status --porcelain                   # both repos
(empty)

$ git -C vendor/tbc-new-fork diff --name-only cbf6b75..HEAD -- '*.go' | wc -l
0

$ ls -la vendor/tbc-new-fork/dist/tbc/lib.wasm
20293865 bytes, Aug 14 13:13

$ git -C vendor/tbc-new-fork check-ignore dist
dist
```

Acceptance met: drift check ok on 33 files, both trees clean, fork tip `f359239`.

## Fork toolchain repair (Step 1b preflight) — deviation D1

The fork's build and type-check could not run as the plan assumed. Three
separate faults, each measured, each fixed without editing a tracked fork file
(`git -C <fork> status --porcelain` empty throughout):

**1. `node_modules` was incomplete.** Six declared dependencies were absent:

```
$ python -c "<compare package.json deps against node_modules>"
declared: 47   missing: 6
['idb', '@types/async', 'oxfmt', 'oxlint', 'sass-embedded', 'vite-plugin-watch-and-run']
```

`vite-plugin-watch-and-run` is imported by `vite.config.mts`, so **every** vite
command failed with `ERR_MODULE_NOT_FOUND`. Fixed with
`npm ci --prefix <fork> --no-audit --no-fund` -> `added 365 packages`, then
re-checked: `declared 47 missing 0`.

Consequence for the earlier readings in this file: the `oxlint`/`oxfmt` runs
before the repair used **npx-fetched** binaries, not the pinned local ones.

**2. TypeScript 7's platform binary is missing from the fork's lockfile.**
After a clean `npm ci`, `tsc` crashed:

```
Error: Unable to resolve @typescript/typescript-win32-x64.
```

`typescript@7.0.2` ships its compiler as 20 platform-specific optional
dependencies; `grep` over `package-lock.json` finds **none** of them:

```
$ python -c "<list lockfile packages matching typescript>"
node_modules/@protobuf-ts/plugin-framework/node_modules/typescript 3.9.10
node_modules/@protobuf-ts/plugin/node_modules/typescript 3.9.10
node_modules/typescript 7.0.2
```

So `npm run type-check` cannot work from a clean `npm ci` of this lockfile on
**any** platform, not just this machine. Worked around locally with
`npm install --prefix <fork> --no-save @typescript/typescript-win32-x64@7.0.2`
(`--no-save`: manifest and lockfile untouched). **This is a real fork defect and
is not fixed by this run** — see the ledger; it needs a lockfile regeneration
that is outside this plan's Paths manifest.

**3. The generated proto TypeScript was stale.** With a working `tsc`, 108
errors, every one of them a missing proto export (`StatCapType`,
`BulkSimRequest`, `ProgressMetrics.finalReforgeResult`, ...) across 28 files.
Zero were in any `upgrades` file. `ui/core/proto/api.ts` is gitignored
(generated). Regenerated with the makefile's own recipe (`makefile:76-78`):

```
$ npx protoc --ts_opt generate_dependencies --ts_out <fork>/ui/core/proto       --proto_path <fork>/proto <fork>/proto/api.proto
$ npx protoc --ts_out ... test.proto
$ npx protoc --ts_out ... ui.proto
$ node <fork>/node_modules/typescript/bin/tsc --noEmit -p <fork>/tsconfig.json | wc -l
0
```

**The fork type-checks with zero errors** once the toolchain is repaired. The
plan's "type-check green" gate is therefore used as written from here on.

## Fork check gate — as actually run

Per fork commit: `tsc --noEmit` **0 errors**; `npm run lint:css` exit 0;
`npm run test:locales` exit 0; `oxlint` findings on touched files unchanged from
their baseline set; `git diff --stat` confined to the Paths manifest.

`npm run format` is **not** run: it is a *writer* (`lint:fix && fmt:fix`), not a
check, and the committed tree is not oxfmt-clean — on `upgrades_tab.tsx` alone
it reflowed 1891 lines, and tree-wide it rewrites 138 files, all outside the
Paths manifest. `oxfmt --check` on the untouched tip already reports
`Format issues found in above 138 files`, so "format green" was never true of
this tree. Edits are written in the surrounding file's existing style instead.
Ledger row D2.

## Step 1 — elapsed wall-clock in the done/stopped status

Fork commit `a2ddf2a` "Show the run's wall-clock when a ranking finishes".

```
$ node <fork>/node_modules/typescript/bin/tsc --noEmit -p <fork>/tsconfig.json | wc -l
0
$ npm --prefix <fork> run lint:css     -> exit 0
$ npm --prefix <fork> run test:locales -> exit 0
$ npx oxlint <fork>/ui/core/components/individual_sim_ui/upgrades_tab.tsx
2 warnings: import(no-duplicates) 15:35, simple-import-sort 1:1
  -- both present on the untouched tip, neither introduced here
$ git -C <fork> diff --stat
 assets/locales/en/translation.json                |  1 +
 .../individual_sim_ui/upgrades_tab.tsx            | 31 +++++++++++++++-
```

Acceptance: `grep -n 'status.elapsed' <tab>` -> line 520. In `translation.json`
the key is nested (`upgrades_tab.status.elapsed`), so the plan's flat grep does
not match it; resolved through the parser instead, which is the stronger check:

```
$ python -c "json.load(...)['upgrades_tab']['status']['elapsed']"
'Took {{seconds}} s.'
```

## Steps 2-5 — fork controls

Each commit: `tsc` 0 errors, `lint:css` exit 0, `test:locales` exit 0, oxlint on
touched files unchanged from baseline (2 warnings on `upgrades_tab.tsx`:
`import(no-duplicates)` 15:35 and `simple-import-sort` 1:1, both pre-existing).

| Step | Fork commit | Acceptance |
| --- | --- | --- |
| 2 full sweep | `41e2260` | `grep -n fullPool <tab>` -> one hit, line 410, inside `run()` |
| 3 set-bonus toggle | `44c7369` | `grep -n withSetPotential <tab>` -> one hit, read from the checkbox; `rankUpgrades(` call sites -> 1 (C15 holds) |
| 4 post-sim BIS filter | `1095e8a` | `applyView(` call sites -> 1; `tieGroupId`/`groups` appear only in an explanatory comment, no render site (C33 holds) |
| 5 pre-sim prune | `e5d8741` | G4: `pool: this.effectivePool` -> 1 hit, and no `poolFor(` inside `run()`; the two `poolFor(` sites are the visibility check and `effectivePool` itself |

C17 re-measured this run:

```
$ python -c "<count entries carrying bisTags, per universe file>"
feral-p2 17   feral-p3 17   ret-p2 16   ret-p3 16   ret-p4 16   ret-p5 16
```

**G2 disagreement, recorded not resolved.** The round-2 reviewer reported the
tagged count as phase-scoped and falling to 9 (ret-p3+) and 5 (feral-p3). Every
universe file is already phase-scoped by `assemble_universe.py`, so measuring
within each file shows no such drop:

```
$ python -c "<tagged, and tagged whose entry phase <= the file's phase>"
ret-p2:   tagged=16  tagged&phase<=2: 16
feral-p2: tagged=17  tagged&phase<=2: 17
ret-p3:   tagged=16  tagged&phase<=3: 16
feral-p3: tagged=17  tagged&phase<=3: 17
```

The two measurements are of different things — the reviewer appears to have
filtered a higher-phase universe down to `maxPhase 2`. The budget cell is
maxPhase 2 either way, where both agree on 16/17, so nothing in this run turns
on it. Flagged for whoever writes STATUS; not resolved here.

## Step 6 — racing removal (nested plan)

Nested plan at `.scratch/stage-gate/finish-the-tab/nested/racing-removal/plan.md`,
written by a focused planner before any engine edit. It caught three real
mismatches with the parent sub-brief. The most consequential, confirmed here:

```
$ git log -1 --format="%h %s" -- docs/adr/0026-*.md        # the parent plan's command
ae32a92 Renumber tickets 232/233 to 236/237; allocate via NEXT

$ git log --format="%h %s" -S screenCandidate -- packages/core/src/rank.ts | head -1
28b00f9 Remove racing; full-sweep every eligible candidate   # the actual removal

$ git log --diff-filter=A --format="%h %s" -- docs/adr/0026-*.md
66dab19 Answer ticket 225 and record the removal in ADR-0026
```

The parent plan's lookup would have named a ticket-renumbering commit as the
ported source. PROVENANCE names `28b00f9`, with `66dab19` as the ADR commit.

The other two mismatches: `disclosure.ts` and `types.ts` mention no screening
(only `content-hash.ts` does), and `rank.ts` carried five racing touchpoints the
sub-brief did not list — the `screeningSkips` sort and its `substitutions`
spread, `ranked.push(...screenedRows)`, the rank-loop early return, and the M2
paragraph in the file doc comment. All were removed.

Commits, in the order the plan requires so no repo commit is ever red:

| # | Repo | Commit | Gate |
| --- | --- | --- | --- |
| 1 | this repo | `eaaae45` | `pnpm verify` exit 0 against the still-racing fork |
| 2 | fork | `8db275d7d` | tsc 0 errors; E-W3 green |
| 3 | fork | `0993f944b` | drift check `ok: 32 ported files` |
| 4 | this repo | `a381482` | `pnpm verify` exit 0 |

E-W3 against the de-raced engine:

```
$ pnpm vitest run packages/core/test/wowsims-fork-parity.test.ts
 PASS  wowsims-fork-parity (E-W3) > the ported fork engine reproduces this
       repo's ranked deltas   3538ms
 Tests  1 passed | 1 skipped (2)
```

The skip is the `describe.skipIf` placeholder that fires only when the clone is
absent; the E-W3 describe ran. **This measures C38 and C14**, which the plan
filed as `hypothesis, untested`: at that commit the parity harness still passed
`extraInput: { fullPool: true }`, and the post-removal engine ignored the
unknown field at runtime. Commit 4 then removed the extra input entirely.

Removal gates, all met:

```
rank.ts  screenCandidate|promotionRule|stage:"screening"|.screened  -> 0
view.ts  same pattern                                               -> 0
rank.ts  screen|racing|promot|fullPool -> only the frozen-literal block
         (comment + fullPool: true, screenIterations: null, promoteTopK: null).
         No promoteTopJ anywhere: parent claim C37 honoured.
ls <E>/promotion.ts                                    -> No such file
<tab>    screened|screening|fullPool                   -> 0
<fork>/assets/locales/en/translation.json  screen      -> 0
python scripts/check_engine_port_drift.py -> ok: 32 ported files (was 33)
```

### Go tests: one pre-existing failure, not caused by this work

`make` is not installed on this machine, so `make -C <fork> test` returns 127.
**Its exit 0 came from the shell pipeline, not from any test running** — the
failure mode AGENTS.md names. Ran the target's own command instead
(`makefile:290-291`):

```
$ GOARCH=amd64 go -C <fork> test --tags=with_db ./sim/...
21 packages ok, including:
  ok  sim/core                    46.2s
  ok  sim/paladin/retribution     85.9s
  ok  sim/druid/feralcat         131.9s
FAIL sim/web [setup failed]
  sim\web\main.go:21:2: no required module provides package
  github.com/wowsims/tbc/binary_dist
```

`sim/web` needs the generated `binary_dist/dist.go`, a prerequisite of the
makefile's `test` target that does not exist in this clone. Not caused by this
work:

```
$ git -C <fork> diff --name-only f359239..HEAD | grep -E "[.]go$|[.]proto$" | wc -l
0
```

This run changed no Go and no proto source. Both specs the tab supports pass.

### Second toolchain repair: the Go protos were stale too

The first `go test` run failed to build **every** package, with errors like
`undefined: proto.APLValueTimeToNextEnergyTick` and `SimItem has no field
Unique` — the same stale-generated-proto fault as the TypeScript side, this time
in `sim/core/proto/*.pb.go` (gitignored, generated). Regenerated with the
makefile's own recipe (`makefile:223-225`):

```
$ protoc -I=<fork>/proto \
    --go_opt=Mgoogle/protobuf/descriptor.proto=google.golang.org/protobuf/types/descriptorpb \
    --go_out=<fork>/sim/core <fork>/proto/*.proto
$ GOARCH=amd64 go -C <fork> build ./sim/core/...   -> exit 0
$ git -C <fork> status --porcelain                 -> empty
```

## Step 7 — lockfile and gates

```
$ git -C vendor/tbc-new-fork rev-parse HEAD
0993f944b3d2c1d57773799cdb6d30f9aa810d6d
```

`data/wowsims-fork.lock.json` `commit` set to that value; `pushed: false` and
`branchedFrom` left untouched (verified by reading the file back).

Bumping the lockfile made `pnpm verify` **fail**, which the plan did not
anticipate:

```
data\sim-implemented-effects.json is stale against the fork's Go tree
(fields differ: [forkCommit]).
```

That artifact records which fork commit its Go scan ran against. Regenerated;
only the recorded commit moved:

```
$ python scripts/generate_sim_implemented_effects.py
wrote data\sim-implemented-effects.json -- 217 implemented, 451 stub-only
(fork commit 0993f944b3d2c1d57773799cdb6d30f9aa810d6d)

$ python -c "<compare the before/after JSON key by key>"
CHANGED forkCommit  f359239... -> 0993f94...
identical: generatedBy, forkRepo, _comment, implementedEffectItemIdsCount,
           implementedEffectItemIds, stubOnlyItemIds
```

The id lists are byte-identical, which is what a run that changed no Go file
must produce. The gate's message also suggests re-running
`assemble_universe.py`; the universes consume those id lists, which did not
move, and `pnpm verify` passes without it.

```
$ pnpm verify                                -> exit 0
$ python scripts/check_engine_port_drift.py  -> ok: 32 ported files
$ test "$(git -C vendor/tbc-new-fork rev-parse HEAD)" = "<lockfile commit>"
lockfile-matches
```

## Step 8 — the two archived builds

Both live outside either repo, at
`C:/Users/dgree/AppData/Local/Temp/finish-the-tab-builds/`.

### Third toolchain repair: two more missing native binaries

The bundle build needed two further win32 packages absent from the fork's
Linux-only lockfile, found one at a time because each failure hides the next:
`@rolldown/binding-win32-x64-msvc` (build could not start) and
`lightningcss-win32-x64-msvc` (`Cannot find module
'../lightningcss.win32-x64-msvc.node'` during CSS minification).

Six win32 native packages in total had to be installed for this machine to
type-check, lint, format-check and build the fork at all:

```
npm install --prefix <fork> --no-save --no-audit --no-fund \
  @typescript/typescript-win32-x64@7.0.2 \
  @rolldown/binding-win32-x64-msvc@1.2.3 \
  @oxlint/binding-win32-x64-msvc@1.77.0 \
  @oxfmt/binding-win32-x64-msvc@0.62.0 \
  sass-embedded-win32-x64@1.100.0 \
  lightningcss-win32-x64-msvc@1.33.0
```

They must be installed in **one** command: `--no-save` installs do not compose,
and a second one prunes the first (observed — the typescript binary vanished
when rolldown's was added separately). `git -C <fork> status --porcelain` is
empty after, so the manifest and lockfile are untouched.

### The build recipe needs the fork as cwd

The plan's `npx vite build` with the root passed as an argument **fails**:

```
Error: Directory does not exist: C:\Users\dgree\Code\lulz\tbc-gear-prio\assets\locales
```

`vite.config.mts:128` passes `i18nextLoader({ paths: ['assets/locales'] })`, a
relative path resolved against the process cwd rather than the config's
`__dirname`. The build must run with the fork as its working directory.

C23's "never `cd` into the fork" is narrower than it reads: `cd` fails only
when `fnm env` has not been evaluated. After
`eval "$(fnm env --shell bash)"; fnm use 22.17.1`, `cd <fork>` works and keeps
Node 22.17.1 (checked directly: `node --version` prints v22.17.1 on both sides
of the `cd`). Note `fnm env` alone is not enough — it auto-switches on `cd`,
which this harness's non-interactive shells do not trigger, so `fnm use` is the
part that pins the version.

### `full` — the shipped tip

Built from fork tip `0993f944b3d2c1d57773799cdb6d30f9aa810d6d`, archived at
`C:/Users/dgree/AppData/Local/Temp/finish-the-tab-builds/full/`.

```
$ grep -l upgrades-bis-prune-toggle    <full>/tbc/bundle/*.js  -> 1 file
$ grep -l upgrades-set-potential-toggle <full>/tbc/bundle/*.js -> 1 file
$ ls -la <full>/tbc/lib.wasm      -> 20293865 bytes, Aug 14 13:13 (reused, C22)
$ ls <full>/tbc/druid <full>/tbc/paladin  -> feralcat/ , retribution/
```

`feralcat/`, not `feral/` — round-1 finding F7's correction confirmed against a
real build directory. Feral's page is `/tbc/druid/feralcat/`.

### `racing` — candidate (a) for the Q1 comparison

Built from fork commit `a2ddf2a` (Step 1's tip: the elapsed-status commit,
before `fullPool: true` and before racing was deleted), archived at
`C:/Users/dgree/AppData/Local/Temp/finish-the-tab-builds/racing/`.

Built in a **detached worktree**, so the branch never moved:

```
$ git -C <fork> worktree add --detach <tmp>/racing-src a2ddf2a
$ grep -c 'input.fullPool !== true' <tmp>/racing-src/.../engine/rank.ts   -> 1
$ git -C <fork> rev-parse --abbrev-ref HEAD                              -> feat/upgrades-tab
$ git -C <fork> rev-parse --short HEAD                                   -> 0993f944b
```

A fresh worktree cannot build without four gitignored generated inputs, all
copied in from the main clone (none is a source edit):
`node_modules/` (306 entries, verified equal), `ui/core/proto/` (generated TS
protos), `dist/tbc/*.wasm` (`highs.wasm` and `lib.wasm` — the worker build
opens `highs.wasm` and fails ENOENT without it), the two generated per-spec
`ui/**/index.html` files (without them vite's
`glob.sync(ui/**/index.html)` finds one entry and emits no spec pages), and
`upgrades/adapters/local.wcl-credentials.ts` (an `UNRESOLVED_IMPORT` otherwise).

Identity of the archived racing build, each grep distinguishing it from `full`:

```
elapsed status  "Took "                    -> 2 files  (Step 1 is in)
screening       "Screening "               -> 2 files  (racing IS present)
prune toggle    upgrades-bis-prune-toggle  -> 0 files  (not yet built)
set-potential   upgrades-set-potential-toggle -> 0 files (not yet built)
pages           druid/feralcat, paladin/retribution
```

The worktree was removed after archiving (`git worktree remove --force`);
`git -C <fork> worktree list` shows only the main clone.

## Step 8 stop-and-report state

```
$ git -C <repo> status --porcelain
?? .scratch/stage-gate/finish-the-tab/measurements.md
?? .scratch/stage-gate/finish-the-tab/nested/
   (both are Step 11 artifacts, deliberately uncommitted at this stop)

$ git -C <fork> status --porcelain     -> empty
$ git -C <fork> rev-parse HEAD         -> 0993f944b3d2c1d57773799cdb6d30f9aa810d6d
```

Step 9 is not attempted: it needs a foregrounded Brave tab the owner fronts
(C29), and nothing was timed from the Claude Code Browser pane.

## Gate C rework — the reformat of `upgrades_tab.tsx`

### Cause: my own Python rewrite, not a formatter

No editor, oxfmt or prettier ran. `upgrades_tab.tsx` was **CRLF**; Steps 1-3
edited it with a tool that preserves line endings, and Step 4 rewrote the whole
file through Python, emitting **LF**. Every one of its 1,007 lines therefore
registered as changed.

Isolated to exactly one commit and one file:

```
$ for c in ...; do git show --stat $c -- upgrades_tab.tsx; done
a2ddf2a42     30 +/1 -         (plain and -w agree)
41e226019     10 +/10 -        (plain and -w agree)
44c73690b     49 +/1 -         (plain and -w agree)
1095e8a1a   1067 +/1007 -   but -w:  62 +/2 -      <-- the reformat
e5d874192     59 +/2 -         (plain and -w agree)
8db275d7d     13 +/49 -        (plain and -w agree)

$ line endings of the tab, per commit
f359239 CRLF | a2ddf2a CRLF | 41e2260 CRLF | 44c7369 CRLF
1095e8a LF   | e5d8741 LF   | 8db275d LF
```

Every other file this run touched was already LF at the base and is unaffected.

**The file was the anomaly, not the change.** All 113 tracked `.tsx` files at
HEAD are LF; at the base, `upgrades_tab.tsx` was the only CRLF one. The clone
sets `core.autocrlf=false` with no `.gitattributes`, so nothing was converting
it — it had picked up CRLF in an earlier session. That is why the fix keeps the
conversion rather than reverting it, but gives it its own commit.

### Fix: history rewritten (option a)

Branch reset to `44c73690b`, a normalisation-only commit inserted, then the four
later commits replayed with their original messages. The branch is unpushed, so
no published history moved.

New fork history:

```
e79916172 Record the racing removal in PROVENANCE.md
f70378155 Remove racing; full-sweep every eligible candidate
70a38b51e Let a run sim only the items on a BIS list
9f327af9a Filter a finished ranking down to BIS-list items      <- 62 +/2 -
caf36cf68 Normalise upgrades_tab.tsx to LF line endings         <- 1007 +/1007 -, -w empty
44c73690b Let the user rank with set-bonus potential included
41e226019 Full-sweep every eligible candidate on the tab path
a2ddf2a42 Show the run's wall-clock when a ranking finishes
```

**The rewrite changed no content.** Tree hashes are identical:

```
$ git diff --stat rework-backup HEAD     -> no output
backup tree: 692dce3a92d2ca6d9ae936c97e309a03152d28dc
new    tree: 692dce3a92d2ca6d9ae936c97e309a03152d28dc
```

Net diff on the tab, base to tip: `1088 +/930 -` plain, **`216 +/58 -` with
`-w`** — the figure Gate C named.

Checks re-run on the new tip `e79916172`: tsc **0 errors**; `lint:css` and
`test:locales` exit 0; oxlint 4 warnings, all baseline import rules; drift
`ok: 32 ported files`; every verify-recipe grep unchanged (toggles 3,
`applyView(` 1, `rankUpgrades(` 1, `screened` 0, rank.ts and view.ts racing 0,
frozen literal 1, `promotion.ts` absent). `pnpm verify` exit 0.

`full/` archive rebuilt from `e79916172` (prune and set-potential toggles
present, screening strings absent, `lib.wasm` reused). **`racing/` untouched** —
still the 20:28 copy built from `a2ddf2a`.

Repo commit `ff23b75` re-pins the lockfile to `e79916172`, regenerates
`sim-implemented-effects.json` (217 implemented / 451 stub-only, unchanged, as a
content-preserving rewrite requires), and files ticket 272.

## Step 9 — STOPPED before the first timed run

No timed cell was run and no number was recorded, because two preconditions the
plan makes load-bearing were not met. Both were measured, not assumed.

Server started and the page loaded fine:

```
$ npx http-server <builds>/full -p 8123 -c-1      # serving, version 14.1.1
navigate -> http://localhost:8123/tbc/paladin/retribution/
title: "The Burning Crusade Retribution Paladin simulator"
Upgrades tab present in the nav strip
hardwareConcurrency: 20      deviceMemory: 32
```

### Blocker 1 — the tab is not fronted (C29)

```
$ document.visibilityState   -> "hidden"
$ document.hasFocus()        -> false
$ document.hidden            -> true
```

Checked twice, several minutes apart, so this is the steady state and not a
load-time transient. C29 is explicit that a foregrounded, compositing tab is the
only valid surface and that a background tab throttles. Every elapsed figure
from this state would be wrong in the unsafe direction — slower than reality,
against a budget the run is meant to judge.

### Blocker 2 — the character has no gear

```
$ equipped item icons -> 0
```

The screenshot confirms it: every slot from Head to Trinket 2 is empty and the
whole Stats panel reads 0, including `Melee Crit Cap: Under by 65.30%`.
`rankUpgrades` ranks candidates against the gear on the Gear tab, so a run from
here is not the "page defaults" default run Step 9 specifies, and its shortlist
and `Simming n/N` total would not be comparable to ticket 156's figures or
between cells.

### What is needed to resume

1. The owner fronts the Brave tab and leaves it fronted (`visibilityState`
   must read `visible` at the moment the run starts).
2. A gear set is loaded on the Gear tab for each spec — ticket 156's protocol
   and `prep-notes.md` name the set those numbers came from; the same one keeps
   this run comparable.

Both archives are built and ready; the only missing input is the surface.
Nothing was timed from the Claude Code Browser pane.

## Step 9 setup — second attempt (after the Gate C ruling)

### Fronting: tried from this seat, still hidden

Selecting the tab and clicking into the page was not enough:

```
tabs_context           -> selectedTabId: 700896563   (already the selected tab)
document.visibilityState -> "hidden"
computer left_click into the page
document.hasFocus()      -> true     <- the click did land and focus the document
document.visibilityState -> "hidden" <- but the window is still not composited
```

`hasFocus: true` with `visibilityState: "hidden"` says the tab is the selected
tab of a Brave window that is minimised or fully occluded. Nothing reachable
from this seat changes that; only a human clicking the window can. Polled at
8:57:05, 8:57:41, 8:59:33 and 9:00:13 PM, all `hidden`.

A `visibilitychange` watcher was armed at 8:59:43 PM (`window.__visWatch`) so a
flip is caught between polls rather than only at one:

```js
window.__visWatch  ->  { everVisible, firstVisibleAt, armedAt }
```

### The served build was re-verified, not assumed

The http-server from the first attempt survived `TaskStop` (a restart failed
with `EADDRINUSE 0.0.0.0:8123`), and the tab had been loaded **before** the
`full/` archive was rebuilt at the new tip. Rather than trust it, the chunk that
actually carries the tab was fetched from the live server and checked:

```
$ f=$(grep -l upgrades-bis-prune-toggle <builds>/full/tbc/bundle/*.js)
  -> preset_utils-TxzoUkfT.chunk.js
$ curl -s http://localhost:8123/tbc/bundle/preset_utils-TxzoUkfT.chunk.js
  http=200
  grep -c upgrades-bis-prune-toggle -> 1     (rebuilt full build)
  grep -c "Screening "             -> 0     (racing gone)
```

So the origin is serving the post-rework `full` build from tip `e79916172`.
The page in the tab still needs a reload to pick it up before any timed run.

### Gear presets to load (ticket 156 cites none)

`prep-notes.md` and `protocol.md` name no gear set — grep for
`gear|preset|equip|import|localStorage` returns only a note that
`Candidates=N` means "N by EP **plus every equipped item**", which is why its
3,000-iteration runs landed 34 rows rather than 20. So the coordinator's
fallback applies: use each spec's P2 preset.

Preset labels read from the fork's own sources, not guessed:

```
ret   ui/paladin/retribution/presets.ts:28
      makePresetGear('P2', P2_Gear, { phase: Phase.Phase2 })        -> "P2"
feral ui/druid/feralcat/presets.ts:31,33
      makePresetGear('BiS 6%', P2_6P_Gear, { phase: Phase.Phase2 }) -> "BiS 6%"
      makePresetGear('BiS 9%', P2_9P_Gear, { phase: Phase.Phase2 }) -> "BiS 9%"
```

Feral's phase-2 BIS splits into 6% and 9% hit variants. **BiS 9%** is the one to
use (the raid-buffed hit configuration); record the choice per cell.

The preset UI is present in the DOM (`preset-configuration-picker-root
saved-data-manager-root`, with `saved-data-presets` currently carrying `hide`),
so it is reachable once the tab is fronted.

### Fronting: the 10-minute window closed, never visible

The watcher armed at 8:59:43 PM ran past 9:09:51 PM. `everVisible` stayed
`false` and `firstVisibleAt` stayed `null` for the whole window, so the tab was
never composited even momentarily between polls:

```
8:57:05 PM  hidden          9:01:31 PM  hidden
8:57:41 PM  hidden          9:02:22 PM  hidden
8:59:33 PM  hidden          9:02:53 PM  hidden
9:00:13 PM  hidden          9:09:51 PM  hidden   <- window closed
9:01:03 PM  hidden
                            everVisible: false, firstVisibleAt: null throughout
```

**It is the Brave window, not the tab.** A brand-new tab created through
`tabs_create_mcp` and navigated to the same page also reported
`visibilityState: "hidden"` immediately on load (9:01:57 PM), which rules out
tab selection as the cause — the window is minimised or fully occluded. That
spare tab was closed again; tab 700896563 is the only one left in the group.

Everything else for Step 9 is staged and verified: the origin serves the
post-rework `full` build, both archives are intact and distinguishable
(`racing` still the 20:28 copy with screening present and no prune toggle), and
the preset names are read from source. The single missing input remains a
human-composited window.

No cell was started and no elapsed figure was recorded.

## Step 9 — third attempt, 2026-08-23: tab visible, page live

```
$ document.visibilityState -> "visible"
$ document.hasFocus()      -> true
$ navigator.hardwareConcurrency -> 20
```

Server still live and serving the post-rework build (re-verified by fetching the
tab-carrying chunk):

```
$ curl http://localhost:8123/tbc/bundle/preset_utils-TxzoUkfT.chunk.js
  upgrades-bis-prune-toggle -> 1     "Screening " -> 0
$ curl .../tbc/assets/database/db.json  -> 200, 3,117,456 bytes
$ curl .../tbc/lib.wasm                 -> 200, 20,293,865 bytes
```

Server log confirms the engine and database load on every page open
(`GET /tbc/lib.wasm` x5 — one per worker — and `GET /tbc/assets/database/db.json`).

### The Upgrades tab is live and the controls are wired (first real evidence)

```js
document.querySelector('.upgrades-shopping-list')
-> { found: true,
     hasRunBtn: true,
     status: "Ranks upgrades against your current gear and settings on this page.",
     candPlaceholder: "all 240 eligible",
     pruneHidden: "upgrades-bis-prune-label d-flex ..."   // NO d-none -> visible
   }
```

**Step 5's pre-sim prune measured live**, toggling the checkbox and reading the
Candidates placeholder back:

```
prune off -> "all 240 eligible"
prune on  -> "all 16 eligible"      <- 16 = the ret-p2 tagged count from C17
prune off -> "all 240 eligible"
```

The eligible count follows the control, and the pruned figure equals the
phase-scoped tagged count measured independently from
`ret-p2.universe.json` (16). The prune control is visible for ret, so C17's
"hidden polarity unreachable with shipped data" holds on a real page.

Both view toggles are correctly **hidden** at this point
(`setPotentialVisible: false`, `bisOnlyVisible: false`) because no ranking has
completed yet — the hide-when-absent rule (PLAN.md §4) behaving as designed.

### Gear: the page loads with an empty character

`equipped item icons -> 0`, every stat 0. The gear-preset chips are not present
in the DOM (`.saved-data-set-chip` -> none) and the Settings tab pane renders
empty, so the preset picker could not be driven from this seat. The sim UI object
is not exposed on `window` either (`Object.keys(window)` matching
`sim|ui|player|preset` -> only `uidEvent`), so gear cannot be applied by script.

### Gear presets are not in this build's output — Step 9 blocked again

The preset pickers exist in the DOM but their content containers are **empty**,
in all four instances:

```html
<div class="preset-group-picker"><div class="preset-group-picker-container">
  <div class="preset-group-phase-tabs"></div>     <!-- empty -->
  <div class="preset-group-sections"></div>       <!-- empty -->
</div></div>
```

`document.querySelectorAll('.saved-data-set-chip').length -> 0`, so there is no
preset to click, and the sim UI object is not on `window`, so none can be
applied by script either. The Settings tab pane also renders empty.

This is not a driving mistake — the preset data is absent from the built
bundle:

```
$ ls <full>/tbc/bundle/ui/paladin/retribution/
index.html-Dz_5DU6F.entry.js       (13,037 bytes)
$ grep -c '"id":'   <that file>   -> 0        # no gear item data
$ grep -c gear_sets <that file>   -> 0
$ grep -rl "makePresetGear\|P2_Gear" <full>/tbc/bundle -> (no matches)
```

And the page is not failing to fetch anything — every request it makes succeeds.
Distinct paths requested on a fresh load:

```
/tbc/paladin/retribution/            /tbc/bundle/localization-*.chunk.js
/tbc/bundle/ui/paladin/retribution/index.html-*.entry.js
/tbc/bundle/preset_utils-*.chunk.js  /tbc/assets/database/db.json   (200, 3.1 MB)
/tbc/lib.wasm (x5, one per worker)   /tbc/sim_worker.js
/version                             assets, fonts, item-slot images
```

No 404, and no request for a preset chunk that never arrives. The console's only
message is `No version info found!`, matching the `GET /version` above.

**Consequence for Step 9.** A run is possible — the Run button is live and the
engine loads — but it would rank against an **empty character**: 0 equipped
items, every stat 0. Ticket 156's figures came from a geared character (its
`Candidates=20` runs landed 34 rows precisely because the cap adds "every
equipped item"). An empty-gear run is not the plan's default run, is not
comparable to 156, and its baseline DPS is meaningless, so it cannot judge the
600 s budget or decide Q1.

No timed cell was run.

## Correction: the archives were never missing presets — my grep was wrong

The earlier finding "preset data is absent from the built bundle" was **a false
negative from my own grep**, and the rebuild the ruling asked for is not needed.

`vite.config.mts:96` sets `minify: 'oxc'` for non-development builds. The oxc
minifier renames every top-level binding, so source identifiers like
`makePresetGear` and `P2_Gear` do not survive into the output. Grepping a
minified production bundle for them fails whether or not the data is there.
**Numeric data literals do survive**, so the correct probe is a raw item id
taken from the gear-set JSON:

```
$ python -c "<read ui/paladin/retribution/gear_sets/p2.gear.json>"
items: 16   first ids: [32461, 30022, 30055, 30098, 30129, 28795]

$ grep -rl 32461 <full>/tbc/bundle --include=*.js
  preset_utils-TxzoUkfT.chunk.js
  ui/paladin/retribution/index.html-Dz_5DU6F.entry.js      <- the page's own entry

$ for id in 32461 30022 30055; do grep -rl $id <archive>/tbc/bundle; done
  full   -> 2 files each
  racing -> 2 files each
```

Both archives carry the ret P2 preset. Neither needs rebuilding.

The 13 KB size of the per-spec entry chunk is also normal, not evidence of a
stripped build: `vite.config.mts:169-172` splits shared code into
`preset_utils-*.chunk.js` (2.0 MB) and `localization-*.chunk.js` (1.2 MB) across
all 17 spec entries, so a small per-spec entry that imports from them is the
designed output shape.

### The build procedure, checked against the makefile

`make dist/tbc/.dirstamp` (`makefile:30-35`, wrapped by `host` at :315) runs, in
dependency order: `go run ./tools/database/gen_db -gen=go-to-ts` (:228-229) for
the auto-gen TS; the `ui/%/index.html` pattern rule (:80-81) that generates each
spec page from `ui/index_template.html`; `npx protoc ... --ts_out ui/core/proto`
(:75-78); the wasm build; the asset copy; then `tsc --noEmit`,
`npx tsx vite.build-workers.mts`, `npx vite build` (:47-50).

The plan's C21 recipe runs only the last two, relying on the generated inputs
already being on disk. In this clone they are (`ui/paladin/retribution/index.html`
and `ui/druid/feralcat/index.html` exist, are gitignored via `.gitignore:6`
`ui/*/*/index.html`, and match `ui/index_template.html` with `@@CLASS@@`/
`@@SPEC@@` substituted — diffed by hand, they carry the same
`<script src="./index.ts" type="module">` entry). That is why the two-command
recipe produced a bundle that does contain the presets.

**Corrected recipe for the verification log** — prefer the makefile target,
which cannot silently skip a generation step:

```
make -C <fork> dist/tbc/.dirstamp      # needs `make` on PATH; absent on this box
```

Fallback used here, valid only when the generated inputs already exist (they do
in this clone; a fresh worktree needs them seeded, as the racing build did):

```
eval "$(fnm env --shell bash)"; fnm use 22.17.1
cd <fork> && npx tsx vite.build-workers.mts && npx vite build
```

`cd` is required: `vite.config.mts:128` resolves `i18nextLoader({paths:
['assets/locales']})` against the process cwd. Verify a build with a gear-set
item id, never with a source identifier.

### So why is the preset picker empty on the page?

Not the build. On the live page `#gear-tab` renders (9,395 chars of HTML) but
its `.preset-group-sections` has 0 children and `.saved-data-set-chip` count is
0, after waiting.

An earlier reading of mine in this file — "the Settings tab pane renders empty"
— was also wrong: `.gear-tab` and `.settings-tab` are the nav **buttons**, not
the panes. The panes are `#gear-tab` / `#settings-tab`.

While re-testing, the Brave window returned to the background
(`visibilityState: "hidden"`, `hasFocus: false`) and one long
`Runtime.evaluate` timed out with "the renderer may be frozen or unresponsive",
which is what a throttled background tab looks like. Whether the empty picker is
a real page defect or an artifact of the tab being throttled during init is
**not yet established** — it needs one more look with the window genuinely
fronted.

### The picker is built but populated with nothing — reproduced on a second surface

Re-tested on an independent surface (the Claude Code browser pane, diagnosis
only — nothing timed there). Byte-identical readings to Brave:

```
gearPane innerHTML length : 9395     (same on both)
preset-group-sections > * : 0        (same on both)
preset-group-phase-tabs > *: 0       (same on both)
saved-data-set-chip       : 0        (same on both)
equipped item icons       : 0        (same on both)
```

The Gear tab is **fully rendered**, so this is not a failed init:

```
hasGearPicker  : true
itemPickers    : 34
classes present: gear-picker-root, gear-picker-left/right, item-picker-root,
                 item-picker-icon, item-picker-sockets-container,
                 preset-group-picker, preset-group-phase-tabs,
                 preset-group-sections
```

So the preset picker element **is constructed** and its two content containers
exist — they are simply filled with zero entries, while the sibling gear picker
next to them renders all 34 item slots. Combined with the bundle evidence above
(the ret P2 item ids are in the very entry chunk this page loads), the data
ships and the widget builds; the step that turns the one into the other does
not run.

Caveat stated plainly: both surfaces reported `visibilityState: "hidden"`, and
during the Brave attempt one long evaluate timed out with "the renderer may be
frozen or unresponsive". Identical numbers from two independent browsers make a
real page behaviour much more likely than throttling, but the two conditions
were not separated, so this is **not** proven to be independent of visibility.

## Share-link gear load (Gate C ruling) — encoded fine, page will not apply it

### The links were generated from committed data, no fork source touched

Script kept in the scratchpad (`make-share-links.mts`); it was run from inside
the repo only because module resolution needs it, then deleted —
`git status --porcelain` is clean of it.

Two deviations from the ruling's wording, both forced:

1. **The named ret input does not exist.** `packages/core/test/fixtures/
   slamaltman.raid-sim-request.json` is absent; the fixture lives at the repo
   root: `test/fixtures/slamaltman.raid-sim-request.json` (17 equipped items,
   player `slamaltman`). Used that.
2. **The feral export will not decode against this repo's pinned proto.**
   `fromJson` throws
   `cannot decode message proto.APLValue from JSON: key "timeToNextEnergyTick" is unknown`
   — the committed export carries 17 instances of an APL field newer than the
   pin. Only gear/buffs/encounter matter for a ranking run and the page supplies
   its own rotation, so the script deletes `player.rotation` before decoding.
   Recorded rather than worked around silently.

```
$ pnpm exec tsx <script>
RET_ITEMS=17
FERAL_ITEMS=17
RET_URL=http://localhost:8123/tbc/paladin/retribution/#eJztVW9oG2UYz/Pmcnn7pOmfd9lyu23t9aYjxGXmzyJdoCRdO5iKtnMWFUS8Nde1I21CLoVOEdqxD23BuslQWnADcX4YBbugdTQoMnUqWOiHddZ1SFYY6toPc4OqGQO5S7IuCnPDDUX23PFy9/6e3/PnfX/3HlZQqCICSMRFvKQe2BqJPM8dAjgF5DMgc0CyQA4REN90UEsVEY8DVtLpGyBknDI/egOWM4AcPXMZsJz+eBmEE07ZPJ8BtNL+LAhXCDJ6chGESw65bD4DOePGSno9C8J3DplfzkDe+/rPIIxbsJwuZkHm5zMwck2fPrkEwhdOtNKBRRAuOpCjs1k94dUr+nj0oj5+dUn3HPkBhF8caEKOXjgHchudTEPVmTS4hufAu7ynfmgJIrATOiEBadh0oGt6BMbTMJGGj9IwmYaP03A6DV/Owye/wocD5I0hMvg6mYKK78dhec/BNLw/CbOT4J7gcIaYHtg9NTYH/3YJ98sEe2iWQ9PfXeyBru6D/a91tZ1S49CuhyngRIKmKVIb9HiDAb/X5/EG/QGvN+jze72BgM8fDAR83qDva8LNEHKemBbIexTXIBV55GjuHZARKfIeX/2WoIYbsGoB7GhrTaqJ3lhst6rE5DK0osXj0+F1WL0AFVhegJ/oje5VZR45JF4NnWhfAETaWiQWAPaQKGONez3lGQmZREeOr8bKZjWm7JeeUvbFk1JTsxYysYDow4fZRrSlgSJP3z4GLkCHm1GOWU4TQoloRQuat2zVRB0/8ju4gDnF1UWCMWE09fkRwh4Tt6KbuUpANA+DqRjyqpVQKISs1wzeB0eBhcWGEs4CeNC2oy/ekmyK92hqO6vBVc8qyb1qqlntjve0JNt6oqoSZdYczyF5Os5i4j58ib2ItvP8Sht22YZl70IhCbrcmyjHbGPWmx7i6jRhFNjNFvMtG8Xy+WKL/Qfz/Rs0gchhbHhVjuqraSxmU7Mmh3y+zXKisIPxVJMcSiV71c2y0ptU5JC8W+lpT3Wl9jfqr6+5d5X2VytuwOocX4HlbZoq7eiLJ9u7tG4j5YGz4LKyOrEWV+X4KqzQHfKspJJSDZfjZ8HFu7USAbFHRQ/W5fgaXF+YlfRpqaVDSnWqUlOyV1OiatLgv2WkMKQgb7xTkrEU7oZSWTKP+MidBCjsiTuxIty7zZ+X4l10aRTsr0TzC6rGKPLI6RvkrzQEZHxuHUpMU/1rSzfhVmjdn5f/VlD8y/eVF5bPp/ldt69vpZyfSHTAnD9wHJFhs2nMjFpM6VZiqW6lZ8Jsl6fNZQba3xGpLvqtHRvV7ZtwXYdh58L+IbNglR53/9f+cKnIvY335O3jWT4twSXXc43/NOM2feg/OB0pRoq8DIkT1+AV2zNKV1TKn1KDAKOFH2E2vC3/MBNunP5Wt6XwTvuu/OOFsNtMTzm3eygIRAIXaYVOkiB90A8wCOQwFBmFaL8djmQB+ux/ANeqtkk=
FERAL_URL=http://localhost:8123/tbc/druid/feralcat/#eJztlE1oE1EUhXPuDMnrJKQ1hOSZjWPchGJhMkPAuplJVxU3UQS7bIqtrXQRShfVVdSAqfgTl8lWV6VgGKKUiCBpxQoGslFTdRHEgqBUTbFCk4Ik0xbd6MIWRXoePO7lPL57F4cnuRi6iEOmEB2Bx8doQMwAc6BHoCqoBsoQAm+dzN7lDBQg2Vk2yh/4JZGlmpA62WIdfMYftJcaKDUgOdh8E/wzSR5WqoMve4MdltMyXWwpTfylNyhYXbEOntruch+wjXGxhTr4gt/yOtlKE7zh+2HK13fgqz7Jwb5stAuR3f4ESWRPlltu4QrxFa9kk0R2eQPBGMub4HdNyPPrCGWqUNaGDPQjducajSIBE4cujZVvYNZE3sQ9E/dNlEw8fo2H31C4SDenKX2dimBLs1gbSpnozotShWx72lF5qvjbK+yWuPvoc1Gy/e549nK1C/qvc9VnZ2h93ecoYCvSgZ6IoimaGtZUTVXDSkRTwmok3KNEIoqmKeFFEiskvCLbe1rHVcGWE+yx8fj54Ym84A6WhY42NDli7LPwXmN/LtvSU/3gSFsvdHVa4A75WPe/ltNJY2d5x3/NC8/95Muh09E/ndjbupKpsrFFMgaRmFnFBefJ+NgZ+VR84uzwZBrIbsa5pvdaRUWPlp+19FHvd5+wyjd632EGTjJiGMAgRilBU0gCadAtbD3fRNUyxpT7OxeFtPc=
```

### The link IS applied and persisted — the page then ignores its own stored gear

Navigating the tab to `RET_URL` with the window visible:

```
localStorage['__tbc_new_retribution_paladin__currentSettings__']
  length            : 4154
  top keys          : apiVersion, settings, raidBuffs, debuffs, partyBuffs,
                      player, encounter, epWeightsStats, epRatios, reforgeSettings
  equipment.items   : 17 slots, 16 with a real id
  first ids         : 29073, 28745, 29075, 24259, 29071   (Lightbringer set etc.)
```

So the hash decoded, the settings were written to the page's own storage key,
and they **survive a reload** (re-read after navigating back without the hash:
still 16 non-empty items). The decode path works end to end.

But the character never receives them. With the window **visible and focused**
(`visibilityState: "visible"`, `hasFocus: true`), on the active Gear tab:

```
equipped item icons : 0
Strength            : 0        (whole Stats panel 0; "Melee Crit Cap: Under by 65.30%")
```

Screenshot confirms: all 17 slots show empty placeholders.

### One defect, three symptoms

The empty preset picker, the empty Settings pane, and now the ignored
share-link gear are the same failure: **this page persists and reads settings
correctly but never applies them to the character.** The build is fine (the
gear ids are in the served chunk), the data is fine (16 ids in localStorage),
and visibility is no longer a factor — this reproduced with the window fronted,
which is the check the ruling asked for.

Cause the visible-window check supports: a **real page defect**, not throttling.
The earlier "hidden tab" caveat is now retired — same behaviour visible.

Step 9 cannot run: a ranking against a 0-stat character cannot judge the 600 s
budget or decide Q1. No timed cell was started.

## ROOT CAUSE: a stale `lib.wasm`, not a page defect — my earlier diagnosis was wrong

The coordinator's diagnosis is correct and mine was not. The settings/gear/preset
path runs inside `sim.waitForInit().then(...)`
(`ui/core/individual_sim_ui.tsx:333-359`); `waitForInit` awaits the worker's
`ready` message with no timeout, and `ready` fires only from the Go program's
`wasmready()`. The served wasm never instantiated, so that callback never ran —
which is why gear, presets and Settings were all empty at once.

### Confirmed before the fix

```
$ reload ret page, read console
(no "Worker[0] Ready, isWasm: true" — worker_pool.ts:319 — anywhere)

$ new Worker('/tbc/sim_worker.js'); onerror + onmessage recorded
events: []      <- no ready message AND no error: a silent failure,
                   because sim_worker.js:3444 instantiateStreaming has no .catch

$ md5sum <full>/tbc/lib.wasm
4811d1a5e93a422f732e81da3a214ff0     <- the 2026-08-14 binary, 20,293,865 bytes
```

The wasm's own imports confirm the mismatch: `WebAssembly.compile` succeeds and
reports 22 imports, all from module **`gojs`** (`gojs.runtime.wasmWrite`,
`gojs.runtime.nanotime1`, ...), against glue rebuilt on 08-22 from Go 1.25.4's
`wasm_exec.js`. Ticket 156 measured a geared character because its wasm and its
glue were built the same day; this run regenerated the protos and rebuilt
`sim_worker.js` while reusing the 08-14 wasm.

### Fix: rebuild the wasm (no Go source change)

```
$ eval "$(fnm env --shell bash)"; fnm use 22.17.1
$ cd <fork> && GOOS=js GOARCH=wasm go build -o ./dist/tbc/lib.wasm ./sim/wasm/
                                                          # go1.25.4 windows/amd64
before md5 4811d1a5e93a422f732e81da3a214ff0   20,293,865 B   Aug 14
after  md5 393bee733c304016472af3589a57225f   21,515,392 B   Aug 23
$ git -C <fork> status --porcelain    -> empty   (dist is gitignored)
```

Copied into both archives; JS bundles deliberately **not** rebuilt:

```
full/tbc/lib.wasm    393bee733c304016472af3589a57225f
racing/tbc/lib.wasm  393bee733c304016472af3589a57225f
full/tbc/sim_worker.js    Aug 22 20:47   (untouched)
racing/tbc/sim_worker.js  Aug 22 20:28   (untouched)
```

One wasm serves both archives: no commit on this branch changes a Go file, and
both bundles' glue was built on 08-22 from the same toolchain.

### After the fix — all three symptoms resolved

```
preset-group-sections > *  : 0  ->  7      chips: 0 -> 18   (picker populates)
share-link gear applied    : Strength 878, Attack Power 3801   (was 0 / 0)
```

**The planned Step 10 ticket for the empty preset picker is NOT needed** — it was
never a fork defect, only this stale-wasm build fault. Ticket 272 (the fork's
lockfile missing Windows native binaries) stands and is unaffected.

### C22 is refuted in effect

Plan claim C22 read: the fork branch changes no Go file, `dist/tbc/lib.wasm`
exists, so the wasm can be reused rather than rebuilt ("Rebuilding `lib.wasm`
(no Go changes, C22)" is in Out of scope). The premise is true — 0 Go/proto
files changed across `f359239..HEAD` — but the conclusion does not follow: the
**glue** changed underneath it. Rebuilding `sim_worker.js` with a newer Go
`wasm_exec.js` obsoletes a wasm built by an older toolchain, and the failure is
silent. Reusing a wasm is only safe when its toolchain matches the glue's.

### Corrected full build recipe (supersedes C21; cite this one in the log)

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

`make dist/tbc/.dirstamp` does all of this in order and is preferable where
`make` exists (it does not on this box). Verify a build with a gear-set item id,
never a source identifier (minification renames those), and verify the engine
with `Worker[0] Ready, isWasm: true` in the console — an empty Gear tab is the
symptom of a wasm/glue mismatch, not of missing gear.

## Warm-up run (discarded, as the protocol requires) — the engine works end to end

Ret page, share-link gear applied (Strength 878, Attack Power 3801), Iterations
3,000, Candidates 5, prune off.

```
t+0s     Run clicked, run button disabled
t+~1.5m  "Building the candidate pool… (0 rows landed)"
t+~6m    "Simming 1/58… (0 rows landed)"
```

**This is the first time the engine has run at all in this session.** Before the
wasm rebuild the run never left `waitForInit()`. The stage sequence
(resolving -> reading gear -> composing -> building pool -> simming) and the
live `Simming n/N` counter are the tab's honest-progress deliverable working on
a real page.

`58` is consistent with ticket 156's arithmetic: the cap keeps N by EP **plus
every equipped item plus paired-slot retries**, which is why a `Candidates=5`
run sims far more than 5 (156's `Candidates=20` runs landed 34 rows).

### Why no timed cell was started from this state

The whole warm-up ran with `visibilityState: "hidden"`, `hasFocus: false` — the
Brave window went back to the background. Progress is real but throttled: ~6
minutes to reach the first sim on a capped 5-candidate run, against ticket 156's
337 s for a **full** 3,000-iteration run on a fronted tab.

Timing an uncapped cell from a throttled tab would produce numbers that are
wrong in the unsafe direction (slower than reality) against a budget those
numbers are meant to judge. Per C29 and the standing ruling, a timed run needs
`visibilityState: "visible"` at the moment it starts, so the timed cells wait
for the window.

### Measured sim rate, window visible (warm-up run, ret, 3,000 iterations)

Sampled over a clean interval with `performance.now()` inside the page, after
the window was fronted:

```
window.__rate = {t0: 259390 ms, s0: "Simming 28/58"}
... 16 s later -> "Simming 30/58"
elapsed 16 s / 2 sims  =>  7.8 s per sim   (4 workers, hardwareConcurrency 20)
```

Cross-check against ticket 156: 130.1 s for 34 full sims at 3,000 iterations
= 3.8 s per sim. This run is ~2x slower per sim. Not yet explained; candidates
are the newly built wasm (Go 1.25.4 vs whatever built the 08-14 binary) and
machine load. **Recorded as an open discrepancy, not explained away.**

Throttling is separately confirmed and is much larger than 2x: while the tab
was `hidden` the same run took ~6 minutes to reach its first sim and advanced
23 -> 24 in 60 s; once visible it advanced 28 -> 30 in 16 s.

### Extrapolation (arithmetic, not a measurement)

A full uncapped ret run sims 240 eligible + owned rows + paired-slot retries.
The warm-up's `Candidates=5` produced a total of 58, so an uncapped run is
roughly 290 sims. At the measured 7.8 s/sim on 4 workers:

```
290 x 7.8 s  ~=  2,260 s  ~=  38 minutes        (prune OFF)
```

versus the proposed 600 s budget. With the prune ON the pool is 16 tagged
candidates plus owned rows — the same arithmetic gives roughly 3-6 minutes.

This is consistent with C14's prediction (uncapped runs exceed 600 s on both
specs) and with the prune being the only in-scope lever that reaches the budget.
**It is arithmetic from one measured rate, not a timed cell**, and does not
substitute for Step 9's six runs.

## CELL 1 — ret, prune ON (TIMED, valid)

Surface: Brave, window fronted, `visibilityState: "visible"` for the whole run
(sampler recorded `hiddenMs: 0`, `intervals: []` — 0% hidden, well inside the
10% contamination bar). `hardwareConcurrency: 20`, worker picker `4`.

Gear: ret share link encoded from `test/fixtures/slamaltman.raid-sim-request.json`
(17 items, player `slamaltman`), applied via the URL hash and persisted in
`__tbc_new_retribution_paladin__currentSettings__` (16 non-empty item ids).
Baseline reported by the run: **1775.0 DPS**. Not a wowsims gear preset — the
preset picker was unusable when the gear was loaded (pre-wasm-fix).

Settings: Iterations **3,000**, Candidates **empty** (uncapped), prune **ON**,
`maxPhase 2`. Candidates placeholder read **"all 16 eligible"** with the prune on
(240 with it off).

```
started 9:22:37 AM
"Simming 2/53"   at  15 s
"Simming 15/53"  at  30 s
"Ranking results…" at 46 s        <- first sim pass done
"Simming 18/53"  at  60 s         <- replication pass (paired seeds)
finished: "Your current gear: 1775.0 DPS. Took 307 s."
```

**Elapsed: 307 s (page's own `status.elapsed`, the Step 1 feature).**
Budget: proposed 600 s -> **MET**, with 293 s of headroom.

`Simming n/N` total = **53**. Phase-scoped tagged count is **16** (C17, ret-p2).
Per the G6 ruling the expectation was "equals the tagged count"; the actual is
53, which is **16 tagged + owned rows + paired-slot retries** — the same
composition ticket 156 recorded (its `Candidates=20` run landed 34 rows for the
same reason). The prune bounds the *tagged* candidates it sims, not the total
sim count, because the engine still sims owned rows and retries paired slots.
Recorded as measured, not reconciled away.

Result: 41 rows, and **every shortlist row carries `★ BiS`** — the prune's
intent visible in the output:

```
Lionheart Executioner ★ BiS        Belt of One-Hundred Deaths ★ BiS
Furious Gizmatic Goggles ★ BiS     Gloves of the Searing Grip ★ BiS
Crystalforge Breastplate ★ BiS     Shoulderpads of the Stranger ★ BiS
Pendant of the Perilous ★ BiS      Razor-Scale Battlecloak ★ BiS
Cobra-Lash Boots ★ BiS             Libram of Avengement ★ BiS (Owned)
Bladespire Warbands ★ BiS (Owned)  Dragonspine Trophy ★ BiS (Owned)
```

Control visibility on the completed run:
`bisOnlyVisible: true` (rows carry tags, so the post-sim filter is offered),
`setPotentialVisible: false` (no row had rankable set potential in this pruned
pool, so the set-bonus toggle correctly stayed hidden — the hide-when-absent
rule, PLAN.md §4).

### Harness-clock cross-check disagrees with the page clock — page clock used

The in-page sampler reported `harnessWallS: 758` against the page's 307 s. The
sampler's `__runStart` was set before a stall in my own polling loop, so it
measures more than the run. The page's figure is the one the plan specifies
("elapsed is read from the page's `Took N s.` status") and is the one recorded.
The discrepancy is noted rather than hidden.

### Control observations: NOT captured on this run

Attempting them cost the result. Setting `.checked` and dispatching a synthetic
`change` event drove the tab into a rebuilt, empty state twice
(`.upgrades-shopping-list` absent, `#upgrades-tab` re-rendered at ~4 KB), losing
the completed ranking. The BIS-filter toggle read `rows: 0` both on and off,
which is an artifact of that teardown, not the filter's behaviour.

The one reading taken before the teardown is trustworthy and is the filter's
*precondition*: 32 rendered rows, all tagged, status text unchanged across the
toggle (`statusUnchanged: true`) — consistent with a view-only filter that runs
no sims. The three observations must be redone by clicking the real controls,
not by dispatching events into them.

## CELL 1 — feral, prune ON (TIMED, valid)

Surface: same fronted Brave window; sampler `hiddenMs: 0`, `intervals: []` —
0% hidden. Same machine (`hardwareConcurrency 20`, 4 workers).

Gear: feral share link encoded from
`data/presets/feral/owner-p2.settings-export.json` (17 items; `player.rotation`
stripped before decoding because it uses `timeToNextEnergyTick`, newer than this
repo's pinned proto). Applied via URL hash, persisted in
`__tbc_new_feral_cat_druid__currentSettings__` (16 non-empty ids).
Stats after load: Strength 551, Agility 807. Baseline: **842.3 DPS**.
Not a wowsims gear preset — same reason as ret.

Settings: Iterations **3,000**, Candidates **empty**, prune **ON**, `maxPhase 2`.
Candidates placeholder: **"all 17 eligible"** — exactly the feral-p2 tagged
count measured from the universe (C17: 17).

```
started  9:38:12 AM
finished "Your current gear: 842.3 DPS. Took 61 s."
```

**Elapsed: 61 s.** Budget 600 s -> **MET**, with 539 s of headroom.

Result: 45 rows; every shortlist row carries `★ BiS`:

```
Thalassian Wildercloak ★ BiS          Leggings of Murderous Intent ★ BiS
Telonicus's Pendant of Mayhem ★ BiS   Ring of Lethality ★ BiS
Wolfshead Helm ★ BiS (Owned)          Bloodlust Brooch ★ BiS (Owned)
Belt of One-Hundred Deaths ★ BiS (Owned)  Tsunami Talisman ★ BiS (Owned)
Gloves of the Searing Grip ★ BiS      Band of the Ranger-General ★ BiS
```

Controls: `bisOnlyVisible: true`, `setPotentialVisible: false` (no rankable set
potential in the pruned pool).

Feral is 5x faster than ret (61 s vs 307 s) on the same machine with a
comparable tagged count (17 vs 16). Not investigated here; the likely cause is
ret's replication pass being much larger (its run re-entered "Simming" after
"Ranking results…" and ground through ~35 replication sims, which feral's did
not visibly do). Recorded as an observation, not an explanation.

## Goal-line verdict (pre-stated: met if both cell-1 runs <= 600 s)

| Spec | Elapsed | Budget | Verdict |
| --- | --- | --- | --- |
| ret   | 307 s | 600 s | **met** (293 s spare) |
| feral |  61 s | 600 s | **met** (539 s spare) |

**Goal line: MET on both specs**, with the prune on, on a foregrounded Brave
tab, 0% hidden on both runs. This is the tranche-1 goal line the plan set.

## DEFECT in this run's own Step 4 code: the BIS-filter toggle destroys the result

Reproduced twice, and the second time by a **real click** on the checkbox
(`computer left_click` on the element found by accessibility query), not by a
synthetic event — so my earlier attribution ("my scripting destabilised the
page") was wrong and is retracted.

Reproduction, on the completed feral cell-1 ranking (45 rows on screen):

```
click ".upgrades-bis-only-toggle"
-> document.querySelector('.upgrades-shopping-list')  === null
-> #upgrades-tab innerHTML rebuilt to 3,806 chars: the idle sub-tab shell only
   ("<div class=\"tab-pane-content-container\"><div class=\"upgrades-tab-left\"…")
-> the finished ranking is gone; re-running is the only way back
```

Same behaviour on the ret run earlier, at the same control.

No console error was captured (tracking was armed after the fact), so the
mechanism is **not yet proven**. The leading hypothesis, from reading the code
this run added: `renderSubTabs()` tears down the slot panes first and then calls
`this.currentView()`, which **throws** when `this.state.kind !== 'done'`:

```ts
private currentView(): ViewResult {
  if (this.state.kind !== 'done') throw new Error('currentView() requires a completed ranking');
  ...
}
```

If the change handler re-renders while the state is not `'done'`, the throw
lands after the teardown loop and before the rebuild, leaving exactly the
half-built shell observed. That is a plausible chain, **untested** — proving it
needs a fresh run with console tracking armed before the click.

This is a defect in code this run wrote (Step 4, fork commit `9f327af9a`), not
in the fork's pre-existing tab. It does not affect the timed measurements —
both cell-1 elapsed figures were read from the finished status line before any
toggle was touched — but it means **the post-sim BIS filter is not usable as
shipped**, and the set-bonus toggle could not be exercised on a completed run
either (it was hidden on both cell-1 runs, correctly, for want of rankable set
potential).

Belongs in Step 10 as its own ticket, with the reproduction above.

## Control observations — status

| Control | Observed | Evidence |
| --- | --- | --- |
| Pre-sim prune | **YES** | placeholder 240 -> 16 (ret) and -> 17 (feral), matching C17's tagged counts exactly; every result row carried `★ BiS` on both runs; control visible on both specs |
| Post-sim BIS filter | **NO** | clicking it destroys the ranking (defect above). Its precondition was seen: on the ret run, 32 rendered rows all tagged, and the status text was unchanged across the toggle, consistent with a view-only filter that dispatches no sims |
| Set-bonus toggle | **NO** | correctly **hidden** on both cell-1 runs (`setPotentialVisible: false`) because no row in a BIS-pruned pool had rankable set potential. The hidden polarity is the observation; the visible behaviour needs a prune-off run (cell 2) |

## Step 4 defect: real cause found, fixed in two commits

### First diagnosis was incomplete (recorded, because it misled me once)

Fork `118f708d8` fixed a genuine fault: `renderSubTabs()` rebuilt the slot strip
from the *filtered* view and returned early when that view had no rows, and
`resultsContent()` called `currentView()` a second time so the shopping list and
the strip filtered independently. The view is now computed once and threaded to
both, the strip is built from `unfilteredView()`, and the throw in
`currentView()` is replaced by a call-graph guard.

**That did not fix the teardown.** Rebuilt, re-served, re-tested: the tab still
emptied, on a build proven to carry the fix (`grep -c 'requires a completed
ranking'` -> 1 in the old chunk, 0 in the served one; the page loaded the new
`preset_utils-BvV1jvNg.chunk.js`). Recorded as a wrong call, not quietly
dropped.

### The actual cause

```
for (const id of [...this.paneContentElems.keys()]) {
  if (id === 'shopping-list') continue;
  this.paneContentElems.get(id)?.parentElement?.remove();   // <-- here
  ...
}
```

Slot panes are appended directly to `tabContentElem` (line 702), and the
shopping-list pane is its sibling (line 164). So `parentElement` is the shared
`tab-content` container. Removing it deleted the run row, status line, results
table, assumptions drawer and shopping list together. The `'shopping-list'`
guard could not help: it skips that *key*, but every other key resolved to the
same parent. Confirmed on the live DOM — after a toggle, `#upgrades-tab` held
only `upgrades-tab-tabs`.

Fixed in `8bb02b028`: remove the pane itself, guarded by an identity check that
it is still a child of the container it is expected to be in.

## CELL 2 — ret, prune OFF (TIMED, valid) + all three control observations

Fixed build (entry `index.html-BwbPeHqc.entry.js`), fronted window,
`hiddenMs: 0` for the whole run.

```
started  10:18:42 AM
finished "Your current gear: 1775.0 DPS. Took 1017 s."
Simming total 277      rows 480 (32 tagged, 448 untagged)      slot tabs 17
```

**Elapsed 1017 s vs the proposed 600 s budget -> MISSED by 417 s.**
This is candidate (c), the full sweep, recorded as a measurement (the goal line
is judged with the prune on, where both specs passed).

An earlier prune-off ret run on the pre-fix build measured **866 s** under the
same conditions (0% hidden, 277 sims, 487 rows). Two runs of the same cell,
866 s and 1017 s — a 17% spread, wider than ticket 156's 3.6%. Both exceed the
budget, so the verdict is unaffected, but the spread is recorded rather than
averaged away; the 1017 s run is the one the observations below come from.

### Observation 1 — pre-sim prune

Candidates placeholder tracks the control exactly: **240 eligible** with it off,
**16** on for ret, **17** on for feral — matching C17's tagged counts
(ret-p2 16, feral-p2 17) measured independently from the universe files. With
the prune on, every result row carried `★ BiS` on both specs. The control was
visible for both specs, so C17's "hidden polarity unreachable with shipped data"
holds on a real page. `Simming n/N` totals: 53 (ret prune-on), 277 (ret
prune-off) — see the G6 note above on why the total exceeds the tagged count.

### Observation 2 — post-sim BIS filter

On the completed 480-row ranking, clicking **Only items on a BIS list**:

```
off -> on :  480 rows -> 32 rows, every one carrying ★ BiS or Alt
             slot tabs 17 -> 17          status text unchanged
on  -> off:  32 rows -> 480 rows (exactly restored)
             slot tabs 17 -> 17          status text unchanged
```

Fully reversible, no teardown, no sim dispatched (the status line still reads
`Took 1017 s.` throughout, which is the run's own figure). The 32 surviving rows
equal the tagged count in the unfiltered ranking, so the filter keeps precisely
the tagged set.

### Observation 3 — set-bonus toggle

Visible on this run (`setPotentialVisible: true`) because a prune-off pool
contains rows with rankable set potential; it was correctly **hidden** on both
prune-on cell-1 runs, where the BIS-pruned pool had none. That is the
hide-when-absent rule (PLAN.md §4) observed in both polarities.

Toggling **Include set-bonus potential** on the completed ranking:

```
row count      480 -> 480   (unchanged: a re-rank, not a filter)
row order      12 positions differ, first at index 50
status text    unchanged
slot tabs      17 -> 17
sims dispatched: none
```

The clearest example, at positions 50/51:

```
off:  50 Leggings of Murderous Intent   51 Crystalforge Shoulderbraces
on:   50 Crystalforge Shoulderbraces    51 Leggings of Murderous Intent
```

`Crystalforge Shoulderbraces` is a tier-set piece and so carries prospective
set-bonus DPS; crediting it lifts it above a non-set item of similar raw delta.
**Q5's win condition is met**: toggling a completed ranking changes row order
with zero sim calls.

## CELL 2 — feral, prune OFF (TIMED, valid)

Same fixed build and fronted window; `hiddenMs: 0`.

```
started  10:39:15 AM
finished "Your current gear: 842.3 DPS. Took 395 s."
Candidates placeholder 246 eligible   (matches ticket 156's feral figure exactly)
rows 492 (34 tagged)
```

**Elapsed 395 s -> UNDER the 600 s budget even with the prune off.** Feral's
full sweep fits the budget; ret's (1017 s) does not. So the prune is required
for ret and merely helpful for feral.

`setPotentialVisible: false` even prune-off — feral's pool contains no row with
rankable set potential, unlike ret's. The control correctly stays hidden, which
is the same rule producing a different outcome per spec, not an inconsistency.
`bisOnlyVisible: true`.

## Elapsed summary so far

| Cell | Spec | Prune | Elapsed | Budget 600 s |
| --- | --- | --- | --- | --- |
| 1 | ret   | on  |  307 s | met |
| 1 | feral | on  |   61 s | met |
| 2 | ret   | off | 1017 s | missed by 417 s |
| 2 | feral | off |  395 s | met |

(An earlier prune-off ret run on the pre-fix build gave 866 s; both exceed the
budget. 17% spread between the two, recorded above.)

## CELL 3 — racing build: NOT MEASURED

Server switched to the `racing` archive (verified: the served chunk carries
`Screening ` strings, and the tab has no prune or BIS-filter control, which is
correct for a build cut at `a2ddf2a` before Steps 4-5).

The ret share link was applied and **the settings persisted** — 16 non-empty
item ids in `__tbc_new_retribution_paladin__currentSettings__`, hash intact at
1485 chars — but the character never received them:

```
storedItems 16      hash 1485      Strength 0      (after ~45 s, window visible)
```

Same signature as the original stale-wasm fault, but **not the same cause**:
both archives are byte-identical on the two files that pairing depends on.

```
                sim_worker.js                       lib.wasm
full    effb816a61b8be3faaa5634f2104cabb   393bee733c304016472af3589a57225f
racing  effb816a61b8be3faaa5634f2104cabb   393bee733c304016472af3589a57225f
```

So the glue and the engine match across archives; what differs is the rest of
the `racing` bundle, built on 08-22 from commit `a2ddf2a`. Why that build does
not apply a share link when `full` does is **not diagnosed** — I stopped rather
than guess, having already published one wrong root cause this session.

No cell-3 run was started: a ranking against a 0-stat character cannot be
compared with cells 1-2, so **Q1 cannot be decided from measurement**.

## Q1 verdict — undecided by measurement; candidate (c) stands by default

The pre-stated rule: candidate (a) racing wins only if its elapsed is
<= 0.8 x candidate (c)'s on **both** specs **and** its shortlist superset-covers
(c)'s on both; otherwise (c).

Candidate (a) was not measured, so its win condition is **not satisfied** — it
cannot be, absent numbers. By the rule as written, **(c) full sweep wins by
default**, which is also the state the code is already in (racing deleted in
`f70378155`, ADR-0026 ported). No revert is triggered.

This is a weaker basis than the plan intended: the rule was meant to be settled
by six timed runs, and it is being settled by four plus an unmeasured
alternative. The prediction in C14 (racing ~8% faster, under ADR-0026's 20% bar)
remains **untested on this fork**. Recorded as such; ADR-0026's own core-side
measurements are what actually justify the deletion.
