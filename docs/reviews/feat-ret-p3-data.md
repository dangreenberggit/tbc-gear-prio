# Pre-merge review — feat/ret-p3-data

Reviewed range: `5be6a814d97488201a09f7b3f709ea144e83b1e9..859eab504a95932c57d931f59b9a2497b3a5f378`

Round 1. Three axes, fresh context, review lane (Claude Code: Opus at effort
`medium`). `codex` is not on `PATH` (`which codex` exits 1), so option 1 of the
skill's dispatch order was unavailable; all three axes ran as fresh subagents in
one parallel batch. No wall was hit.

Scope: slice 6/6b of the wowsims-tab detour — ret P3 EP weights, the vendored
upstream ret P3 curated gear set under a per-file pin override, refreshed
`bisTags` across the p3–p5 ret universes, p3+ universes scored with p3 EP
weights, a phase guard on curated-item membership, plus handoffs and the SME
verdict.

Two reviewers independently regenerated all four ret universes from committed
sources and reported them reproducing byte-for-byte against `HEAD` (CRLF aside
on a scratch path). That matches the orchestrator's slice-6b verification table
in `.scratch/handoffs/wowsims-tab/PROCESS.md`, which recorded the same result
plus `pnpm verify` exit 0.

Excluded by construction, not re-litigated: the SME verdict's two medium
pool-membership findings (already ticket 157) and `feral-p2.json` staleness
against its own generator (ticket 154, pre-existing).

## Adversarial

**A1 (high) — p4 and p5 silently adopt p3's EP weights, with no record of
which weights produced the numbers.** `scripts/assemble_universe.py:1303`
resolves weights via `ep_weights_path_for`, which picks the highest key
`<= max_phase`, so `max_phase` 4 and 5 both land on
`data/presets/ret/p3.ep-weights.json`. Those are not p3 artifacts. The universe
file's top-level keys are `spec, maxPhase, carryoverPolicy, generatedBy,
d7Note`, `generatedBy` is the bare string `"scripts/assemble_universe.py"`, and
the report records no weights either. `curationHint` is the EP score, the slot
sort key, and the junk filter's percentile floor.

Confirmed by the reviewer of this file, not taken on the axis's word:

```bash
python -c "
import json,subprocess
old=json.loads(subprocess.run(['git','show','5be6a81:data/universes/ret-p5.json'],capture_output=True,text=True).stdout)
new=json.load(open('data/universes/ret-p5.json'))
o={e['itemId']:e.get('curationHint') for e in old['entries']}
n={e['itemId']:e.get('curationHint') for e in new['entries']}
print('changed:',sum(1 for k in o if o[k]!=n[k]),'of',len(o))
print('membership added:',len(set(n)-set(o)),'removed:',len(set(o)-set(n)))
"
```

423 of 534 p5 `curationHint` values changed with **zero** membership change — a
pure reweight. And `git diff 5be6a81...859eab5 --stat -- data/universes/` shows
`ret-p3/p4/p5.report.json` are absent from the diff entirely, so a reader
diffing the reports sees nothing happened. The domain axis reached the same
finding independently and judged the substitution itself _better_ than leaving
p4/p5 on p2 weights — the defect is the missing provenance, not the choice.

**A2 (low) — dead branch in `ep_weights_path_for`
(`scripts/assemble_universe.py:365-372`).** `candidates` is built as a list of
paths and then only tested for emptiness; `best_phase` independently recomputes
the max over the same predicate. The two cannot disagree today, so the first
list is pure overhead — but it invites a future edit that filters one and not
the other, silently returning a later phase's weights. Collapses to a single
`max(..., default=None)`. The standards axis flagged the same lines
independently as duplicated code.

**A3 (medium) — neither new mechanism has a test.** `ep_weights_by_phase` /
`ep_weights_path_for` and `PER_FILE_PIN` have no references outside their own
scripts. A three-line table test over `(max_phase → resolved path)` would have
surfaced A1 before the artifacts shipped.

**Cleared under scrutiny, explicitly.** The adversarial axis confirmed the
`curated` phase guard is correct and its comment accurate (32574, phase 3,
excluded from ret-p2 and present p3–p5; 33122, phase 1, admitted at p2); the
`PER_FILE_PIN` override round-trips through `do_restore` and stays hash-guarded
by `verify_blob`; every p3 EP weight matches upstream at `ac0ed034b` including
stat-index mapping; and the changed test counts are not theatre — the curated
union independently recomputes to 44 with 40 admitted and 4 excluded, matching
the assertions. The axis also recorded rejecting its own first hypothesis (that
the unchanged report files were stale artifacts) after regenerating disproved
it.

## Domain

**No contradictions of `docs/stage0-findings.md` or `docs/verification-log.md`.**
The diff adds no WCL field reading, no slot mapping, no enchant/gem namespace
handling, no race inference and no spec classification, and the axis checked
each brief item by name rather than by absence of the topic. `currentPhase`
still comes only from upstream's `CURRENT_PHASE` in `constants_other.ts`, which
`PER_FILE_PIN` deliberately does not override — so the content tier is not
re-derived. The research docs describe upstream's own race-from-racial-casts
importer as upstream behaviour, not as something adopted here.

**D1 (verified clean) — EP stat indices.** Keys `0/1/5/17/20/21/22/23/24` map to
Strength / Agility / SpellDamage / AttackPower / MeleeHit / MeleeCrit /
MeleeHaste / ArmorPen / Expertise per `data/proto/common.proto`, and
`pseudoWeights.0` is `PseudoStatMainHandDps` — the separate enum space, matching
upstream's 5.43.

**D2 (medium, unverified) — `p3.ep-weights.json` provenance is not
reproducible at the repo pin and nothing checksums it.** Its own `source` field
admits `P3_EP_PRESET` does not exist at `8aa378b3`; the nine weights plus the
pseudo-weight were hand-transcribed from `ac0ed034b`. Unlike
`ret_p3.gear.json`, which got a `PER_FILE_PIN` entry and a sha256 lock row, the
EP file has no lock entry and no `--check` assertion. The adversarial axis did
diff the values against upstream and found them exact, so this is a durability
gap rather than a known error: nothing re-verifies them on the next sync.
Closing it means a lock entry or a check that fetches
`ui/paladin/retribution/presets.ts` at `ac0ed034b` and compares.

**D3 (see A1) — no EP-weight provenance in the artifact.** Reached
independently of the adversarial axis. Domain's addition: the docstring's
"newest available, never a later phase's claim" rule is borrowed from gear-set
tagging, which _does_ have a disclosure surface (`curatedSets`, plus the HTML
report's staleness warning). Weights have no equivalent surface, so the analogy
does not carry.

## Standards + Spec

**S1 (medium) — `PER_FILE_PIN` has no case in the verify-gated check.**
`scripts/check_sync_wowsims.py` runs under `pnpm verify` and contains no
`PER_FILE_PIN` reference (`grep -n "PER_FILE_PIN" scripts/check_sync_wowsims.py`
is empty — confirmed by the reviewer of this file). Nothing fails if a future
`--update` drops the override and drags `ret_p3.gear.json` back to the main
pin, which is precisely the hazard the new comment says must not happen. The
slice's own handoff records as **untested** whether a second `PER_FILE_PIN`
entry round-trips.

**S2 (low) — stale name in a load-bearing comment.**
`scripts/assemble_universe.py:171` names `ep_weights_for_phase()`; the function
is `ep_weights_path_for` (`:354`).

**S3 (low) — divergent `pin` field contract.**
`data/presets/ret/p3.ep-weights.json` puts a ~100-word narrative in `"pin"`
where `p2.ep-weights.json` holds `"8aa378b3"`. Nothing can machine-compare it
against the lockfile. Related to D2.

**S4 (low) — repeated phase predicate.** `int(it.get("phase") or 99) <=
max_phase` now appears three times in one block of `assemble_universe.py`; the
new comment says "guarded the same way as `in_heroic`/`in_rep_phase` below",
which is the duplication describing itself.

**S5 (low) — comment bulk.** The ~11-line history comment on the `curated`
guard and the 10-line changelog comment above a single `toBe(241)` in
`packages/core/test/pool.test.ts` both carry more history than the repo's
comment policy wants inline; one sentence each is load-bearing.

**Spec — regen verified rather than asserted.** The axis ran
`python scripts/assemble_universe.py --spec ret --max-phase {2,3,4,5}` against
committed sources and reported all four universes and all four reports
reproducing exactly (ret-p2's report differing only by CRLF), worktree left
clean.

**SP1 (high) — the `sme-rank-review` gate is not met as written, and two
documents disagree about whether it ran.** `docs/plans/wowsims-tab/plan.md:378-380`
makes slice 6 done when "the `sme-rank-review` verdict is filed", and
`orchestration.md:60-61` says it fires "on slice 6's refreshed ret-p3
**ranking**". The filed verdict states plainly that it reviewed no ranking —
"These are not rank results… no ordered list, no equipped set, and no gain/loss
numbers" — and its own gate answer is "Not yet". Separately,
`.scratch/handoffs/wowsims-tab/slice-6/HANDOFF.md:664-665` still says the review
"has not been run" while the verdict is committed in the same branch at
`859eab5`.

Judgment: this is a **plan-completion** finding, not a code defect. The three
things the slice actually claimed — the P3 pin, the EP wiring, the phase-guard
fix — all landed and regenerate byte-exact, and the SME verdict itself says
findings 1–2 "do not block the branch on their own". What is not true is that
plan §9.6's done-when is satisfied. That is the user's call at the merge ask,
not a reviewer's, so it is recorded here rather than silently deferred.

**SP2 (medium) — no provenance note on the refreshed p3 tags.**
`plan.md:311-315` asks for "refreshed `bisTags` in `data/universes/ret-p3.json`

- provenance note". The artifact's top-level keys are `spec, maxPhase,
carryoverPolicy, generatedBy, d7Note` — the provenance lives only in `.scratch/`
  handoffs and code comments, never in the shipped file. Same shape as A1/D3 and
  folded into the same ticket.

**SP3 (medium, scope) — `PER_FILE_PIN` is unrequested lockfile schema.**
Decision D2 pins `8aa378b3` and defers the rebase to slice 7, and slice 6's
brief forbade vendor/lockfile edits. The branch adds a per-file override plus a
new per-entry `"commit"` field. The intent is defensible and the reviewer
confirmed the main pin is unmoved with exactly one override present
(`python -c "import json;lock=json.load(open('data/wowsims.lock.json'));print(lock['commit'][:12]);print([k for k,v in lock['files'].items() if 'commit' in v])"`
→ `8aa378b3671a`, `['ret_p3.gear.json']`), so D2 holds in substance. Recorded
as scope drift with test cover missing (S1), not as a defect.

**SP4 (low) — PLAN.md §16 item 3 is stale.** It asserts
`p2.ep-weights.json` "is missing its largest term"; the file has carried
`pseudoWeights: {"0": 5.34}` since `2fdad02` (2026-08-02). Verified by reading
the file and that commit.

## Summary

The branch does what it claims, and the parts most likely to be wrong were
checked rather than assumed: the vendored gear set hashes to its lockfile row
(647 bytes, `673db01…`), the 15 tagged ids at p3 are exactly upstream's 16
populated slots minus `27484` with zero spurious tags, the main pin is unmoved,
the phase guard behaves in both directions, and two independent reviewers plus
the earlier orchestrator pass all reproduced the artifacts byte-for-byte.

One finding is worth pausing on before merge, and it is a **disclosure** defect
rather than an arithmetic one — the same shape this repo has hit before
(tickets 127, 102). Scoring p4/p5 with p3 weights is the better approximation,
but 423 of 534 p5 scores moved while the report files did not change at all and
no artifact records which weights were used. Nothing errors; the numbers just
quietly mean something different than they did. That is filed as 158 rather
than fixed here, because it is a generator-output decision and this branch's
data regenerates byte-exact as-is.

The second thing the user should see before deciding: plan §9.6's done-when
asked for an SME review of a **ranking**, and what exists is a review of a
candidate list that returned "not yet". The branch is defensible; the slice's
completion claim is the part that is not, and that is a merge-ask decision, not
a reviewer's.

Nothing was fixed on the branch in this round — the review is filed and stops
here, per the skill.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Adversarial | defer       | `.scratch/carry-forward/issues/158-universe-artifacts-record-no-ep-weights-provenance.md`                                                                                                                                                                                                                                                                                                  |
| A2  | Adversarial | defer       | Folded into 158's done-when (same function); trivial cleanup, no behaviour change                                                                                                                                                                                                                                                                                                          |
| A3  | Adversarial | defer       | `.scratch/carry-forward/issues/160-per-file-pin-has-no-check-sync-wowsims-case.md` (PER_FILE_PIN half); weights-table test folded into 158                                                                                                                                                                                                                                                 |
| D1  | Domain      | wontfix     | Verified clean — EP stat indices and the pseudo-stat namespace match upstream; recorded as evidence, not a defect                                                                                                                                                                                                                                                                          |
| D2  | Domain      | defer       | Folded into 158 — the EP file needs a lock entry / check alongside the provenance stamp. Stated **unverified**: the values were diffed against `ac0ed034b` and matched, but nothing re-checks them on the next sync                                                                                                                                                                        |
| D3  | Domain      | defer       | Same finding as A1 → 158 (reached independently)                                                                                                                                                                                                                                                                                                                                           |
| S1  | Standards   | defer       | `.scratch/carry-forward/issues/160-per-file-pin-has-no-check-sync-wowsims-case.md`                                                                                                                                                                                                                                                                                                         |
| S2  | Standards   | defer       | Folded into 158 (same function, one-line comment fix)                                                                                                                                                                                                                                                                                                                                      |
| S3  | Standards   | defer       | Folded into 158 (the EP-file lock entry supersedes the prose `pin` field)                                                                                                                                                                                                                                                                                                                  |
| S4  | Standards   | wontfix     | Three uses of one short predicate in one block; extracting it would not make the phase rule clearer than the guard comment already does                                                                                                                                                                                                                                                    |
| S5  | Standards   | wontfix     | Comment bulk is history-carrying but accurate and points at real commits; the repo has been bitten harder by stale comments (ticket 130) than by long ones                                                                                                                                                                                                                                 |
| SP1 | Spec        | defer       | `.scratch/carry-forward/issues/161-plan-16-item-3-and-slice-6-handoff-are-stale.md` for the document contradiction. The plan-completion half is **not** ticketed: it is the user's merge-ask decision, raised in Summary                                                                                                                                                                   |
| SP2 | Spec        | defer       | Same finding as A1 → 158                                                                                                                                                                                                                                                                                                                                                                   |
| SP3 | Spec        | defer       | Test cover → 160. D2 pin discipline verified intact (main pin unmoved, one override), so no separate ticket                                                                                                                                                                                                                                                                                |
| SP4 | Spec        | defer       | `.scratch/carry-forward/issues/161-plan-16-item-3-and-slice-6-handoff-are-stale.md`                                                                                                                                                                                                                                                                                                        |
| R1  | Reviewer    | defer       | `.scratch/carry-forward/issues/159-cli-hardcodes-p2-ep-weights-for-every-ret-phase.md` — `cli.ts:284-288` picks EP weights by spec only, so a `--max-phase 3` rank still uses p2 weights while the assembler uses p3's. Pre-existing (`git show 5be6a81:packages/core/src/cli.ts` is identical; the branch touched no `packages/core/src`), but this branch is what makes the two disagree |

Pre-existing and deliberately not re-filed: ticket 157 (SME pool-membership
findings), ticket 154 (`feral-p2.json` stale against its own generator).
