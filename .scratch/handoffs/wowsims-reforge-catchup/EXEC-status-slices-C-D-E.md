# Execution status — slices C, D and E (wowsims-reforge-catchup)

Branch `feat/wowsims-reforge-catchup`, continued from base SHA
`1d462f693883d32e7d3326860e4c8a8e594075ba` (matched the SHA the orchestrator
named; no correction needed). Shared checkout, not a worktree. Model: Opus.

Scope executed: **slices C, D and E**. Stopped there — no `pre-merge-review`, no
merge, no push.

## Commits

| SHA | Slice | Subject | Files |
| --- | --- | --- | --- |
| `313d470` | C | Merge backend-reforge into the fork and re-pin it | `data/wowsims-fork.lock.json`, `data/sim-implemented-effects.json` |
| `8913860` | D | Invalidate cached rankings for the Phase 3 default | `packages/core/src/content-hash.ts`, `PLAN.md`, `scripts/sync_wowsims.py` |
| `ad7f2d7` | E | Record ADR-0030 and correct what the pin move falsified | 11 files (ADR-0030 new, ADR-0025, PLAN.md, tab plan, known-traps, 6 tickets + NEXT) |

Plus, in the **fork** (`vendor/tbc-new-fork`, gitignored, own git repo,
`pushed: false` unchanged):

| SHA | Branch | Subject |
| --- | --- | --- |
| `ab59127d9faad30cdd4190b5f7e6780e34405822` | `feat/upgrades-tab` | Merge upstream feature/backend-reforge at ec5c5f2 |

Backup branch `backup/pre-reforge-merge` points at `b8e7f9e8d`, the actual
pre-merge tip. The plan said to point it at `6d0edd69d`; see the ledger.

## The conflict, and who resolved it

**I resolved it myself. I did not hand it to a Haiku worker, and that is a
deliberate deviation** — see the ledger row. Escalation to Sonnet was never
needed: the resolved file typechecks.

The merge produced exactly one conflict, `ui/core/components/sim_header.tsx`,
confirming claim C10 against a real merge (`merge-tree` had only simulated it).

**The plan's resolution rule did not apply.** It described "ours adds a private
tab-strip scroll-affordance method after the constructor; theirs drops a dead
`hideInRaidSim` parameter and edits one JSX class name; no hunk overlaps
semantically", with the rule "keep both". The actual conflict is a **single JSX
hunk** inside `customRootElement()` — two versions of the same subtree, where
closing-tag balance depends on which nesting survives. "Keep both" is not a
possible resolution of that.

What I did instead, and the evidence for each half:

| Side | Kept? | Why |
| --- | --- | --- |
| Ours: `<div className="sim-header-container-wrap">` wrapper | **kept** | Load-bearing for our own code. `sim_header.tsx:67` does `querySelector<HTMLElement>('.sim-header-container-wrap')!` — a non-null assertion that throws at runtime without it — and `ui/scss/core/sim_ui/_header.scss:42` styles it. Introduced by our commit `d7ea63197` "Unbreak the Upgrades tab on mobile". |
| Theirs: removal of `within-raid-sim-hide` | **taken** | Gone from upstream entirely — 0 occurrences at `ec5c5f2`, 8 at our pre-merge tip. The merge had already auto-resolved the other 7 away; keeping this one would leave an orphan class with no SCSS definition anywhere in the merged tree. |

Verified: no conflict markers remain, and the fork's own
`node node_modules/typescript/bin/tsc --noEmit` exits 0.

The merge touched **no** file in `check_layout_gate.py`'s `SHELL_FILES`
(`upgrades_tab.tsx`, `_upgrades_tab.scss`, `_sim_tab.scss`, `sim_tab.ts`), so the
layout gate is not re-armed. That was the plan's one cheap real check for F5, run
against the real merge file list.

## Predicted vs actual, every regen

### Slice C

| Artifact | Predicted | Actual | Match? |
| --- | --- | --- | --- |
| conflict count / file | 1, `sim_header.tsx` | 1, `sim_header.tsx` | Yes (resolution rule did not match — above) |
| `data/sim-implemented-effects.json` | "may move — a handful of entries" | Moved by **exactly one**: item `17076`, Bonereaver's Edge, plus the embedded pin line. 217→218 implemented; 451 stub-only unchanged | Yes, at the low end |
| `data/equip-eligibility.json` | unchanged | Unchanged — the gate re-ran the fork exporter and reports all 17 specs matching at `ab59127d9faa` | Yes |
| `data/gems/meta-conditions.json` | green, no edit | Green, 18 meta gems match | Yes |
| `data/presets/*/*.ep-weights.json` | green, no edit | Green, 20 files match | Yes |
| `engine-port-drift:check` | green (C11) | Green, 33 ported files match `PROVENANCE.md` | Yes |
| `data/universes/*` (conditional regen) | empty diff | **Empty.** All 88 files (44 universes + 44 report sidecars) rewritten byte-identically | Yes |

The new Bonereaver's Edge entry is attributed: upstream commit `ea112d982` "add
bonereaver's edge proc", `sim/common/tbc/items_weapons.go`. It changed **no**
universe membership — the empty universe diff is the evidence.

The universe regen was **required, not optional**:
`data/sim-implemented-effects.json` is a declared input of
`assemble_universe.py` (line 40), and it moved. I checked that rather than
assuming the conditional did not fire.

### Slice D

| Check | Predicted | Actual | Match? |
| --- | --- | --- | --- |
| lock already at `currentPhase`/`defaultMaxPhase` = 3 | yes (revised P4) | Yes, both 3 from slice B | Yes |
| `--update --ref` then `git diff --exit-code` on the lock | exit 0, a real check now | **Exit 0.** `hash-object` on the working copy equals HEAD's blob exactly | Yes |
| `--check` drift lines | exit 1, only "new release available", no tier line | **Exactly that.** No CONTENT TIER line (lock and master both read 3), no checksum mismatch | Yes |
| ret live sim | runs, p3 universe | `maxPhase=3 universe=467 cutoff=3.4 DPS`, 504 sims, exit 0, ~2m40s | Yes |
| feral live sim | runs, p3 universe | `maxPhase=3 universe=364 cutoff=3.6 DPS`, 401 sims, exit 0, ~1m30s | Yes |
| `typecheck` after `ENGINE_VERSION` 6→7 | green (C14) | Green | Yes |

Both CLI runs are **live sims**, per F3b — `cli.ts:308` wires `CliSimRunner`
unconditionally. None of the three failure modes the review named appeared: no
missing EP preset, no missing curated BiS data, no `wowsimcli` error on a p3
item. They are the strongest end-to-end evidence on this branch: the from-source
binary, the new pin and the tier default all work together, with no
`--max-phase` flag passed.

### Slice E

No regen. `pnpm issues:open` lists 263, 353, 354, 355 and does **not** list 251
or 337 — the plan's acceptance condition, measured. `grep -c 'Currently \*\*2\*\*'
PLAN.md` → 0. No duplicate ticket numbers; `NEXT` advanced to 356.

## Uncertainties measured, and their answers

| Question | Answer |
| --- | --- |
| `protoc-gen-es` present after `npm ci`? (plan's open uncertainty) | **No — and the question was mis-aimed.** The fork uses `protoc-gen-ts`, not `protoc-gen-es`; the makefile's proto target calls `npx protoc --ts_out`. `npm ci` installs 374 packages and `make proto` succeeds. The plan's grep was looking for a binary this fork never uses. |
| Does `make proto` work on this machine? | Yes, **but only with `SHELL=/bin/bash`**. GnuWin32 make defaults to `cmd.exe`, and the makefile has no `SHELL` override, so its `uname`/`realpath`/`find` calls fail. `make` is not on PATH in Git Bash either; it lives at `C:\Program Files (x86)\GnuWin32\bin`. |
| Slice D live-sim runtime over the p3 universe (new, from F3b) | ret ~2m40s (504 sims), feral ~1m30s (401 sims). Backgrounded both; neither needed bounding. |
| Is there an `--iterations` flag to bound them? | **No.** The plan assumed one. The CLI's real flags do not include it; runs use `DEFAULT_ITERATIONS = 3000` across `DEFAULT_SEED_COUNT = 5` seeds. Runtime turned out modest, so the missing bound cost nothing. |
| Is 263's precondition really satisfied? | **Yes, verified rather than asserted.** `data/wowsims.lock.json` `commit` = `ec5c5f2`; fork lock `branchedFrom` = `ec5c5f2`; bear presets present in the fork clone. |
| Do ret's curated sets really stop at P2 (PLAN.md's claim)? | **No.** Measured at this pin: ret ships `p1`, `p2`, `p3`, `preraid`; feral ships `p2`, `p3` in 6p/9p plus `preraid`. Neither reaches p4/p5. The plan's draft text said feral reaches p5 — also wrong; I wrote what I measured. |
| Is `sim-implemented-effects.json` an `assemble_universe.py` input? | **Yes**, line 40 — which is what made the universe regen mandatory. |

## Deviation ledger

| Step | Plan said | Found | Action | Why |
| --- | --- | --- | --- | --- |
| C precondition | `git -C vendor/tbc-new-fork rev-parse HEAD` → `6d0edd69d` == lock `commit` | HEAD was `b8e7f9e8d` | **adapt** | Slice B legitimately advanced the clone by one commit (universe-bundle refresh), and the slices-1-B handoff anticipates exactly this. Verified `b8e7f9e8d` is a direct descendant of `6d0edd69d` before proceeding, so the merge base moves forward by precisely that one commit. The plan's own sequencing note covers it. |
| C backup branch | `git branch backup/pre-reforge-merge 6d0edd69d…` | Pointed it at `b8e7f9e8d` instead | **adapt** | A backup exists to restore the pre-merge state. Pointing it at `6d0edd69d` would silently discard slice B's fork commit on rollback — the opposite of what a backup is for. Local, unambiguous intent. |
| C conflict resolution | Hand to a Haiku worker with `resolving-merge-conflicts`; rule "keep both"; ours = a scroll-affordance method after the constructor, theirs = a dead `hideInRaidSim` param + one class name | The conflict is one JSX hunk in `customRootElement()`, two versions of the same subtree. Neither side matched the plan's description, and "keep both" is not a possible resolution | **adapt** | The plan's brief for the worker was factually wrong about the file. Dispatching a Haiku worker with a resolution rule that cannot apply invites a confidently wrong merge in code that exists on exactly one machine. Resolving it needed evidence-gathering (git log -S, cross-tree greps, SCSS lookups) to establish which side was load-bearing — the judgment the plan's own escalation clause reserves for a stronger lane. The result is gated: fork `tsc --noEmit` exits 0. |
| C fork typecheck | fork's typecheck must pass after the merge | Failed first with 4 × TS2307 `Cannot find module './constants_auto_gen'` | **adapt** | Not a merge defect and not mine. `constants_auto_gen.ts` is **gitignored**, so it was never in the merge; upstream moved the bulk-sim WASM code to `ui/core/wasm/bulk_sim/` and `gen_bulksim_constants.ts.go` writes the new path at line 184 while still declaring the old one at line 15 — an upstream inconsistency, carried identically by both sides of the merge. `make go-to-ts` regenerates both paths; typecheck then exits 0. Recorded in the fork commit body. |
| C universe regen | conditional: rerun "if `equip-eligibility.json` or `sim-implemented-effects.json` moved" | `sim-implemented-effects.json` moved, so I reran all 44 | followed the plan | Noted because the trigger fired and could have been skipped by assuming the one-id change was inconsequential. Diff empty, so the Bonereaver's Edge entry provably changes no membership. |
| D iteration bound | "`--iterations 100` above, or whatever the CLI's flag is named — read `cli.ts` and use the real one" | No such flag exists on this CLI | **adapt** | The plan told me to read `cli.ts` and use the real flag; the real answer is that there is none. Ran unbounded but backgrounded and timed, per the plan's own fallback ("time the ret run first; background it rather than blocking"). Runtime was modest. |
| E PLAN.md "ret stops at P2" | correct line ~274 | The same false claim also sits at line ~542 | **adapt** | Correcting one instance of a claim I had just measured as false while knowingly leaving its twin would be dishonest. Same file, same claim, same commit. |
| E `AGENTS.md` pointer | not mentioned | `AGENTS.md:87` enumerates the branches that should send an agent to `known-traps.md`, and my new section adds a branch that list does not name — by `writing-for-agents`' own reasoning, a pointer-wording variance bug | **flag** | `AGENTS.md` is **not in the Paths manifest**, and the project requires proposing changes to it in chat and waiting for approval, since it steers every future session. Left unedited. **Suggested one-word addition** for the owner: insert "moving the wowsims engine pin" into that sentence's list of actions. |
| E ticket 251 acceptance box | "`pnpm verify` green" | Not literally true at this tip | **adapt** | Ticked with the exception stated inline rather than silently: every fork gate is green (which is what 251 is about); the `test` gate is red on the 11 pre-existing feral failures deferred to 353. Recording it as unqualified green would be a false durable claim. |

Nothing reached **stop**. No register claim was refuted; C10, C11, C12, C13, C14
and C16 all held.

## `pnpm verify` at the tip — exact state, per failure

**`pnpm verify` exits 1.** It is **not** green, and the branch is legitimately
un-green. The full account:

| Gate | Result |
| --- | --- |
| `typecheck`, `lint`, `format:check` | exit 0 |
| `equip-eligibility:check` | exit 0 — "17 specs match the fork at `ab59127d9faa`" |
| `ep-presets:check` | exit 0 — "20 files match the fork symbols they name" |
| `meta-conditions:check` | exit 0 — "18 meta gems match the fork's table" |
| `sim-implemented-effects:check` | exit 0 — "218 implemented, 451 stub-only, matches committed file" |
| `engine-port-drift:check` | exit 0 — "33 ported files match PROVENANCE.md" |
| `fork-universes:check` | exit 0 — "63 bundled copies byte-match their data/ sources" |
| `pool-listings:check` | exit 0 — "both listings match a fresh regeneration" |
| `sim-defaults:check`, `skeleton:check`, `lock-merge:check` | exit 0 |
| `test` | **exit 1 — 11 failed, 1258 passed, 1 skipped, 2 todo** |

The three fork gates that were **red when I started** (`equip-eligibility`,
`ep-presets`, `meta-conditions`, all exiting 2 with "clone HEAD is X but lock
pins Y") are now green. Slice C's lock edit closed them exactly as the plan
predicted.

The 11 failures are **the same 11** the previous executor documented, in the
same three files with the same distribution — all feral, none ret:

| File | Count | Cause |
| --- | --- | --- |
| `full-sweep-recall.test.ts` | 8 | Recorded-adapter sim-key misses from slice B's legitimate `buff-defaults.json` change |
| `synthetic-fixtures.test.ts` | 2 | Same recall path, synthetic replay |
| `individual-settings.test.ts` | 1 | Stale hand-authored `apiVersion` 13 vs `CURRENT_API_VERSION` 15 |

**Slices C, D and E added no new failures.** I did not touch, re-record or
hand-fix any fixture, per the instruction.

### Judgement: what this means for Stage 4

The branch is **legitimately un-green, and it should not be merged in this state
without a deliberate owner decision.**

The failures are deferred **by design**, not overlooked: the plan defers them to
ticket 353 and the review's Axis G explicitly endorses deferring rather than
fixing them in the same commit that causes them — re-recording here would put the
engine change and its own detector in one diff. That reasoning is sound and I
followed it.

But two things follow that Stage 4 must weigh, and I am not the seat to decide
them:

1. **`pnpm merge-to-dev` runs `pnpm verify` and will refuse this tip.** Merging
   requires either closing 353 first, or an explicit override. There is no path
   where this merges quietly.
2. **The deferred failures are exactly the tests that would detect an engine
   problem.** While they are red, this branch has no automated evidence that the
   new engine produces correct feral numbers — which is precisely what ticket
   353's SME item exists to answer. The green gates above prove the *pipeline* is
   consistent; they prove nothing about whether the numbers are *right*.

My recommendation, for the orchestrator rather than my call to take: run
`pre-merge-review` on this tip as planned, and treat ticket 353 as a merge
blocker rather than a follow-up, since it is the only thing standing between
this branch and an unverified engine change. If the owner prefers to merge
first, that is a legitimate call — but it should be made knowingly, not
discovered when `merge-to-dev` refuses.

## Session environment notes

- The fnm PATH pin was needed for every Node/pnpm command in both shells. Bash
  emits the `fnm env` error on stderr constantly; it is noise, not failure — I
  confirmed artifacts (file mtimes, blob hashes, row counts) rather than
  trusting exit codes anywhere it mattered.
- `make` needs both a full path (`C:\Program Files (x86)\GnuWin32\bin`) and
  `SHELL=/bin/bash` to run the fork's makefile.
- One trap worth carrying: `git diff --exit-code` on `data/wowsims.lock.json`
  returned 0 while `git status` flagged the file. Neither was lying — the
  content was byte-identical to HEAD (confirmed by `hash-object`) and the flag
  was a stale index entry from the generator's rewrite. `git checkout --` on the
  unchanged file cleared it. Worth knowing before chasing a phantom lock diff.
