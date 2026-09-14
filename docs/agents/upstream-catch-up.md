# Catching both pins up to upstream

This repo pins upstream `wowsims/tbc-new` twice: the **engine pin**
(`data/wowsims.lock.json` → `vendor/wowsims/`) and the **fork pin**
(`data/wowsims-fork.lock.json` → `vendor/tbc-new-fork/`). Moving them is a
routine, not an event. ADR-0030 and ADR-0033 record why they are two pins and
what they name today.

Every command below was run on 2026-09-14 moving both pins from `ec5c5f2` to
`master` tip `17a8fb28c5ad14b649acecdaacd488594048f467`; the outputs are in
`.scratch/stage-gate/upstream-catchup-chunk1/execution-report.md`.

Throughout: use `git -C <abs path>`, never `cd X && git …` — fnm emits an error
that breaks the chain. A pipe reports the **last** command's status, so append
`; echo "rc=${PIPESTATUS[0]}"` or redirect and inspect separately.

## 0. Preconditions

Both trees clean, the fork lock naming the clone's actual HEAD, one worktree
registration, and a known `pushed` flag:

```bash
git -C <core> status --porcelain
git -C <fork> status --porcelain
git -C <fork> rev-parse HEAD
git -C <fork> ls-remote origin refs/heads/feat/upgrades-tab
git -C <fork> worktree list
python -c "import json;l=json.load(open('data/wowsims-fork.lock.json'));print(l['commit'],l['pushed'])"
```

Read the `pushed` flag **before** you start and write it down. It flips to
`false` the moment you make a fork commit, and you want to know what it was.

## 1. Pick the sha and measure the conflict surface first

```bash
gh api repos/wowsims/tbc-new/commits/master --jq .sha
git -C <fork> fetch upstream master
git -C <fork> merge-tree --write-tree --name-only HEAD <TARGET_SHA>
```

`merge-tree` is a **dry run** — it writes a tree object and lists conflicts
without touching the working tree. Record the conflicted set before merging;
anything conflicting outside it later is a stop-and-report.

Measure which upstream files the fork has modified, and intersect:

```bash
git -C <fork> diff --name-status <OLD_PIN> HEAD | grep '^M' | cut -f2 | sort > m.txt
gh api "repos/wowsims/tbc-new/compare/<OLD_PIN>...master" --paginate --jq '.files[].filename' | sort > u.txt
comm -12 m.txt u.txt
```

Prove the sha builds before pinning it (ADR-0030 §3). Run it **twice** and
compare the hashes:

```bash
python scripts/fetch_wowsimcli.py --commit <TARGET_SHA> --tag-dir <TARGET_SHA>
```

Two identical `sha256=` lines is the proof. `git -C <fork> worktree list` must
still print one line afterwards.

## 2. Engine side

```bash
python scripts/sync_wowsims.py --update --ref <TARGET_SHA>
python scripts/sync_wowsims.py --unwatch-ref --ref <dead ref>
python scripts/sync_wowsims.py --watch-ref --ref master
python scripts/fetch_protos.py
pnpm proto:generate
pnpm data:items:generate
python scripts/list_phase_pool.py
pnpm sim-defaults:build
python scripts/assemble_universe.py --spec <spec> --max-phase <N> --report data/universes/<spec>-p<N>.report.json
```

The last one runs once per `(spec, phase)` pair present under `data/universes/`.

**Pin a commit sha, never a branch name** — a slash in `lock["tag"]` nests the
`vendor/wowsimcli-<tag>-<platform>` directory. The branch belongs in
`watchedRefs`. `--update` carries `watchedRefs` forward unchanged, so move it
explicitly; `--unwatch-ref` is how a deleted upstream branch leaves.

**`pnpm verify` does not run `sync_wowsims.py --check`.** The verify chain ends at
`upstream-drift:warn`, which exits 0 on every branch by design. Run the check by
hand and paste the `in sync.` line into your report:

```bash
python scripts/sync_wowsims.py --check
```

Acceptance — the lock must be purely generated, so running `--update` again
changes nothing:

```bash
python scripts/sync_wowsims.py --update --ref <TARGET_SHA>
git -C <core> diff --exit-code data/wowsims.lock.json
pnpm proto:generate
git -C <core> diff --exit-code -- packages/core/src/proto data/proto
```

## 3. Predict, then diff

Write the expected regen list down **before** running anything
(`data-pipeline-work` rule 2), then reconcile every changed path against it. A
path you did not predict is a finding to explain, not to absorb.

Two traps worth naming. The register may count **upstream's** changed files
rather than the **lock's** rehashing entries — those differ, because the lock
tracks its own paths. And a generated file can flip line endings, which makes the
whole file look changed:

```bash
git -C <core> diff --stat
git -C <core> diff --stat --ignore-cr-at-eol
```

Identical output means no line-ending flip. If they differ, the files in the
first list but not the second changed only their endings — rewrite those to LF
before committing.

## 4. Fork side

Save the pre-merge lock **before** resolving, because `checkout --theirs`
overwrites it and mid-merge the recovery path is not obvious:

```bash
git -C <fork> show HEAD:package-lock.json > package-lock.pre-merge.json
git -C <fork> merge --no-ff --no-commit <TARGET_SHA>
git -C <fork> diff --name-only --diff-filter=U
```

Resolve only the measured paths. For a lock file, take upstream's side and
reconcile:

```bash
git -C <fork> checkout --theirs -- package-lock.json
npm install
```

Resolving a conflict's _content_ does not clear git's index state — stage the
resolved paths explicitly and confirm the unmerged count reaches zero before
committing:

```bash
git -C <fork> add <resolved paths>
git -C <fork> diff --name-only --diff-filter=U
git -C <fork> commit -F <message file>
```

Locate code by pattern, never by a fixed line range: conflict markers shift every
line after the first hunk.

```bash
grep -n '<pattern>' <file>
```

**The generated protobuf bindings are untracked and go stale across a pin move.**
If upstream's source arrives referencing new proto fields, Go and TypeScript both
fail to compile until you regenerate. On Windows, `make proto` fails (the makefile
assumes a POSIX shell) and PowerShell mangles `-I=./proto`; run protoc from
Python with an argument list instead, the same shell-free form
`scripts/fetch_wowsimcli.py` uses:

```python
subprocess.run(["protoc", "-I=./proto",
                "--go_opt=Mgoogle/protobuf/descriptor.proto=google.golang.org/protobuf/types/descriptorpb",
                "--go_out=./sim/core", *protos], cwd=FORK)
```

Then verify the merged tree:

```bash
go build ./sim/core/... ; go build ./sim/hunter/... ; go vet ./sim/hunter/
node_modules\.bin\oxlint.cmd --deny-warnings ui/core/components/individual_sim_ui/upgrades ui/core/components/individual_sim_ui/upgrades_tab.tsx
node_modules\.bin\stylelint.cmd ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss
node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json
npm run test:layout
```

`go build ./sim/...` cannot pass in this checkout: `sim/web/main.go` imports
`binary_dist`, which is gitignored and built only by `make binary_dist`. Build the
packages that hold the merged code instead. Read `test:layout`'s log for its
assertion line, not just the rc.

Refresh the bundled data the tab ranks from, then commit again:

```bash
python scripts/sync_fork_universes.py --write
python scripts/sync_fork_universes.py --check
```

Add a dated section to the fork's `upgrades/data/PROVENANCE.md` saying what moved
and why. That script compares **raw bytes**, so a pure CRLF/LF difference reads
exactly like a real drift — check with `--ignore-cr-at-eol` before writing a
cause down.

## 5. Re-pin the fork

Edit `data/wowsims-fork.lock.json`: `commit` → the new fork tip, `branchedFrom` →
the upstream sha, `pushed` → **false**, plus a dated `_comment`. Verify
`branchedFrom` rather than asserting it:

```bash
git -C <fork> merge-base HEAD <TARGET_SHA>
```

It must return `<TARGET_SHA>` itself. Then regenerate and check:

```bash
pnpm sim-implemented-effects:generate
pnpm equip-eligibility:check
pnpm meta-conditions:check
pnpm ep-presets:check
pnpm fork-lint:check
pnpm verify
```

The four `require_pinned_fork` gates exit 2 between the fork commit and this lock
edit — **red by design**, read the message rather than chasing it.

Three artifacts, three different mechanisms. `data/equip-eligibility.json` is
**generated** by the fork's exporter. `data/gems/meta-conditions.json` and
`data/presets/*/*.ep-weights.json` are documented **hand copies**: re-copy from
the named fork source (`gems.ts`, the named `presets.ts` symbol) — **never** from
a check's diff text, which would record what someone retyped rather than what the
generator produces.

A recorded-fixture miss (`no recording for sim key`) is a **stop-and-report**, not
a re-record.

## 6. The tag trigger

ADR-0030 D2 keeps `wowsimcli` on build-from-source until a release tag contains
the reforge merge. Re-measure it each time:

```bash
gh api 'repos/wowsims/tbc-new/tags?per_page=1' --jq '.[0].name'
gh api repos/wowsims/tbc-new/compare/3163bcfaf791ed9818463e07fa6ba438c0099d6e...<tag> --jq '{ahead:.ahead_by,behind:.behind_by}'
```

`behind_by` of 0 means it fires. As of 2026-09-14 it **does** fire (`v0.0.137`),
and it was recorded rather than acted on: restoring the zip path changes how every
fresh clone obtains the binary and is its own decision.

## 7. Push and verify — the order

No gate checks whether a fork commit was pushed. `git ls-remote` appears in no
executable file and the `pushed` boolean has no code readers, so a core branch can
merge to `dev` while its pin names a fork commit that exists on one disk.
ADR-0030 Consequence 4 accepts that risk; ticket 355 was filed when it bit.

1. Fork commit in `vendor/tbc-new-fork/`.
2. Push the fork branch — **owner-authorised, an explicit ask**.
3. Verify with `git -C <fork> ls-remote origin refs/heads/feat/upgrades-tab`
   returning the same sha. **Do not trust the lockfile's `pushed` flag.**
4. Re-pin `data/wowsims-fork.lock.json`; set `pushed`.
5. Regenerate the pin-derived artifacts.
6. `pnpm verify` in the core repo.
7. Review, then ask the owner before `pnpm merge-to-dev`.

An executing agent reaches step 2 and **stops**, reporting the tip sha ready to
push. Steps 4–6 can be done ahead of the push with `pushed: false`, which is what
the 2026-09-14 pass did; the flag then stays false until someone runs step 3.
