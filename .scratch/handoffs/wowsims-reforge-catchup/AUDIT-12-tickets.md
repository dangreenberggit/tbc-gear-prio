# Audit — 12 tickets named by the `feat/wowsims-reforge-catchup` merge advisory

Read-only audit. Repo `C:\Users\dgree\Code\lulz\tbc-gear-prio`, `dev` at merge
commit `16f8fba`, merge base `8b2fffe`. Every claim below is grounded in
`git diff 8b2fffe..16f8fba -- <path>`, a specific commit, or a file in
`.scratch/handoffs/wowsims-reforge-catchup/` — cited inline, not restated from
memory.

## Table

| Ticket | Verdict | One-line reason |
| --- | --- | --- |
| 153 — p3-curated-list-pinned-to-p2-set | UNAFFECTED | `rank-report.ts` display logic (the ticket's actual substance) is untouched; only the mechanical `PER_FILE_PIN` override for `ret_p3.gear.json` was promoted out, which does not touch the ticket's own text |
| 170 — do-restore-override-check-crashes-instead-of-failing | UNAFFECTED | `do_restore`'s `file_sha = meta.get("commit", sha)` read is byte-identical; the branch never touched `do_restore` |
| 338 — layout-gate-fnm-node-22-not-verified | CHANGED | `_layout_command()`'s unguarded `fnm exec --using=22` is still exactly as described, but the file was rewritten around it (new verdict-line mechanism) and line numbers moved |
| 350 — two-hander-swap-leaves-worn-offhand | UNAFFECTED | `rank.ts`/`pool.ts` (the actual guard logic) have zero diff; `common_pb.ts` only gained an unrelated `bloodthistle` field, `HandType`/`WeaponType` enum values unchanged |
| 351 — weapon-imbue-does-not-follow-candidate-weapon | UNAFFECTED | `compose.ts` has zero diff; `WeaponType` enum values cited in the ticket (Axe 1 … Sword 9) are byte-identical after regen |
| 353 — re-baseline-committed-sim-numbers-on-engine-ec5c5f2 | CHANGED | Mechanical acceptance boxes 1/2/3/5 are done and match the ticket's own "What was done" log; box 4 (SME) is still open, and the ticket's §4 text still states the stale/reversed −18 DPS claim as an unanswered question — contradicted by `SME-353-feral-verdict.md` |
| 354 — sync-wowsims-check-misreports-drift-on-a-ref-pin | UNAFFECTED | `do_check`/`latest_tag()` in `scripts/sync_wowsims.py` have zero diff; `EXEC-status-slices-C-D-E.md` measured the exact symptom (a) live on this branch's own tip |
| 356 — fetch-wowsimcli-builds-from-an-unrelated-commit-for-a-non-tag-non-sha-pin | FIXED | Closed by commit `06a5ef7`, "Refuse to build when the lock tag does not name the commit" — dispatch is now total, measured against all four cases in the commit body |
| 357 — build-from-source-can-leak-a-git-worktree-registration | UNAFFECTED | Both halves ((a) the re-tested `finally` guard, (b) the missing `--commit`/`--tag-dir` mismatch warning) are still present verbatim in the current `scripts/fetch_wowsimcli.py`; only 356 (a different bug in the same function) was fixed |
| 72 — import-a-user-supplied-wowsims-setup | UNAFFECTED | `IndividualSimSettings` in `ui_pb.ts` is unchanged in shape (only later message indices shifted because upstream removed `ReforgeSettings`/`StatCapConfig`/`UIStat` from this file); `share-link.ts` and `individual-settings.ts`, which the ticket's codec claims depend on, have zero diff |
| 73 — extend-sim-defaults-extractor-to-talents-and-consumables | UNAFFECTED | The branch's `extract_sim_defaults.mjs` change only generalizes phase resolution for `defaultExposeWeaknessSettings()`; it does not touch `ui/druid/feralcat/presets.ts` or add `TALENTS`/`CONSUMABLES` extraction, which remains this ticket's whole ask |
| 84 — proto-drift-not-caught-by-local-verify | UNAFFECTED (reinforced) | `pnpm verify`'s script chain and `.github/workflows/verify.yml` have zero diff — still no local proto-drift gate; this branch independently hit the exact failure mode it describes (see below) |

## FIXED

### 356 — fetch-wowsimcli builds from an unrelated commit

Closed by commit `06a5ef7` ("Refuse to build when the lock tag does not name
the commit"), landed on this branch after the branch's own pre-merge review
(adversarial axis, finding A2) found it. `scripts/fetch_wowsimcli.py` now
rejects any `tag` that is neither `RELEASE_TAG_RE` nor a 40-hex sha matching
`lock["commit"]`, with exit 2 and a message naming both legal forms — exactly
what the ticket's acceptance criteria ask for. The commit message records four
measured cases (`tag=master`, `tag=v0.0.119-rc1`, mismatched 40-char shas, and
the real pin), each with the observed exit code and message.

**Close this ticket.** Nothing further needed; the acceptance boxes are
satisfied by the commit as written.

## CHANGED

### 338 — layout-gate-fnm-node-22-not-verified

The ticket's cited defect — `_layout_command()` dispatching to
`fnm exec --using=22` without checking that fnm actually resolves a v22 —
is still present verbatim in `scripts/check_layout_gate.py` (current function,
same three-branch shape: ambient >=22 direct, else `fnm exec --using=22` if
`fnm` is on PATH, else `None`). No guard was added between "fnm is on PATH"
and "the fnm-selected node is actually >= 22".

What changed is everything **around** it. Commits `ddce4ac` ("Arm the layout
gate against the gzipped wasm") and `4dcafcd` ("Stop the layout gate blaming
the tab for a crash") rewrote large parts of the file: a new
`LAYOUT_GATE_VERDICT` line contract between `test-layout.mjs` and this script,
a `GATE_UNMEASURED` sentinel, and a rewritten `run_gate()` that tees stdout.
`4dcafcd`'s own commit body records running the gate end to end for the first
time since the backend-reforge merge, green on **ambient Node 22** ("37
assertions at widths 375, 653, 768 and 1280"). That is the direct-ambient-node
path, not the fnm-fallback path — the missing-v22-under-fnm case the ticket
describes was not exercised, so the bug is not disproven, only untouched.

One relevant new fact for whoever picks this up: if `fnm exec --using=22`
now fails because no v22 is installed, the subprocess itself errors before
`test-layout.mjs` ever runs, so no `LAYOUT_GATE_VERDICT` line is emitted.
`_parse_verdict` returns `None` in that case, and the new code's fallback path
(`REVIEW-agents-edits.md`/commit `4dcafcd`, the "older fork clone" branch)
returns **1**, still reported as a layout failure via
`die("layout gate failed …")` — the same misreport the ticket names, just
reached through the new verdict-parsing code instead of the old exit-code
path.

**Edit needed in the ticket:** line references to `check_layout_gate.py:189`
are stale (function line numbers moved substantially); re-cite
`_layout_command()` by name, which the ticket already does as a fallback.
Optionally add a note that the new verdict-line fallback path reproduces the
same misreport when fnm has no v22, so a fix can target either the dispatch
in `_layout_command()` or the `None`-verdict fallback in `run_gate()`.

### 353 — re-baseline-committed-sim-numbers-on-engine-ec5c5f2

The ticket's own file, read in full, already carries a "What was done
(2026-09-10)" section recording that acceptance boxes 1, 2, 3 and 5 are done:
- Fixtures re-recorded, commit `fda1126` ("Re-record the synthetic fixtures on
  engine ec5c5f2").
- `apiVersion` assertion replaced, commit `c135b0b` ("Assert the preset
  capture's api version, not equality") — confirmed against
  `packages/core/test/individual-settings.test.ts`'s diff: the old
  `expect(CURRENT_API_VERSION).toBe(preset.apiVersion)` is gone, replaced by
  `expect(preset.apiVersion).toBeGreaterThan(0)` +
  `expect(CURRENT_API_VERSION).toBeGreaterThanOrEqual(preset.apiVersion)`.
- All 11 previously-failing tests are named with disposition "green,
  re-recorded" or "assertion replaced".
- `docs/verification-log.md` read, no stale figure found in a load-bearing
  position.

**Box 4 (SME verdict) is still unchecked, and it should stay that way only
until the ticket text is corrected** — `.scratch/handoffs/wowsims-reforge-catchup/SME-353-feral-verdict.md`
(seat `gate-sme`, verdict `trust-with-caveats`) directly contests the
ticket's own §4 text:

> Ticket 353 §4 says the prior pin review "recorded a −18 DPS feral rotation
> regression ... with no domain look." ... It was answered on 2026-08-21, the
> −18 figure was superseded, and the sign of the effect is the opposite of the
> one the ticket carries forward.

The SME cites `.scratch/carry-forward/issues/250-feral-rotation-regression-unreviewed.md`
(status: closed) and `docs/verification-log.md:1654-1669` ("Ticket 250,
re-measured and closed"), which shows the rotation change is **+42.91 DPS in
favour of the new rotation**, not a −18 DPS regression. Re-reading the current
ticket 353 file confirms this stale claim is still present verbatim:

> The prior pin review recorded a **−18 DPS feral rotation regression** and a
> 15 → 27 jump in above-cutoff rows, with no domain look.

**Exact edit needed:** in ticket 353's "§4 The domain question, unanswered"
section, replace the sentence above with a corrected framing per the SME's
"Merge line" recommendation:

> Ticket 353 §4 should be corrected before it is used as a brief again. It
> revives the −18 DPS figure as an open question; that figure was superseded
> in sign on 2026-08-21 and ticket 250 is closed. Propagating it a third time
> is how a stale number becomes folklore. The 15 → 27 pair should likewise be
> labelled as two uncontrolled measurements rather than a regression.

The SME's own re-record data (already in ticket 353's "What was done" section)
sharpens this further: the re-recorded pool shows `aboveCutoffItemIds`
unchanged on all three rows, and ret's request-hash-identical rows prove the
new engine is bit-identical on unchanged requests — feral's whole DPS delta
(+7.53) is attributable to a correct Expose Weakness buff change carried by
the request, not to engine drift. The "15 → 27" figure from the old review is
**not reproduced** in this re-record (feral-p3 sits at 43 both before and
after).

Once §4 is corrected, box 4 can be closed on the SME's `trust-with-caveats`
verdict and the ticket closed outright. Two secondary, lower-priority notes
from the same SME doc, not required for closing 353 but worth carrying
forward: `scripts/build_feral_skeleton.py:19`'s comment still claims the
rotation comes from the vendored APL (contradicts line 64, which reads from
the owner's export) — one-line comment fix; and
`data/presets/feral/p1.ep-weights.json`'s "EP only chooses gems here" note is
false (`candidate-order.ts` also orders the candidate pool with the same
weights, capped by `rank.ts:1100`).

## UNAFFECTED, with detail (where a starting point needed confirming)

### 350 / 351 — two-hander-swap / weapon-imbue

Both tickets are engine-logic bugs in `packages/core/src/rank.ts`,
`packages/core/src/compose.ts`, and the mirrored fork copies. Neither file has
any diff between `8b2fffe` and `16f8fba` (`git diff --stat` returns empty for
both paths). `common_pb.ts`'s only change is an unrelated new field
(`bloodthistle: boolean` on `ConsumesSpec`); the `HandType` enum
(`HandTypeMainHand = 1`, and by extension `HandTypeTwoHand`) and `WeaponType`
enum (`WeaponTypeAxe = 1` … `WeaponTypeSword = 9`) that both tickets cite by
value are byte-identical after the proto regen. Both tickets' factual claims
and reachability tables stand exactly as written.

### 354 — sync-wowsims-check-misreports-drift-on-a-ref-pin

`scripts/sync_wowsims.py`'s `do_check`/`latest_tag()` functions have zero diff
in this branch (the only edits to that file are the `PER_FILE_PIN` promotion
and an expanded `CONTENT TIER CHANGED` follow-up message inside `do_update` —
see ticket 153 note below). Symptom (a) was independently reproduced live on
this branch's own tip: `.scratch/handoffs/wowsims-reforge-catchup/EXEC-status-slices-C-D-E.md`
records, under "Slice D": `--check` drift lines — predicted "exit 1, only 'new
release available', no tier line" — actual "**Exactly that.**" This is
corroborating evidence the bug is live today, not a fix.

### 357 — build-from-source-can-leak-a-git-worktree-registration

Confirmed both halves are still present in the current
`scripts/fetch_wowsimcli.py`:
- (a) `build_from_source`'s `finally` block (currently ~line 195) still does
  `if src is not None and (FORK / ".git").exists(): run(["git", "-C", ...,
  "worktree", "remove", "--force", str(src)])` — a re-test of the same
  filesystem condition `obtain_source` branched on at entry, not a captured
  flag from the path actually taken.
- (b) `main()`'s final branch (`dir_name = args.tag_dir or (commit if
  args.commit else tag)`) still builds and writes to
  `vendor/wowsimcli-<dir_name>-<platform>` with no check or warning when
  `--commit` is given and the resulting `dir_name` differs from `lock["tag"]`.

356 fixed a different bug in the same function (the tag-dispatch totality
check, inserted earlier in `main()`), which is why the merge advisory's
starting-point question ("was 357 also fixed?") resolves to no — 356's fix
does not touch either of 357's two defects.

### 72 — import-a-user-supplied-wowsims-setup

The ticket's cited code — `packages/core/src/share-link.ts`,
`packages/core/src/individual-settings.ts`, `packages/core/src/compose.ts`,
`packages/core/src/rank.ts` — has zero diff. `ui_pb.ts` did change
substantially, but the change is upstream removing `ReforgeSettings`,
`StatCapConfig`, and `UIStat` message types out of `ui.proto` (they moved to
`api_pb.ts`, consistent with upstream's backend-reforge work being about
in-engine reforge, not UI state) and renumbering later message indices
(`SavedGearSetSchema` 19→16, etc.) accordingly. `IndividualSimSettings` itself
— the message this ticket's whole "Stage 1" plan is built on — is untouched in
shape. No correction to the ticket's text is needed.

### 73 — extend-sim-defaults-extractor-to-talents-and-consumables

`scripts/extract_sim_defaults.mjs`'s diff only generalizes
`callHelper`'s `defaultExposeWeaknessSettings` branch to resolve
`CURRENT_PHASE` statically from a newly-read `vendor/wowsims/constants_other.ts`
when the call has zero arguments (needed because upstream's own call site lost
its explicit phase argument at the new pin — confirmed by
`EXEC-status-slices-1-B.md`'s C15 row). This is a different function
(`callHelper`) working against a different vendored file
(`constants_other.ts`) than this ticket's ask, which is reading
`ui/druid/feralcat/presets.ts` for `TALENTS`/`CONSUMABLES`/`RACE`/
`PROFESSION1`/`PROFESSION2`. That file is not touched, `presets.ts` is not
read by the extractor, and none of the five named constants moved into
generated output. The ticket's own text is already up to date (it already
notes `CONSUMABLES` was separately deleted by ticket 244, and that `TALENTS`
still stands) — no edit needed.

### 84 — proto-drift-not-caught-by-local-verify

`package.json`'s `verify` script chain and `.github/workflows/verify.yml` are
both untouched (zero diff). There is still no local check that regenerates
`packages/core/src/proto/*.ts`/`data/proto` and byte-compares — the CI-only
gate the ticket describes is still CI-only.

Worth recording as reinforcing evidence, not a fix: this branch independently
tripped over the exact failure class the ticket names.
`EXEC-status-slices-1-B.md`'s Slice B2 table records that `apl_pb.ts` and
`spell_pb.ts` "moved anyway — pre-existing codegen drift dating to the first
proto-pinning commit (`9705084`), surfaced by this session's `buf generate`
... but not caused by this pin move." In other words: those two generated
files had been silently stale since the very first proto-pinning commit, `git
diff --exit-code` in CI would have caught it on every push since, but nobody
ran `pnpm proto:generate` + byte-compare locally until this branch's own
regen work happened to touch every proto file. That is ticket 84's scenario,
observed live, not hypothesized. No ticket text needs correcting — the
scenario described is confirmed, not contradicted — but this is worth citing
if 84 is ever prioritized, as concrete evidence the gap is not theoretical.

### 153 — p3-curated-list-pinned-to-p2-set

The ticket's entire remaining scope (after its own 2026-08-14 update) is
display-side: `bisStale` placement in `rank-report.ts`, `bisStale`'s
older-vs-absent blind spot, and the unmeasured 3-vs-15 curated-item count.
None of `packages/core/src/rank-report.ts` is touched by this branch (zero
diff). The only related change is mechanical: `scripts/sync_wowsims.py`'s
`PER_FILE_PIN` dict, which had carried a per-file override pinning
`ret_p3.gear.json` to commit `5c7491899` (the "missed jsons" commit the
ticket's own update already describes as closing the underlying upstream
gap), was promoted out — the new main pin `ec5c5f205e61` is confirmed ahead of
that commit (`gh api .../compare/5c7491899...ec5c5f205e61 --jq .status` →
"ahead", per the diff's own comment), so the override became a no-op and was
removed. This changes *how* the p3 ret set is fetched, not *whether* it
exists or how it's displayed — the ticket's own text already correctly treats
the underlying data gap as resolved and scopes itself to presentation only.
No edit needed.

### 170 — do-restore-override-check-crashes-instead-of-failing

`scripts/sync_wowsims.py`'s `do_restore` function is untouched: the line the
ticket cites (`file_sha = meta.get("commit", sha)`, now around line 529 after
unrelated edits elsewhere in the file shifted line numbers) is byte-identical
to the version described in the ticket's reproduction steps. The bug and its
repro stand exactly as written.

## Summary

**Close now:**
- **356** — fixed by commit `06a5ef7`, acceptance criteria satisfied and
  measured in the commit body.

**Need a text correction before further use, do not close yet:**
- **353** — correct §4's stale/reversed −18 DPS claim and the "15 → 27" framing
  per the SME verdict in `SME-353-feral-verdict.md`; once corrected, box 4 can
  be checked off `trust-with-caveats` and the ticket closed.
- **338** — re-cite `_layout_command()` by name rather than a stale line
  number; optionally note the verdict-parsing fallback path reproduces the
  same misreport when fnm has no v22 (bug persists, just relocated).

**Newly urgent: none.** No ticket in this set was made more likely or given a
new related hazard by this branch. 356 removed one live-if-hand-edited risk;
everything else is either fixed, cosmetically relocated, or simply untouched.

**Everything else (153, 170, 350, 351, 354, 357, 72, 73, 84) stays open,
unedited, exactly as filed** — confirmed by diffing their matched files
against this merge and, where available, cross-checked against the branch's
own exec-status and review documents.
