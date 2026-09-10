# Pre-merge review — feat/wowsims-reforge-catchup

Reviewed range: `8b2fffe72d17dffc196eef66db8c4a4c379083be..9570b87a4b37a1dddb3acacbb02ee74e372329f8`

Dispatch: three axes, fresh context, one parallel batch, Opus at effort medium
(review lane). `codex` is not on `PATH`, so option 1 of the skill's dispatch
order did not apply. No wall was hit; no axis was downgraded.

What the branch did: moved this repo's wowsims engine pin from release tag
`v0.0.119` to commit `ec5c5f205e61049d730e460967f8488774a7fe2a` on upstream's
`feature/backend-reforge`; merged that same commit into the gitignored fork
clone at `vendor/tbc-new-fork` so the Upgrades tab and the ranking engine run
one engine; moved the default content tier 2 → 3; taught `fetch_wowsimcli.py`
to build the sim binary from source when the pin is a sha rather than a release
tag; recorded ADR-0030; re-recorded the synthetic sim fixtures.

**No blockers on any axis.**

## Adversarial

No blockers. The findings are real but bounded, and two of the three are in the
new build-from-source path rather than in the engine change itself.

**A1 — should-fix — `scripts/fetch_wowsimcli.py:190-193`, worktree registration
leak.** `build_from_source`'s `finally` clause guards cleanup on
`(FORK / ".git").exists()` — the _same_ test `obtain_source` (`:105-133`)
branched on at entry, re-evaluated at cleanup time, so the two can disagree.
The consequential half is that a failure after `git worktree add` can leave
`vendor/tbc-new-fork/.git/worktrees/` holding a registration pointing at a
directory `shutil.rmtree` has removed. The worktree path is
`wowsims-src-{commit[:12]}` — deterministic per commit — so the leak is not
transient: the next build of the same commit fails with "already registered"
and stays failing until someone runs `git worktree prune`, which nothing tells
them to do.

**A2 — should-fix — `scripts/fetch_wowsimcli.py:219-237`, a non-tag, non-sha pin
builds a binary from an unrelated commit, silently.** The dispatch has two
guards and no third: `RELEASE_TAG_RE` (`^v\d+\.\d+\.\d+$`) takes the release
path, `"/" in tag` returns 2, and **everything else falls through to
`commit = lock["commit"]` and builds**. A `tag` of `master`, `v0.0.119-rc1` or
`latest` matches neither guard, so the build proceeds into
`vendor/wowsimcli-<tag>-<platform>` — which is exactly the directory all eleven
consumers resolve from `lock.tag`. The binary is therefore found and used,
built from a commit that need not correspond to what `tag` names, and
`main.Version` is stamped from `lock["commit"]` so even
`CliSimRunner.version()` agrees. This is PLAN.md's stated worst case —
plausible-looking DPS, wrong answer, no error anywhere — reached through a new
door. The supported path (`sync_wowsims.py --update --ref <sha>`) writes both
fields identically and cannot produce the state; the exposure is a hand edit,
which `known-traps.md` already says is invisible to every gate.

**A3 — should-fix — `scripts/fetch_wowsimcli.py:235`, `--commit` can write a
binary nothing loads.** With `--commit X` and no `--tag-dir`, the output lands
in `vendor/wowsimcli-<X>-<platform>`, while every consumer resolves from
`lock.tag`. That is intended for pre-pin proving and the flag's help text says
so, but nothing warns, so a developer who builds `--commit <newsha>` and then
runs `pnpm rank` silently gets the **old** binary and old numbers with no
signal that the build they just watched succeed is not the one in use. The
ticket-244 failure mode, re-armed through a new flag.

**A4 — nit, disclosed — nothing binds a fixture's `simVersion` to the lock.**
`synthetic-fixtures.test.ts:145` and `full-sweep-recall.test.ts:192` construct
`RecordedSimRunner(recorded.simVersion, ...)` from the fixture's own field; no
gate compares it to `data/wowsims.lock.json`. A fixture recorded on an old
binary replays green forever. Ticket 353 states this outright — "a fresh
recording makes them green **by construction**" — so it is disclosed rather
than hidden, but disclosure in a ticket body is not a gate, and this is the
second pin move to rely on a human remembering.

### Checked and found clean

- **The fixtures are genuinely re-recorded, not hand-edited.** Both blobs were
  compared across `git show 8b2fffe:` and `git show 9570b87:`. Ret shares 267
  request hashes with the old file and all 267 return bit-identical DPS, plus
  48 genuinely new recordings matching the 240 → 288 poolSize. Feral and
  feral-p3 share **zero** hashes (260 → 252, 430 → 417): every request body
  changed and every observation is new. Hand-editing cannot produce that hash
  turnover.
- **The `individual-settings.test.ts` change is not test theatre.** The old
  `expect(CURRENT_API_VERSION).toBe(preset.apiVersion)` coupled a historical
  `decodelink` capture to a live constant and would break on every future pin
  with no defect behind it. The invariant it was reaching for — that _our_
  exports stamp the current version — is independently asserted with a strict
  `toBe` at `:74-78` ("stamps the current api version so the site does not
  migrate the import"). The replacement adds a `> 0` check against the
  migration-triggering proto default. Net strength on the real invariant is
  unchanged.
- **`extract_sim_defaults.mjs` swallows nothing.** The new zero-arg branch reads
  `CURRENT_PHASE` statically from a tracked vendored file and throws
  `Unresolved` if absent; the unexpected-arg-count case throws too. Gated by
  `sim-defaults:check` in `pnpm verify`.
- **`sync_wowsims.py` fails loudly.** `do_update` collects fetch errors and
  re-raises after the loop rather than the old print-and-continue, and rejects
  zero-byte blobs. The `PER_FILE_PIN = {}` promotion is justified in-comment by
  a re-runnable `gh api ... compare ... --jq .status` showing the override
  commit is an ancestor of the new pin.
- **`ENGINE_VERSION` 6 → 7** (`content-hash.ts:52`) correctly invalidates cached
  rankings for the tier move.
- **Ticket 354** already documents both `--check` symptoms on a ref pin,
  including the tier check reading a non-ancestor commit. Filed rather than
  papered over.

### Not examined

The Go engine internals and the 153 upstream commits (no source in this tree),
the ~1,300 regenerated lines of `packages/core/src/proto/*_pb.ts` (machine
output; lock hashes spot-checked, not audited line by line), and whether the new
feral numbers are _correct_ — the last is the domain axis's, and the SME verdict
covers it.

## Domain

No domain blockers. The tier move is TBC-correct and the data artifacts are
faithful mirrors of the new pin. All findings are documentation defects.

**D1 — should-fix — ticket 353 §4 revives a figure that was superseded and
reversed in sign.**
`.scratch/carry-forward/issues/353-re-baseline-committed-sim-numbers-on-engine-ec5c5f2.md:68`
says the prior pin review "recorded a −18 DPS feral rotation regression … with
no domain look" and that whether the feral numbers are right "is an SME question
that nobody has answered". Both halves are false against the repo.
`docs/verification-log.md:1654-1669` records a three-arm, 20000-iteration,
seed-42 experiment on the pinned binary whose rotation main effect is **−42.91
DPS in favour of the new rotation** — opposite in sign to −18 — against a
pre-registered 2×combined-SEM bound of 1.38, and ticket 250 is `Status: closed`
with its own line 23 already flagging the −18 sentence as wrong. This is the
figure's third propagation; left alone it becomes folklore. The same section's
"15 → 27 above-cutoff rows" pair should be labelled what it is — two
uncontrolled measurements at different pins, baselines and pool sizes — not a
regression. The re-record on this branch did not reproduce it: feral-p3 sits at
43 both before and after.

**D2 — should-fix — the feral P1 EP-weights scope note is false.**
`data/presets/feral/p1.ep-weights.json`, `notes[1]`, claims EP "only chooses
gems here" and that "a phase-1 gem preference does not rank items".
`packages/core/src/candidate-order.ts:36-67` orders the whole eligible pool by
EP and `rank.ts:1100` caps that order, so on a **capped** run stale P1 weights
decide which candidates are never simmed at all — a P3 item can be dropped
before measurement, invisibly. Both defaults are safe (the CLI never caps; the
tab defaults to no cap), so this is a disclosure defect rather than a wrong
number. But a note that understates a stale input's reach is exactly what makes
the next reviewer dismiss a real exposure.

**D3 — nit — `scripts/build_feral_skeleton.py:19` documents a rotation source it
does not use.** Line 19 says the rotation is "merged from the pinned
vendor/wowsims/feral_default.apl.json"; line 64 reads the owner's own export.
Confirmed still present at tip. This matters more since ADR-0030, because
`feral_default.apl.json`'s sha **did** move in this pin (upstream rewrote the
feral APL, 104 lines) — line 19 is the sentence that would make a reader
conclude that rewrite reaches this repo's numbers. It does not.

**D4 — nit, pre-existing, fixed as a side effect.** The committed `poolSize`
figures 240/228/366 named in ticket 353 §1 were already stale before this
branch: `data/universes/` has held 288/227/364 and those files did not move
here. The re-recorded fixtures now carry 288/227/364, so this branch _fixes_
the staleness incidentally. The tier move does not make it worse. Already
flagged in `EXEC-status-353.md:169`; no action.

### Checked and found clean

- **Phase 3 = T6 is right.** `data/universes/feral-p3.report.json` `phaseZones`
  reads Black Temple, Hyjal Summit, Serpentshrine Cavern, Tempest Keep,
  Karazhan, Gruul's, Magtheridon's, World Bosses — exactly TBC P1–P3
  cumulative, inclusive-filtered as PLAN.md §2 requires, `tierPiecesMissing: []`
  against 10 expected. No Wrath or Classic leakage.
- **`currentPhase: 3` is not hand-set.** `vendor/wowsims/constants_other.ts`
  reads `CURRENT_PHASE: Phase = Phase.Phase3`, satisfying the rule that the tier
  comes from upstream's own constant and is never inferred from a player's log.
- **All five `data/items/index.json` phase edits mirror `db.json`.** Medallion of
  Karabor (32649) and Blessed Medallion (32757) are `phase: 3`; the three
  Vindicator's (Season 2 arena) pieces are `phase: 4`. Both moves are
  TBC-correct — the Karabor medallions are Black Temple attunement-era rewards,
  and Season 2 gear belongs above P3. Upstream correcting its own data, not our
  drift.
- **`data/enchants/index.json` key `963`** is faithful: `db.json` holds two
  records at `effectId 963` (Greater Impact, spellId 13937; Major Striking,
  spellId 27967 / itemId 22552), both real weapon enchants. Two entries under
  one key is a pre-existing shape — 5 of 138 keys already have it.
- **`sim-implemented-effects.json` 217 → 218** adds 17076, Bonereaver's Edge — a
  real upstream effect (`core.NewItemEffect(17076, …)`, 3-stack 700 armor pen,
  2 PPM), correctly excluded from the P3 pool as a Molten Core drop.
- **`exposeWeaknessHunterAgility` 1080 → 1210 is correct, not drift.**
  `vendor/wowsims/proto_utils.ts:1280-1282` is upstream's phase map: P1 1080,
  P2 1150, P3 1210. The value tracks the tier, and the direction is positive for
  feral, consistent with the observed +7.53.
- **Pool listings are self-consistent**: `feral-p3.md` 364 and `ret-p3.md` 467
  match `data/universes/` on disk and the 467 seen in the browser.
- **The PLAN.md §4.1/§8.3 curated-set rewrite is accurate** — the lock tracks
  ret p1/p2/p3/preraid and feral p2/p3 in 6p/9p plus preraid, exactly as the new
  text claims. The old "ret stops at P2" line was genuinely stale.

### Judgment on the tier move itself

Moving the default from Phase 2 to Phase 3 does change what a user's ranking
means — a roughly 60% larger, top-weighted pool against the same baseline. That
is disclosed adequately. The CLI prints `maxPhase=3 universe=467` on every run
(`cli.ts:312`), the tab header reads "Phase 3 (2.2 - T6)", `ENGINE_VERSION`
6 → 7 invalidates cached rankings so nobody sees a P2 answer relabelled, and
`epWeightsPhaseNote` (`ep-weights.ts:102`) surfaces `EP weights: P1 (requested:
P3)` for feral. No path was found where a user silently gets a Phase 3 answer
believing it is Phase 2.

The SME seat's verdict on ticket 353 (`gate-sme`, tip `ad7f2d7`) is
`trust-with-caveats` with nothing blocking, and its one genuinely unmeasured
item — feral EP weights have not been recomputed on `ec5c5f2` — is a follow-up
rather than a blocker, since displayed rank is measured `deltaDps`.

## Standards + Spec

Run through the `code-review` skill, both sub-agents on the review lane.

### Standards

**No hard violations of a documented standard.** Four judgement calls, all
baseline smells.

**S-1 — `scripts/fetch_wowsimcli.py:161`, function-local `import os`.** Buried
mid-function under a path that only fires for sha pins, while every other import
is at the top (`:32-42`). Not a documented-standard breach, but it hides a
dependency.

**S-2 — possible Duplicated Code, `build_from_source`.** The build recipe is
written twice: once as the executed `run([...])` argv, then again as a
hand-maintained `print("recipe: …")` string. The two can drift silently, because
the printed recipe is not derived from the list that ran. Worth deriving the
message from the argv, given ADR-0030 records that recipe as the reproduction
instructions.

**S-3 — possible Speculative Generality, `--tag-dir`.** Its help text offers to
override the vendor directory name, but the only stated need (`--commit` for
pre-pin proving) already derives one from the commit, and no caller in the diff
passes it.

**S-4 — minor Mysterious Name / Data Clump, `ASSETS`.** The tuple now carries
`(zip, binary, goos, goarch)`; two of four fields have nothing to do with a
release asset. It wants to be a small `Platform` record.

Positive checks worth recording, because each is a trap this repo has hit
before: no line endings flipped (`--numstat` on the hand-written files gives
3/1, 19/2, 23/9, 193/17, 16/11 — all far below file length); the pin is a sha
not a branch name, with `watchedRefs` moved in the same lock and the slash case
guarded explicitly; `currentPhase` and `defaultMaxPhase` both stand as the
generator wrote them, with the deliberate half of the bump isolated in
`8913860`; `NEXT` moved 353 → 356 for exactly three new tickets; every comment
in the diff is a _why_ comment; the `PER_FILE_PIN` promotion cites a re-runnable
command, satisfying the durable-claims rule; and no type is derived from a JSON
import.

### Spec

The branch tracks the amended plan closely — nine commits, slices 1→B→C→D→E plus
the 353 follow-on, in the prescribed serial order.

**P-1 — missing — ticket 353's SME box is open though the verdict exists.**
Line 83's box asks for an `sme-rank-review` verdict on the feral rotation and
the above-cutoff row count. That verdict was produced (seat `gate-sme`, tip
`ad7f2d7`, `trust-with-caveats`, nothing blocking) and it answers exactly that
box, but the ticket does not tick it, does not cite it, and the verdict lives
only in an untracked handoff file. Worse, the SME **contests the ticket's own
§4** — the D1 finding above. So the tracked ticket carries a claim its own SME
review refuted. The ticket is the durable artifact; the verdict is not.

**P-2 — partial — 353's inventory omits the `data/items/index.json` phase
moves.** Slice B's ledger says five items' `phase` field was corrected and that
this was "recorded for ticket 353's blast-radius inventory". It was not — grep
finds no `32649`, no `35317`, no `items/index` in the ticket. The plan's Axis-G
requirement was that 353 must _enumerate_ which committed numbers are now
suspect, and this entry was promised and did not land.

**P-3 — partial — 353's §1 was never corrected in place.** The corrections are
appended under "What was done", so §1 still states that the preset fixture is
"hand-authored, never-regenerated" and that the Expose Weakness value reaches
the request from `buff-defaults.json` at runtime. The ticket's own later section
calls both wrong. Minor, but a reader meets §1 first.

**P-4 — scope creep, defensible — the 353 re-record was executed, not
deferred.** Plan §10 put "re-recording sim fixtures or re-baselining committed
DPS numbers on the new engine (ticket 353)" out of scope, and the plan review
endorsed the deferral on the grounds that one commit should not both move the
engine and re-baseline the numbers that would have detected an engine problem.
`fda1126` and `c135b0b` do that work on this branch. It is defensible — separate
commits satisfy the stated reason, and the executor argues so explicitly — but
it is the branch taking on work the spec excluded, and it makes 11 red tests
green by construction, which `EXEC-status-353.md` itself says. Flagged for the
owner rather than treated as a defect; the adversarial axis independently
confirmed the re-record is real.

**P-5 — scope creep, disclosed, no action.** `PLAN.md` §8.3 was corrected in
addition to the §4.1 line the spec named. Same false claim in two places; fixing
both was the right call and was disclosed.

**P-6 — nothing wrong.** Each substantive requirement was checked against the
diff and holds: sha pin not branch name; `watchedRefs` moved by the separate
`--watch-ref`; `defaultMaxPhase` flipped by the generator with no hand edit;
`PER_FILE_PIN` emptied with ancestry evidence; `ENGINE_VERSION` 6 → 7 with a
reason; the runbook text de-staled from `data/pools/` to the universes;
ADR-0030 carrying all four consequences including the hard-fail and
fresh-machine ones; ADR-0025's status and Decision-1 supersession note; the
`known-traps.md` section; the fork lock `_comment` rewritten per the spec's
clause list; 251 and 337 closed, 263 unblocked, 354 carrying both symptoms, 355
filed, `NEXT` at 356.

**P-7 — flagged, correctly not done.** Slice E declined to edit `AGENTS.md:87`
to add the engine-pin trap to the known-traps trigger list, because that file is
outside the paths manifest and the project rule requires owner approval. The new
`known-traps.md` section is therefore reachable only by someone already reading
that file. Correct execution; carried as a ticket.

## Summary

Three axes, no blockers. The engine change itself came through clean on every
axis that could test it: the fixtures are provably re-recorded rather than
hand-edited, the tier move is TBC-correct and sourced from upstream's own
constant rather than inferred, the one test that was relaxed had its real
invariant independently asserted next door, and the two scripts that changed
fail loudly where they used to be quiet.

The defects cluster in two places. First, the new build-from-source path in
`fetch_wowsimcli.py` — its dispatch is not total, so a lock `tag` that is
neither a release tag nor a sha builds a binary from an unrelated commit into
the directory every consumer reads, with no error anywhere. That is the
project's stated worst case reached through a new door, and it is the most
important thing on this list even though the supported tooling cannot currently
produce the state. Second, a set of documentation defects where a note
understates the reach of a stale input — most sharply ticket 353 §4, which
revives a −18 DPS figure that was measured away and **reversed in sign** three
weeks ago, on its third propagation.

Ticket 353 is also the weakest artifact on the branch relative to its own job.
It exists to be the durable inventory of what the pin move made suspect, and it
is missing an entry the executor promised it, has an uncorrected §1 that
contradicts its own appendix, and leaves its SME box unticked although the
verdict exists and contests the ticket's text. Everything needed to fix it has
been produced; none of it reached the tracked file.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                 |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | defer       | `.scratch/carry-forward/issues/357-build-from-source-can-leak-a-git-worktree-registration.md` — worktree registration leak blocks all future builds of the same commit                        |
| A2  | Adversarial | defer       | `.scratch/carry-forward/issues/356-fetch-wowsimcli-builds-from-an-unrelated-commit-for-a-non-tag-non-sha-pin.md` — non-total dispatch, silent-wrong-binary class                              |
| A3  | Adversarial | defer       | `.scratch/carry-forward/issues/357-build-from-source-can-leak-a-git-worktree-registration.md` — same ticket, part (b): `--commit` writes a binary no consumer resolves                        |
| A4  | Adversarial | defer       | `.scratch/carry-forward/issues/360-nothing-binds-a-recorded-fixture-to-the-engine-pin.md` — no gate compares fixture `simVersion` to the lock                                                 |
| D1  | Domain      | defer       | `.scratch/carry-forward/issues/358-three-stale-scope-notes-mis-state-what-their-inputs-reach.md` — the −18 DPS figure, superseded and reversed in sign                                        |
| D2  | Domain      | defer       | `.scratch/carry-forward/issues/358-three-stale-scope-notes-mis-state-what-their-inputs-reach.md` — false feral EP scope note                                                                  |
| D3  | Domain      | defer       | `.scratch/carry-forward/issues/358-three-stale-scope-notes-mis-state-what-their-inputs-reach.md` — `build_feral_skeleton.py:19` rotation source                                               |
| D4  | Domain      | wontfix     | Pre-existing `poolSize` staleness that this branch fixes as a side effect; the re-recorded fixtures now carry 288/227/364                                                                     |
| S-1 | Standards   | wontfix     | Function-local `import os` in a build-only path; cosmetic, and the surrounding function is due an edit under ticket 357                                                                       |
| S-2 | Standards   | wontfix     | The printed recipe duplicates the executed argv; ADR-0030 records the same recipe, so the drift risk is bounded and visible                                                                   |
| S-3 | Standards   | wontfix     | `--tag-dir` is unused in the diff but is the documented escape hatch for the pre-pin proving flow ADR-0030 Decision 3 step 1 requires                                                         |
| S-4 | Standards   | wontfix     | `ASSETS` tuple shape; a four-field tuple in one module is not worth a type today                                                                                                              |
| P-1 | Spec        | defer       | `.scratch/carry-forward/issues/360-nothing-binds-a-recorded-fixture-to-the-engine-pin.md` — SME box unticked though the verdict exists and contests §4                                        |
| P-2 | Spec        | defer       | `.scratch/carry-forward/issues/360-nothing-binds-a-recorded-fixture-to-the-engine-pin.md` — `items/index.json` phase moves missing from the inventory                                         |
| P-3 | Spec        | defer       | `.scratch/carry-forward/issues/360-nothing-binds-a-recorded-fixture-to-the-engine-pin.md` — §1 not corrected in place                                                                         |
| P-4 | Spec        | wontfix     | The 353 re-record was out of plan scope but landed in its own commits, which satisfies the deferral's stated reason; the adversarial axis confirmed the re-record is real. Owner may disagree |
| P-5 | Spec        | wontfix     | Fixing the same false PLAN.md claim in both places was correct and was disclosed                                                                                                              |
| P-6 | Spec        | wontfix     | No finding — every substantive requirement checked and holds                                                                                                                                  |
| P-7 | Spec        | defer       | `.scratch/carry-forward/issues/359-agents-md-trigger-list-omits-the-new-engine-pin-trap.md` — needs owner approval before editing `AGENTS.md`                                                 |
