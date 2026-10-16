# Catching up to upstream

This repo pins upstream `wowsims/tbc-new` twice: the **engine pin**
(`data/wowsims.lock.json` → `vendor/wowsims/`) and the **fork pin**
(`data/wowsims-fork.lock.json` → `vendor/tbc-new-fork/`). ADR-0030 and ADR-0033
record why they are two pins. ADR-0036 lets them move separately:

- **Routine fork update (fork only)**, next section: the fork branch merges
  upstream `master`. Do it whenever `pnpm fork:upstream-status` shows content
  conflicts only.
- **Moving the engine version (both pins)**, §0–§7: the full procedure, run
  when the command-line tool needs a newer engine.

Both procedures run in a pair (`docs/agents/paired-worktrees.md`).
`<main-folder>` is the main checkout's folder.
`pnpm -C <main-folder> wt:pair <name> <main-branch> <fork-branch> -b --new-fork-branch`
makes the main branch from `dev` and the fork branch at the fork lock's
`commit`. Give that call a 600000 ms timeout. It is done when it prints
`pair ready` with no `WARNING` line after it. `<pair>` is the pair's folder as
an absolute `C:/Users/...` path (Windows `python` and `node` cannot read Git
Bash's `/c/Users/...`), and `<fork>` is `<pair>/vendor/tbc-new-fork`.

A subagent starts in the spawning session's folder, usually the main folder,
and Bash returns to it between calls.
So every command below names its folder (`git -C`, `pnpm -C`, `npm --prefix`,
`go -C`, `make -C`, or an absolute path) and runs the same from any folder.
Run each one exactly as written. A bare `python scripts/<x>.py` or
`pnpm <script>` reads and writes the main folder's files, not the pair's, and
a `cd X && …` chain breaks on the error fnm prints.
`pnpm -C <pair> exec python scripts/<x>.py …` runs a script in `<pair>` with
flags that no `package.json` script passes. Run every `make -C` command in
this guide in Git Bash: the fork's makefile calls `sh` and GNU `find`
(`scripts/worktree_pair.py` `make_env`).

Both procedures merge into `dev` at §7 step 5, and only when the owner asks.

A pipe reports the **last** command's status, so append
`; echo "rc=${PIPESTATUS[0]}"` or redirect and inspect separately.

## Routine fork update (fork only)

1. See how far behind the fork is and what a merge would conflict on:

   ```bash
   pnpm -C <pair> fork:upstream-status
   ```

   It fetches `upstream/master`, then prints the commits behind and the
   dry-run conflicts by type. Content conflicts only: continue. Any location
   or modify/delete conflict means upstream moved something the fork builds
   on: stop here and plan that merge as its own piece of work.

2. Record the unit-test result on the fork tip before merging
   (`npm --prefix <fork> run test:unit`), so step 4 has a baseline. Then merge
   on the fork branch:

   ```bash
   git -C <fork> merge upstream/master
   ```

   Resolve conflicts by the rules in §4. For `package-lock.json`, take
   upstream's version and run `npm --prefix <fork> install`.

3. Regenerate the gitignored bindings: `make -C <fork> proto` and
   `make -C <fork> go-to-ts` (both ran on Windows at `42c75dc9`; ticket 558).
4. Check the merged tree:
   `node <fork>/node_modules/typescript/bin/tsc --noEmit -p <fork>`,
   `npm --prefix <fork> run lint:js`,
   `go -C <fork> test --tags=with_db ./sim/...` (`sim/web` always fails its
   setup: it needs `binary_dist`), and `npm --prefix <fork> run test:unit`.
   Done when `tsc` and
   `lint:js` exit 0, `go test` fails only on `sim/web`, and every unit-test
   failure also failed in step 2's baseline; a new
   failure is a finding. A merge with no conflicts can still break the build,
   because upstream renames APIs our feature folder calls.
5. Commit the merge in the fork.
6. Re-pin in `<pair>`. In `<pair>/data/wowsims-fork.lock.json` set `commit` to
   `git -C <fork> rev-parse HEAD`, `branchedFrom` to
   `git -C <fork> rev-parse HEAD^2` (the upstream commit the merge brought in),
   and `pushed` to `false`, and append a dated sentence to `_comment`. If the
   merge changed anything under `<fork>/ui/features/upgrades/model/engine/`,
   run the PROVENANCE cycle first (`docs/agents/known-traps.md`, "Before
   editing a ported engine file"). Then run:

   ```bash
   pnpm -C <pair> sim-implemented-effects:generate
   pnpm -C <pair> equip-eligibility:check
   pnpm -C <pair> fork-universes:check
   pnpm -C <pair> verify
   ```

   If `pool-listings:check` fails inside `verify`, stop and report: the fork
   lock and the engine lock now name different upstream commits, and the
   listings disagree until the engine moves (ADR-0036 Consequence 3).

7. Run the desktop gate (§5, last paragraphs) only when `dev` will receive this
   re-pin.

The engine lock does not move here. Between engine moves the two locks can name
different upstream commits (ADR-0036).

## Moving the engine version (both pins)

Every command below was run on 2026-09-14 moving both pins from `ec5c5f2` to
`master` tip `17a8fb28c5ad14b649acecdaacd488594048f467`; the outputs are in
`<main-folder>/.scratch/stage-gate/upstream-catchup-chunk1/execution-report.md`.

2026-10-06 (ticket 558 P4): the engine pin moved from `17a8fb28` to `42c75dc9`. `TRACKED` was remapped to upstream's `ui/specs/` and `ui/sim/` layout, and the three CLI rankings were compared old engine against new engine on the same code; outputs in `<main-folder>/.scratch/stage-gate/558-p4-engine-move/`.

Both output folders are gitignored, so they exist only on the main checkout's
disk; a pair does not have them.

### 0. Preconditions

Both trees clean, the fork lock naming the clone's actual HEAD, the expected
worktree registrations, and a known `pushed` flag. `git -C <fork> worktree list`
prints one line for the main checkout's clone, one for each pair, and one more
for each port worktree that is open. Name each
extra line's path and branch in your notes before you start.

```bash
git -C <pair> status --porcelain
git -C <fork> status --porcelain
git -C <fork> rev-parse HEAD
git -C <fork> ls-remote origin refs/heads/<branch from the fork lock>
git -C <fork> worktree list
python -c "import json;l=json.load(open('<pair>/data/wowsims-fork.lock.json'));print(l['commit'],l['pushed'],l['branchedFrom'])"
```

Read the `pushed` flag **before** you start and write it down. §5 sets it to
`false` with the re-pin; only §7 step 7 sets it back to `true`.

### 1. Pick the sha and measure what the merge conflicts on

```bash
gh api repos/wowsims/tbc-new/commits/master --jq .sha
git -C <fork> fetch upstream master
git -C <fork> merge-tree --write-tree --name-only HEAD <TARGET_SHA>
```

`merge-tree` is a **dry run** — it writes a tree object and lists conflicts
without touching the working tree. Record the conflicted set before merging;
anything conflicting outside it later is a stop-and-report.

`<OLD_PIN>` is the fork lock's `branchedFrom`: the last upstream commit the
fork merged. Check that `git -C <fork> merge-base HEAD <TARGET_SHA>` prints
it. If it prints another commit, stop and report: the lock's `branchedFrom` is
wrong. Then list the upstream files the fork has modified since `<OLD_PIN>`, the
files upstream changed between `<OLD_PIN>` and `<TARGET_SHA>`, and the files
on both lists:

```bash
git -C <fork> diff --name-status <OLD_PIN> HEAD | grep '^M' | cut -f2 | sort > <pair>/.scratch/m.txt
git -C <fork> diff --name-only <OLD_PIN> <TARGET_SHA> | sort > <pair>/.scratch/u.txt
comm -12 <pair>/.scratch/m.txt <pair>/.scratch/u.txt
```

Prove the sha builds before pinning it (ADR-0030 §3). Run it **twice** and
compare the hashes:

```bash
pnpm -C <pair> fetch:wowsimcli --commit <TARGET_SHA> --tag-dir <TARGET_SHA>
```

Two identical `sha256=` lines is the proof. `git -C <fork> worktree list` must
print the same lines afterwards as in §0.

### 2. Engine side

Read `docs/agents/known-traps.md` § "Before moving the wowsims engine pin"
first. Then write the expected regen list down **before** running anything
(`data-pipeline-work` rule 2); §3 reconciles every changed path against it.

```bash
pnpm -C <pair> sync:wowsims --ref <TARGET_SHA>
pnpm -C <pair> exec python scripts/sync_wowsims.py --unwatch-ref --ref <dead ref>
pnpm -C <pair> exec python scripts/sync_wowsims.py --watch-ref --ref master
pnpm -C <pair> fetch:protos
pnpm -C <pair> proto:generate
pnpm -C <pair> data:items:generate
pnpm -C <pair> sim-defaults:build
pnpm -C <pair> universe:assemble --spec <spec> --max-phase <N> --report data/universes/<spec>-p<N>.report.json
python <pair>/scripts/check_pool_completeness.py
```

Run the `--unwatch-ref` line only when `watchedRefs` in
`<pair>/data/wowsims.lock.json` names a ref other than `master`, such as a
branch upstream deleted. It exits 2 when the ref is not in `watchedRefs`, and
`--watch-ref --ref master` exits 2 while another ref is still watched
(`scripts/sync_wowsims.py`, `do_unwatch_ref` and `do_watch_ref`).

The last line runs once per `(spec, phase)` pair present under
`<pair>/data/universes/`.

**Pin a commit sha, never a branch name** — a slash in `lock["tag"]` nests the
`vendor/wowsimcli-<tag>-<platform>` directory. The branch belongs in
`watchedRefs`. `sync:wowsims` runs `--update`, which copies `watchedRefs`
forward unchanged, so move it explicitly with `--watch-ref`.

**`pnpm verify` does not run `sync_wowsims.py --check`.** The verify chain ends at
`upstream-drift:warn`, which exits 0 on every branch by design. Run the check by
hand and paste the `in sync.` line into your report:

```bash
pnpm -C <pair> sync:wowsims:check
```

Acceptance — the lock must be purely generated, so running `--update` again
changes nothing. Stage the first run's output before the second run:
`git diff` compares the working tree with the index, so without the
`git add` it shows the first run's changes and always fails.

```bash
git -C <pair> add -- data/wowsims.lock.json packages/core/src/proto data/proto
pnpm -C <pair> sync:wowsims --ref <TARGET_SHA>
git -C <pair> diff --exit-code data/wowsims.lock.json
pnpm -C <pair> proto:generate
git -C <pair> diff --exit-code -- packages/core/src/proto data/proto
```

If `currentPhase` in `<pair>/data/wowsims.lock.json` changed, bump
`ENGINE_VERSION` in `<pair>/packages/core/src/content-hash.ts` and update the
"Content tier" row in `<pair>/PLAN.md`, in a commit of their own
(ADR-0030 Decision 3, step 4).

### 3. Diff against the prediction

Reconcile every changed path against the list you wrote at the start of §2. A
path you did not predict is a finding to explain, not to absorb.

Two traps. Predict the lock's rehashing entries, not upstream's changed files
(`u.txt`): the lock tracks its own list of paths, so the two lists differ. And
a generated file can flip line endings, which makes the whole file look
changed:

```bash
git -C <pair> diff --stat
git -C <pair> diff --stat --ignore-cr-at-eol
```

Identical output means no line-ending flip. If they differ, the files in the
first list but not the second changed only their endings — rewrite those to LF
before committing.

### 4. Fork side

Save the pre-merge lock **before** resolving, because `checkout --theirs`
overwrites it and mid-merge the recovery path is not obvious:

```bash
git -C <fork> show HEAD:package-lock.json > <pair>/.scratch/package-lock.pre-merge.json
git -C <fork> merge --no-ff --no-commit <TARGET_SHA>
git -C <fork> diff --name-only --diff-filter=U
```

Resolve only the measured paths. For a lock file, take upstream's side and
reconcile:

```bash
git -C <fork> checkout --theirs -- package-lock.json
npm --prefix <fork> install
```

Resolving a conflict's _content_ does not clear git's index state — stage the
resolved paths explicitly and confirm the unmerged count reaches zero before
committing:

```bash
git -C <fork> add <resolved paths>
git -C <fork> diff --name-only --diff-filter=U
git -C <fork> commit -F <message file>
```

Write the message file outside `<pair>`.

After the merge commit, delete the scratch files. `pnpm wt:unpair` refuses a
pair that holds ignored `.scratch/` files (`scripts/worktree_pair.py`,
`is_disposable` and `unsaved_work`):

```bash
rm <pair>/.scratch/m.txt <pair>/.scratch/u.txt <pair>/.scratch/package-lock.pre-merge.json
```

Locate code by pattern, never by a fixed line range: conflict markers shift every
line after the first hunk.

```bash
grep -n '<pattern>' <fork>/<file>
```

**The generated protobuf bindings are untracked and go stale across a pin move.**
`pnpm wt:pair` generated them when it made the pair, but if upstream's source
arrives referencing new proto fields, Go and TypeScript both fail to compile
until you run `make -C <fork> proto` and `make -C <fork> go-to-ts` again. Both
ran on Windows at upstream `42c75dc9` (ticket 558). If `make` fails, run
`protoc` from Python with an argument list and no shell, as
`build_from_source` in `scripts/fetch_wowsimcli.py` does.

Then verify the merged tree. Build the packages that hold the merged code; the
`./sim/hunter/...` lines are the 2026-09-14 example, so name the packages your
merge touched:

```bash
go -C <fork> build ./sim/core/...
go -C <fork> build ./sim/hunter/...
go -C <fork> vet ./sim/hunter/
pnpm -C <pair> fork-lint:check    # oxlint over our fork paths, then the fork's tsc
make -C <fork> dist/tbc/.dirstamp
node <pair>/scripts/tab-harness/test-layout.mjs
```

`go build ./sim/...` cannot pass in this checkout: `sim/web/main.go` imports
`binary_dist`, which is gitignored and built only by `make binary_dist`.

The layout gate needs a built `<fork>/dist/tbc/` (`lib.wasm.gz` and `assets/`)
and throws without it (`scripts/tab-harness/test-tab-harness.mjs`,
`serveTab`). `make -C <fork> dist/tbc/.dirstamp` builds it, and rebuilds the
wasm and the bundle when their Go or UI sources are newer (the target's
prerequisites in `<fork>/makefile`). Leave
`TBC_FORK_PORT` unset, or the gate reuses a server that may serve another
folder's fork. The gate is done when it exits 0 and its `LAYOUT_GATE_VERDICT`
line has `"outcome":"measured"` and `"pass":true`. An `unmeasured` verdict
means a prerequisite broke, not the layout.

Refresh the bundled data the tab ranks from, then commit again:

```bash
python <pair>/scripts/sync_fork_universes.py --write
pnpm -C <pair> fork-universes:check
```

Add a dated section to `<pair>/docs/fork-provenance/data.md`
saying what moved and why. `fork-universes:check` compares **raw bytes**, so a
pure CRLF/LF difference reads exactly like a real drift — check with
`--ignore-cr-at-eol` before writing a cause down.

### 5. Re-pin the fork

Edit `<pair>/data/wowsims-fork.lock.json`: `commit` → the new fork tip,
`branchedFrom` → the upstream sha, `pushed` → **false**, plus a dated
`_comment`. Verify `branchedFrom` rather than asserting it:

```bash
git -C <fork> merge-base HEAD <TARGET_SHA>
```

It must return `<TARGET_SHA>` itself. Then regenerate and check:

```bash
pnpm -C <pair> sim-implemented-effects:generate
pnpm -C <pair> equip-eligibility:check
pnpm -C <pair> meta-conditions:check
pnpm -C <pair> ep-presets:check
pnpm -C <pair> fork-lint:check
pnpm -C <pair> verify
```

The four `require_pinned_fork` gates exit 2 between the fork commit and this lock
edit — **red by design**, read the message rather than chasing it.

The three artifacts are made two ways. `<pair>/data/equip-eligibility.json` is
**generated** by the fork's exporter. `<pair>/data/gems/meta-conditions.json`
and `<pair>/data/presets/*/*.ep-weights.json` are documented **hand copies**:
re-copy from the named fork source (`gems.ts`, the named `presets.ts` symbol) —
**never** from a check's diff text, which would record what someone retyped
rather than what the generator produces.

A recorded-fixture miss (`no recording for sim key`) is a **stop-and-report**, not
a re-record.

Before a fork re-pin that `dev` will receive (ADR-0036 Consequence 1), hand-run
`pnpm -C <pair> desktop-gate:check` and paste its
assertion lines (a)–(f) and (h) ((g) removed) into the commit body or the stage's `desktop-gate.md`. It
proves the upgrades tab still runs on the packaged desktop binary over the HTTP
transport and cannot pass on a page served by vite. It is deliberately **not** in
`pnpm verify` — it needs `go`, `make` and Chrome, none of which CI has — so
nothing else catches a re-pin that breaks the embedded transport. A red gate
blocks the re-pin.

Check (h) compares the run against
`<pair>/data/desktop-gate/golden-ret-p4-cap40.json`; a re-pin that changes the
tab's output regenerates it with `--update-golden` and explains the diff in the
commit body.

### 6. The tag trigger

ADR-0030 D2 keeps `wowsimcli` on build-from-source until a release tag contains
the reforge merge. Re-measure it each time:

```bash
gh api 'repos/wowsims/tbc-new/tags?per_page=1' --jq '.[0].name'
gh api repos/wowsims/tbc-new/compare/3163bcfaf791ed9818463e07fa6ba438c0099d6e...<tag> --jq '{ahead:.ahead_by,behind:.behind_by}'
```

`behind_by` of 0 means it fires. As of 2026-09-14 it **does** fire (`v0.0.137`),
and it was recorded rather than acted on: restoring the zip path changes how every
fresh clone obtains the binary and is its own decision.

### 7. Push and verify — the order

No gate checks whether a fork commit was pushed. `git ls-remote` appears in no
executable file and the `pushed` boolean has no code readers, so a main branch can
merge to `dev` while its pin names a fork commit that exists on one disk.
ADR-0030 Consequence 4 accepts that risk; ticket 355 was filed when it bit.

1. Fork commit in `<fork>` (the pair's fork).
2. Re-pin the pair's `data/wowsims-fork.lock.json`, with `pushed: false`.
3. Regenerate the pin-derived artifacts.
4. `pnpm -C <pair> verify`.
5. Review, then ask the owner before landing it by
   `docs/agents/paired-worktrees.md` "Land it on dev": the main folder merges
   `<fork-branch>` into the fork lock's `branch`, then, with the main folder on
   `dev`, runs `pnpm -C <main-folder> merge-to-dev <main-branch>`
   (`scripts/merge_to_dev.py` refuses a named branch from a folder not on
   `dev`). A catch-up always re-pins the fork, so if `dev`'s fork lock moved
   after `<main-branch>` was made, that command refuses: take
   paired-worktrees.md's older route ("When `dev` has a new fork pin").

   The merge leaves the main folder's gitignored generated files stale.
   Refresh them with these commands; the first three are the steps
   `pnpm wt:pair` runs in a new pair (`scripts/worktree_pair.py`, `pair`). Run
   them after `merge-to-dev`, or on the older route before its `pnpm verify`.
   Done when each exits 0.

   ```bash
   make -C <main-folder>/vendor/tbc-new-fork proto
   make -C <main-folder>/vendor/tbc-new-fork go-to-ts
   npm --prefix <main-folder>/vendor/tbc-new-fork ci   # only when the fork's package-lock.json changed
   pnpm -C <main-folder> sync:wowsims:restore           # only after an engine move
   pnpm -C <main-folder> fetch:wowsimcli                # only after an engine move
   ```

6. Push the fork lock's `branch` — **owner-authorised, an explicit ask**:
   `git -C <main-folder>/vendor/tbc-new-fork push origin <branch from the fork lock>`.
7. Verify with
   `git -C <main-folder>/vendor/tbc-new-fork ls-remote origin refs/heads/<branch from the fork lock>`,
   returning the same sha. **Do not trust the lockfile's `pushed` flag.** Then
   set `pushed: true` in `<main-folder>/data/wowsims-fork.lock.json` and commit
   it directly on `dev` in the main folder, as `64443dc4` ("Mark fork
   316326a95 as pushed") did; `.githooks/pre-commit` allows a plain commit on
   `dev`.

The push comes after the merge into `dev` because, in a pair, the fork lock's
`branch` gets the fork commit only at landing (paired-worktrees.md "Land it on
dev", step 2). The unpushed window between steps 5 and 6 is the risk
ADR-0030 Consequence 4 records.

An executing agent reaches step 5 and **stops**, reporting the fork tip sha.
`pushed` stays false until someone runs step 7, as it did after the 2026-09-14
pass.
