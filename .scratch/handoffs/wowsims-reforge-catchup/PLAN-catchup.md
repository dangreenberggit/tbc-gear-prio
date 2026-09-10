# PLAN-catchup — engine pin and fork both onto `feature/backend-reforge`, then tier 2→3

Branch: `feat/wowsims-reforge-catchup` off `dev` (`8b2fffe`). Target upstream commit for BOTH pins: `ec5c5f205e61049d730e460967f8488774a7fe2a` (`feature/backend-reforge` tip as measured 2026-09-03/09; claim C1). Executor runs slices in the order given; nothing is fanned out (see § Slice partition).

Conventions in this plan: "Verified by" names a command that would have failed if the claim were false. "hypothesis, untested" means nobody has measured it; the executor measures it before relying on it and records the result in the commit message. All paths are repo-relative to `C:\Users\dgree\Code\lulz\tbc-gear-prio` unless they start with `vendor/tbc-new-fork`, which is a separate gitignored git repo.

Shell note (`docs/agents/known-traps.md` § Before running node / pnpm): tool shells emit an `fnm env` error on stderr that breaks `&&` chains and `cd`. Run each command standalone with absolute paths or `-C`/`--prefix`; never chain with `&&`.

## 0. Decisions this plan makes (owner decisions are fixed inputs, not relitigated)

| # | Decision | Why |
| --- | --- | --- |
| P1 | `lock["tag"]` becomes the **full 40-char sha** `ec5c5f205e61049d730e460967f8488774a7fe2a`, via `--update --ref <sha>`, not the branch name. | A branch name contains `/`; `cli-wiring.ts:81` and `fetch_wowsimcli.py:46` build `vendor/wowsimcli-<tag>-<platform>` from the raw tag, so a `/` produces a nested directory. This bit the previous pin move for real (`docs/reviews/feat-engine-pin-backend-reforge.md` § finding 2). The branch relationship is recorded in `watchedRefs` and ADR-0030 instead. |
| P2 | `fetch_wowsimcli.py` gains a **build-from-source path** used whenever `tag` is not a `vX.Y.Z` release; the release-download path stays for tagged pins. No separate binary-version field, no CI artifact. | See slice 1 tradeoff. |
| P3 | Fork reconciliation is `git merge --no-ff <sha>` into `feat/upgrades-tab` (R5 Option B), merging the **sha**, not the branch name, so the fork and the engine pin land on the identical commit even if the branch moves during execution. | 1 conflict, no SHA rewrite, no force-push (R5 §4). |
| P4 | **REVISED after plan review (F1 blocker), owner-confirmed 2026-09-10.** No hand edit. `--update --ref` writes `currentPhase` **and** `defaultMaxPhase` to `3` in the pin commit; slice D becomes `ENGINE_VERSION` + docs only. | The drafted P4 hand-edited `defaultMaxPhase` back to `2` in a **generated** file for one commit. `sync_wowsims.py:447-455` writes that field unconditionally from `current_phase` with no carry-forward (contrast `watchedRefs`, which gets an explicit one at `:469-471` precisely because owned keys are otherwise clobbered). So the pin commit would carry a generated file its own generator does not reproduce, and **no gate can see it** — `grep -rn defaultMaxPhase scripts/*.py` finds only the OWNED_KEYS entry, the write, and two in-memory test fixtures that never read the real lock. Slice D's acceptance command (`--update --ref` then `git diff --exit-code`) would then pass while proving nothing, because the executor had just hand-set the field to the value the generator was always going to write. **This still honours the owner's decision 3**: its stated purpose is that the regen diff stay attributable, and no generator reads `defaultMaxPhase` — every consumer is a runtime read (`cli-wiring.ts:89-95`, `cli.ts:45-49`, `apps/web/server/main.ts:69`). The tier bump remains its own attributable step; the commit boundary moves, not the sequencing intent. Slice C already puts the tab on Phase 3 (`§3`), so the drafted P4 produced three inconsistent states rather than two. |
| P5 | ADR-0025 gets a new superseding ADR-0030 for Decision 1 (and the "watched ref, not built from" framing of Decision 5); Decisions 2–4 (the game-rule findings) stay accepted and are not re-argued. | R3/R4: only the pin policy is falsified, not the socket-bonus findings. |
| P6 | Universe regen (`data/universes/*`, 44 files + 44 reports) runs in slice B (inputs `db.json`, `data/proto/common.proto`, `data/proto/ui.proto` moved) and conditionally again in slice C (only if `data/equip-eligibility.json` or `data/sim-implemented-effects.json` moved). Predicted diff both times: **empty**. | `assemble_universe.py:29-45` names those inputs; R2 found no new gear items in `db.json`. Any moved path is a finding per data-pipeline rule 2. |

## 1. Slice 1 — `fetch_wowsimcli.py` can produce the binary for a sha pin

**Goal.** `pnpm fetch:wowsimcli` works when `lock["tag"]` is a commit sha, by building from source with the reproducible recipe from ticket 244, and refuses a tag containing `/`. Proven against `ec5c5f2` *before* the pin moves, using a new `--commit` override.

**Why build-from-source, and the tradeoff.**

- Releases exist for tags only; `releases/download/<sha>/...` 404s (ticket 244 measured 404 for the branch name; a sha is the same case). Verified by: `curl -s -o /dev/null -w "%{http_code}" -L https://github.com/wowsims/tbc-new/releases/download/ec5c5f205e61049d730e460967f8488774a7fe2a/wowsimcli-windows.exe.zip` → expect `404` (claim C2, executor re-runs).
- Rejected: **CI artifact**. Upstream's `release.yml` builds `wowsimcli-*.zip` only on tags (`vendor/tbc-new-fork/.github/workflows/release.yml:69-71`); whether `run_tests.yml` uploads a wowsimcli artifact on branch pushes is **hypothesis, untested** — even if it did, Actions artifacts expire and need a token, so a fresh worktree would still have no door.
- Rejected: **separate binary-version field** (e.g. `lock["cliRelease"] = "v0.0.134"`). It re-introduces two engines (binary from `master`'s tag, data from the branch), which is exactly what the owner's decision 1 rules out.
- Cost of building: needs `go` (present: `go1.25.4 windows/amd64`), `protoc` (present: `libprotoc 35.1`), `protoc-gen-go` (present: `C:\Users\dgree\go\bin\protoc-gen-go`), and a git object source for upstream at the pinned sha. Build is seconds to ~23 s (ticket 244). CI is unaffected: `.github/workflows/verify.yml` never calls `fetch:wowsimcli`, and the only test that needs the binary skips when it is absent (`packages/core/test/cli-sim-runner.test.ts:26`).
- **State the regression plainly (review F3), do not hide behind "CI is unaffected":** after this change, `pnpm fetch:wowsimcli` **hard-fails on any machine without go + protoc + protoc-gen-go**, where it previously downloaded a zip. That is a real loss of fresh-clone ergonomics for any future contributor or any worktree on another machine, and it is invisible to CI *precisely because* CI never runs it. It needs no solving — the owner is the only user — but it goes in ADR-0030's Consequences as a fourth entry, so a later reader does not conclude nothing was lost. Provenance: with `-trimpath` the binary is byte-reproducible (ticket 244 § Binary provenance, two clones → identical sha256), so the recipe + commit + `main.Version` + sha256 recorded together is the pin.

**Design (executor implements in `scripts/fetch_wowsimcli.py`).**

1. `RELEASE_TAG_RE = r"^v\d+\.\d+\.\d+$"`. If `tag` matches → existing download path, unchanged.
2. Else, if `"/" in tag` → exit 2 with: "lock tag `<tag>` contains `/`; pin a commit sha (`sync_wowsims.py --update --ref <sha>`) — a slash nests the vendor directory (docs/reviews/feat-engine-pin-backend-reforge.md)".
3. Else → build from source at `lock["commit"]`:
   - Object source: if `vendor/tbc-new-fork/.git` exists, `git -C vendor/tbc-new-fork fetch https://github.com/wowsims/tbc-new.git <commit>` then `git -C vendor/tbc-new-fork worktree add --detach <scratch>/wowsims-src-<commit[:12]> <commit>`; otherwise clone into `<scratch>`. **Fallback mechanics (review F3)**: a blobless partial clone fetches only the default branch's history, and `ec5c5f2` lives on `feature/backend-reforge`, so a bare `git clone --filter=blob:none` then `git checkout --detach <commit>` can fail to find the commit. Use `git clone --filter=blob:none --no-checkout <url> <scratch>`, then an explicit `git -C <scratch> fetch origin <commit>`, then `git -C <scratch> checkout --detach <commit>` — and **verify the checkout succeeded**, reporting rather than proceeding if not. This is the fallback path, so it is the one that will break on the machine that needed it. Scratch dir: `tempfile.mkdtemp()`; remove the worktree afterwards (`git worktree remove --force`).
   - `protoc -I=./proto --go_opt=Mgoogle/protobuf/descriptor.proto=google.golang.org/protobuf/types/descriptorpb --go_out=./sim/core ./proto/*.proto` (ticket 244; `vendor/tbc-new-fork/makefile:212-224` is the upstream target) — refuse with the makefile's own message if `protoc-gen-go` is the deprecated `github.com/golang/protobuf` one.
   - In `cmd/wowsimcli`: `go build -trimpath -o <binary> --tags=with_db -ldflags="-X 'main.Version=<commit>' -s -w"` with env `GOOS`/`GOARCH` from the `--platform` table (`windows/amd64` + `GOAMD64=v2`, or `linux/amd64` + `GOAMD64=v2`). `main.Version` = the full commit sha, so `CliSimRunner.version()` matches `lock.commit` (test at `cli-sim-runner.test.ts:31-34` accepts `lock.tag` or `lock.commit`).
   - Copy to `vendor/wowsimcli-<tag>-<platform>/<binary>`, chmod +x, print the sha256 and the exact recipe line.
4. New flags: `--commit <sha>` (override the lock's commit, for pre-pin proving and for slice 1's own test) and `--tag-dir <name>` (override the directory name; defaults to `lock["tag"]`). Both optional; documented in the docstring.

**Commands.**

```
python scripts/fetch_wowsimcli.py --commit ec5c5f205e61049d730e460967f8488774a7fe2a --tag-dir ec5c5f205e61049d730e460967f8488774a7fe2a
python scripts/fetch_wowsimcli.py --commit ec5c5f205e61049d730e460967f8488774a7fe2a --tag-dir probe-second-build
python -c "import hashlib,sys;print(hashlib.sha256(open(sys.argv[1],'rb').read()).hexdigest())" vendor/wowsimcli-ec5c5f205e61049d730e460967f8488774a7fe2a-win32-x64/wowsimcli-windows.exe
python -c "import hashlib,sys;print(hashlib.sha256(open(sys.argv[1],'rb').read()).hexdigest())" vendor/wowsimcli-probe-second-build-win32-x64/wowsimcli-windows.exe
python scripts/fetch_wowsimcli.py            # on the unchanged v0.0.119 lock: release path still works
```

**Predicted diff.** Tracked: `scripts/fetch_wowsimcli.py` only. Untracked (gitignored): two new `vendor/wowsimcli-*` dirs; delete `probe-second-build` after the `cmp`.

**Verification (and what would fail).**

- Two builds produce identical sha256 (data-pipeline rule 3). Fails if `-trimpath` or a flag is missing.
- Release path regression: `python scripts/fetch_wowsimcli.py` on the current lock writes `vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe` (already present; re-fetch must succeed).
- `git diff --stat` shows only the script. `pnpm lint`/`pnpm format:check` are the only verify gates that touch this file; `pnpm verify` says nothing about whether the build path works — the `cmp` above is the evidence.
- Record in the commit body: commit, recipe, `main.Version`, sha256 (ticket 244: omit any one and reproduction breaks).

**Rollback.** `git checkout -- scripts/fetch_wowsimcli.py`; `rm -r vendor/wowsimcli-ec5c5f2*` and the probe dir. Nothing tracked besides the script moved.

**Commit subject.** `Build wowsimcli from source when the pin is a sha`

Depends on claims: C2, C3, C4.

## 2. Slice B — move the engine pin to `ec5c5f2`

**Goal.** `data/wowsims.lock.json` pins `ec5c5f205e61…`; `vendor/wowsims/` and every committed artifact derived from it are regenerated and accounted for field by field; `data/proto/` and `packages/core/src/proto/` follow; the binary from slice 1 is the one the lock now names.

**Preconditions (executor checks, stops if any fails).**

- `gh auth status` → logged in (present: `dangreenberggit`).
- `python scripts/sync_wowsims.py --check` on the unchanged lock → **expect exit 1**, carrying exactly two DRIFT lines: "new release available" and "watched ref moved" (vendor checksums all match; R2 measured 98/98). Exit 1 *is* the success case here — read the lines, not the code (review F8). **Exit 2** means `vendor/` is empty or missing → run `--restore` first. Any "checksum mismatch" line means a local edit exists → stop.
- `gh api repos/wowsims/tbc-new/compare/5c7491899b5d71adecdc8de28d4fb2f77f0571b8...ec5c5f205e61049d730e460967f8488774a7fe2a --jq .status` → expect `ahead` (i.e. the `ret_p3` PER_FILE_PIN commit is an ancestor of the new pin; claim C5, hypothesis until run). If `ahead`: remove the `"ret_p3.gear.json"` entry from `PER_FILE_PIN` in `scripts/sync_wowsims.py:252-254` and shorten its comment, per that comment's own rule ("Promote a file out of this dict once its ref reaches the main pin"). If not `ahead`: leave it and note why.

**Step B1 — pin.**

```
python scripts/sync_wowsims.py --update --ref ec5c5f205e61049d730e460967f8488774a7fe2a
python scripts/sync_wowsims.py --watch-ref --ref feature/backend-reforge
```

No hand edit (revised P4). Both `currentPhase` and `defaultMaxPhase` become `3` here, written by the generator.

`--watch-ref` is **load-bearing, not cosmetic** (review F2a): `--update --ref` carries `watchedRefs` forward unchanged from the previous lock (`sync_wowsims.py:469-471`), so without the second command the watched entry would still name `cbf6b75` while the pin names `ec5c5f2`. Do not skip it.

Predicted `git diff` for `data/wowsims.lock.json` (claim C6):

- `tag`: `"v0.0.119"` → `"ec5c5f205e61049d730e460967f8488774a7fe2a"`; `commit`: `3267f8df…` → `ec5c5f20…`.
- `currentPhase`: 2 → 3. `defaultMaxPhase`: 2 → 3 (generator-written, revised P4).
- `files`: **`TRACKED` has 98 entries and `lock.files` has 98** (measured; the earlier "78" was wrong — review F2c). Exactly 8 change `sha256`/`bytes`: `db.json`, `constants_other.ts`, `proto_utils.ts`, `feral_sim.ts`, `feral_default.apl.json`, `ele_p1_a.gear.json`, `ele_p1_h.gear.json`, `enh_p5.gear.json` (R2). The other **90** entries are byte-identical. `ret_p3.gear.json` loses its per-file `"commit"` line if C5 held. This 98/8/90 split is the baseline for "every unpredicted path is a finding" — get it right before relying on it.
- `_comment`: unchanged (template at `sync_wowsims.py:456-462` is the text already in the file).
- `watchedRefs["feature/backend-reforge"]`: `commit` `cbf6b75…` → `ec5c5f20…`, `fetchedAt` → today.
- `proto` block: unchanged by this step (owned by `fetch_protos.py`; `merge_lock` carries it).
- `--update` prints `*** CONTENT TIER CHANGED: 2 -> 3 ***` with a follow-up list that is partly stale (it names `data/pools/<spec>.json` and "PLAN.md 14, Stage 5+"; pools are the universes since ADR-0028). Slice D fixes the text.

Line-ending check: `git diff --stat data/wowsims.lock.json` must show a small change count, not every line (the script writes `newline=""`; a CRLF rewrite would show ~500 lines).

**Step B2 — protos.**

```
python scripts/fetch_protos.py
pnpm proto:generate
pnpm typecheck
```

Predicted diff: `data/proto/api.proto` (large: BulkSim/ReforgeOptimize surface, +~225/-few vs the v0.0.119 pin — R2's number is right for *this* gap; R5 only corrected it for the fork's gap), `common.proto` (2 lines), `db.proto` (6 lines), `ui.proto` (−73 lines, raid-sim/Blessings messages); the other 12 unchanged. `data/wowsims.lock.json` `proto.commit` → `ec5c5f20…` and those 4 sha256s. `packages/core/src/proto/{api,common,db,ui}_pb.ts` regenerate; the other 12 generated files unchanged. **Hypothesis, untested:** `pnpm typecheck` stays green — `packages/core/src` imports only from `api_pb`, `common_pb`, `ui_pb` and the sole `Blessings` mention in `packages/core/src/spec.ts:198` is a comment; the command that would fail is `pnpm typecheck`.

**Step B3 — db-derived artifacts.**

```
pnpm data:items:generate
python scripts/list_phase_pool.py
pnpm sim-defaults:build
python scripts/build_feral_skeleton.py
```

Predicted `git diff --numstat -- data/`:

- `data/gems/palette.json`: exactly 4 gems change one stat each by −1 (ids 33135, 33140, 33143, 33144; R2). Entry count unchanged.
- `data/enchants/index.json`: R2 reports two new rows for effect id 963 ("Greater Impact", "Major Striking") in `db.json`'s enchant table — predict +2 entries or 1 changed entry (**UNCERTAIN**: R2's phrasing "ids 963 x2" is ambiguous; the executor reports the field-level diff).
- `data/items/index.json`: **unchanged** (generator emits no icon field — `grep -n icon scripts/generate_item_gem_index.py` → no hits; `db.json` gained only icons and no gear items).
- `data/pool-listings/ret-p3.md`, `feral-p3.md`: only the two pin header lines (`sha256 …`, `at \`<tag>\`, commit …`) change; zero item rows change. Note the header now reads a sha where it read a version (R5 § readers — cosmetic, accepted).
- `data/presets/feral/buff-defaults.json`: **UNCERTAIN**. `feral_sim.ts` changed `defaultExposeWeaknessSettings(Phase.Phase1)` → `defaultExposeWeaknessSettings()` (R2) and `extract_sim_defaults.mjs` resolves that helper as "a Map keyed by phase" (its docstring). The extractor may exit 2 (unresolvable expression) and need a small edit in `scripts/extract_sim_defaults.mjs`; if it runs, the `debuffs.exposeWeakness*` values may move. Whatever moves is reported field by field; if the script is edited, that edit is in the same commit with the reason.
- `data/presets/feral/p2.raid-sim-skeleton.json`: changes only if `buff-defaults.json` changed (it copies those blocks; rotation comes from the owner's export `owner-p2.settings-export.json`, not from the vendored APL — `build_feral_skeleton.py:64-66`). Otherwise unchanged. The 104-line upstream feral APL rewrite therefore does **not** enter this repo's skeleton.
- Everything else under `data/`: unchanged.

Rule-3 check: run `pnpm data:items:generate` twice (second run into a temp copy, or run then `git diff --exit-code` after the second run) → identical.

**Step B4 — universes (decision P6).**

For each spec in `ret feral balance hunter mage shadow rogue ele enh warlock warrior` and each phase in `2 3 4 5`: `python scripts/assemble_universe.py --spec <spec> --max-phase <N>`. Runtime per invocation: **hypothesis, untested** — run one first and time it; background the rest with `run_in_background` and a `--prefix`-style absolute path (no `cd`).

Predicted `git diff --numstat -- data/universes/`: **empty**. Any moved path is a finding to explain (most likely candidates: `.report.json` sidecars if they embed a timestamp or the db sha — executor reads the diff before deciding).

Then `pnpm fork-universes:check` → green iff universes did not move; if they moved, `python scripts/sync_fork_universes.py --write` and record it (that touches the fork working tree — do it *before* slice C's merge so the merge starts from a clean fork tree, then commit in the fork).

**Step B5 — binary and the one live test.**

The lock's `tag` now equals the directory slice 1 built: `vendor/wowsimcli-ec5c5f205e61049d730e460967f8488774a7fe2a-win32-x64/wowsimcli-windows.exe`. Run:

```
npx vitest run packages/core/test/cli-sim-runner.test.ts
```

It must report the two tests as **passed, not skipped** (the suite skips silently when the binary path is missing — an exit 0 with "skipped" is the failure mode to read for). Passing means the binary's `version()` equals `lock.commit` and the slamaltman fixture sims in range.

**Step B6 — verify.**

`pnpm verify`. Gates that genuinely exercise this slice (each would go red if the step above were skipped): `pool-listings:check` (B3), `sim-defaults:check` (B3), `skeleton:check` (ret skeleton vs `vendor/wowsims/ret_default.apl.json`, unchanged so must stay green), `feral-skeleton-apl:check`, `lock-merge:check`, `sync-wowsims:unit:check` (in-memory; unaffected by the real lock's values), `fork-universes:check` (B4), `typecheck` (B2), `test` (B5 + recorded-adapter tests). The three AtlasLoot gates say nothing about this slice. `upstream-drift:warn` will now print `new release available: ec5c5f2… -> v0.0.134` on every run — by design of `do_check` (it compares against the latest tag regardless of pin kind); warn-only, cosmetic, ticketed in slice E.

CI's extra gate: `pnpm proto:generate` then `git diff --exit-code -- packages/core/src/proto data/proto` — run it locally too; it is the check that fails if B2's generated output was hand-edited or stale.

**Rollback (whole slice, before commit).**

```
git checkout -- data scripts packages/core/src/proto
python scripts/sync_wowsims.py --restore
```

After commit: `git revert <B commits>` then `--restore`. `vendor/wowsims/` is rebuilt by `--restore` from whichever lock is checked out; the v0.0.119 binary dir is untouched and still present.

**Commits (three, in order).**

1. `Pin the engine to backend-reforge ec5c5f2` — lock, `scripts/sync_wowsims.py` (PER_FILE_PIN), palette/enchants/pool-listings/buff-defaults/skeleton regen. Body: the hand-set `defaultMaxPhase`, the 8 moved files, the field-level account of each regen, `numstat` output.
2. `Refresh data/proto and generated types from the pin`
3. `Regenerate universes against the new pin` — only if B4 moved anything; otherwise fold the "regenerated, no change" note into commit 1's body with the `numstat` (empty) as evidence.

Depends on claims: C1, C5, C6, C7, C8, C9.

## 3. Slice C — merge `ec5c5f2` into the fork's `feat/upgrades-tab`

**Goal.** `vendor/tbc-new-fork` `feat/upgrades-tab` contains upstream `ec5c5f2` (so the tab builds from the same engine the data pin names), `data/wowsims-fork.lock.json` records the merge commit, and every fork-derived committed artifact is re-derived and accounted for.

**How this is recorded and reproduced.** The clone at `vendor/tbc-new-fork` is gitignored and has its own `.git`; `pushed: false` in `data/wowsims-fork.lock.json` means **no copy of `feat/upgrades-tab` exists off this machine**. So: (a) this repo records only the merge commit sha and the base sha in `data/wowsims-fork.lock.json`; (b) a fresh worktree on this machine reproduces the state by `git -C vendor/tbc-new-fork checkout <commit from the lock>` (the clone is shared, not per-worktree — memory note "tab code is in gitignored vendor/tbc-new-fork (main checkout only)"); (c) a fresh machine **cannot** reproduce it until the fork is pushed, which is a separate owner ask (the lock's `_comment` says flipping `pushed` is deliberate). The plan does not push. This limitation predates the plan; the plan states it rather than claiming a fresh worktree can rebuild the fork.

**Preconditions.**

- `git -C vendor/tbc-new-fork status --porcelain` → empty (measured empty today).
- `git -C vendor/tbc-new-fork rev-parse HEAD` → `6d0edd69d237e725de8ec5d034c28aa10171bd21` == lock `commit`.
- Slice B committed (so B4's possible `sync_fork_universes --write` is already in the fork tree and committed there).

**Commands.**

```
git -C vendor/tbc-new-fork branch backup/pre-reforge-merge 6d0edd69d237e725de8ec5d034c28aa10171bd21
git -C vendor/tbc-new-fork remote add upstream https://github.com/wowsims/tbc-new.git      # skip if it exists
git -C vendor/tbc-new-fork fetch upstream ec5c5f205e61049d730e460967f8488774a7fe2a
git -C vendor/tbc-new-fork merge --no-ff --no-commit ec5c5f205e61049d730e460967f8488774a7fe2a
```

Expected: `CONFLICT (content): Merge conflict in ui/core/components/sim_header.tsx` and nothing else (R5 §4 `merge-tree` result; claim C10). If a second conflict appears, the branch tip moved or the simulation was wrong → stop and report the file list; do not resolve unplanned conflicts.

Conflict resolution (hand to a **Haiku** worker with `resolving-merge-conflicts`, per PROCESS.md Stage 3): keep **both** — ours adds a private tab-strip scroll-affordance method after the constructor (~lines 48-90); theirs drops the dead `hideInRaidSim` parameter from an unrelated method signature (~lines 92-240) and edits one JSX class name. No hunk overlaps semantically. Escalate to Sonnet if the resolved file does not typecheck.

Then:

```
git -C vendor/tbc-new-fork commit -F <msg-file>     # subject: Merge upstream feature/backend-reforge at ec5c5f2
git -C vendor/tbc-new-fork rev-parse HEAD            # -> MERGE_SHA, record it
git -C vendor/tbc-new-fork merge-base HEAD ec5c5f205e61049d730e460967f8488774a7fe2a   # must print ec5c5f2…
npm --prefix vendor/tbc-new-fork ci                  # package-lock.json merged on both sides
make -C vendor/tbc-new-fork proto                    # regenerates gitignored ui/core/proto/*.ts and sim/core/proto/*.pb.go
```

`make proto` needs `protoc` + `protoc-gen-go` (present) and `protoc-gen-es` from the fork's `node_modules` (**hypothesis, untested** that `npm ci` restores it; `vendor/tbc-new-fork/node_modules/.bin` currently shows `buf` but the grep did not list `protoc-gen-es` — executor checks `ls vendor/tbc-new-fork/node_modules/.bin | grep protoc-gen-es` after `npm ci` and reports). Then the fork's own typecheck/build as its `package.json` defines them (executor reads `vendor/tbc-new-fork/package.json` scripts; at minimum a `vite build` or `tsc --noEmit` must pass — the merged `individual_sim_ui.tsx`/`sim.ts` lost raid-sim imports on their side and gained tab wiring on ours).

**Lock update (hand edit, `data/wowsims-fork.lock.json`).** `commit` → MERGE_SHA; `branchedFrom` → `ec5c5f205e61049d730e460967f8488774a7fe2a` (the merge-base with upstream is now that commit; the field's own definition is "the upstream commit this fork branch actually sits on"); `_comment` rewritten: drop the 2026-08-21 divergence sentence, state "as of <date> both `data/wowsims.lock.json` and this file name `ec5c5f2` (ADR-0030); ticket 251 closed with a shape-changed note", keep the D1 pattern sentence, the gitignored-clone sentence and the `pushed:false` sentence verbatim. This satisfies ticket 251's third acceptance box.

**Fork-derived artifacts (each gate names its own regen).**

```
pnpm sim-implemented-effects:generate      # data/sim-implemented-effects.json, re-derived via git show <MERGE_SHA>:sim/**
pnpm sim-implemented-effects:check
node --import <file:// URL of node_modules/tsx/dist/loader.mjs> --import ./ui/core/components/individual_sim_ui/upgrades/tools/register.mjs ./ui/core/components/individual_sim_ui/upgrades/tools/export_equip_eligibility.mts <tmp.json>   # run from vendor/tbc-new-fork; see its tools/README.md:44-49
pnpm equip-eligibility:check
pnpm ep-presets:check
pnpm meta-conditions:check
pnpm engine-port-drift:check
pnpm fork-universes:check
```

Predictions:

- `data/sim-implemented-effects.json`: **may move** — the 121 upstream commits include class/spec sim fixes (rogue, enchant BasePoints+DieSides, incapacitate, Vampiric Touch, bear rage; R5 §3). Predict: a handful of effect entries change or appear; the executor lists each changed id and the upstream commit that explains it. **hypothesis, untested** on count.
- `data/equip-eligibility.json`: predict **unchanged** (hypothesis; the exporter reads `capabilities_auto_gen.ts` and `db.json`, and R2 found no new gear). If the exported JSON differs, copy it over the committed file and explain each spec's set delta.
- `pnpm ep-presets:check`, `pnpm meta-conditions:check`: predict **green** (hypothesis). On red: re-copy the numbers/conditions from the named fork symbol into `data/presets/<spec>/<phase>.ep-weights.json` / `data/gems/meta-conditions.json` — never edit the fork to match (the gates' own instruction).
- `pnpm engine-port-drift:check`: **green** — R5's 8-file overlap list contains nothing under `upgrades/`, so the ported engine files and `PROVENANCE.md` hashes are untouched (claim C11).
- `pnpm fork-universes:check`: green unless B4 changed universes and `--write` was skipped.
- If `data/equip-eligibility.json` or `data/sim-implemented-effects.json` moved: rerun the full universe regen from B4 (both are `assemble_universe.py` inputs), predicted diff empty, commit any movement separately with the account.

**Tab-side consequence to state in the commit body.** The tab reads upstream's `CURRENT_PHASE` live (`docs/fork-phase-seams.md` §1); after this merge the tab is on **Phase 3** immediately, before slice D flips this repo's default. That is the owner's "same engine" decision playing out, not a sequencing error, but it means the tab and `pnpm rank` disagree on the default tier between commits C and D. Say so.

**Layout gate — ANSWERED, no longer uncertain (review F5).** `sim_header.tsx` is **not** in the gate's file list. `check_layout_gate.py:111-116` defines `SHELL_FILES` as exactly `upgrades_tab.tsx`, `_upgrades_tab.scss`, `_sim_tab.scss`, `sim_tab.ts`; `SHARED_LAYOUT_FILES` (`:118-135`) is SCSS only. So the conflicted file does not re-arm the layout gate. Do **not** spend a measurement on this. One cheap real check remains: diff the merge's file list against those four names, in case the merge touched a SHELL_FILE for an unrelated reason.

**Verification.** `pnpm verify` — the six fork gates are the ones that would fail (or, with `_fork_gate`, exit 2 "clone HEAD is X but lock pins Y" if the lock edit were skipped). They **skip in CI** (no clone there), so this machine's green is the only evidence for the fork-derived artifacts; the commit body says so.

**Rollback.**

```
git -C vendor/tbc-new-fork merge --abort                       # if not yet committed
git -C vendor/tbc-new-fork reset --hard backup/pre-reforge-merge   # if committed
npm --prefix vendor/tbc-new-fork ci
make -C vendor/tbc-new-fork proto
git checkout -- data/wowsims-fork.lock.json data/sim-implemented-effects.json data/equip-eligibility.json data/gems/meta-conditions.json data/presets
```

The `upstream` remote and the backup branch are harmless to leave.

**Commits (this repo).** `Merge backend-reforge into the fork and re-pin it` (lock + re-derived artifacts; body carries MERGE_SHA, the conflict resolution summary, and each artifact's field-level account). Fork commit is the merge commit itself.

Depends on claims: C1, C10, C11, C12.

## 4. Slice D — default tier 2→3

**Goal.** `pnpm rank` defaults to `maxPhase 3`; cached rankings are invalidated; the lock again equals the generator's output.

**What the flip causes (measured, not assumed).**

- `packages/core/src/cli.ts:45-49,106` `defaultMaxPhaseFromLock()` → `cli-wiring.ts:89-94` reads `lock.defaultMaxPhase ?? lock.currentPhase` → 3 when `--max-phase` is omitted.
- Universe: `cli-wiring.ts:103` loads `data/universes/<spec>-p3.json` — present for all 11 specs (`ls data/universes`). No regen for the flip.
- Skeleton: `cli-wiring.ts:128` and `rank.ts:559-561` use `p2.raid-sim-skeleton` regardless of phase — unaffected.
- EP weights: `data/presets/ep-weights-by-phase.json` resolved by phase (`cli-wiring.ts:139-142`; `ep-weights.ts:56-78` picks the highest key ≤ 3). Ret has `p3.ep-weights.json`; feral only `p1` (documented). No regen.
- Gem palette: `gems.ts:40-41` filters the committed `data/gems/palette.json` (regenerated in B) by phase ≤ 3. No regen.
- `list_phase_pool.py:71` already hardcodes `MAX_PHASE = 3`; unaffected.
- `content-hash.ts`: `maxPhase` is in the hashed payload (`:65`), so every default-run key changes anyway; `ENGINE_VERSION` (`:52`) is passed in by `rank.ts:774` and is **not** read inside `content-hash.ts` (grep shows the export only), so `content-hash.test.ts`'s golden (which sets `engineVersion: 1` in `BASE`, `:72`) does not move when the constant is bumped. No test asserts `ENGINE_VERSION === 6` or `defaultMaxPhase === 2` (researcher grep, not found).
- The sync runbook's items "regenerate `data/items/index.json` and `data/gems/palette.json`" were done in B (they are db-driven, not tier-driven); "curate the new tier's items into `data/pools/<spec>.json`" is stale text (pools are universes; `data/pools/` holds only a README) — fix the text here.

**Edits.** (Revised P4: the lock already reads `defaultMaxPhase: 3` from slice B — this slice does not touch the lock at all.)

1. ~~`data/wowsims.lock.json`~~ — no lock edit in this slice.
2. `packages/core/src/content-hash.ts:52`: `ENGINE_VERSION = 6` → `7`, comment line naming this bump's reason (engine moved to `ec5c5f2` + default tier 3).
3. `PLAN.md` line 29: "Currently **2**" → "Currently **3**" (per §8.5's own rule).
4. `scripts/sync_wowsims.py:489-493` printed follow-up list: replace the `data/pools/<spec>.json` / "PLAN.md 14, Stage 5+" lines with the real steps (universes exist per phase under `data/universes/`; regenerate db-derived artifacts; bump `ENGINE_VERSION`; update PLAN.md line 29). Also `:571-574` message unchanged.

**Commands / verification.**

```
python scripts/sync_wowsims.py --update --ref ec5c5f205e61049d730e460967f8488774a7fe2a
git diff --exit-code -- data/wowsims.lock.json        # generator reproduces the committed lock exactly; a REAL check now that nothing is hand-edited (revised P4)
python scripts/sync_wowsims.py --check                # expect EXIT 1 with only the "new release available" DRIFT line; no tier line, no checksum lines. Exit 2 means vendor/ is absent -- run --restore first (review F8)
npx tsx packages/core/src/cli.ts --region US --realm dreamscythe --character slamaltman --offline --spec ret --show-below-cutoff --iterations 100
npx tsx packages/core/src/cli.ts --region US --realm dreamscythe --character shredzepelin --offline --spec feral --show-below-cutoff --iterations 100
pnpm verify
```

**These two runs are LIVE SIMS, not replays (review F3b).** The plan's earlier "UNCERTAIN — do the recorded adapters key on the content hash?" was a non-question: `cli.ts:308` wires `CliSimRunner` unconditionally, and `--offline` only swaps the **gear source**. `RecordedSimRunner` is unreachable from the CLI. So each command spawns slice 1's from-source binary across the larger p3 universe. Consequences the executor must plan for:

- **Bound the iterations** (`--iterations 100` above, or whatever the CLI's flag is named — read `cli.ts` and use the real one). Unbounded, these are the longest step in the plan and their runtime is unmeasured.
- Time the ret run first before starting feral; if either exceeds a few minutes, background it with an absolute path (no `cd`) rather than blocking.
- A failure here is a **finding about the new engine**, not a missing fixture. Do not re-record anything in this slice (out of scope, ticket 353).

`pnpm test` is the gate for everything else; `sync-wowsims:unit:check` and `lock-merge:check` are unaffected by the value.

**Rollback.** `git revert` the two commits; nothing outside git changes (no vendor effect).

**Commits.** (1) `Default the content tier to Phase 3` — lock + PLAN.md line 29 + runbook text. (2) `Bump ENGINE_VERSION for the new engine and tier`.

Depends on claims: C13, C14.

## 5. Slice E — decisions, docs, tickets

**Goal.** Every written decision this work falsifies is corrected where it lives, with the date and the commands.

1. **`docs/adr/0030-build-from-feature-backend-reforge-on-both-pins.md`** (new; numbering follows 0029). Status accepted, date, Relates to ADR-0025, ADR-0027, PLAN.md §8, §9; tickets 251, 263, 337. Context: the owner's Gate 1 decision (PROCESS.md § Gate 1 outcome), R4's two-pin vocabulary, R5's numbers (126 ahead / 121 behind at merge-base `cbf6b75`, 1 conflict). Decision: (1) both `data/wowsims.lock.json` and `data/wowsims-fork.lock.json` name the same commit on `feature/backend-reforge`; the engine pin is a sha, not a tag, pinned with `--update --ref <sha>`; the branch name lives in `watchedRefs`; (2) the wowsimcli binary is built from source with the recorded recipe (commit, flags, `main.Version`, sha256 — copied from slice 1's commit body); (3) re-pin procedure: slices 1→B→C→D of this plan, condensed to a checklist; (4) ADR-0025 Decision 1 and the "watched, not built from" half of Decision 5 are superseded; Decisions 2–4 stand. Consequences — **four**, and the last two carry standing risk (review F3, F4):

  1. `sync_wowsims.py --check` reports "new release available" permanently on a ref pin (ticket 354, both symptoms).
  2. The fork tab's content tier follows the branch, not this repo's default.
  3. **`pnpm fetch:wowsimcli` now hard-fails without go + protoc + protoc-gen-go**, where it used to download a zip. Invisible to CI because CI never runs it.
  4. **A fresh machine cannot rebuild the fork, and this decision widens what depends on that.** Name what is now downstream of the unpushed merge: the `sim_header.tsx` conflict resolution exists nowhere else, and this repo's committed `data/sim-implemented-effects.json` (and possibly `equip-eligibility.json`) are **derived from that unpushed merge commit**. If the machine dies, those committed artifacts become unre-derivable and their gates exit 2 forever with no path back. The *class* of this limitation predates the decision; this specific escalation does not — which is why the ADR carries it rather than a scratch plan that gets deleted. Ticket 355 tracks pushing or archiving the branch.
2. **`docs/adr/0025-…md`**: `Status: accepted — Decision 1 superseded by ADR-0030 (2026-09-…)`; a one-line note under Decision 1 pointing at 0030. Leave the "as of v0.0.101" stamps: they date the findings and are true as history.
3. **`PLAN.md`**: line ~274 — replace "Ret has three curated sets in `tbc-new` and they stop at P2, so above `maxPhase: 2` there is nothing to pin" with the true statement (ret ships p1/p2/p3 as of `5c7491899`; feral to p5; the toggle disables for whichever (spec, maxPhase) has no set — ticket 121/153). Line ~320 (`wowsims.lock.json` "pinned upstream tag") → "pinned upstream ref — a release tag or, since ADR-0030, a commit sha on `feature/backend-reforge`". §8.1 "from the same wowsims release as the binary" → "from the same pinned commit as the binary". §9 line ~650: the clause "its active development lives on `feature/backend-reforge`, not the pinned tag, so our repair pass remains ours" → keep "our repair pass remains ours (ADR-0025 decisions 2–4)" and drop the "not the pinned tag" reason; add "(pin moved to that branch, ADR-0030)".
4. **`docs/plans/wowsims-tab/plan.md`** D2 row (line 56): append "Amended 2026-09-…: fork and engine both pin `ec5c5f2` on `feature/backend-reforge` (ADR-0030, ticket 251)". Line 602's mitigation row: same one-line note. This is ticket 251's second acceptance box.
5. **Tickets** (`.scratch/carry-forward/issues/`):
   - `251-…`: `Status: closed`. Append `## Closed 2026-09-…`: none of the three listed options was taken — the *engine* pin moved onto the branch (a fourth shape the ticket did not contemplate); record the sha, the merge commit, the D2 amendment location, the `_comment` fix; tick the boxes; the ahead/behind numbers in the body are superseded by R5.
   - `263-…`: stay `open`, remove "do not start", append: precondition satisfied on <date> (one repo, one branch, commit `ec5c5f2` holds every spec's presets — ret/feral in `vendor/wowsims/`, bear in the fork, same commit); `Blocked by: none`.
   - `337-…`: `Status: closed`. Append: trigger fired (`33617c607a50` is an ancestor of `ec5c5f2`, R1); migration done in slice D; note the runbook lines about `data/pools/` were stale and were corrected; caveat about `fetch_wowsimcli.py` resolved by slice 1.
   - New **353**: "Re-baseline committed sim numbers and recorded fixtures against engine `ec5c5f2`; SME look at the feral rotation change" (origin: this plan; the prior pin review recorded −18 DPS feral rotation regression and 15→27 above-cutoff rows with no domain look; recorded adapters still replay old-engine numbers). **The ticket must ENUMERATE which committed numbers are now suspect** (review, G-gap) — list the files and the specific figures, so a later session does not have to re-derive the blast radius. Deferring the fix is right; deferring the inventory is not.
   - New **354**: "`sync_wowsims.py --check` misreports drift on a `--ref` pin" — **two symptoms, not one** (review F7): (a) the cosmetic permanent "new release available" line, and (b) the second-order bug — `do_check:566-575` fetches `constants_other.ts` **at the latest master tag** and compares its `CURRENT_PHASE` to ours, so if master ever moves to Phase 4 the `*** CONTENT TIER CHANGED ***` line fires from a tag that is **not an ancestor of `feature/backend-reforge`**. Quiet after slice D (both read 3), latent thereafter. Cover both.
   - New **355**: "Push or archive the fork branch `feat/upgrades-tab`" (review F4) — `pushed: false` means the branch exists on exactly one machine, and this plan puts a merge commit on it, growing what is lost if that disk dies. Write `356` to `NEXT`.
6. **`docs/agents/known-traps.md`**: new section `## Before moving the wowsims engine pin` — five lines: pin a sha not a branch name (slash → nested dir); `--update --ref` flips `currentPhase` in the same write; `fetch_wowsimcli.py` builds from source for a sha pin; the fork gates exit 2 until `data/wowsims-fork.lock.json` names the clone's HEAD; predict the regen list before running (data-pipeline rule 2). This is a tracked doc an agent is pointed at — run the `writing-for-agents` review pass on it and on ADR-0030 before committing (AGENTS.md § Writing for agents).

**Verification — ANSWERED (review F5).** **No `pnpm verify` gate reads any document slice E edits.** Measured: `check_policy_notes.py` contains no `docs/` or `.md` reference (it checks each spec's `d7Note` against committed JSON payloads); `check_skill_mirrors.py:11-13` compares `.claude/skills` against `.agents/skills`, not `docs/`. The only gates slice E can trip are `format:check` and `lint`, plus `pnpm issues:open`.

State the consequence plainly rather than hiding it: **ADR-0030, the PLAN.md corrections and `known-traps.md` have no automated check at all.** The `writing-for-agents` review pass this slice already calls for is the only gate on them — keep it, and do not treat a green `pnpm verify` as evidence about their content.

`pnpm issues:open` must list 263 and the three new tickets and not 251/337. `grep -n "Currently \*\*2\*\*" PLAN.md` → no hits.

**Rollback.** `git revert` the slice-E commit(s); pure text.

**Commits.** `Record ADR-0030 and amend ADR-0025 for the branch pin`; `Close tickets 251 and 337, unblock 263`; `Correct PLAN.md claims the pin move falsified`.

## 6. Slice partition — what runs in parallel (nothing)

Files per slice (tracked only):

| Slice | Files |
| --- | --- |
| 1 | `scripts/fetch_wowsimcli.py` |
| B | `data/wowsims.lock.json`, `scripts/sync_wowsims.py`, `data/proto/*` (4), `packages/core/src/proto/*` (4), `data/gems/palette.json`, `data/enchants/index.json`, `data/items/index.json` (predicted no-op), `data/pool-listings/{ret,feral}-p3.md`, `data/presets/feral/buff-defaults.json`, `data/presets/feral/p2.raid-sim-skeleton.json`, `scripts/extract_sim_defaults.mjs` (maybe), `data/universes/*` (predicted no-op) |
| C | `data/wowsims-fork.lock.json`, `data/sim-implemented-effects.json`, `data/equip-eligibility.json` (maybe), `data/gems/meta-conditions.json` (maybe), `data/presets/*/*.ep-weights.json` (maybe), `data/universes/*` (conditional), plus the fork repo |
| D | `data/wowsims.lock.json`, `packages/core/src/content-hash.ts`, `PLAN.md`, `scripts/sync_wowsims.py` |
| E | `docs/adr/0025-*.md`, `docs/adr/0030-*.md`, `PLAN.md`, `docs/plans/wowsims-tab/plan.md`, `.scratch/carry-forward/issues/{251,263,337}-*.md`, two new tickets, `NEXT`, `docs/agents/known-traps.md` |

Files appearing twice: `data/wowsims.lock.json` (B, D), `scripts/sync_wowsims.py` (B, D), `PLAN.md` (D, E), `data/universes/*` (B, C). Data dependencies besides files: C's regen reads `vendor/wowsims/db.json` (B's output) and slice 1's binary is needed by B5; D's generator check needs B's lock; E needs shas and the binary sha256 from 1/B/C. So the order is **1 → B → C → D → E, strictly serial, one executor**. The only parallelisable piece is drafting ADR-0030's prose, and it is not worth a worktree. Per PROCESS.md the executor is Sonnet; the conflict in C goes to a Haiku worker with `resolving-merge-conflicts`.

## 7. Verification honesty — what a green `pnpm verify` does and does not say

- The three `data-pipeline-work` gates (`sync:atlasloot:verify-local`, `atlasloot:regen:check`, `rep-tables:check`) are AtlasLoot-only and say nothing here.
- Gates that **do** read the engine pin's outputs and fail hard when `vendor/wowsims` is absent: `sim-defaults:check`, `skeleton:check` (ret), `pool-listings:check`. CI restores `vendor/wowsims` (`verify.yml`), so these run there too. They prove the committed artifacts match a regeneration from the vendored files; they do not prove the vendored files match upstream — that is `sync_wowsims.py --check`'s checksum section (run locally in B and D; warn-only in verify).
- Gates that read the **fork** (`engine-port-drift`, `equip-eligibility`, `ep-presets`, `meta-conditions`, `sim-implemented-effects`, `fork-universes`) **skip in CI**. Green in CI proves nothing about slice C; only this machine's run does. Slice C's commit body must say "verified on this machine; CI skips these gates".
- The proto gate (`proto:generate` + `git diff --exit-code`) runs only in CI; run it locally in B.
- The one live-sim test (`cli-sim-runner.test.ts`) **skips silently** without the binary; "passed" must be read from vitest's output, not inferred from exit 0.
- Nothing in verify checks the binary's provenance; slice 1's double-build `cmp` and the recorded sha256 are that evidence.
- No gate checks that a committed DPS number is still true on the new engine (ticket 353).

## 8. Claims register

| ID | Claim | Verified by |
| --- | --- | --- |
| C1 | `feature/backend-reforge` tip is `ec5c5f205e61049d730e460967f8488774a7fe2a`; our pin `3267f8d` is a clean ancestor (153 behind, 0 ahead). | R5 §1 commands; executor re-runs `gh api repos/wowsims/tbc-new/commits/feature/backend-reforge --jq .sha` before slice B. If it differs, the plan still pins `ec5c5f2` (owner's measured target); note the new tip in the ADR. |
| C2 | No GitHub release asset exists for a sha or branch ref. | `curl -s -o /dev/null -w "%{http_code}" -L https://github.com/wowsims/tbc-new/releases/download/ec5c5f205e61049d730e460967f8488774a7fe2a/wowsimcli-windows.exe.zip` → 404 (ticket 244 measured 404 for the branch name; sha re-measured by executor). |
| C3 | The from-source build is byte-reproducible with `-trimpath`. | Ticket 244 § Binary provenance (two clones, identical sha256); slice 1 repeats the `cmp`. |
| C4 | Go, protoc, protoc-gen-go are present; CI never fetches the binary; the only binary-dependent test skips when absent. | `go version`; `protoc --version`; `which protoc-gen-go`; `grep -c fetch:wowsimcli .github/workflows/verify.yml` → 0; `cli-sim-runner.test.ts:26`. |
| C5 | `5c7491899` (ret_p3 PER_FILE_PIN) is an ancestor of `ec5c5f2`. | `gh api repos/wowsims/tbc-new/compare/5c7491899b5d71adecdc8de28d4fb2f77f0571b8...ec5c5f205e61049d730e460967f8488774a7fe2a --jq .status` → `ahead`. hypothesis, untested. |
| C6 | **CORRECTED (review F2c).** Exactly 8 of **98** TRACKED files differ between the pin and `ec5c5f2`; the other 90 are byte-identical; vendor checksums all match the lock today. The earlier "78" was wrong. | Measured: `TRACKED` has 98 entries, `lock.files` has 98. R2 `git diff --stat 3267f8dfa4a2 ec5c5f205e61 -- <paths>`; R2 checksum script 98/98. Slice B's `git diff data/wowsims.lock.json` shows 8 changed entries. The "exactly 8" half is untested until slice B runs. |
| C7 | `db.json` delta is icons + 4 gem stat corrections + 2 enchant rows, no new gear items. | R2 § db.json in detail; slice B's palette/enchants diff. |
| C8 | Protos moved in `api`, `common`, `db`, `ui` only. | R2 § Protos (`git diff --stat 3267f8dfa4a2 ec5c5f205e61 -- proto/`); slice B's `fetch_protos.py` output. |
| C9 | `packages/core` typechecks against the new generated protos. | `pnpm typecheck`. hypothesis, untested. |
| C10 | Merging `ec5c5f2` into `feat/upgrades-tab` conflicts in exactly one file, `ui/core/components/sim_header.tsx`. | R5 §4 `git -C vendor/tbc-new-fork merge-tree --write-tree 6d0edd69d… ec5c5f205e…`; the real merge in slice C. |
| C11 | Upstream's 121 commits touch nothing under `upgrades/`, so `engine-port-drift:check` stays green. | R5 §3 overlap list (8 files, none under `upgrades/`); `pnpm engine-port-drift:check` after the merge. |
| C12 | The fork gates exit 2 until `data/wowsims-fork.lock.json.commit` equals the clone's HEAD. | `scripts/_fork_gate.py:84-112`. |
| C13 | A default of 3 needs no universe/preset regen: p3 universes exist for all 11 specs; skeleton is fixed to p2; EP weights resolve by phase. | `ls data/universes`; `cli-wiring.ts:103,128,139-142`; `rank.ts:559-561`. |
| C14 | Bumping `ENGINE_VERSION` breaks no test; no test pins a literal `6` or `defaultMaxPhase 2`. **Claim stands; its stated evidence was slightly false** (review F6). | Measured: the grep returns `content-hash.test.ts:113` (a **comment** telling you to bump ENGINE_VERSION rather than edit the payload shape) plus seven `apps/web` hits — `server/main.ts:13,69,76`, `server/routes.ts:31,51`, and their `dist-server` build outputs. All are runtime plumbing that reads the lock; none pins a literal. Expect the `apps/web/dist-server/*` hits and do not be surprised by them. `pnpm test` is the gate. |
| C15 | `extract_sim_defaults.mjs` may fail on `defaultExposeWeaknessSettings()` losing its phase argument. | hypothesis, untested; `pnpm sim-defaults:build` in slice B. |
| C16 | `data/sim-implemented-effects.json` may move after the fork merge; `equip-eligibility.json`, `ep-weights`, `meta-conditions.json` predicted unchanged. | hypothesis, untested; the five gate commands in slice C. |
| C17 | The fork's `feat/upgrades-tab` exists nowhere off this machine. | `data/wowsims-fork.lock.json` `pushed: false`; `git -C vendor/tbc-new-fork branch -r` shows no `origin/feat/upgrades-tab`. hypothesis for the second command, untested. |
| C18 | `pnpm verify`'s fork gates skip in CI; `pool-listings`, `sim-defaults`, `skeleton` fail hard without `vendor/wowsims`. | Researcher table: `_fork_gate` callers `is_dir()` skips; `list_phase_pool.py:518-528`; `extract_sim_defaults.mjs:214-218`; `check_raid_sim_skeleton.py:63-66`. |

## 9. Paths manifest (every file the executor touches)

Tracked, this repo: `scripts/fetch_wowsimcli.py`; `scripts/sync_wowsims.py`; `scripts/extract_sim_defaults.mjs` (only if C15 fires); `data/wowsims.lock.json`; `data/wowsims-fork.lock.json`; `data/proto/api.proto`, `common.proto`, `db.proto`, `ui.proto`; `packages/core/src/proto/api_pb.ts`, `common_pb.ts`, `db_pb.ts`, `ui_pb.ts`; `data/gems/palette.json`; `data/enchants/index.json`; `data/items/index.json` (predicted unchanged); `data/pool-listings/ret-p3.md`, `feral-p3.md`; `data/presets/feral/buff-defaults.json`, `p2.raid-sim-skeleton.json`; `data/universes/*.json` (predicted unchanged); `data/sim-implemented-effects.json`; `data/equip-eligibility.json`, `data/gems/meta-conditions.json`, `data/presets/*/*.ep-weights.json` (only on gate red); `packages/core/src/content-hash.ts`; `PLAN.md`; `docs/adr/0025-upstream-has-a-gem-optimizer-we-stay-pinned-and-borrow-only-its-rules.md`; `docs/adr/0030-build-from-feature-backend-reforge-on-both-pins.md` (new); `docs/plans/wowsims-tab/plan.md`; `docs/agents/known-traps.md`; `.scratch/carry-forward/issues/251-fork-base-no-longer-matches-the-engine-pin.md`, `263-derive-meta-preferences-once-upstream-is-one-repo-one-branch.md`, `337-*.md`, new `353-*.md`, `354-*.md`, `NEXT`.

Untracked / gitignored: `vendor/wowsimcli-ec5c5f205e61049d730e460967f8488774a7fe2a-win32-x64/`; `vendor/wowsims/*` (rewritten by `--update`); `vendor/tbc-new-fork` (merge commit, `node_modules`, regenerated `ui/core/proto/*.ts`, `sim/core/proto/*.pb.go`, new branch `backup/pre-reforge-merge`, new remote `upstream`).

## 10. Out of scope

- Pushing the fork or opening the upstream PR (`pushed:false` stays; separate owner ask).
- Re-recording sim fixtures or re-baselining committed DPS numbers on the new engine; SME review of the feral rotation change (ticket 353).
- Fixing `sync_wowsims.py --check`'s permanent "new release available" line on a ref pin (ticket 354).
- Adding a `data/wowsimcli.build.json` binary-provenance file (a third lockfile writer; the recipe lives in ADR-0030 and the slice 1 commit body instead — reviewer may prefer the file).
- Linux binary build (the recipe supports `--platform linux-x64`; not exercised here).
- Layout gate baseline (`data/wowsims-fork-layout.lock.json`) — handled by `pnpm merge-to-dev` in Stage 4 if the hash moved.
- Any `maxPhase 4/5` work, Wowhead token verification for new tiers, or `data/two-hop` extension (ticket 337's text mentions them; the tier-3 data already exists).
- Merging to `dev` (Stage 4 stops after the review file).

## 11. Open uncertainties, listed once

**Closed by the plan review — do not spend measurements on these four:**

- ~~P4 hand-edit~~ — decided: no hand edit, both fields flip with the pin (F1, owner-confirmed).
- ~~`sim_header.tsx` in the layout gate~~ — **no** (F5, `check_layout_gate.py:111-116`).
- ~~`policy-notes:check` reads docs~~ — **no**, and neither does `mirrors:check` (F5).
- ~~Do the recorded adapters key on the content hash?~~ — **a non-question** (F3b): `RecordedSimRunner` is unreachable from the CLI; slice D's runs are live sims.

**Still open, each measured at the step that needs it:**

C5 ancestry; C9 typecheck; C15 extractor signature; C16 which fork-derived artifacts move; `protoc-gen-es` presence after `npm ci`; universe regen runtime; **slice D's live-sim runtime over the p3 universe** (new, from F3b — bound the iterations and time the first run).

**Register the one doc-sourced claim** (review): "the tab reads upstream's `CURRENT_PHASE` live" (§3) is sourced to `docs/fork-phase-seams.md §1` — a document, not a command — and it underwrites a user-facing sentence in a commit body. Either verify it against the fork's code before writing that sentence, or attribute it to the doc in the body.
