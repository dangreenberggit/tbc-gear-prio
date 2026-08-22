# Plan review — stage-3-web-shell (round 1)

Reviewer seat (`gate-reviewer`, opus) on plan at `2a2940ff10b25bda2a6c3df766dbe040a17f98d7`, 2026-08-22.

VERDICT: revise

## Findings

| ID | Severity | Where | What breaks | Evidence |
| --- | --- | --- | --- | --- |
| F1 | blocking | Approach Q1; C1 | `applyView` in the browser ships a 6.6 MB JSON. `view.ts` → `rank-report-rules.ts` (runtime, line 9, not type-only) → `items.ts` line 13 `import rawIndex from "../../../data/items/index.json" with { type: "json" }`. C18 asks only "any `node:` built-ins?" and answers no — a question whose answer does not establish the conclusion it is registered for. Every view control re-render is browser-side by design (gate box 4), so this is on the critical path of the plan's central UX claim, and no step budgets for it. | `ls -l data/items/index.json` → `6825902`; `sed -n 13p packages/core/src/items.ts`; `sed -n 9p packages/core/src/view.ts`; `sed -n 11p packages/core/src/rank-report-rules.ts` |
| F2 | blocking | Step 11 acceptance; C5 | The gate-box-5 acceptance criterion is backwards, so box 5 cannot be closed by the evidence the plan names. `loadUniversePool` reads a **separate pre-built file per phase** (`data/universes/${spec}-p${maxPhase}.json`), not a superset narrowed at runtime. `ret-p2.json` has 16 `bisTags: ["BiS"]` entries; `ret-p3.json` has 391 entries and **also 16** BiS-tagged. So `pinBisAvailable` is true at `maxPhase: 3`, not false. The plan has no reproducible way to produce the `pinBisAvailable === false` state it must demonstrate. | `sed -n 261,274p packages/core/src/cli.ts`; BiS-tag counts in `data/universes/ret-p2.json` and `ret-p3.json` (16 each) |
| F3 | material | C1; Approach Q1 | C1 is false as stated and is the plan's *sole* declared ground for Q1=A ("B is dropped for that reason alone"). `C:/Users/dgree/Code/lulz/tbc-gear-prio/.env` exists (110 bytes) with `WCL_CLIENT_ID` and `WCL_CLIENT_SECRET`. `.env` is gitignored (`.gitignore:2`), so its absence from a worktree is an artifact of worktree creation — exactly the durable-claims failure AGENTS.md names ("never assert that a gitignored input is absent for a fresh worktree"). The **conclusion** Q1=A survives independently on PLAN.md §14 ("needs its own real planning pass before Stage 3 closes — not scoped here"), but the reasoning of record is false, the brief's required sizing measurement was never performed (no file or step count for B, unlike Q2 which does count), and the "strongest rejected alternative" paragraph's "if a credential appears" is now a live counterfactual. | `ls -la C:/Users/dgree/Code/lulz/tbc-gear-prio/.env`; `git check-ignore -v .env` → `.gitignore:2:.env`; key names `WCL_CLIENT_ID`, `WCL_CLIENT_SECRET` |
| F4 | material | Step 7; C26 | `expectedRows = filterPoolByPhase(pool, maxPhase).length` overstates the row count, so the skeleton renders phantom rows that never fill — which reads to a user as a hung run and directly threatens gate boxes 2 ("feels calm") and 3 ("zero layout shift", if the skeleton is trimmed at completion). `rankUpgrades` filters further after the pool: `isKaelTempLegendary` exclusion (`rank.ts:698-700`), `candidateCap` (`rank.ts:718-719`), worn-slot skip (`rank.ts:887-888`), and cutoff classification (`rank.ts:981`). Also, the CLI does not call `filterPoolByPhase` at all — it loads a per-phase file (F2). | `sed -n 695,720p packages/core/src/rank.ts`; `sed -n 261,274p packages/core/src/cli.ts` |
| F5 | material | Step 2; C7 | The extraction step is not executable as written. `resolveWowsimcli()` takes **no argument** — it closes over module-level `const root` at `cli.ts:58`; the plan specifies `resolveWowsimcli(root): string`. Line numbers are all wrong: `resolveWowsimcli` is at 276-281 (plan says 275-280), skeleton/EP/pool loading spans 283-322 (plan says 300-320), gear recordings span ~353-398 (plan says 355-400). Worse, `loadUniversePool` calls `console.error` and `process.exit(2)` — both banned by the purity `no-restricted-globals` rule; the plan's C8 fix only adds `cli-wiring.ts` to `ignores`, which does silence it, but the plan never notices that the moved code carries process-exit behaviour into a module the server will import. A server that calls `loadOfflineInputs` on a missing universe file will `process.exit(2)` and kill the web process. | `sed -n 58p packages/core/src/cli.ts`; `sed -n 261,281p packages/core/src/cli.ts`; `sed -n 92,93p eslint.config.js` |
| F6 | material | Step 3; C21 | The `IndividualSimSettings` lowering omits `apiVersion`, which C21's field list does not mention. wowsims gates on it: `if (!(settingsProto.apiVersion < CURRENT_API_VERSION)) return;` then runs `migrateOldProto`. A message with the proto default `apiVersion: 0` is treated as ancient and silently rewritten by the migration chain (e.g. the drums conversion at version 7). The step-3 acceptance only checks `wowsimcli decodelink` exit 0 and `player.equipment` equality — `decodelink` does not run the UI migration, so the check passes while the link is wrong in the actual site. The acceptance is not evidence for the claim. | `grep -n "CURRENT_API_VERSION" vendor/tbc-new-fork/ui/core/individual_sim_ui.tsx` → lines 528, 565, 568, 662; `sed -n 527,540p` same file |
| F7 | material | C22, C6 | Two register rows are misleading in ways a step depends on. (a) C22 asserts v0.0.119 "has a `decodelink` subcommand" but its evidence is a verification-log entry about **v0.0.101** — a property measured against one binary, cited for another. (I ran it: v0.0.119 does have `decodelink`, so the claim is true but the evidence given does not support it.) (b) C6's "all fixtures are committed" is true but hides that `nexess` has a `.raw.json` and **no** `.raid-sim-result.json`, unlike slamaltman and shredzepelin-cat. Step 10's acceptance says "the three recorded names render gear within 2 s" — gear may work, but a *run* on nexess has no recorded sim result, so any step treating the three as uniformly runnable is wrong. | `vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe --help` → lists `decodelink`; `git ls-files test/fixtures` — no `nexess.raid-sim-result.json` |
| F8 | material | Paths manifest / Partition | `apps/web/package.json` appears in **S2's `pathsAllowed` and S3's `pathsForbidden`** with a parenthetical that S2 adds React/Vite deps "before S3 starts" — but S2 and S3 are declared to run *in parallel* after step 4. S3 cannot build (`vite`, `react` unresolved) until S2's step 5 lands, and step 5 is the *first* S2 step whose output S3 needs while S2 continues to steps 6-8. This is a sequencing dependency dressed as a partition. Also `apps/web/tsconfig.ui.json` and `vite.config.ts` are **created in step 5 (S2's step)** but owned by S3 — a created path whose creating step sits in the other slice. | Plan Partition table rows S2/S3; step 5 creates `tsconfig.ui.json` and `vite.config.ts`, both in S3's `pathsAllowed` |
| F9 | material | Unregistered claim, Approach Q2 | "A adds 3 runtime deps and 4 dev deps… B's dependency count is strictly larger than A's 7" is a causal/comparative claim carrying the Q2 decision, and its own text admits `hypothesis, untested` on the counts — but it is **not in the Claims register** at all, and no register row covers Q2. The brief required B's count to be stated; the plan states A's and asserts B's is larger without measuring it. Same defect as F3: a property measured against one option presented as a comparison. | Plan Approach Q2 bullet; register has no Q2 row (C1-C28 reviewed) |
| F10 | material | Step 15, Verify recipe | `git diff --stat c256b34 -- packages/core/test` uses a hardcoded SHA with no stated relationship to the branch base. The prompt's base SHA is `2a2940ff…`, the brief says `8a1c01af…`, and the branch tip is `2a2940f`. `c256b34` resolves but is none of these. If it is an ancestor far behind the base, the diff shows unrelated Stage 2 test churn and the acceptance "shows only the two new test files" fails for reasons unrelated to this plan — or passes vacuously if it is ahead. The step never says what `c256b34` is. | `git rev-parse HEAD` → `2a2940ff10b25bda2a6c3df766dbe040a17f98d7`; `git rev-parse --short c256b34` → resolves, unexplained |
| F11 | minor | Step 4; C16 | The `exports` map addition is safe for current consumers but for a reason the plan never states: **nothing in the repo imports `@tbc-gear-prio/core` by package name today** — the CLI and all tests use relative `./x.js` paths inside `packages/core`. So the risk the reviewer was asked to check (breaking the CLI, tests, or `tsx`) is nil, but the plan's confidence rests on C16 (which only reads the manifest), not on that fact. Worth recording, because the moment `apps/web` imports by name, `moduleResolution: NodeNext` plus a bare `exports` map with no `types` condition will fail typecheck for the subpath `./view`. | `grep -rn "@tbc-gear-prio/core" --include=*.ts .` → only `packages/core/package.json:2` and a comment in `index.ts:1`; `cat tsconfig.base.json` → `"moduleResolution": "NodeNext"` |
| F12 | minor | Verify recipe | The recipe is a bash block containing `pnpm web:build && PORT=3000 pnpm web:start &` and `> /tmp/after.txt` on a Windows-primary machine, plus `jq` (not established as present). AGENTS.md's CLI-environment section warns backgrounded Bash does not inherit `cd`, and the recipe opens with a `cd`. The recipe will not run as written on the stated dev platform. | Plan Verify recipe lines 141-155; env is `win32`, PowerShell primary |

## Register verdicts

| Claim | Verdict | Evidence |
| --- | --- | --- |
| C1 | **refuted** | `.env` exists at `C:/Users/dgree/Code/lulz/tbc-gear-prio/.env` (110 bytes, `WCL_CLIENT_ID` + `WCL_CLIENT_SECRET`); absent from worktree only because `git check-ignore -v .env` → `.gitignore:2`. See F3. |
| C2 | stands | `cat pnpm-workspace.yaml` → `apps/*` listed; `ls apps` → no such directory; `grep -c react package.json` → 0 |
| C3 | stands | `sed -n 905,918p PLAN.md` — Stage 3 gate has six boxes, none mentions restart; "caches survive restart" is under Stage 4 |
| C4 | stands | `sed -n 554,558p packages/core/src/rank.ts`; `sed -n 165,185p` — signature and all seven `Progress` variants exact, including the `{kind:"row"}` side channel |
| C5 | stands | `sed -n 314p packages/core/src/view.ts`; `pinBisAvailable` declared `:95`, computed `:343` as `r.items.some(i => i.bisTags.includes("BiS"))`; `ViewOptions` fields match. (The claim stands; step 11's *use* of it does not — F2.) |
| C6 | **refuted** | Three names resolve, but "all fixtures are committed" conceals that `nexess.raid-sim-result.json` does not exist. See F7b. |
| C7 | **refuted** | Every cited line range is wrong, and `resolveWowsimcli()` takes no argument (`cli.ts:58` module-level `root`). See F5. |
| C8 | stands | `sed -n 93p eslint.config.js` → `ignores: ["packages/core/src/seams/**", "packages/core/src/cli.ts"]` verbatim |
| C9 | stands | `individual_link_exporter.tsx:31-35` → `toBinary` → `pako.deflate` → `btoa` → `linkUrl.hash`; importer lines 22/28/29 → `atob` → `pako.inflate` → `fromBinary` |
| C10 | stands | `grep -n` → `contentHashOf(` at `rank.ts:723`; `rankingCacheKey` at `:744`, `:1279`, defined `:1841` |
| C11 | stands | `sed -n 62,102p packages/core/src/content-hash.ts` — `ContentHashInput` built field-by-field, no `ViewOptions` field |
| C12 | stands | `store.ts:7` `import { DatabaseSync } from "node:sqlite"`; `job.create` at `:176-205` does `SELECT COUNT(*)` then `INSERT` with no `await` between |
| C13 | stands | `node --version` → v22.16.0; `require('node:sqlite')` loads with ExperimentalWarning; `verify.yml` → `runs-on: ubuntu-latest`, `node-version: 22` |
| C14 | stands | `cat vitest.config.ts` — no `include`; excludes only node_modules/dist/.scratch/.claude-worktrees/vendor. `apps/web/test/*.test.ts` would be collected |
| C15 | stands | `cat tsconfig.json` → `"files": []` with two references; `package.json:11` → `"typecheck": "tsc --build"` |
| C16 | stands | `cat packages/core/package.json` → `main: ./dist/index.js`, `types: ./dist/index.d.ts`, no `exports`; `ls packages/core/dist` → absent |
| C17 | **untestable** here | Self-labelled `hypothesis, untested`; deferred to executor step 1. Core tsconfig confirms `outDir: dist`, `composite: true` (inherited), no `noEmit` — consistent, but I did not run `tsc --build` (write to tree). Note the row's `Load-bearing` column says `yes` while its `Verified by` says untested — a load-bearing untested row. It is low-risk: the config genuinely implies emission. |
| C18 | **refuted** | True as literally worded (no `node:*` in the closure — I confirmed the full transitive set: view, cutoff, pool, rank-report-rules, items, two generated modules, types) but it does not establish "can be bundled for the browser": `items.ts:13` pulls a 6.6 MB JSON at runtime. See F1. |
| C19 | stands | `sed -n 430,463p packages/core/src/rank.ts`; `hitDriven` present per `RankedItem`; `Ranking` carries no `RaidSimRequest` |
| C20 | stands | `compose` exported at `compose.ts:29`, re-exported `index.ts:169` |
| C21 | **refuted** | Field list is incomplete in a load-bearing way: `IndividualSimSettings` also has `apiVersion` (`ui_pb.ts`, field 15), which wowsims' importer gates its migration chain on. See F6. Row is marked `Load-bearing: no`, which is itself wrong — step 3's external round-trip depends on it. |
| C22 | stands (evidence insufficient) | v0.0.119 present in main checkout, absent in worktree, and `--help` confirms `decodelink`. But the row's *cited* evidence is a log entry about v0.0.101. See F7a. |
| C23 | stands | `sed -n 1,10p` on all three ticket files — 72 `Blocks: phase-3`; 78 `Blocks: phase-3`, `Blocked by: WclGearSource / going-live plan`; 31 `Blocks: phase-4` |
| C24 | stands | `sed -n 55,70p scripts/check_merge_ready.py` — `BLOCKS_RE`, `PHASE_BRANCH_RE`, `OPEN_STATUSES` behave as described |
| C25 | **untestable** | Self-labelled `hypothesis, untested`; I did not fetch external URLs. The brief made confirming TMB's labels an in-scope requirement ("Confirm TMB's actual control labels before building the filter UI"); deferring it to a log note is a scope reduction the plan should surface as a deviation, not a register row. Judgment: acceptable as a *third* deviation if stated as one. |
| C26 | **refuted** | `filterPoolByPhase` is exported (`pool.ts:180`, `index.ts:67`), but its count ≠ `rankUpgrades`' row count, and the CLI does not use it for pool loading at all. See F2, F4. |
| C27 | stands (moot) | Self-labelled `hypothesis, untested` and explicitly not relied on — the plan resolves core through `dist`. No load. |
| C28 | stands | `package.json:63` `lint-staged ~16.4.0`; `.githooks/pre-commit` comments confirm `--no-stash --no-hide-partially-staged` |

## What must change before execution

Two blockers, both about evidence for gate boxes rather than about the architecture:

- **F1** — decide how `applyView` reaches the browser without the 6.6 MB item index. The options differ in kind: split `setPotentialIsConfounded` out of `rank-report-rules.ts` so `view.ts`'s runtime closure drops `items.ts`; inject the item lookup into `applyView`; or serve `applyView` from the server and give up gate box 4. The plan must pick one and register the measurement, because box 4 ("filters and pins re-render without a network round trip") is the one box whose closure depends entirely on this.
- **F2** — find a reproducible input that makes `pinBisAvailable` false, or box 5 cannot close. `maxPhase: 3` does not do it. If no such input exists over the committed universes, box 5 needs a different demonstration or must be recorded ☐ with the reason, the same honesty precedent the plan already invokes for box 1.

The Approach's Q1 conclusion (offline-first) is correct, but reached on a false premise — F3 requires re-arguing it on PLAN.md §14's scoping line and performing the sizing count the brief asked for, not merely patching C1. Q2, Q3 and Q4 survive: Q4's reasoning is sound and its measurement is the right one (no Stage 3 box needs restart survival, confirmed against `PLAN.md` L909 vs L915), and Q3's "the export is the opposite lowering from ticket 72's lift" holds against the proto shapes.

The two stated deviations from §12 are both legitimate and well-argued — deviation 1 in particular correctly identifies that `contentHash` is unavailable at submit time (C10 verified) and offers a real substitute. A third deviation (C25, TMB labels unconfirmed) should be promoted from a register row to a stated deviation, since the brief made confirming them in-scope.

---

# Plan review — round 2 (revision 1, changed claims only)

Reviewer seat (`gate-reviewer`, opus) on plan at `bcc873b0172bcd213486baab4ab26011d61e3cb4`, 2026-08-22.

VERDICT: proceed

## Findings

| ID | Severity | Where | What breaks | Evidence |
| --- | --- | --- | --- | --- |
| G1 | minor | Step 2a; C7 | Signature re-ordering is silent. The existing function is `loadUniversePool(maxPhase: ContentPhase, spec: SpecId)`; step 2a specifies `loadUniversePool(root, spec, maxPhase)` — the two kept params are in the opposite order. Both are narrow types, so a swap likely fails typecheck rather than silently — minor. Worth one line in the step telling the executor the order changed. | `sed -n 261p packages/core/src/cli.ts` |
| G2 | minor | Step 11; deviation 4 | `rank.ts` emits `simming` from three sites (`:963`, `:1034`, `:1365`), and only `:1034` will carry `candidates` per step 2c. If the first poll that observes `stage: "simming"` lands on a `:963` or `:1365` emission, the client sees no `candidates` and must hold the fixed-height container rather than render zero skeleton rows. Fix: render skeletons on the first poll where `candidates` is **defined**, not the first `simming` poll. | `grep -n 'stage: "simming"' packages/core/src/rank.ts` → 963, 1034, 1365 |

No blocking or material findings remain.

## Register verdicts — rows in scope

| Claim | Verdict | Evidence |
| --- | --- | --- |
| C1 (rev 1) | stands | `grep -o '^[A-Z_]*=' C:/Users/dgree/Code/lulz/tbc-gear-prio/.env` → `WCL_CLIENT_ID=`, `WCL_CLIENT_SECRET=`; `git check-ignore -v .env` → `.gitignore:2` |
| C3 (rev 1) | stands | `sed -n 898p PLAN.md` → "needs its own real planning pass before Stage 3 closes — not scoped here"; L909 six boxes, no restart; L915 Stage 4 |
| C6 (rev 1) | stands | `git ls-files test/fixtures` — `nexess.raw.json` present, no `nexess.raid-sim-result.json`; `cli.ts:372-373` maps the refs |
| C7 (rev 1) | stands | `:58` root; `:261` `loadUniversePool` with `console.error` + `process.exit(2)` at `:267-271`; `:276` `resolveWowsimcli()` no-arg; `:300-322`. See G1 |
| C16 (rev 1) | stands | `grep -rn "@tbc-gear-prio/core" --include=*.ts . \| grep -v node_modules` → one comment hit at `index.ts:1` |
| C18 (rev 1) | stands | `view.ts:9` value import of `setPotentialIsConfounded`; `rank-report-rules.ts:11` imports `getItem` from `items.js`; `items.ts:13` imports the 6,825,902-byte JSON |
| C21 (rev 1) | stands | `apiVersion` at `ui_pb.ts:985` (field 15); `individual_sim_ui.tsx:528` gate; `constants/other.ts:15`; the extension is generated in our protos at `common_pb.ts:3320` (`current_version_number = 50000`) with `ProtoVersionSchema` at `:33`, so step 3's preferred branch is reachable; preset `"apiVersion": 13` |
| C22 (rev 1) | stands | v0.0.119 `--help` → `decodelink  decode wowsims link/url`; worktree `ls vendor` absent |
| C26 (rev 1) | stands | `rank.ts:698-700`, `:1022` `candidateCap`, `:887-888`; `cli.ts:261-274` per-phase file |
| C29 (new) | stands | Re-ran the row's command; all eight versions and counts match exactly |
| C30 (new) | stands | `rank-report-rules.ts:676-681` six lines over `item.setContext?.prospectiveBonusBreaks`; callers `view.ts:285`, `rank-report-rules.ts:693`; no test calls it directly |
| C31 (new) | untestable here, low risk | After the move, `view.ts`'s closure is `cutoff.ts` (type-only `SpecId`) and `pool.ts` (all `import type`, incl. `ItemSlot` from `items.ts`); `tsconfig.base.json:12` `verbatimModuleSyntax: true` guarantees erasure. 400 kB has headroom |
| C32 (new) | stands | feral-p2 17, feral-p3 17, ret-p2 16, ret-p3 16, ret-p4 16, ret-p5 16 |
| C33 (new) | stands | `rank.ts:1032` `totalSims = 1 + simCandidates.length + replicaSims`; `:965` `if (!best) return`. See G2 |
| C34 (new) | stands | `git merge-base HEAD dev` → `8a1c01af…`; tip now `bcc873b` (row says `eae0fdd`, one commit stale, immaterial — recipe computes merge-base at run time) |
| C35 (new) | stands | `jq --version` → command not found |

## F1–F12 disposition

| # | Status | Note |
| --- | --- | --- |
| F1 | addressed | `set-potential.ts` move genuinely drops `items.ts`: it is the only value import on the path, and `pool.ts`'s `ItemSlot` import is type-only under `verbatimModuleSyntax` |
| F2 | addressed | `Deps.pool?: readonly PoolEntry[]` is a real injection point (`rank.ts:137`, "Curated (or test) candidate pool"); step 7 asserts both polarities; box 5 ☑ with the caveat stated |
| F3 | addressed | C1 rewritten; Q1 performs the sizing (12 steps, ~8 files vs 17 steps, ~45 files) and cites L898; credential carried into the follow-up ticket |
| F4 | addressed | `filterPoolByPhase` dropped; deviation 4 + step 2c `candidates` from `simCandidates.length` after the cap |
| F5 | addressed | C7 corrected; `resolveWowsimcli(root)`; result union replaces `process.exit`, server returns 400 |
| F6 | addressed | C21 load-bearing with `apiVersion`; step 3 reads the proto option (exists in our generated protos) with a constant-13 fallback and drift test; step 3 and step 8 acceptance check `apiVersion` |
| F7 | addressed | C22 evidence is the 0.0.119 binary; C6 states the nexess gap and its consequence |
| F8 | addressed | S1 owns every manifest and both placeholders; S2 and S3 share no path; `apps/web/test/fixtures/**` forbidden to S3 |
| F9 | addressed | C29: two-sided registry counts, reproduced |
| F10 | not a defect | Per orchestrator; C34 records provenance; recipe uses `$(git merge-base HEAD dev)` |
| F11 | addressed | C16 carries the fact; step 4 adds the `types` condition on all three `exports` entries |
| F12 | addressed | `$W` + `pnpm -C` / `git -C`, scratchpad path, `node -e` for JSON, foreground server in a second tool call |

## Assessment

Every blocking finding is resolved on its merits. The two resolutions probed hardest both hold under direct verification. The revision also improves the plan's honesty beyond what round 1 demanded (deviation 3 promotes the unconfirmed TMB labels; deviation 4 discloses the skeleton-timing compromise; box 5's log entry will say no committed universe reaches the state demonstrated). G1 and G2 are one-sentence fixes in step text; neither needs another review round.
