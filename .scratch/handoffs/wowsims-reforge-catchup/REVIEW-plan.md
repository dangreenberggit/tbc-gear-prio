# Plan review — PLAN-catchup.md (engine + fork onto `feature/backend-reforge`, then tier 2→3)

**APPROVE WITH CHANGES**

Reviewed adversarially at `dev` `8b2fffe`, before any code exists. Every command
below was re-run against the working tree; where I say "measured" I ran it.

The plan is unusually honest — it marks its own uncertainties, separates
verification theatre from real gates in a dedicated §7, and its slice partition
is correct. It is not approvable as written because of **one blocker (F1)** that
makes slice D's own acceptance criterion unsatisfiable, and because **P4 as
drafted does not honour the owner's decision 3** — it honours the letter and
breaks the mechanism the decision exists to protect. Everything else is
executor-resolvable inline.

---

## Blockers — fix before the executor starts

### F1 — Slice D's acceptance command cannot pass, because P4 poisons the generator-equality check (blocker)

`PLAN-catchup.md:278-279` makes slice D's proof:

```
python scripts/sync_wowsims.py --update --ref ec5c5f2...
git diff --exit-code -- data/wowsims.lock.json   # generator reproduces the committed lock exactly
```

Measured: `scripts/sync_wowsims.py:447-455` builds the owned block with

```python
"currentPhase": current_phase,
"defaultMaxPhase": current_phase,
```

`defaultMaxPhase` is written **unconditionally from `current_phase`**. There is
no flag, no carry-forward, no `prev` consultation — unlike `watchedRefs`, which
gets an explicit carry-forward at `:469-471` precisely because the author knew
owned keys are otherwise clobbered.

So the sequence the plan prescribes is:

1. Slice B: `--update --ref` writes `defaultMaxPhase: 3`; executor hand-edits it
   back to `2` and commits (P4).
2. Slice D: executor hand-edits it to `3`, then runs `--update --ref` again and
   asserts `git diff --exit-code` is clean.

Step 2's assertion passes — but it proves nothing it claims to prove, because
the executor just hand-set the field to the value the generator was always going
to write. And in **slice B** the same command would have shown a one-line diff
that the plan never asks anyone to run, so the P4 hand edit is committed with no
gate anywhere able to see it. I checked: no gate detects it.
`grep -rn defaultMaxPhase scripts/*.py` returns only
`sync_wowsims.py:342` (OWNED_KEYS) and `:454` (the write), plus in-memory
fixtures in `check_lock_merge.py:35` and `check_sync_wowsims.py:80` that use
literal dicts and never read `data/wowsims.lock.json`.

Net effect: between commits B and D the repo carries a committed generated file
that its own generator does not reproduce, and **nothing in `pnpm verify` says
so**. That is the exact failure mode `AGENTS.md` § Durable claims legislates
against ("the working tree must match `HEAD` … before commit" for generated
artifacts).

**What the plan should say instead** — see P4 below; adopting the alternative
deletes this finding entirely, and slice D's `--update` + `git diff --exit-code`
then becomes a *real* check (it would catch a stale vendor or a hand edit,
because nothing was hand-edited).

---

## P4 — the decision you asked me to make

**Take the alternative. Let both `currentPhase` and `defaultMaxPhase` flip to 3
in the pin commit; slice D becomes `ENGINE_VERSION` + `PLAN.md` line 29 + the
runbook text, and drops the lock edit.**

The plan argues (`:16`) that the alternative "changes the user-facing default in
the pin commit, which the owner's decision 3 forbids." I read decision 3
(`PROCESS.md:126-128, 157-159`) differently, and I think the plan has inverted
its purpose. The owner's stated reason is in the decision itself:

> A pin move and a user-facing default change stay separate commits **so the
> regen diff stays attributable.**

Attributability is the goal; separate commits are the means. Ask what each
option does to attributability:

- **P4 as drafted**: the pin commit contains a hand edit to a generated file
  that contradicts its generator. A later reader running the generator at commit
  B gets a different file and cannot tell whether the pin move was botched or
  the edit was deliberate. Attributability is *worse*, not better — and the
  regen diff that decision 3 protects (palette, enchants, pool-listings,
  protos, universes) is **not affected either way**, because none of those
  artifacts read `defaultMaxPhase`. I verified the consumers:
  `cli-wiring.ts:89-95` (`defaultMaxPhase(root)`), `cli.ts:45-49,106`, and
  `apps/web/server/main.ts:69`. Every one is a **runtime** read. Zero generators
  under `scripts/` read it.
- **The alternative**: the pin commit's lock is exactly what the generator
  writes — `git diff --exit-code` after `--update --ref` is clean at *every*
  commit, which is a gate that actually holds. The user-facing behaviour change
  still lands in the pin commit, but it lands as **upstream's own fact**
  (`currentPhase` is parsed from upstream's `CURRENT_PHASE`,
  `sync_wowsims.py:14-22, 445`), and the *deliberate* half of the tier
  bump — `ENGINE_VERSION`, the cache invalidation, the PLAN.md claim, the
  runbook text — still lands separately in slice D. That is decision 3's
  separation, drawn at the seam where the repo actually makes a choice.

Note also that slice C already breaks the "tier changes only in D" framing on
its own: `PLAN-catchup.md:231` correctly admits the tab reads upstream's
`CURRENT_PHASE` live and is on Phase 3 the moment the fork merge lands. So the
drafted P4 does not even achieve a coherent "everything is still tier 2 until D"
state — it achieves "the CLI is tier 2, the tab is tier 3, and the lockfile
disagrees with its generator." Three states instead of two.

**Concretely, change the plan to:**

- Delete the hand-edit sentence at `:84` and the `defaultMaxPhase` row at `:90`;
  predict `defaultMaxPhase: 2 → 3` in slice B's lockfile diff alongside
  `currentPhase`.
- Add to slice B's step B1 verification: `python scripts/sync_wowsims.py
  --update --ref <sha>` a second time, then `git diff --exit-code --
  data/wowsims.lock.json` — the generator-equality check, now meaningful, run
  where the pin actually moves.
- Slice D drops edit 1 (`:270`) and keeps edits 2–4. Its commit 1 subject
  changes from "Default the content tier to Phase 3" to something honest about
  what it now does, e.g. `Invalidate cached rankings for the Phase 3 default`.
- Slice B's commit body states that the default moved 2→3 as a consequence of
  the pin, and that the deliberate follow-through (cache invalidation, docs) is
  slice D. That sentence *is* the attributability decision 3 asked for.
- Rewrite decision P4 in §0 to record this, and note that it was the reviewer's
  call so the executor does not relitigate it.

This does not violate the owner's fixed decision. If the orchestrator judges it
does, that is an owner question, not an executor one — but the plan should then
state that a generated file is knowingly hand-edited for one commit and that no
gate can see it, which the current text (`:16`) only half says.

---

## Major findings

### F2 — The predicted lockfile diff is missing `defaultMaxPhase` reasoning and mis-states `watchedRefs` ownership (major)

Two problems with the §2 predicted diff (`:86-93`), both from the same root —
the plan did not trace `merge_lock`.

**(a) `watchedRefs` is carried, not written, by `--update`.** The plan predicts
(`:92`) that `watchedRefs["feature/backend-reforge"]` moves to `ec5c5f2` with
today's `fetchedAt`. It will — but **only because of the separate
`--watch-ref` call at `:81`**, not from `--update`. `sync_wowsims.py:466-471`
explicitly carries the *previous* `watchedRefs` value forward:

```python
if prev and "watchedRefs" in prev:
    owned["watchedRefs"] = prev["watchedRefs"]
```

The plan's two commands happen to produce the predicted result, so this is not a
wrong prediction — but the plan attributes it to the wrong command, and an
executor who drops the `--watch-ref` line as redundant would get a stale
`watchedRefs` and a passing `git diff`. State that the second command is
load-bearing.

**(b) `--update --ref` is confirmed NOT to chase latest.** Axis B checks out:
`do_update(tag, ref)` at `:373-386` resolves `ref_sha(ref)` and never calls
`latest_tag()` when `ref` is set. `latest_tag()` is reached only at `:386`
(bare `--update`) and `:559` (`do_check`). The plan's claim that
`--update --ref <sha>` does not move the pin to the latest tag **stands,
measured**. Good.

**(c) The `files` count.** The plan says "8 of 78 TRACKED files" (C6, `:348`).
Measured: `TRACKED` has **98** entries, and `data/wowsims.lock.json.files` has
**98**. The 78 figure is wrong — it appears to be R2's count of paths it
diffed, not the tracked set. This matters because the plan's own review
instruction is "every unpredicted path is a finding": if the executor expects 78
entries and sees 98, they will chase a phantom. Fix C6 and `:90` to say "exactly
8 of 98 tracked file entries change".

### F3 — `fetch_wowsimcli.py` build path: sound design, but the plan understates the fresh-clone consequence (major)

I read `scripts/fetch_wowsimcli.py` in full (72 lines). The plan's reading is
accurate: `tag = lock["tag"]` at `:46`, the release URL at `:49` and the vendor
dir at `:50` are both built from the raw tag, so a `/` nests the directory and a
sha 404s. `packages/core/src/cli-wiring.ts:78-82` builds the same
`wowsimcli-<tag>-<plat>` path from the same field, so the two agree. The
proposed design (release-regex fast path, refuse `/`, else build from source,
`--commit`/`--tag-dir` overrides) is sound and minimal.

**The ticket-244 reproducibility claim is real, not inherited.** I checked
`.scratch/carry-forward/issues/244-...md:335-383`: it records two clones at
deliberately different absolute path lengths, a table of four sha256 values
showing non-`-trimpath` builds differ and `-trimpath` builds match
(`71c240d2bb0cd887...`, 22,340,608 bytes both), and the cause confirmed by
`grep -a` finding baked-in absolute paths. It also states `main.Version` is part
of the hash. C3 **stands**. The plan correctly propagates the "record commit +
recipe + `main.Version` + sha256 together" rule.

**CI claim confirmed.** `.github/workflows/verify.yml` contains no
`fetch:wowsimcli` step; it runs `sync:wowsims:restore`, `sync:atlasloot:restore`,
`pnpm verify`, then `proto:generate` + `git diff --exit-code`. And
`packages/core/test/cli-sim-runner.test.ts:26` is
`describe.skipIf(!existsSync(binaryPath))`. C4 **stands**.

**What the plan understates.** It says (`:29`) "CI is unaffected" and treats the
go/protoc requirement as a cost line. But the real consequence is: after this
change, **`pnpm fetch:wowsimcli` on a machine without go+protoc+protoc-gen-go
hard-fails where it previously downloaded a zip**. That is a genuine regression
in fresh-clone ergonomics for any future contributor or any future worktree on a
different machine, and it is invisible to CI *because* CI never runs it. The
plan should say this in one sentence and put it in ADR-0030's Consequences
(`:298` lists three consequences; this is a fourth). It does not need solving —
the owner is the only user — but "CI is unaffected" is the kind of true-but-
misleading line that lets a later reader conclude nothing was lost.

**Also:** the plan's step 3 object-source fallback (`:36`) does
`git clone --filter=blob:none <upstream> <scratch>` then `git checkout --detach
<commit>`. A blobless partial clone defaults to fetching only the default
branch's history; `ec5c5f2` is on `feature/backend-reforge` and may not be
present. Add `--no-checkout` + an explicit `git fetch origin <commit>`, or just
say the executor verifies the checkout succeeded and reports if not. Minor
mechanics, but it is the fallback path, so it will be the one that breaks on the
machine that needed it.

### F3b — Slice D's `UNCERTAIN` about recorded adapters rests on a false premise; the two CLI runs are live sims, not replays (major)

`PLAN-catchup.md:286` asks whether "the recorded offline adapters key on the
content hash (in which case a new `ENGINE_VERSION` makes them miss) or on the
request", and tells the executor to report a missing recording as a finding.
**Both horns are wrong — there is no recording lookup in the sim path at all.**

Measured:

- `packages/core/src/cli.ts:308` — `const sim: SimRunner = new CliSimRunner(binary);`
  is the **only** `SimRunner` the CLI ever wires, `--offline` or not.
- `cli.ts:239-244` — `--offline` gates only the **WCL gear fetch**; it is in fact
  mandatory (the live path returns 2, "not wired yet"). It swaps in
  `RecordedGearSource`, nothing else.
- `RecordedSimRunner` (`packages/core/src/seams/sim-runner.ts`) is referenced only
  by its own definition and the public export in `index.ts`. It is not reachable
  from `cli.ts`.

So the two commands at `:281-282` **spawn the real `wowsimcli` binary and sim the
full p3 candidate universe live.** Three consequences the plan does not account
for:

1. **They depend on slice 1's from-source binary**, not on fixtures. If slice 1's
   build is wrong, these fail here rather than at B5 — and the plan presents them
   as a cheap smoke test.
2. **Runtime is unbudgeted.** `maxPhase 3` loads `data/universes/<spec>-p3.json`
   (`cli-wiring.ts:103`), a larger candidate pool than p2, and each candidate is a
   binary invocation. The plan budgets nothing and gives no `--iterations` bound.
   Slice B4's universe regen at least admits its runtime is "hypothesis, untested";
   this step does not.
3. **The real p3 failure modes are elsewhere.** Not a recording miss —
   rather: a missing EP-weight preset (the plan itself notes at `:262` that feral
   has only `p1`), missing curated BiS data (`cli.ts:399-402` prints a `--pin-bis`
   disabled note "ret's curated sets stop at P2"), or `wowsimcli` erroring on a
   p3-only item. Those are what the executor should be told to watch for.

**What the plan should say instead:** replace the `UNCERTAIN` paragraph at `:286`
with a statement that these are live sims against the slice-1 binary; give them an
explicit iteration bound so they are a smoke test rather than a full ranking run;
and name the three real failure modes above as the things to report. Also drop the
"do not re-record fixtures in this slice" instruction — nothing in this path
re-records anything, so the instruction protects against a scenario that cannot
occur while implying one that can.

The deferral to ticket 353 is still correct; this finding does not change it. It
changes what slice D's own verification actually costs and actually proves.

### F4 — The fork is honestly described but ADR-0030 should carry the irreversibility, not just the plan (major)

Axis E. The plan's §3 "How this is recorded and reproduced" (`:174`) is the most
honest paragraph in the document: it states (a) only shas are recorded, (b) a
fresh worktree on *this machine* recovers via `git -C vendor/tbc-new-fork
checkout <commit>`, (c) a fresh **machine** cannot reproduce it, and (d) the plan
does not push. I verified `data/wowsims-fork.lock.json` carries `"pushed": false`
and a `_comment` saying flipping it is deliberate. C17's first half **stands**
from that file.

Recording only a SHA **is** sufficient for the fork's stated contract — the
`_fork_gate` mechanism (`scripts/_fork_gate.py:84-112`, read; it raises
`ForkGateError` with "clone HEAD is X but <lock> pins Y") exists exactly to
enforce lock↔clone agreement, and it is the same D1 pattern already in use. C12
**stands**.

But this plan **increases** the unreproducible surface materially: before it, the
fork was 126 commits of local work on top of a public base; after it, the fork
contains a merge commit whose resolution of `sim_header.tsx` exists nowhere else,
and this repo's committed `data/sim-implemented-effects.json` and possibly
`equip-eligibility.json` are **derived from that unpushed merge**. If the machine
dies, those committed artifacts become unre-derivable — the gates that check them
would exit 2 forever with no path back.

The plan says this limitation "predates the plan." Half true: the *class* of
limitation predates it; this specific escalation does not. Two changes:

- ADR-0030's Consequences (`:298`) already ends with "a fresh machine cannot
  rebuild the fork until it is pushed." Strengthen it to name what is now
  downstream of the unpushed merge — the fork-derived committed artifacts — so
  the decision record carries the risk, not just a scratch plan that will be
  deleted.
- Add to slice E: a ticket recommending the fork be pushed (or a bundle
  archived), referencing this. The plan puts pushing "out of scope" (`:370`),
  which is right for execution, but out-of-scope work that grows a standing risk
  should leave a ticket behind. Cheap, and it is the difference between an
  accepted risk and a forgotten one.

---

## Minor findings — executor can resolve inline

### F5 — Two `UNCERTAIN` items in the plan are answerable now; I answered them (minor)

Both are marked "not read" / "hypothesis". Neither needs to reach the executor.

- **`sim_header.tsx` in the layout gate's file list (`:233`) — NO.** Read
  `scripts/check_layout_gate.py:111-116`: `SHELL_FILES` is exactly
  `ui/core/components/individual_sim_ui/upgrades_tab.tsx`,
  `ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss`,
  `ui/scss/core/components/_sim_tab.scss`, `ui/core/components/sim_tab.ts`.
  `sim_header.tsx` is absent, and so is any `sim_header` string in that file.
  `SHARED_LAYOUT_FILES` (`:118-135`) lists SCSS only. So the merge does **not**
  re-arm the layout gate via the conflicted file. Delete the paragraph or replace
  it with this one-liner. (The merge may still touch a SHELL_FILE for other
  reasons — the executor should check the merge's file list against those four
  names, which is a cheap real check rather than an open question.)
- **`policy-notes:check` reads docs (`:309`) — NO.**
  `grep -n "docs/\|\.md" scripts/check_policy_notes.py` returns nothing; its
  docstring says it checks that each spec's `d7Note` publishes its policy
  exclusions, reading committed JSON payloads. Likewise `mirrors:check`
  (`scripts/check_skill_mirrors.py:11-13`) compares `.claude/skills` against
  `.agents/skills` — it does **not** read `docs/`. So **no `pnpm verify` gate
  reads any document slice E edits**, except `format:check` and `lint`. Slice E's
  verification line should say that plainly instead of hedging: the only gates
  slice E can trip are prettier/eslint, and `pnpm issues:open`.

  Consequence worth stating: this means **ADR-0030, the PLAN.md corrections and
  `known-traps.md` have no automated check at all.** The `writing-for-agents`
  review pass the plan already calls for (`:307`) is the only gate. Keep it.

### F6 — C14's stated grep result is slightly false; the claim survives (minor)

C14 (`:356`) says the grep returns "only `content-hash.test.ts` with
`engineVersion: 1` literals". Measured:
`grep -rn "ENGINE_VERSION\|defaultMaxPhase" packages/core/test apps/web` returns
`packages/core/test/content-hash.test.ts:113` (a **comment** saying to bump
ENGINE_VERSION rather than edit the payload shape) plus seven `apps/web` hits —
`server/main.ts:13,69,76` and `server/routes.ts:31,51`, and their `dist-server`
build outputs. All are runtime plumbing that reads the lock; none pins a literal
`6` or `2`. **C14 stands**, but restate its evidence honestly, and note the
`apps/web/dist-server/*` hits so the executor is not surprised by committed build
output in the grep. (Separately: `apps/web/dist-server/` appearing in a grep of
tracked files is worth a glance — if it is committed build output it will need
regenerating or it is stale. Out of scope here; flag only.)

### F7 — `--check`'s permanent "new release available" is correctly identified, and its second-order effect is not (minor)

The plan notes (`:149`) that `upstream-drift:warn` will print "new release
available" forever on a ref pin, warn-only, ticketed as 354. Confirmed:
`do_check` calls `latest_tag()` unconditionally at `:559` and compares
`lock["commit"] != sha` at `:565`.

The un-noted second-order effect: at `:566-575`, inside that same `if`, `do_check`
fetches upstream's `constants_other.ts` **at the latest master tag** and compares
its `CURRENT_PHASE` against `lock["currentPhase"]`. After slice D the lock says 3
and master says 3, so this stays quiet — but if master ever moves to Phase 4, the
`*** CONTENT TIER CHANGED ***` drift line fires **from a master tag that is not
an ancestor of `feature/backend-reforge`** (`PROCESS.md:20-24` establishes tags
are cut from master). Ticket 354 should cover both symptoms, not just the cosmetic
one. One extra sentence in the ticket.

### F8 — Slice B's `--check` precondition asserts an outcome it cannot fully get (minor)

`:74` requires that `--check` on the unchanged lock shows "only 'new release
available' and 'watched ref moved'". But `do_check` exits **2** early if
`vendor_is_empty()` (`:552-556` region), and returns **1** on any drift — so the
executor gets exit 1 in the success case and must read the lines, not the code.
The plan should say "exit 1 with exactly these two DRIFT lines; exit 2 means
vendor/ is absent, run `--restore` first." Otherwise a careful executor stops on
a nonzero exit that is the expected outcome.

---

## Axes that came back clean — one line each

- **Axis A (verification theatre)**: §7 (`:329-337`) is correct and I could not
  break it. The AtlasLoot-only claim for the three data-pipeline gates
  is right; `sim-defaults:check`, `skeleton:check`, `pool-listings:check` do run
  in CI because `verify.yml` runs `sync:wowsims:restore` first; the fork gates do
  skip in CI (no clone); the proto byte-compare is CI-only. The plan says all of
  this before anyone asked it to. The one genuine theatre instance is F1.
- **Axis B (moves a pin it did not say it would)**: clean, measured — see F2(b).
  The `--update --ref` path never reaches `latest_tag()`. The `proto` block is
  correctly identified as foreign to `sync_wowsims.py`'s `OWNED_KEYS`
  (`:336-347`, verified: `repo, tag, commit, currentPhase, defaultMaxPhase,
  files, _comment, watchedRefs`) and carried by `merge_lock`, so B2's separate
  `fetch_protos.py` run is genuinely required. Correct.
- **Axis F (ordering and rollback)**: the strict 1→B→C→D→E serialisation is
  forced and correctly argued (`:327`). Slice B's rollback via
  `git checkout -- …` + `--restore` is sound because `--restore` rebuilds
  `vendor/wowsims` from whichever lock is on disk (`do_restore` reads
  `lock["commit"]`, does not rewrite the lock). Slice C's rollback via a backup
  branch created **before** the merge (`:185`) plus `reset --hard` is the right
  shape for a repo with no remote. The `npm ci` + `make proto` re-run after
  rollback is correctly included — those outputs are gitignored and would
  otherwise be left describing the merged tree.
- **Slice partition (§6)**: correct, and correctly concludes nothing parallelises.
  The four doubled files are named honestly rather than waved at.

---

## Axis G — missing work

Mostly covered, with one real gap.

**Deferring the fixture re-baseline to ticket 353 is right.** Re-recording
fixtures inside this plan would mean the same commit moves the engine *and*
re-baselines the numbers that would have detected an engine problem — the change
and its own detector in one diff. Deferring keeps the recorded adapters as a
standing comparison against the old engine, which is more informative than
silently refreshing them. The plan's §7 line "No gate checks that a committed DPS
number is still true on the new engine (ticket 353)" is exactly the right
admission.

**The gap: nothing states which committed numbers are now suspect.** Ticket 353
as drafted (`:306`) says "re-baseline committed sim numbers and recorded fixtures."
That is a task, not an inventory. Between the engine move (121 upstream commits
including rogue/enchant/rage sim fixes per R5 §3) and the tier default change,
some set of committed artifacts now carries numbers produced by an engine the
repo no longer pins. Slice E should enumerate that set — at minimum the
pool-listing DPS columns if any, `data/presets/*/…ep-weights.json`, and any
committed report/verification-log figure — even if the fix is deferred. A ticket
that names its blast radius is actionable; one that does not becomes a permanent
open item. This is cheap: it is a grep and a list, not a re-measurement.

**The feral rotation/APL change is correctly handled.** The plan traces
(`:124`) that `build_feral_skeleton.py:64-66` takes the rotation from the owner's
export, not the vendored APL, so upstream's 104-line APL rewrite does not enter
the skeleton — and it still routes the SME question to 353. Both halves right.

---

## Claims register — verdicts

| Claim | Verdict | Evidence |
| --- | --- | --- |
| C1 | untestable here | Live `gh api`; plan already makes the executor re-run it and states the fallback. Correctly handled. |
| C2 | stands (untested, correctly labelled) | Release-by-tag URL construction confirmed at `fetch_wowsimcli.py:49`; 404 for a sha is inference from ticket 244's measured 404 for a branch name. Executor re-runs. |
| C3 | **stands, measured** | `.scratch/carry-forward/issues/244-…md:335-383` — four-row sha256 table, two clones at different path lengths, `-trimpath` builds identical. Not inherited. |
| C4 | **stands, measured** | `.github/workflows/verify.yml` (no `fetch:wowsimcli` step); `packages/core/test/cli-sim-runner.test.ts:26` `describe.skipIf(!existsSync(binaryPath))`. |
| C5 | untestable here | Live `gh api compare`. Labelled hypothesis; the plan's conditional handling (promote out of `PER_FILE_PIN` iff `ahead`) matches `sync_wowsims.py:250-255`'s own stated rule. Correct. |
| C6 | **refuted in part** | "78 TRACKED files" is wrong: `TRACKED` has **98** entries and `lock.files` has **98** (measured). The "exactly 8 change" half is untested here. See F2(c). |
| C7 | untestable here | R2-inherited; slice B's palette/enchants diff is the real check. Correctly flagged UNCERTAIN at `:120`. |
| C8 | untestable here | R2-inherited; `fetch_protos.py` output is the check. |
| C9 | stands as hypothesis, correctly labelled | `pnpm typecheck` named as the falsifier. Fine. |
| C10 | untestable here | R5 `merge-tree`; the real merge is the check, and the plan correctly says stop if a second conflict appears. |
| C11 | untestable here | R5 overlap list. Note `check_engine_port_drift.py` compares files ported from **this** repo (ticket 244:268-280), so a green result was never evidence about the upstream pin anyway — the plan's prediction is right but for a stronger reason than it gives. |
| C12 | **stands, measured** | `scripts/_fork_gate.py:84-112` — `require_pinned_fork` raises `ForkGateError` "clone HEAD is X but … pins Y" when `commit != pin`. |
| C13 | **stands, measured** | `cli-wiring.ts:98-110` `loadUniversePool` builds `data/universes/<spec>-p<N>.json` and returns a `generate` hint if absent; `:89-95` `defaultMaxPhase` reads `defaultMaxPhase ?? currentPhase`. |
| C14 | **stands, evidence mis-stated** | See F6 — grep returns a comment at `content-hash.test.ts:113` plus seven `apps/web` runtime hits; no literal `6` or `2` is pinned. Claim survives, wording does not. |
| C15 | stands as hypothesis, correctly labelled | Falsifier named (`pnpm sim-defaults:build`). Good. |
| C16 | stands as hypothesis, correctly labelled | Five gate commands named. Good. |
| C17 | stands (first half measured) | `data/wowsims-fork.lock.json` `"pushed": false` confirmed by read. Second half (`branch -r`) untested, correctly labelled. |
| C18 | **stands, measured** | `_fork_gate.py:93-95` docstring confirms callers check `fork_root.is_dir()` themselves; `verify.yml` restores `vendor/wowsims` but never the fork clone. |

**Unregistered claims found in the plan body** (each is a causal or factual claim
that belongs in the register per `AGENTS.md` § Durable claims):

- `:16` — "`sync_wowsims.py:453-454` writes both fields from the fetched
  `constants_other.ts` in the same run; there is no flag to separate them."
  **True, measured** (`:447-455`), but it is the load-bearing claim under P4 and
  is not a register row. Add it, or moot it by adopting the alternative.
- `:106` — "`packages/core/src` imports only from `api_pb`, `common_pb`, `ui_pb`."
  Untested, and it is the reasoning behind C9's optimism. Either register it or
  drop the reasoning and keep C9 as a bare hypothesis.
- `:174` — "the clone is shared, not per-worktree." Sourced to a memory note, not
  a command. Load-bearing for slice C's reproducibility story. Register it with
  `git -C vendor/tbc-new-fork rev-parse --git-dir` or label it untested.
- `:231` — "the tab reads upstream's `CURRENT_PHASE` live." Sourced to
  `docs/fork-phase-seams.md §1`, which is a doc, not a command. It is the basis
  for a user-facing statement in a commit body. Register it.

---

## Summary for the orchestrator

**Blocks execution (2):**

1. **F1 / P4** — adopt the alternative: let `defaultMaxPhase` flip with the pin;
   slice D becomes `ENGINE_VERSION` + docs. This deletes the hand-edited
   generated file, makes slice D's `git diff --exit-code` a real check, and — I
   argue — honours the owner's decision 3 better than the drafted P4 does. If the
   orchestrator disagrees, this needs the owner, not the executor.
2. **F2(c)** — fix the 78→98 tracked-file count in C6 and `:90` before the
   executor uses it as the "unpredicted path is a finding" baseline.

**Executor resolves inline (7):** F2(a) note that `--watch-ref` is load-bearing;
F3 partial-clone fallback mechanics + the fresh-clone regression sentence;
**F3b rewrite slice D's verification paragraph — the two CLI runs are live sims
against the slice-1 binary, need an iteration bound, and the recorded-adapter
uncertainty is a non-question**; F4 ADR consequence + a push/archive ticket;
F5 delete two answered UNCERTAINs (layout gate: no; policy-notes: no);
F6 restate C14's evidence; F7 widen ticket 354; F8 state the expected nonzero exit.

**Three of the plan's eleven open uncertainties (`:381`) are now closed by this
review** — `sim_header.tsx` in the layout gate (no), `policy-notes:check` reading
docs (no), and the recorded-adapter keying question (a non-question, F3b). The
executor should not spend measurements on them.

**Also do:** F-G gap — ticket 353 should enumerate which committed numbers are
now suspect, even though the fix is deferred.

The plan is good. Its §7 and its slice partition are better than most reviewed
plans produce, and its self-flagged uncertainties were honest rather than
decorative — two of them I could close outright, which is the sign they were
real questions and not hedging. Fix P4 and the file count and it is ready.
