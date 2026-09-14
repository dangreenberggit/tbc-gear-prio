# Pre-merge review — feat/upstream-catchup-chunk1

Reviewed range: `a8a20225b602d433b46e68f0279e3ee0d8ce7037..7d48528b17784327fd1207b7b2057b5bbbd726e4`

Six commits, 63 files. Four axes, each dispatched with fresh context — none saw
the session that produced the branch, and none was told what the orchestrator had
concluded. `codex` is not on `PATH` on this machine, so all four ran as fresh
Opus subagents on the review lane (the skill's second dispatch option, not a
downgrade).

The branch moves this repo's wowsims engine pin from `ec5c5f2` to `17a8fb28`
(upstream `master`, carrying the merged PR-385 reforge work), merges that commit
into the gitignored fork clone and re-pins it, regenerates the pin-derived
artifacts, fixes tickets 354 and 357, and adds ADR-0033 plus
`docs/agents/upstream-catch-up.md`.

Plan step 10 — a full-tab ranking regression — was **withdrawn before execution**
as badly designed (ranking is an unstable derived observable; its noise-band
apparatus existed only to manage instability a better observable avoids) and
replaced by a targeted engine test. The Spec axis was told this so it would not
report the absent `regression.md` as a missing requirement.

## Adversarial

**A1 — The new sha-pin guard rails do not test what the comparison compares
against.** This is the finding of the review. `_DoCheckHarness`
(`scripts/check_sync_wowsims.py:377-382`) stubs `latest_tag` → `UPSTREAM_SHA` and
`ref_sha` → `UPSTREAM_SHA`: **the same value**, so no assertion can distinguish
"compared against the watched ref" from "compared against the latest release tag"
— which is ticket 354 symptom (b), the defect the branch exists to fix. `fetch`
is `lambda sha, path: b"...Phase.Phase2;"`, ignoring its `sha`, so the ref tip and
the tag can never disagree on `CURRENT_PHASE`.

Three mutations of the fix survive all 21 checks: replacing `tip = ref_sha(ref)`
with `tip = sha` (ticket 354's original bug verbatim); taking the _last_ watched
ref instead of the first; and hardcoding the tier check so
`*** CONTENT TIER CHANGED ***` can never fire.

Reproduced independently by the orchestrator: with `tip = sha` substituted,
`python scripts/check_sync_wowsims.py` printed `guard rails ok (21 checks)`,
**rc 0**. Source restored, `git diff --stat` empty.

Consequence: ticket 354 is `closed` with an acceptance criterion — "a test covers
a ref pin whose watched branch and latest master tag disagree on `CURRENT_PHASE`"
— that is unmeetable under this harness. The production code appears correct; the
guard is hollow, which is the rot `check_sync_wowsims.py` exists to prevent.

The checks are not pure theatre — forcing `is_sha_pin` → `False` kills two of the
four, and a no-op `do_unwatch_ref` kills the fourth — but none constrains the
comparison itself.

**A2 — `next(iter(watchedRefs))` makes the comparison depend on JSON key order.**
`sync_wowsims.py:591`. Correct at one watched ref; at two, the pin is compared
against whichever key sits first in insertion order, with no error and no output
saying a choice was made. A pin in sync with `master` while `master` sits second
would report `pin is behind <other-ref>` forever. Both the docstring and ADR-0033
§3 call it "the first entry" as though that were a definition.

**A3 — `is_sha_pin`'s regex can misclassify, though not on any real tag.**
`re.fullmatch(r"[0-9a-f]{7,40}", ...)`. Upstream tags are `vX.Y.Z` and cannot
match. The asymmetry: a sha pin **under 7 characters** classifies as a tag and
silently takes the pre-fix release-comparison path. No code path in this repo
writes a sub-7-character pin. Reasoned, not run.

**A4 — `do_unwatch_ref` truncates the lockfile before serializing.**
`sync_wowsims.py:709-713` opens `"w"` then `json.dump`s; an exception mid-write
leaves a truncated lock. **Pre-existing** — `do_watch_ref:679-683` has the
identical shape and predates this branch.

**A5 — `fetch_wowsimcli.py`'s defensive `worktree prune` is repo-global.** The
mode-capture fix itself correctly closes ticket 357(a): `obtain_source` returns
`(path, mode)` and the `finally` branches on the captured mode, so entry and
cleanup can no longer disagree. The added prune clears _every_ stale registration
on the shared fork clone. Concurrent builds are not a workflow this repo
documents, and two builds of the same commit already collide at `worktree add`.

**A6 — `pushed: false` is unguarded, and stated honestly.** `grep` across
`scripts/` and `packages/` finds **zero code readers** of the `pushed` key, and
`git ls-remote` appears in no executable file. So `data/sim-implemented-effects.json`
embeds `forkCommit: 2781486d6...`, a commit on one disk, and nothing in
`pnpm verify` would notice. Disclosed in ADR-0033 Consequence 3; carried from
ADR-0030 Consequence 4.

**A7 — Lockfiles and ADR agree.** `data/wowsims.lock.json` has
`tag == commit == 17a8fb28...` with `watchedRefs: {master: ...}`;
`data/wowsims-fork.lock.json` names the same upstream sha as `branchedFrom`.

**A8 — The regenerated artifacts show no sign of hand-editing. Clean.** Probed
four ways: line endings uniform (all `data/universes/` files CRLF in tree, LF in
the committed blob, per `.gitattributes`); cross-artifact coherence (the same
three item ids move `phase: 4 → 3` in `data/items/index.json`, appear in every p3
universe, and appear in `data/pool-listings/feral-p3.md` with counts incrementing
in lockstep — `f` 532→535, `W` 1347→1350); and three read-only gates green
(`list_phase_pool.py --check`, `check_curated_set_phase.py`,
`sync_fork_universes.py --check`).

**A9 — The pre-existing checks are not theatre.** The harness runs the **real**
`do_check` and greps its real output rather than asserting on
`inspect.getsource`, with a docstring explaining why the source-grep approach was
rejected. A1 is a gap in what this harness can express, not a wrong approach.

## Domain

**D1 — The content tier correctly did not move. Clean.** `currentPhase: 3` /
`defaultMaxPhase: 3` are unchanged, and
`git -C <fork> grep -n CURRENT_PHASE <sha> -- ui/core/` returns
`Phase.Phase3` at **both** pins. `watchedRefs` correctly moves
`feature/backend-reforge` → `master`.

**D2 — The universe changes are a legitimate upstream database correction.**
Every spec's P3 universe gains the same three items — 35317, 35319, 35320
(Vindicator's Season 3 pieces) — and `data/items/index.json` moves all three
`phase: 4 → 3`. Confirmed as upstream's data by extracting `db.json` at both
pins: `phase=4` at `ec5c5f2`, `phase=3` at `17a8fb28`. Correct in direction, too:
their set-mate 33921 already read `phase=3` at the old pin. Counts move in
lockstep; no item was lost anywhere.

**D3 — ADR-0033 describes the Two-Handed Weapon Specialization change correctly,
but it is one of five mechanic changes in that file.** The 2H claim is accurate:
`applyTwoHandedWeaponSpecialization` goes from `AddStaticMod` to `AddDynamicMod`
gated on `GetMainHandType() == HandTypeTwoHand`, with a
`RegisterItemSwapCallback`. The old code applied the bonus on `ProcMask` alone
with no weapon-type gate, so a one-handed paladin genuinely received a
two-handed-only talent. The magnitude is plausible: 5/5 gives 6% on most ret melee
damage, and 6% of ~1513 DPS is ~91, so an observed −80.35 sits sensibly just
under. The same hunk range also flips `applyImprovedSealOfRighteousness`
(`DamageDone_Pct` → `Flat`), `applyBenediction` (`PowerCost_Pct` →
`Pct_Add`), and — in `sim/paladin/item_sets.go` — **Justicar 2pc and Lightbringer
4pc**, which are set bonuses on ranked items, not talent bookkeeping.

**D4 — Seal of Vengeance went 15 → 20 PPM, and the ADR does not mention it.**
`sim/paladin/seals.go`: `NewStaticLegacyPPMManager(15, ...)` → `(20, ...)`, with
an upstream comment citing TBC Anniversary logs (63 paladins, 6.3k landed swings,
19.9 PPM at 1.6, 1.8 and 2.7 weapon speed alike). A 33% proc-rate increase on a
seal whose damage scales with weapon speed changes fast-vs-slow weapon value for
ret. The same file adds `SpellFlagSuppressEquipProcs` to Seal of Righteousness,
its judgement, and Seal of Blood; combined with the metagem and weapon-enchant
exclusions in `sim/common/tbc/`, this is a coordinated pass on which procs seals
and weapon procs can trigger — across enchants, gems and weapons this project
ranks. Verified in the diff by the orchestrator. Not simmed: no DPS magnitude is
claimed.

**D5 — Upstream's P3 BiS sets changed for mage and shadow priest, unmentioned.**
New sha256 values for `mage_p3_staff.gear.json`, `mage_p3_sword.gear.json`,
`shadow_p3.gear.json`. Mage P3 ranged: 32363 → 28783. Shadow P3 ranged: 29982 →
32343; neck: 30666 → 35319 (one of D2's phase-corrected items — the corrections
are connected). The universes track it correctly; the prose never says so.

**D6 — Two smaller data changes, both benign.** Felsteel Shield Spike (2714)
gains `enchantType`/`type` and enchant 804 appears, both following upstream
registering the shield spike as a real proc effect;
`data/sim-implemented-effects.json` gains three ids (218→221). `item_effects.go`
now skips gems marked `Disabled`, which interacts correctly with this repo's
meta-activation handling.

**D7 — The `pushed: false` exposure is honestly disclosed.** ADR-0033
Consequence 3 and `upstream-catch-up.md` §7 both state that no gate checks it and
that `ls-remote` is the only proof; the lock's `_comment` records the pre-merge
remote tip so the gap stays re-checkable.

**D8 — ADR-0033 polices its own evidence.** It correctly refuses to treat
upstream's 20-iteration `AllItems` rows as per-item evidence, and Consequence 6
states plainly that the stale `simVersion ec5c5f2` fixture means a green
`pnpm verify` proves nothing at the new pin.

## Standards + Spec

### Standards

**Clean on documented standards — no hard violations.** Checked against
`AGENTS.md` (comment policy, durable claims, types-from-JSON, CLI environment),
`CLAUDE.md`, `docs/workflow.md`, `docs/agents/known-traps.md` and
`docs/agents/issue-tracker.md`. Every new comment is load-bearing; ticket 390
carries all five machine-readable lines with `NEXT` moving in the same commit;
`upstream-catch-up.md` states the fnm and `PIPESTATUS` traps up front and uses
`git -C <abs path>` throughout. The durable-claims discipline is unusually strong:
every closed ticket points at a re-runnable command with its exit code, and
ADR-0033 states its own measurement limits rather than overclaiming.

Three baseline smells, all judgement calls:

- **S1 — Divergent Change**: `do_check` now changes for two unrelated reasons
  (tag-pin drift, sha-pin drift). Extracting `check_sha_pin_drift(lock)` would let
  each be read alone.
- **S2 — Duplicated Code**: the `CURRENT_PHASE` fetch-and-compare block appears
  once per branch. Confirmed by the orchestrator: `parse_current_phase` is called
  at `sync_wowsims.py:611` and `:624`, with `CONTENT TIER CHANGED` written at
  `:616` and `:629`. A message that must stay textually identical in two places is
  how wording drifts apart.
- **S3 — Primitive Obsession**: `obtain_source` returns a bare
  `"worktree"`/`"clone"` string; a typo in the `finally` comparison fails silently
  back into ticket 357's leak. Defensible as written — one comparison site,
  explicit docstring, guard-rail coverage.

### Spec

**Faithful.** Steps 1–9 and 11–12 meet their stated _Acceptance_; the paths
manifest holds; no out-of-scope act occurred.

Step 4 matches its description clause by clause (the `is_sha_pin` regex, skipping
the `latest_tag()` block, `next(iter(...))`, catching `SystemExit` from `ref_sha`
rather than raising, the unconditional informational line, `--unwatch-ref`
returning 2 on an absent key). Step 11: ADR-0033 carries all three Decisions;
ADR-0030 line 3 reads exactly the mandated string; 354/357/358 `closed` with
per-ticket evidence; 359 `open`; 390 filed; `NEXT` = 391. Step 9: fork lock
`2781486d…` / `pushed: false` / `branchedFrom` = target sha. Step 7: hunter counts
0 / 4 / 8, both `17a8fb2` and `3163bcf` ancestors of fork HEAD.

No forbidden path touched — `AGENTS.md`, `CLAUDE.md`, `.claude/skills/`,
`upgrades/engine/`, `packages/core/test/fixtures/**` all untouched; the only
`bulk-screen` match in the diff is ticket 390's filename. Fork not pushed
(`ls-remote` still `5e9013b78…`); no `dev` merge.

**Scope creep, justified:** ADR-0033 Consequence 5 records a 1H-vs-2H engine
change no plan step asked for. It is the replacement for withdrawn step 10 and
states its own limits — but its evidence, `engine-delta.md`, is gitignored, so a
future reader cannot re-derive the number.

**One reversal the spec did not anticipate:** plan Q2 measured
`TAG_TRIGGER: does not fire` (newest tag `v0.0.136`, 82 commits behind). It now
**fires** — `v0.0.137` resolves to `17a8fb28…`, the target sha itself. The
executor handled this exactly as step 2 prescribed: recorded a `FLAG:` line and
did nothing else. The plan's Q2 answer is simply stale.

## Summary

The branch is substantially sound and does what it set out to do: both pins are on
upstream `master`, `sync_wowsims.py --check` exits 0 `in sync.` (the failure that
motivated the chunk), `pnpm verify` is rc 0, the fork merge resolved exactly as
measured, and no regenerated artifact shows any sign of hand-editing across four
independent probes and three read-only gates.

One finding I would want addressed, though not necessarily before merge: **the
guard rails added for ticket 354 do not test the fix** (A1). Three mutations —
including re-introducing the original bug verbatim — leave all 21 checks green,
because the harness cannot express the distinction the fix is about. The
production behaviour was verified by hand, so this is a coverage gap rather than a
live defect, but ticket 354 is closed against an acceptance criterion its own
harness cannot satisfy.

The second theme is **disclosure**: ADR-0033's only behavioural note is the
1H/2H fix, while the same upstream range carries a Seal of Vengeance PPM increase,
two set-bonus conversions on ranked items, a proc-suppression pass across
metagems and weapon enchants, and BiS changes for two specs (D3, D4, D5). All of
the underlying data is correct; none of it is written down. And the one
measurement the ADR does cite rests on a gitignored file (395).

Worst issue per axis — Adversarial: A1. Domain: D4. Standards: S2. Spec: the
gitignored evidence pointer.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                             |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `.scratch/carry-forward/issues/391-sha-pin-guard-rails-do-not-test-the-comparison.md` — closed by `268fe406`                                                                                                              |
| A2  | Adversarial | defer       | `.scratch/carry-forward/issues/392-watched-ref-comparison-depends-on-json-key-order.md`                                                                                                                                   |
| A3  | Adversarial | wontfix     | Unreachable on any real upstream tag (`vX.Y.Z` cannot match the regex); no code path writes a sub-7-character pin. Recorded in 392's context.                                                                             |
| A4  | Adversarial | wontfix     | Pre-existing — `do_watch_ref` has the identical truncate-then-write shape and predates this branch. Not introduced here; fixing it is a separate change to both functions.                                                |
| A5  | Adversarial | wontfix     | The mode-capture fix (ticket 357's actual subject) is correct. The repo-global prune only bites concurrent builds, which this repo does not document, and same-commit builds already collide at `worktree add`.           |
| A6  | Adversarial | wontfix     | Disclosed accepted risk, carried from ADR-0030 Consequence 4 and stated in ADR-0033 Consequence 3. Resolved by the owner's fork push, which is a separate ask.                                                            |
| D3  | Domain      | fixed       | `.scratch/carry-forward/issues/393-adr-0033-omits-ranking-visible-engine-changes.md` — closed by `2c61c723`                                                                                                               |
| D4  | Domain      | fixed       | `.scratch/carry-forward/issues/393-adr-0033-omits-ranking-visible-engine-changes.md` — closed by `2c61c723`                                                                                                               |
| D5  | Domain      | fixed       | `.scratch/carry-forward/issues/394-upstream-bis-sets-changed-without-disclosure.md` — closed by `2c61c723`                                                                                                                |
| S1  | Standards   | wontfix     | Judgement-call smell. `do_check`'s two drift paths are each short and separately tested; extracting them is a refactor this branch did not need to make.                                                                  |
| S2  | Standards   | wontfix     | Judgement-call smell, verified real (`sync_wowsims.py:611/624`, message at `:616/:629`). Two sites inside one function, both visible in one screen; recorded here so a later editor knows the strings must move together. |
| S3  | Standards   | wontfix     | Defensible as written: one comparison site, explicit docstring, and the guard-rail check covers the behaviour ticket 357 was filed for.                                                                                   |
| SP1 | Spec        | fixed       | `.scratch/carry-forward/issues/395-adr-0033-cites-gitignored-evidence.md` — the measurement is inlined in ADR-0033; closed by `2c61c723`                                                                                  |
| SP2 | Spec        | defer       | `.scratch/carry-forward/issues/396-abandoned-step-10-artifacts-in-stage-dir.md` — partial regression artifacts left without a note saying the approach was withdrawn.                                                     |
| SP3 | Spec        | wontfix     | The `TAG_TRIGGER` reversal (`v0.0.137` now contains the merge) was handled exactly as plan step 2 prescribed: flagged, not acted on. The plan's Q2 answer is stale; nothing is wrong in the branch.                       |
