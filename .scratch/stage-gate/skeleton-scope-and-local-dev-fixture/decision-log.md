# Decision log — skeleton-scope-and-local-dev-fixture

One dated line per gate: gate, outcome, reason, round count.

## 2026-09-10 — Stage opened

Base SHA `43052fb924cea939559131970c8894af97c05d3c` on branch
`feat/reforge-catchup-leftovers`. `git status --porcelain` empty at open.

Brief written. Deliverable is a **decision plus committed ticket edits**, not a
built generator, so the brief carries four open questions (Q1 generator worth
building, Q2 does a skeleton alone make a spec CLI-rankable, Q3 which pinned
source is legitimate, Q4 where the CLI/tab distinction is recorded), each
requiring a candidate set, a pre-registered winning condition, and a
measurement or a stated reason none is possible.

Pre-stage measurements cited in the brief rather than left for the planner to
re-derive: the tab reaches ticket 350's case without a skeleton (code read);
the per-spec fork preset inventory across all 11 specs; that
`build_feral_skeleton.py` does not generalize (owner personal export has no
per-spec counterpart); that `extract_sim_defaults.mjs` covers one spec.

Owner decisions recorded as settled, not open: ticket 350 takes **option 2**
(clear the off hand, price the swap honestly), and the 2H+off-hand engine
measurement is explicitly not wanted.

Known constraint carried into the plan: `pnpm` is broken in both shells
(Node 20.18.1 vs pnpm 11.24.0's `>=22.13` floor, dying on
`ERR_UNKNOWN_BUILTIN_MODULE node:sqlite` — ticket 268), so Gate C's
`pnpm verify` requirement cannot currently be met. The planner must resolve
this as a step or report it as a precondition.

## 2026-09-10 — Q3 resolved by derivation, not owner ruling

The brief listed Q3 (which pinned source a generated skeleton may read from) as
an open question. The owner declined to rule on it, on the grounds that it is
derivable from what each tree is for. It is. Recorded here so the planner does
not spend a round on it.

**The rule follows from the consumer, not from preference.** A skeleton is an
input to `packages/core`, the outer repo's CLI ranking engine. It is not a tab
concern. So the question is only whether a given skeleton is a committed,
gated artifact or a throwaway local convenience:

| If the skeleton is | Source | Because |
| --- | --- | --- |
| Committed under `data/presets/` | the pinned mirror `vendor/wowsims/`, added via a `TRACKED` edit then `--update --tag <tag already in data/wowsims.lock.json>` | AGENTS.md § Durable claims requires a committed generated artifact to be regenerable from committed sources with the pinned toolchain and byte-comparable against `HEAD`. That is only possible if the generator's inputs are themselves pinned and restorable. |
| A gitignored local-dev stub | either tree; the fork checkout is acceptable | Nothing gates it and no committed artifact depends on it, so reproducibility does not bind. |

**Why the fork checkout cannot source a committed skeleton.** `vendor/` is
gitignored wholesale (`.gitignore` line 16), so neither tree exists in a fresh
clone. The difference is restorability: `vendor/wowsims/` has `TRACKED` +
`data/wowsims.lock.json` + `sync_wowsims.py` and can be reconstructed at its
pin; `vendor/tbc-new-fork` is a working checkout of our own fork whose pinned
commit `0b50f402` is on no remote (ticket 355, measured this session). A
generator reading it would make its output unreproducible and the byte-compare
gate unrunnable.

**Corroborating precedent, not just inference:** `build_feral_skeleton.py` —
the only skeleton generator that exists — reads
`vendor/wowsims/feral_default.apl.json` as its pinned rotation source. Its one
mention of `tbc-new-fork` is a comment citing `sim/core/consumes.go` for
context, not a read. Verify with
`grep -rn "vendor/wowsims\|tbc-new-fork" scripts/build_feral_skeleton.py`.

**Consequence for Q1.** Q3 is no longer an independent question; it collapses
into Q1's candidate set. Each candidate must state whether its output is
committed or gitignored, and that choice settles its source. A candidate
proposing a committed skeleton generated from the fork checkout is invalid and
should be dropped with that reason.

## Gates

| Date | Gate | Outcome | Reason | Rounds |
| --- | --- | --- | --- | --- |
| 2026-09-10 | Stage open | done | brief + log written, tree clean, SHA logged | — |
| 2026-09-10 | Q3 | resolved pre-plan | derivable from consumer + reproducibility rule; planner redirected mid-flight | — |
| 2026-09-10 | Gate A | pass | all template sections present, claims register C1–C19 nonempty, paths manifest present, Q1–Q4 all answered, tree clean and SHA unmoved at `43052fb` | 1 |
| 2026-09-10 | Gate B | loop back (1 revision) | F4 blocking (`wontfix` is the wrong status for 367); F1/F2 verification methods invalid though conclusions hold; F9 escalated to owner | 1 |
| 2026-09-10 | Gate B (re-judged) | pass | revision 1 clears F4; F1/F2 re-verified by caller census; F5–F8, F12 applied; F9 resolved by owner ruling; tree clean, SHA unmoved | 1 |
| 2026-09-10 | Gate C | pass | all 6 ledger rows dispositioned `accepted`; one out-of-manifest path (`.gitignore`) accepted; `pnpm verify` rc=0 on the tip | 1 |

## 2026-09-10 — Gate C dispositions

Executor reported complete: Steps 1–10, ten commits, `pnpm verify` rc=0 on the
tip. All three Step 1 stop-conditions held exactly (enh rank printed
`unknown spec: enh (known: ret, feral)`; ret rank printed `no-qualifying-fight`;
caller census returned exactly 3 call sites), so the "build none" conclusion
rests on measurements that were re-run, not inherited.

**Orchestrator's own verification of the load-bearing outcomes** (not taken on
the executor's word):

- Ticket 367 header reads `Status: open` — the blocking F4 finding stays fixed.
- Ticket 350 header reads `Blocked by: none`; the word "override" appears
  exactly **once** in the file, which matches the plan's acceptance (the single
  occurrence is the sentence denying it). The owner's scope ruling survived
  execution intact.
- `packages/core/src/rank.ts` shows **0 lines removed** against base and 9
  insertions — comment-only, as Step 6 required.
- `git diff --stat 43052fb..HEAD` covers 12 files, 641 insertions, 34
  deletions: every Paths-manifest path plus `.gitignore`.

### Ledger dispositions

| Row | Deviation | Disposition | Reason |
| --- | --- | --- | --- |
| 1 | `.gitignore` lacked a whitelist line for this stage dir, so Step 1's probe files could not be committed; executor added one line in its own commit `11c73cb` | **accepted** | Out of manifest, so it is dispositioned here per Gate C. Every sibling stage carries the same line, including `ticket-365-dual-wield-fixture` — an omission, not a policy. Without it, ADR-0031 and ticket 367 would cite probe paths no reader could open. Verified as a single additive whitelist line touching nothing else. |
| 2 | ADR's displayed commands rewritten from `grep -n` to `grep`/`grep -c` so the document asserts no line number | **accepted** | Satisfies Step 9's `.ts:[0-9]` → 0 while keeping every claim re-runnable. No claim changed. Consistent with the repo's locate-by-grep rule. |
| 3 | ADR explained the same fork comment twice; merged into one reading (commit `c31bb1a`) | **accepted** | Editorial. The ADR was already committed, so a follow-up commit is correct. |
| 4 | `CONTEXT.md` first draft was 14 insertions, tightened to 11 | **accepted** | Met the plan's own under-12 acceptance. Substance and ADR reference unchanged. |
| 5 | Ticket 367 and `NEXT` committed together | **accepted** | The plan's Step 8 explicitly says "write `368` to `NEXT` in the same commit". Not a deviation in substance. |
| 6 | Four stage artifacts (`brief.md`, `plan.md`, `plan-review.md`, `decision-log.md`) left untracked | **accepted** | Correctly identified as the orchestrator's own files, outside the executor's manifest. Untracked for the same `.gitignore` reason as row 1. Committed by the orchestrator with `execution-report.md`. |

**Out-of-manifest path check:** `git diff --stat 43052fb..HEAD` shows exactly
one path outside the Paths manifest — `.gitignore` — covered by ledger row 1
and dispositioned above. No undispositioned path remains.

**Non-deviation the executor recorded rather than assumed:** git warned
`CRLF will be replaced by LF` on ticket 350; the executor checked instead of
trusting the warning and found 0 CR characters in both the working copy and the
committed blob, with `--ignore-cr-at-eol` giving an identical stat. No line
endings flipped (C19 held).

**Carried to the handoff, not fixed here:** ticket 268 stays open — PowerShell
still resolves Node 20.18.1 and dies on `node:sqlite`; the Bash path is a
workaround, not a fix. `warn_upstream_drift.py` reports a new upstream release
(`ec5c5f2` → `v0.0.134`), which is the standing warning C1 predicted and not a
regression from this stage.

## 2026-09-10 — Gate B re-judgment on revision 1

Tree clean, `git rev-parse HEAD` still `43052fb`. One revision round, as the
skill's norm allows. No blocking finding stands, so execution proceeds without
a second review round.

**F4 (was blocking) — cleared.** Ticket 367 is now filed `Status: open`, body
unchanged, with an explicit "Why `open` and not `wontfix`" section and the
reopening condition named. The plan's own Approach now carries the reasoning:
the work is deferred pending a consumer, and `wontfix` is the status that stops
future agents looking again.

**F1, F2 — cleared.** C6 no longer rests on the literal-path grep. It now
claims and verifies the caller census: `loadOfflineInputs` has exactly three
call sites (`packages/core/src/cli.ts`, `apps/web/server/wiring.ts`,
`apps/web/test/recordings.ts`), each independently gated to ret/feral. Step 1
captures that census instead of the old grep, and the plan says plainly why a
literal-path grep cannot establish absence against a template-built path. C3 is
restated as a front-door gate, with the archetype tests named as direct
`rankUpgrades` callers that read no preset file.

**F5, F6, F7, F8, F12 — applied.** C16 is verified rather than
`hypothesis`. Step 3 anchors on `^### .maxPhase.` with a `## Banned words`
fallback. Step 4 instructs the two-line Edit form for the wrapped sentence.
Steps 4, 5 and 9 now sweep every line-number citation in both tickets. C18's
re-check points at the fork's `upgrades/engine/pool.ts`, with an absent-tree
fallback.

**F9 — resolved by the owner, and the plan now records it correctly.** The
owner read the guard comment in full and ruled there is no conflict: the
comment covers a two-hander already **worn** with a one-hander offered for the
off hand; ticket 350 is the mirror case, a two-hander as **candidate** while an
off-hand item is worn. The guard never fires there because it keys on the
candidate's target slot. The remedies differ because the outcomes differ —
clearing a worn two-hander leaves a worse setup and a dishonest row; clearing a
worn off-hand item leaves a legal two-hander build and an honest one-for-one
swap. Step 5 now quotes the comment in full and states the scope distinction on
its own terms, explicitly **not** as an override, and attributes no narrower
intent to the author.

**New scope, at the owner's request: a comment clarification.** The guard
comment's scope took a long read to establish, so Step 6 adds a scope statement
to it. The planner established two things before planning the edit:
`engine-port-drift:check` hashes only fork files listed in the fork's
`PROVENANCE.md`, and the parity test compares ranked deltas rather than source
bytes (C21) — so a comment-only edit to `packages/core/src/rank.ts` trips
neither gate. The fork's ported copy carries the identical comment, and
known-traps § "Before editing a ported engine file" arms the five-step cycle
for comment-only edits too (C20). **The fork copy is therefore deliberately
left alone**, and the Paths manifest lists it under "explicitly not touched".
Ticket 350's behaviour change stays out of scope.

## 2026-09-10 — Gate B judgment

Reviewer verdict **revise**, one `blocking` finding, six `material`, five
`minor`. Tree clean and SHA unmoved after the review seat ran.

**The headline conclusion survives.** The reviewer attacked "build no
generator" directly and could not break it. Orchestrator-verified
independently: `loadOfflineInputs` has exactly three call sites (`cli.ts`,
`apps/web/server/wiring.ts`, `apps/web/test/recordings.ts`), each gated to
ret/feral, and the nine-spec archetype tests build their request as an in-line
object literal that reads no file. Q1's answer stands.

**F4 (blocking) — accepted, must be fixed before execution.** The plan files
ticket 367 `wontfix` while its own Step 2 names the reopening condition
(extend `parseArgs` with a synthetic-character route through
`syntheticOfflineRecordings`). A ticket whose blocker its own plan has already
identified is deferred, not refused, and `wontfix` is the one status that tells
future agents never to look again — the precise failure this stage exists to
prevent, since 365's stale framing is what sent three sessions down the
nine-step path. Revision: file 367 `Status: open`, body unchanged, with the
"no consumer today" finding and the reopening condition intact.

**F1 and F2 — accepted.** Both conclusions hold; both verification methods are
invalid as written and would have been written into the ADR as evidence.
Verified by the orchestrator: C6's literal-path grep cannot refute a
template-built path (`data/presets/${spec}/p2.raid-sim-skeleton.json`), so it
returns `0` regardless of truth — the caller census is the real measurement.
C3 is true of the `pnpm rank` front door only, not of `rankUpgrades`, which
the test suite calls directly with shadow/rogue/warrior/hunter. An ADR written
to stop future re-derivation must not itself carry a claim proved by a search
that could not have failed.

**F5, F6, F7, F8, F12 — accepted as plan corrections.** F6 confirmed by the
orchestrator: the glossary heading is ``### `maxPhase` `` with backticks and
the plan's `^### maxPhase` grep returns **0**, so Step 3 would have stalled.
F7's deletion target is wrapped across two lines and will not match as a
single quoted string. F5 resolves C16 from `hypothesis` to verified
(`.scratch/` is prettier-ignored; `merge-ready` is not in the `verify` chain).
F8 extends the stale-citation sweep to tickets 350 and 365. F12 points C18's
re-check at the fork file it actually claims.

**F9 — escalated to the owner, not resolved here.** The plan has the executor
write that the existing guard comment's "objection is to silence, not to the
swap". The comment, read in full, carries two objections: the pairing is one
"the game cannot equip, priced as an upgrade", and separately the delta "would
silently include losing the two-hander". Owner-chosen option 2 overrides the
first outright; disclosure answers only the second. Attributing a narrower
intent to the original author is a reinterpretation, not a reconciliation, and
an executor should not settle a recorded design position in prose. The owner
chose option 2 without this comment in front of them. Held pending the owner's
answer, because the revision's wording depends on it.

**F3, F10, F11 — noted, no action.** F3 records that Q1 survives F1/F2. F10 is
a wording ambiguity about which `Blocked by: 365` occurrence is meant. F11
confirms the Paths manifest is consistent and no step edits a forbidden path.

## 2026-09-10 — Gate A detail

Mechanical checks all passed on the first round; no respawn needed.

- **Template sections:** Goal, Approach, Claims register, Steps, Paths
  manifest, Verify recipe, Out of scope — all present.
- **Claims register:** 19 rows, load-bearing flags set, each carrying a command
  or marked `hypothesis, untested` (C16, C19).
- **Paths manifest:** 5 created, 5 modified; consistent with Steps 1–7.
- **Clean tree:** `git status --porcelain` empty; `git rev-parse HEAD` still
  `43052fb924cea939559131970c8894af97c05d3c`. The planner wrote nothing to
  disk, as instructed.

**Orchestrator spot-checks of the load-bearing claims** (not taken on the
planner's word, since Q1's whole answer rests on them):

- C3 confirmed — `grep -n 'known: ret, feral' packages/core/src/cli.ts` returns
  one hit in the arg parser.
- C6 confirmed — the nine-spec skeleton-path grep across `packages/` and
  `scripts/` returns `0`. **Caveat carried to Gate B:** this is a literal-path
  grep, while `cli-wiring.ts` builds the path by template
  (`data/presets/${spec}/p2.raid-sim-skeleton.json`). A literal grep cannot
  prove absence of a template-constructed read. The reviewer was explicitly
  tasked to attack this as the most likely hole in the plan.
- C14 confirmed — `NEXT` reads `367`, highest existing ADR is `0030`.

**Q3 compliance:** the plan honours the pre-plan ruling (mirror `vendor/wowsims/`
via `TRACKED` + `--update --tag`; fork checkout rejected as a source) in Step 2's
ADR content and does not re-open it.

**Planner's own finding, which changed a stage constraint.** The brief carried
`pnpm` as broken in both shells. The planner measured otherwise: from **Bash**,
fnm resolves Node 22.17.1 and `pnpm verify` is green on the base SHA (C1); only
**PowerShell** resolves Node 20.18.1 and dies on `node:sqlite` (C2). Confirmed
independently by the orchestrator — `node --version` from Bash prints `v22.17.1`
at `~/AppData/Roaming/fnm/node-versions/v22.17.1/installation/node`. So Gate C's
`pnpm verify` requirement is satisfiable today and ticket 268 is not a blocker
for this stage; it stays open because the PowerShell path is worked around
rather than fixed.
