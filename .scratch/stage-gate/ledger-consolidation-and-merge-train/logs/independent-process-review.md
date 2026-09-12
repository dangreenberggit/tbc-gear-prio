# Independent process review — ledger consolidation and merge train

Written 2026-09-12 by an independent adversarial reviewer. Read-only: no commit,
merge, push, edit, branch deletion or checkout was performed. This file is the
only write.

All git commands were run through PowerShell against
`C:\Users\dgree\Code\lulz\tbc-gear-prio` (repo `R`) and
`C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\tbc-new-fork` (clone `F`).

---

## VERDICT

**VERDICT: APPROVE WITH CONDITIONS** — the four conditions are listed at the end
of this section and repeated as the final line.

The consolidation is substantially correct. I independently re-derived the
13-vs-15 reconciliation and it holds path-for-path; the ticket renumber is clean
with zero stale path strings anywhere the merge gate reads; the ticket 377
closure is right and the ancestry claim is true; the merge order is safe; and
the NEXT rule does not hand out a used number. Nothing is lost by merging or by
the clone checkout.

What stops a clean approve is not a defect in the merge train itself. It is that
**step 3 — the public push — is a separate decision that this stage explicitly
placed out of its own scope, and no artifact in the stage establishes that the
owner has decided it.** Every prior push of this fork branch is recorded in the
lockfile as happening "at the owner's explicit ask". Treating a merge-train
approval as carrying that ask would be a category error. See Finding 1.

There is also one measurably false sentence in a document that merge 1
publishes (Finding 2), and two places where an artifact's framing is weaker than
the stage claims (Findings 3 and 4).

**Conditions:**

1. The push (action 3) needs its own explicit owner decision, separate from
   approving the merge train. It is not covered by this review.
2. Correct `merge-order.md:37` and `:45` before merge 1 publishes them, or
   accept a known-false sentence landing on `dev`.
3. Run the clone checkout (action 2) **immediately** after merge 3 and before
   any other work, or `dev` sits red on four `pnpm verify` gates.
4. Do not file any carry-forward ticket from `dev` until merge 1 lands.

---

## Findings, most severe first

### Finding 1 — the public push is not established as an owner decision (BLOCKING for step 3 only)

**Severity: high, for action 3 only. Actions 1, 2 and 4 are unaffected.**

The brief for this review states that on a clean verdict, step 3 will push
`5e9013b78` to a public GitHub fork, and calls it not practically retractable.
I agree with that characterisation and measured what would be published.

CONFIRMED — what the push would publish:

```
git -C F ls-remote origin refs/heads/feat/upgrades-tab
bbad1b8a4325d8168758a909a520cf4dced875f6	refs/heads/feat/upgrades-tab

git -C F log --oneline origin/feat/upgrades-tab..feat/upgrades-tab
5e9013b78 Guard the tab-strip scroll affordance lookups

git -C F show --name-only --format='' 5e9013b78b720b32a5cf340f5f2fbda741665be5
ui/core/components/sim_header.tsx

git -C F show 5e9013b78 --stat
 ui/core/components/sim_header.tsx | 7 ++++---
 1 file changed, 4 insertions(+), 3 deletions(-)
```

So the push is exactly one commit, one file, +4/−3, authored
`daniel <dgreenberg1987@gmail.com>`. The content is a defensive null-guard. On
content alone this is low-risk and I found nothing sensitive in it.

**The problem is authority, not content.** Every prior push of this branch is
recorded in `data/wowsims-fork.lock.json`'s `_comment` as an owner-authorised
act, in those words:

- `bbad1b8a4`: "Pushed 2026-09-11 **at the owner's explicit ask**"
- `0b50f402`: "pushed 2026-09-10 **at the owner's explicit ask**"

And the stage itself, in three separate artifacts, places the push outside its
own scope and names it an owner action:

- `merge-order.md` § Owner action after the last merge: "This is an owner
  action — ticket 355 is the precedent — and is out of this stage's scope."
- `HANDOFF.md`: "Pushing is an owner decision (ticket 355 precedent), out of
  this stage's scope."
- `execution-report.md` item 4: "Owner action, ticket 355 precedent, out of
  this stage's scope."

CONFIRMED — ticket 355 exists on `dev` and is the named precedent:
`.scratch/carry-forward/issues/355-push-or-archive-the-fork-branch-feat-upgrades-tab.md`.

**What this means.** Nothing I reviewed is evidence that the owner has decided
to push. The stage deliberately did not decide it, three times over. A verdict
on the merge train cannot import that decision, and I am not in a position to
supply it — I have no owner instruction in front of me, only a description of
what will happen if I approve.

This is not a claim that the push is wrong. It may well be exactly right, and
the lockfile is already written to expect it (`pushed: false` with a re-verify
instruction). It is a claim that **it is a separate decision that has not been
shown to have been made**, and that the one artifact class that would record it
— the "at the owner's explicit ask" pattern — is absent for this commit.

Also worth noting: after the push, `data/wowsims-fork.lock.json` on `dev` will
read `"pushed": false` while the commit is in fact on the remote. That is a
tracked file stating something false. The stage flags this as owner follow-up
(flip it to `true`), but nothing enforces it. CONFIRMED that no script or test
reads the `pushed` field:

```
Select-String -Path R\scripts\*.py -Pattern 'pushed'    -> no matches
git grep -n 'pushed' dev -- packages apps scripts ':!vendor'
  -> only two unrelated prose hits in wowsims-fork-parity.test.ts
```

So a stale `pushed: false` breaks no gate. It is a durable-claims problem, not a
build problem — which is precisely the class AGENTS.md § Durable claims governs.

---

### Finding 2 — `merge-order.md` states a measurably false fact about the spec-registry lockfile, and merge 1 publishes it

**Severity: medium. A false durable claim lands on `dev`.**

`merge-order.md` lines 37 and 45 both assert:

> "`feat/spec-registry`'s lockfile reads `f90b12a7b`, which is older than
> `dev`'s pin"
>
> "Its lockfile reads `f90b12a7b` only because the branch forked before `dev`
> moved the pin"

CONFIRMED false at the branch tip:

```
(git -C R show feat/spec-registry:data/wowsims-fork.lock.json) | Select-String '"commit"'
  "commit": "bbad1b8a4325d8168758a909a520cf4dced875f6",

git -C R merge-base dev feat/spec-registry
a2a42954311e08b252070cad4a667d3da9c15355

(git -C R show a2a4295:data/wowsims-fork.lock.json) | Select-String '"commit"'
  "commit": "bbad1b8a4325d8168758a909a520cf4dced875f6",
```

`feat/spec-registry`'s lockfile reads `bbad1b8a4`, not `f90b12a7b`. The stated
reason is also wrong: the branch does not "read an older pin because it forked
before `dev` moved" — `dev` was merged **into** the branch at `a17b418`, so its
merge-base with `dev` is `a2a4295` itself, and it carries `dev`'s current pin.

CONFIRMED the branch never touched the file, which is the load-bearing half:

```
git -C R log --oneline dev..feat/spec-registry -- data/wowsims-fork.lock.json
  (empty)

git -C R diff --stat dev...feat/spec-registry -- data/wowsims-fork.lock.json data/sim-implemented-effects.json
  (empty)
```

**What it means.** The *conclusion* — merge order is free with respect to the
fork pin, because this branch does not modify the lockfile — is correct and I
confirm it (see Finding 6). The *stated evidence for it* is false. The sentence
was true at some earlier point in the branch's life and went stale when `dev`
was merged in at `a17b418`; nobody re-measured it afterwards.

This matters because `merge-order.md` is tracked on
`docs/fork-upstream-touchpoints` and **merge 1 publishes it to `dev`** as the
decoder ring for the whole renumber. A future reader who checks that sentence
will find it false and has no way to know the conclusion survives.

CONFIRMED it is published by merge 1:

```
git -C R ls-tree -r --name-only docs/fork-upstream-touchpoints -- .scratch/stage-gate/ledger-consolidation-and-merge-train/
  ... merge-order.md ...
```

This is an AGENTS.md § Durable claims violation: a causal claim in a committed
artifact that does not survive re-running the measurement it implies.

---

### Finding 3 — ticket 380 is open against work that is already done, and the merge gate depends on it staying open

**Severity: medium. Not a blocker, but it is a gate being satisfied by a fiction.**

Ticket 380 is the `defer` target of row D1 in
`docs/reviews/fix-sim-header-null-assertion.md`. That row says
`docs/fork-upstream-touchpoints.md` §10 "still says 50/15 and 'inferred from
source, untested'".

CONFIRMED the document already carries the corrected text, on the touchpoints
branch:

```
(git -C R show docs/fork-upstream-touchpoints:docs/fork-upstream-touchpoints.md) | Select-String '51/15|50/15'
| 10 | ui/core/components/sim_header.tsx | 50/15 at `bbad1b8a4`; 51/15 at `5e9013b78` | **yes** | ...
### 10. `ui/core/components/sim_header.tsx` — 50/15 at `bbad1b8a4` — **upstream candidate**
```

And §10's body reads:

> **At `bbad1b8a4`** the result is not a degraded fade: the assertion yields
> `null` and the first `update()` throws during header construction. **This was
> reproduced** during the `fix/sim-header-null-assertion` review …
>
> **At `5e9013b78`** the lookups are guarded with an early return, so a missing
> wrapper **degrades to a lost scroll-fade and no longer throws.**

Both halves 380 complains about are fixed: the counts are stated at both pins,
and "inferred from source, untested" is gone, replaced by "This was reproduced".

The stage knows this. `state-at-exec.txt` § A8 records it explicitly:

> "380: records that the edits it asks for are ALREADY MADE on
> docs/fork-upstream-touchpoints by A4; **stays open because merge-ready
> requires a defer row's ticket open**."

CONFIRMED that is a real constraint (`scripts/check_merge_ready.py:466`):
a `defer` row whose ticket Status is not in `OPEN_STATUSES`
(`open`, `claimed`, `blocked`) is an error.

**What it means.** An open ticket is being held open, by the executor's own
admission, to satisfy a gate — not because work remains. It is honestly
documented rather than hidden, which is why this is medium and not high. But the
shape is a gate measuring the wrong thing, and the honest resolution is to flip
D1 from `defer` to `fixed` once merge 1 lands (which Phase B does plan). Until
then `merge-ready: ok` on merge 3 is partly ceremonial.

Ticket 379 is a genuinely different case and is legitimately open: it waits on
`feat/spec-registry` reaching `dev`, which has not happened.

---

### Finding 4 — `execution-report.md` mis-describes the fork gate count relative to the review file

**Severity: low. Inconsistency between two published artifacts.**

`merge-order.md` Q2 and the plan both say **four** gates refuse on a clone-vs-pin
mismatch. CONFIRMED four:

```
Select-String -Path R\scripts\*.py -Pattern 'require_pinned_fork'
  check_ep_presets.py:138
  check_equip_eligibility.py:261
  check_fork_lint.py:140
  check_meta_conditions.py:104
```

But row E1 in `docs/reviews/feat-spec-registry.md` — which merge 2 publishes —
names only **three**: "`equip-eligibility` / `fork-lint` / `meta-conditions`".
It omits `ep-presets`.

Low severity because nothing depends on the count and all four are in the
`pnpm verify` chain regardless (CONFIRMED in `package.json`'s `verify` script).
Recorded because the four-vs-three discrepancy is exactly the kind of
unreconciled number this stage was convened to eliminate.

---

## Answers to the specific questions asked

### Q1 — the 13-vs-15 reconciliation: CONFIRMED, re-derived independently

I re-derived it from the fork clone without reading the stage's numbers first.
It holds as a genuine set comparison, path-for-path, in both directions.

```powershell
$EC='ec5c5f205e61049d730e460967f8488774a7fe2a'
$P1='f90b12a7bee9268426f3a36a9d6c7c718a6cf5e1'
$P2='bbad1b8a4325d8168758a909a520cf4dced875f6'
$P3='5e9013b78b720b32a5cf340f5f2fbda741665be5'

# A = modified upstream files at bbad1b8a4
$A = git -C F diff --name-status -M "$EC..$P2" | ? { $_ -match '^M' } | % { ($_ -split "`t")[1] }
# B15 = session B's pathspec command at f90b12a7b
$B15 = git -C F diff --name-only "$EC..$P1" -- ':!*upgrades*' ':!*_upgrades*'
```

Actual output:

```
A COUNT=13
A (at 5e9013b78) COUNT=13
B15 COUNT=15
B14 (at bbad1b8a4) COUNT=14
B14 (at 5e9013b78) COUNT=14

SET CMP 1: A vs (B15 minus test-layout.mjs, ui/core/sim.ts)
CMP1: IDENTICAL (no output)

SET CMP 2: B14 vs (A plus test-layout.mjs)
CMP2: IDENTICAL (no output)

sim.ts zero diff at bbad1b8a4:
git -C F diff --stat "$EC..$P2" -- ui/core/sim.ts
OUTPUT=[]
```

The 13 paths:

```
.gitignore
assets/locales/en/translation.json
package.json
package-lock.json
schemas/translation.schema.json
sim/hunter/item_sets.go
test-locales.mjs
tsconfig.json
ui/core/components/gear_picker/item_list.tsx
ui/core/components/sim_header.tsx
ui/core/individual_sim_ui.tsx
ui/scss/core/components/individual_sim_ui/index.scss
ui/scss/core/sim_ui/_header.scss
```

**It means the surviving ledger is right and merge 1 does not publish a false
document on this point.** `Compare-Object` returned nothing in both directions,
so this is a set identity, not two counts that coincide. The two excluded paths
are excluded for the stated reasons, both of which I verified: `test-layout.mjs`
is an `A` (added) row, not an `M` row — confirmed in the full `--name-status`
output — and `ui/core/sim.ts` has an empty diff at `bbad1b8a4`, so
`--name-only` omits it.

Session B's "undercounted by two" reading is wrong, for the reason the
reconciliation gives: it compared a pathspec count against a count of modified
upstream files, which answer different questions.

### Q2 — ticket renumbering integrity: CONFIRMED clean

The renumber is complete everywhere the merge gate reads, and everywhere else I
could find.

CONFIRMED no stale path string on any branch (this is the one that would break
`check_merge_ready.py`, which resolves `defer` rows by literal path):

```
git -C R grep -n -E '/37[123]-' feat/spec-registry -- . ':!vendor'          -> rc 1 (none)
git -C R grep -n -E '/37[123]-' fix/sim-header-null-assertion -- . ':!vendor' -> rc 1 (none)
```

On `docs/fork-upstream-touchpoints` the only `/371-`/`/372-`/`/373-` hits are
inside the stage's own `plan.md`, `plan-review.md`, `decision-log.md`,
`state-at-exec.txt`, `HANDOFF.md` and `logs/` — all of them historical records
of the renumber itself, which is correct and must not be "fixed".

CONFIRMED the defer rows resolve to the renumbered tickets:

```
spec-registry review:   7 × carry-forward/issues/378
sim-header review:      1 × carry-forward/issues/379, 1 × carry-forward/issues/380
```

CONFIRMED the target files exist on their own branches:

```
git -C R cat-file -e feat/spec-registry:.scratch/carry-forward/issues/378-...  -> rc 0
git -C R cat-file -e fix/sim-header-null-assertion:...379-...                  -> rc 0
git -C R cat-file -e fix/sim-header-null-assertion:...380-...                  -> rc 0
```

CONFIRMED their Status values are all `open`, which `OPEN_STATUSES` requires
(376 open, 378 open, 379 open, 380 open; 377 closed and is not a defer target).

CONFIRMED no ticket file numbered 371/372/373 survives on any of the four
branches (`ls-tree` filtered on `/37[123]-` → none everywhere).

CONFIRMED ADR-0032 was updated — it now names
`.scratch/carry-forward/issues/377-...`, "ticket 376", and "377, **closed: its
diagnosis was inverted**".

CONFIRMED NEXT: `dev` 376, touchpoints 381, spec-registry 379, sim-header 381.

**Known stale, by design:** commit bodies on both renumbered branches still name
371/372/373. I confirmed this. The stage documents it as deliberate in three
places with a decoder ring, and the reason given — rewriting them means rebasing
ranges that two review files already reviewed — is sound. I agree with the call.

**Disposition-table parse check.** I ran the real `DISPOSITION_RE` from
`check_merge_ready.py:47-50` against all three tables, because a table that
fails to parse produces "review has no parseable ## Disposition table" and
hard-fails the merge:

```
touchpoints: PARSED ROWS = 15   (A1-A7, D1-D3, S1-S5; all fixed/wontfix, 0 defer)
spec-registry: PARSED ROWS = 11 (7 defer -> 378)
sim-header: PARSED ROWS = 9     (A4, D1 defer -> 379, 380)
```

Note the touchpoints table has a 16th visible row, `Sp1 … n/a`. The regex only
matches `fixed|defer|wontfix`, so it is silently skipped rather than erroring.
Harmless here — 15 rows still parse, so the `if not rows` branch is not taken —
but it means a disposition typo elsewhere would vanish rather than fail loudly.
Not a finding against this work; recorded as a property of the gate.

### Q3 — ticket 377's closure: CONFIRMED correct

The ancestry claim is true and the closure is right. Closing it was the correct
call and I found no sense in which 377 was right.

CONFIRMED linear ancestry:

```
git -C F merge-base --is-ancestor f90b12a7b bbad1b8a4   -> rc 0
git -C F merge-base --is-ancestor bbad1b8a4 5e9013b78   -> rc 0
git -C F merge-base --is-ancestor 5e9013b78 bbad1b8a4   -> rc 1   (reverse, as expected)
git -C F log --oneline bbad1b8a4..5e9013b78
  5e9013b78 Guard the tab-strip scroll affordance lookups
```

So `f90b12a7b` → `bbad1b8a4` → `5e9013b78` is strictly linear and the clone was
**ahead** of the pin `f90b12a7b`, not behind it.

377's original instruction was:

> `git -C vendor/tbc-new-fork checkout --detach f90b12a7bee9268426f3a36a9d6c7c718a6cf5e1`
> … Do not bump the pin to `bbad1b8` — that is backwards

That would have moved a gitignored, unbackupable checkout **backwards** past
commits the remote did not yet have. The danger is real and correctly
characterised: the clone is gitignored, no branch carries its state, and
`pnpm verify`'s fork gates compare clone HEAD to the pin — so after a
"successful" reset the gates would go green while work was gone.

I also confirmed 377's own "Not claimed" section had flagged the risk
("'clean' is not 'contains nothing the remote lacks' — resolve that before
moving it"), which makes the inverted "Suggested route" worse, not better: it
named the hazard and then recommended the action that triggers it.

The closure is well-executed: 377 keeps its original text, adds a banner
("**The diagnosis below is inverted. Do not act on it.**"), and appends a
Resolution with re-runnable commands. It also records a genuine secondary
finding — `_fork_gate.py:109` ends "Reset the clone to the pin, or bump the pin
and regenerate", offering two options with no guidance, and the destructive one
reads as the default. CONFIRMED that text at `scripts/_fork_gate.py:103-110`.
That is a good catch, correctly scoped out and recorded rather than acted on.

### Q4 — merge order safety and the spec-registry lockfile claim

**Merge order: CONFIRMED safe.** All three branches are 0 behind / N ahead of
`dev`, so each merge is a clean fast-forward-able `--no-ff` with no rebase:

```
docs/fork-upstream-touchpoints   0 behind / 11 ahead
feat/spec-registry               0 behind / 16 ahead
fix/sim-header-null-assertion    0 behind / 5 ahead
```

CONFIRMED each merges into `dev` with **no conflicts at all** — because each has
already merged `dev` into itself:

```
git -C R merge-tree --write-tree dev docs/fork-upstream-touchpoints   -> rc 0
git -C R merge-tree --write-tree dev feat/spec-registry               -> rc 0
git -C R merge-tree --write-tree dev fix/sim-header-null-assertion    -> rc 0
```

**This corrects a claim in the stage's own documents.** `merge-order.md` says
"`NEXT` will conflict on merges 2 and 3" and gives a resolution rule. Against
`dev` **as it stands today**, none of the three conflicts. The conflicts appear
only *between* the branches:

```
git -C R merge-tree --write-tree docs/fork-upstream-touchpoints feat/spec-registry
  -> rc 1, CONFLICT (content) in .scratch/carry-forward/issues/NEXT

git -C R merge-tree --write-tree docs/fork-upstream-touchpoints fix/sim-header-null-assertion
  -> rc 1, CONFLICT (content) in .scratch/carry-forward/map.md
```

That is the correct model: merge 1 moves `dev`, and *then* merges 2 and 3 meet
the moved `dev` and conflict. So the stage's prediction is right in substance —
conflicts will occur on merges 2 and 3 — even though the merge-tree evidence it
cites was taken against today's `dev` and does not by itself show that. The
practical consequence is unchanged: expect a `NEXT` conflict on merge 2 and a
`map.md` conflict on merge 3.

**The lockfile claim: PARTLY FALSE — see Finding 2.** The conclusion (order is
free with respect to the pin) is CONFIRMED; the stated evidence is false.

**Only merge 3 moves the pin: CONFIRMED.**

```
dev                            "commit": bbad1b8a4..., "pushed": true
feat/spec-registry             "commit": bbad1b8a4..., "pushed": true
docs/fork-upstream-touchpoints "commit": bbad1b8a4..., "pushed": true
fix/sim-header-null-assertion  "commit": 5e9013b78..., "pushed": false
```

CONFIRMED merge 3's generated-artifact change is exactly the one field:

```
git -C R diff dev fix/sim-header-null-assertion -- data/sim-implemented-effects.json
-  "forkCommit": "bbad1b8a4325d8168758a909a520cf4dced875f6",
+  "forkCommit": "5e9013b78b720b32a5cf340f5f2fbda741665be5",
```

numstat `1 1` — one line changed. `implementedEffectItemIdsCount` stays 218,
matching the lockfile `_comment`'s "218 implemented / 451 stub-only, the same
counts". This is the AGENTS.md generated-artifact rule satisfied: regenerated
from the committed source at the new pin, with only the pin-derived field
moving.

**The clone checkout: CONFIRMED necessary and urgent.** `dev`'s lockfile after
merge 3 reads `5e9013b78` while the clone sits at `bbad1b8a4`, and four gates
compare exactly those (`_fork_gate.py:103-110`). CONFIRMED all four are in the
`verify` chain: `equip-eligibility:check`, `fork-lint:check`, `ep-presets:check`,
`meta-conditions:check`. Until the checkout runs, `dev` is red. Hence condition 3.

CONFIRMED `dev` is not checked out in any worktree, so `merge_to_dev.py`'s
`git checkout dev` will not be blocked:

```
git -C R worktree list --porcelain | Select-String 'branch refs/heads/dev'  -> no match
```

The main worktree currently holds `docs/fork-upstream-touchpoints`, which is
merge 1's source branch — correct for running merge 1.

### Q5 — the NEXT "larger value wins" rule: CONFIRMED safe

CONFIRMED the highest number actually allocated on each branch:

```
dev                            highest allocated = 375
docs/fork-upstream-touchpoints highest allocated = 375
feat/spec-registry             highest allocated = 378
fix/sim-header-null-assertion  highest allocated = 380
```

Highest allocated anywhere = **380**. Every branch's NEXT is ≥ 379, and the
maximum is 381. Applying "larger wins" through the train:

- after merge 1: `dev` NEXT = max(376, 381) = **381**
- after merge 2: `dev` NEXT = max(381, 379) = **381**
- after merge 3: `dev` NEXT = max(381, 381) = **381**

381 > 380, so the rule never hands out a used number. **CONFIRMED safe.**

The rule is also safe in the weaker sense that matters: taking the larger side
can only ever skip numbers, never reuse one, because every branch's NEXT
strictly exceeds its own highest allocation. I verified that holds for each
branch individually (spec-registry 379 > 378; sim-header 381 > 380;
touchpoints 381 > 375).

CONFIRMED k = 0 — the touchpoints review has zero `defer` rows, so it filed no
ticket and NEXT stayed 381. This matches the stage's claim and the `merge-order`
table's "381 + k" resolves to 381.

The 376–380 reservation line is present on the touchpoints branch's `map.md`
(one added line) and is what makes the reservation visible from `dev` after
merge 1. CONFIRMED. This is why merge 1 must go first, and the reasoning is
sound.

**Residual risk CONFIRMED real:** until merge 1, `dev`'s NEXT is 376 and a
session filing from `dev` would legitimately take 376 — a number
`feat/spec-registry` has used. Hence condition 4. This is correctly flagged in
both `HANDOFF.md` and `merge-order.md`.

### Q6 — audit of the self-graded "adapt, accepted" deviations

All four self-reported deviations in `decision-log.md` / `execution-report.md`
check out. I verified each against evidence the executor did not control.

**Deviation 1 — C26 refuted, `dev:map.md:181` flagged not fixed. CONFIRMED, and
the flag is correct.**

```
git -C R rev-parse 0d339c2                        -> 0d339c2f88baf61f9fe7c25ae1a47d810c109e9f
git -C R merge-base --is-ancestor 0d339c2 dev     -> rc 0
```

Line 181 of `dev:.scratch/carry-forward/map.md` is the
`feat/reforge-catchup-leftovers` review entry and does end "NOT merged." — while
`0d339c2` **is** an ancestor of `dev`. The line is wrong. Flagging rather than
fixing was right: the file is on `dev`, which Phase A cannot write to, and it is
outside the stage's Paths manifest. This is the owner's step 4 and it is
justified.

**Deviation 2 — A4 mention-count 5 vs expected 3. CONFIRMED, and the
substantive requirement is met.**

```
git -C R grep -n -E '\]\([^)]*fork-upstream-divergence' docs/fork-upstream-touchpoints -- . ':!vendor'
  -> rc 1 (zero markdown LINKS to the deleted file)

git -C R cat-file -e docs/fork-upstream-touchpoints:docs/fork-upstream-divergence.md
  -> rc 1 (deleted)
```

The remaining mentions are prose naming the superseded document, which A4's own
step body mandates. The plan's arithmetic was wrong; the execution was right.
Accepting this was correct.

I also CONFIRMED the inbound anchor actually resolves, which nothing in
`pnpm verify` checks:

```
docs/fork-phase-seams.md now links:
  fork-upstream-touchpoints.md#uicoresimts--resolved-the-iterations-parameter-reverted

and the target document contains:
  ### `ui/core/sim.ts` — resolved: the `iterations` parameter, reverted
```

The heading is present and its slug matches. Good.

**Deviation 3 — a partial commit was made and reset. CONFIRMED via reflog,
and it was within the rules.**

```
9c5a019 HEAD@{11:04:53}: commit: Fold the divergence ledger into the touchpoints ledger
d5b1b1c HEAD@{11:04:36}: reset: moving to HEAD~1
38913df HEAD@{11:04:17}: commit: Fold the divergence ledger into the touchpoints ledger
```

The reset target `38913df` was made 19 seconds earlier by the executor itself
and was never pushed or shared. No published or externally-authored commit was
rewritten, so this stays within "no amend or rebase of existing commits". The
current branch contains `9c5a019` and not `38913df`. Correctly handled and
honestly recorded.

**Deviation 4 — review-driven edits beyond the plan's item list. CONFIRMED and
this one is a positive.**

`7e1378e` ("Correct five numbers the review could not reproduce") is on the
branch. The touchpoints Disposition table shows 10 `fixed`, 3 `wontfix`, 0
`defer`, and the five numeric corrections include figures the fold *inherited*
from the superseded document. Catching inherited bad numbers is exactly what the
review step is for. Accepting this was right, and the executor's note that it
re-derived D1's 3031 itself before acting is the correct instinct.

**Additional self-graded items I checked and found sound:** the two CRLF traps
were caught before commit (corroborated by the clean single-line NEXT diffs and
by `state-at-exec.txt`'s record of normalising to LF); the duplicate-verify
removal is correct (`merge_to_dev.py:137-141` does run `pnpm run verify`
itself — CONFIRMED by reading the file); and `--check-only`'s
`check-only: ok (not merging)` string is real (`merge_to_dev.py:172-173`),
resolving plan-review finding F11.

### Q7 — is anything about to be lost? NO

CONFIRMED nothing is stranded by the three merges or the clone checkout.

```
git -C R stash list            -> (empty)
git -C F status -sb            -> ## HEAD (no branch)   [detached, clean]
git -C F worktree list         -> one entry, detached at bbad1b8a4
git -C F log --oneline feat/upgrades-tab..origin/feat/upgrades-tab  -> (empty)
```

The clone has no local work the remote lacks except `5e9013b78`, which is the
commit merge 3's pin names and which the checkout moves **forward** onto. The
checkout `git -C vendor/tbc-new-fork checkout feat/upgrades-tab` goes from
detached `bbad1b8a4` to branch tip `5e9013b78` — a forward move along a linear
ancestry (CONFIRMED in Q3). It abandons no commit and the clone is clean, so
there is nothing uncommitted to lose.

The three merged branches keep all their commits (`--no-ff`). No branch deletion
is part of the plan.

**One thing worth naming, though not a loss caused by this work:** the repo has
~180 local branches and 15 worktrees, with 37 branches unmerged into `dev` —
including `feat/fan-out-retro` (49 ahead) and `feat/sweep-residue-tickets`
(51 ahead). None is touched by this merge train. Worktree sprawl is already
ticket 149 per the session memory. Recorded only so the answer to "is anything
about to be lost" is scoped accurately: nothing is lost *by these actions*, and
the pre-existing unmerged work is unaffected.

---

## AGENTS.md process compliance

**Followed:**

- **Pre-merge review before the merge ask.** All three branches have a review
  file at `docs/reviews/<branch>.md` (CONFIRMED `cat-file -e` rc 0 for each),
  committed on the feature branch, with parseable Disposition tables. This is
  step 4 of "The loop" and it was done.
- **Never merged without asking.** `dev` is unmoved at `a2a4295` (CONFIRMED).
  No `pnpm merge-to-dev` was run for real; all three were proven with
  `--check-only`. The stage stopped at the merge ask, which is exactly what
  AGENTS.md requires ("Ask before merging to `dev`… a combined 'review and
  merge' request is **not** enough").
- **Deferred findings became tickets** under `.scratch/carry-forward/issues/`,
  linked from Disposition rows. CONFIRMED for 378, 379, 380.
- **Ticket allocation through `NEXT`, not directory listing.** The whole
  renumber exists because two branches collided, and the fix routes through
  `NEXT` edits, which is what `docs/agents/issue-tracker.md:22-27` prescribes
  ("Editing `NEXT` forces the collision into a git conflict instead").
- **Known traps consulted.** `docs/agents/known-traps.md` has sections for every
  trigger this work hit (scripted/generated file edit, moving the wowsims engine
  pin, filing a ticket, writing a review Disposition table). The CRLF catches and
  the generated-artifact handling show it was actually read, not just cited.
- **PowerShell for git.** The fnm/Node shell footgun is documented and the stage
  used PowerShell throughout. I hit the same fnm stderr failure twice during this
  review, which corroborates the warning.
- **Durable claims, mostly.** Measurements carry re-runnable commands, and
  hypotheses (C27–C29) are labelled as such.

**Violations / gaps:**

1. **Durable claims — `merge-order.md`:37,45.** A causal claim that does not
   survive re-running its own measurement, in an artifact about to be committed
   to `dev`. Finding 2.
2. **"The session writes only the stage artifacts" — self-reported deviation.**
   `decision-log.md` records that the orchestrator wrote plan.md revision 2
   itself, because the Planner's output was never persisted and `SendMessage` is
   unavailable so the seat could not be resumed. This is honestly declared with
   its reasoning, and the alternative (a fresh spawn inventing SHAs) was
   correctly refused by that spawn. I accept the call but record it as a real
   deviation from the stage-gate seat separation.
3. **A reviewer was launched against a stale file** (round-2 re-review read
   revision 1). Self-caught by the reviewer's own guard and recorded as an
   orchestrator sequencing error. Recovered, not hidden. Noted for completeness.
4. **Gate satisfied by a ticket held open for the gate** (Finding 3) — not a
   named AGENTS.md rule, but contrary to the spirit of the carry-forward system.

I found **no** instance of: a commit to `main`, a `--no-verify` bypass, a
`TBC_ALLOW_DEV_MERGE=1` use, a raw `git merge` into `dev`, or a rebase of a
reviewed range.

---

## CONFIRMED vs PLAUSIBLE

**CONFIRMED — I ran the command and quote its real output above:**

- the 13/15/14 counts and both `Compare-Object` set identities
- `ui/core/sim.ts` zero diff at `bbad1b8a4`
- the three-way ancestry, forward and reverse
- `5e9013b78` = one commit, one file, +4/−3, and absent from every remote
- the live `ls-remote` remote tip = `bbad1b8a4`
- all four branch tips, NEXT values, and lockfile `commit`/`pushed` fields
- `feat/spec-registry` never touches the lockfile; its lockfile reads `bbad1b8a4`
- all three `dev`-to-branch merges conflict-free today; the two pairwise
  branch-to-branch conflicts
- zero stale `/371-`/`/372-`/`/373-` paths on both renumbered branches
- the 7 / 1 / 1 defer path targets and their existence and `open` Status
- Disposition tables parse to 15 / 11 / 9 rows under the real regex
- highest allocated ticket anywhere = 380; every NEXT ≥ 379
- k = 0
- the four `require_pinned_fork` gates and their presence in `verify`
- no script or test reads `pushed`
- `merge_to_dev.py` runs `pnpm run verify` itself and prints
  `check-only: ok (not merging)`
- `0d339c2` is an ancestor of `dev` while `map.md:181` says "NOT merged."
- the reflog sequence `38913df` → reset → `9c5a019`
- empty stash list; clean detached clone; `dev` free in every worktree
- §10 of the touchpoints doc already carries both pins' counts and "reproduced"
- the anchor slug target heading exists

**PLAUSIBLE — reasoned, not executed:**

- **That `pnpm verify` is green on all three tips.** I did not run it (read-only,
  ~171s cold, and it would need branch checkouts). I am relying on the
  executor's recorded `--check-only` rc 0 results. The mechanism is sound —
  `--check-only` runs verify internally and propagates its rc — but I did not
  re-run it. This is the single largest thing I took on the stage's word.
- **That merge 2 and merge 3 will conflict only on `NEXT` and `map.md`
  respectively.** Derived from the pairwise merge-tree simulations, which model
  post-merge-1 `dev` correctly in shape but not exactly (the real merge 1 commit
  does not exist yet).
- **That the fold preserved every substantive item from the deleted document.**
  I verified the deletion, zero links, the anchor, and the reconciliation, but I
  did not diff the deleted document's full prose against the folded sections.
  Two review axes and the plan reviewer each checked this independently.
- **That commit-message staleness is genuinely unfixable without invalidating
  the two review files.** The reasoning is sound and I agree, but I did not
  attempt a rebase to prove the review ranges would break.

---

## What I could not determine

1. **Whether the owner has decided to push `5e9013b78` to the public fork.**
   This is Finding 1 and it is the reason for the conditional verdict. Nothing
   in the repo or the stage artifacts records that decision, and three artifacts
   explicitly place it outside this stage's scope. Only the owner can settle it.
2. **Whether `pnpm verify` is actually green right now on each of the three
   tips.** Not re-run — read-only and expensive. Taken from the executor's
   recorded `--check-only` results.
3. **Whether the four fork gates would pass with the clone at `5e9013b78` for
   `dev` post-merge-3.** The pin/clone equality would hold by construction, but
   the gates also compare committed artifacts against the clone's content, and I
   did not execute them. The executor reports `check_equip_eligibility.py` rc 0
   for the sim-header branch at that clone position.
4. **Whether anything in the ~37 unmerged branches conflicts with what lands
   here.** Out of scope for this review and not measured; none is part of the
   merge train.
5. **Whether the SendMessage version-floor explanation is correct.** The stage
   itself labels it "the best available explanation, not a confirmed one". I did
   not test it and it does not bear on the merge decision.
6. **Whether `docs/reviews/*` findings are substantively right.** I audited the
   review files' machine-readable structure (parseability, defer targets, ticket
   status) and spot-checked their claims, but I did not re-perform the three
   branches' code reviews.

---

VERDICT: APPROVE WITH CONDITIONS — (1) step 3, the public push of 5e9013b78, is a separate owner decision that no artifact shows has been made and that this review does not authorize; decide it on its own before pushing. (2) Correct the false sentence at merge-order.md:37 and :45 (feat/spec-registry's lockfile reads bbad1b8a4, not f90b12a7b, and the branch has dev merged in) before merge 1 publishes it, or knowingly accept it landing on dev. (3) Run the fork-clone checkout immediately after merge 3, before any other work, or dev sits red on four verify gates. (4) File no carry-forward ticket from dev until merge 1 lands. Merges 1, 2 and 4 are otherwise clear: the 13-vs-15 reconciliation re-derives exactly, the renumber is clean everywhere the merge gate reads, ticket 377 was rightly closed, the order is safe, the NEXT rule cannot reuse a number, and nothing is lost.

---

## Follow-up — ticket 380 and the defer-row gate

Added on a second pass, at the owner's request, to investigate the "gate
satisfied by a fiction" line from Finding 3 properly rather than leave it as an
advisory. Same read-only constraints; PowerShell for git.

**Short answer, up front:** 380 is real bookkeeping, not a fiction — I withdraw
that word. It is inert, it breaks nothing whether closed now or left open
forever, no other ticket has the shape, and the gate is **not** structurally
forcing dead tickets to stay open. My verdict is unchanged, and Finding 3 should
be downgraded from medium to low.

I was wrong on emphasis in the first pass. The detail below is what changed my
mind.

### 1. Is 380 a fiction, or awkward bookkeeping? — Bookkeeping. CONFIRMED.

**What the gate actually enforces.** Read in full at
`scripts/check_merge_ready.py:450-476`:

```python
for row in rows:
    disp = row["disposition"]
    if disp == "defer":
        tpath = ticket_path_from_note(row["note"])
        if not tpath:            errors.append(f"{row['id']}: defer with no ticket path ...")
        if not tpath.is_file():  errors.append(f"{row['id']}: defer ticket missing: {rel}")
        status = read_status(tpath)
        if status not in OPEN_STATUSES:
            errors.append(f"{row['id']}: {rel} has Status: {status!r} "
                          f"(defer tickets must be open|claimed)")
        else:
            print(f"  ok  {row['id']}: defer -> {rel} ({status})")
    elif disp in ("fixed", "wontfix"):
        print(f"  ok  {row['id']}: {disp}")
```

CONFIRMED three properties:

- A `defer` row requires a resolvable path to an existing file whose `Status:`
  is in `OPEN_STATUSES` = `("open", "claimed", "blocked")`
  (`check_merge_ready.py:61`).
- A `fixed` or `wontfix` row is **printed and nothing else** — no ticket
  resolution, no path check, no status check.
- Status is read from the **working tree**, not from the branch being merged:
  `ROOT = Path(__file__).resolve().parents[1]`, `CARRY = ROOT/".scratch"/...`
  (`:42-44`), `ticket_path_from_note` returns `ROOT / p` (`:176`), and
  `read_status` does `path.read_text()` (`:190`). This matters for question 2.

So 380's stated reason for staying open is an accurate description of the gate.
CONFIRMED.

**Does §10 already say what 380 says it says?** 380 makes four specific claims
about what needs changing. I checked each against
`docs/fork-upstream-touchpoints:docs/fork-upstream-touchpoints.md`:

| 380's claim | State on the touchpoints branch | Verdict |
| --- | --- | --- |
| should record 51/15, not just 50/15 | table row: `50/15 at bbad1b8a4; 51/15 at 5e9013b78` | satisfied |
| "(inferred from source, untested)" should go | `Select-String 'inferred from source'` → **no match** | satisfied |
| behaviour should split by fork commit | `**At bbad1b8a4**` … throws; `**At 5e9013b78**` … guarded, degrades | satisfied |
| carry A3's hand-copied caveat | "ran a **hand-copied** method body rather than the shipped constructor" | satisfied |

All four are already done. **380 is a ticket open against completed work.**
CONFIRMED.

**Why "fiction" was the wrong word.** The ticket does not pretend the work is
outstanding. Its own body has a section headed "**Status: the edits are made, on
the branch that owns the file**", and closes with "When
`docs/fork-upstream-touchpoints` lands on `dev`, confirm §10 reads as described
above and close this ticket. **No edit should be needed.**" It also carries
`Blocked by: branch docs/fork-upstream-touchpoints landing on dev` — CONFIRMED
present.

That is an honest description of a cross-branch sequencing state, not a
fabrication. The work is done *on another unmerged branch*; from
`fix/sim-header-null-assertion`'s point of view the document it describes does
not exist yet. CONFIRMED — `git cat-file -e dev:docs/fork-upstream-touchpoints.md`
→ rc 128, "exists on disk, but not in 'dev'".

The honest reading: **the finding is real and unlanded, and 380 tracks the
landing.** Calling it a fiction overstated it and I withdraw that.

### 2. Load-bearing or cosmetic? — Inert. CONFIRMED.

**Does keeping it open change any gate outcome?** No. Its only effect is to make
row D1 of `docs/reviews/fix-sim-header-null-assertion.md` print
`ok D1: defer -> .../380-... (open)` instead of erroring. It has no `Blocks:`
line (CONFIRMED: `Blocks: none`), so it cannot veto a phase merge — and
`fix/sim-header-null-assertion` is not a `phase-N/*` branch, so
`open_blockers_for_phase` never runs for it (`PHASE_BRANCH_RE.match(branch)` at
`:477`).

**Does anything break if it is closed now, before merge 1?** **Yes — merge 3
would fail.** Because status is read from the working tree, closing 380 makes
`read_status` return `"closed"`, which is not in `OPEN_STATUSES`, so
`check_merge_ready` appends:

```
D1: .scratch/carry-forward/issues/380-...md has Status: 'closed' (defer tickets must be open|claimed)
```

and `pnpm merge-to-dev` for `fix/sim-header-null-assertion` returns non-zero.
PLAUSIBLE rather than CONFIRMED — I did not execute it, since that needs a
branch checkout and a write. The code path is unambiguous, but I did not run it.

**The correct sequence is the one Phase B already specifies:** land merge 1, then
flip D1 from `defer` to `fixed` **and** close 380 together. Flipping the row to
`fixed` removes the status requirement entirely (the `elif` branch checks
nothing), so the two changes are safe in either order once they are in the same
commit. `HANDOFF.md` § Phase B says exactly this: "after merge 2, close tickets
379 and 380 on the sim-header branch and flip its review rows A4/D1 from `defer`
to `fixed`." That plan is correct.

**Does anything break if it is left open forever?** No. It would sit in
`pnpm issues:open` as noise and nothing more. It has no `Blocks:` line, so it
gates no future merge. The cost is a misleading backlog entry, not a broken
build.

So: **cosmetic in effect, correctly sequenced, and the only real risk is closing
it too early.** That is the opposite of the risk I implied in Finding 3.

### 3. Is the pattern anywhere else? — No. CONFIRMED.

I checked all five renumbered tickets for the same shape (open, but the work is
done).

| Ticket | Status | Work outstanding? | Evidence |
| --- | --- | --- | --- |
| 376 | open | **Yes — genuinely outstanding** | Both named targets still stale |
| 377 | closed | n/a | Correctly closed; not a defer target |
| 378 | open | **Yes — deliberately unfixed** | Four shape smells, `wontfix`-adjacent by design |
| 379 | open | **Yes — waiting on a real event** | Needs `feat/spec-registry` on `dev` |
| 380 | open | **No — work is done** | The only one of this shape |

CONFIRMED for 376, whose two targets are unchanged on both branches:

```
(git -C R show feat/spec-registry:apps/web/server/routes.ts) | Select-String 'SPECS'
const SPECS: readonly SpecId[] = ["ret", "feral"];

(git -C R show feat/spec-registry:packages/core/src/cli.ts) | Select-String 'known:'
        console.error(`unknown spec: ${next} (known: ret, feral)`);
```

Identical on `dev`. So 376 tracks live work — and note it is not even a `defer`
target, so it is not holding any gate open.

379 is a different and legitimate case: its blocker is a real unmet condition
(`Blocked by: branch feat/spec-registry landing on dev`, CONFIRMED present).
Once `feat/spec-registry` merges, 377 reads as closed on `dev` and 379 can
close. Until then the condition genuinely has not happened.

378 is the ordinary case the system is designed for: four judgement-call smells
deliberately not fixed on the branch, carried forward. Seven `defer` rows point
at it and it should stay open.

**380 is the only instance.** CONFIRMED.

### 4. Process defect? — No structural defect. The gate is right; this is a rare edge.

I initially suspected the defer-row rule structurally forces dead tickets to stay
open. **The historical evidence refutes that.**

I scanned every review file on `dev` for `defer` rows and resolved each target's
current status in the working tree:

```powershell
$revs = git -C R ls-tree -r --name-only dev -- docs/reviews/
# for each: extract defer rows, resolve the ticket path, read its Status
```

The result: **many `defer` rows on `dev` point at tickets that are now `closed`,
`resolved` or `wontfix`** — for example `feat-candidate-pool.md` rows F7/F8/F12
→ 205/206 (closed), `feat-upgrades-dedup-wowsims.md` rows T1–T4 → 307 (closed),
`phase-0-close-gates.md` row D1 → 01 (closed), `feat-stage-2-close-shortlist-box.md`
row Sp1 → 227 (**wontfix**).

**What that proves:** the gate checks status *at merge time only*, for the branch
being merged. Once a branch is on `dev` its review file is historical and nobody
re-runs `check_merge_ready` against it. Tickets are closed freely afterwards. So
the rule does **not** create a permanent population of undead tickets — the
`dev` history is full of defer rows whose tickets have since closed, exactly as
intended.

The rule is also well-motivated, and documented. `check_merge_ready.py`'s
docstring states the intent plainly:

> "Tickets are the source of truth for deferred work. The review file is the
> judgment record; its Disposition table must link every `defer` to a real open
> carry-forward ticket."

`docs/agents/issue-tracker.md:66-67` says the same: "The review's Disposition
table **links** tickets for `defer` rows; it does not replace them." And the
`pre-merge-review` skill (`SKILL.md:92-95`) instructs filing the ticket first,
then linking it.

The rule exists to stop a review deferring a finding into a void — the failure
mode recorded for tickets 85, 88/89 and 147, where unreadable or missing tickets
made deferred work invisible to every gate. That is a real problem and this is a
reasonable guard against it.

**So what is the actual edge case?** A finding that is *deferred* because the
reviewing branch cannot reach the file, and is *then fixed on the branch that
owns the file* before either branch merges. The disposition vocabulary has no
word for "fixed, but on a branch that has not landed". `fixed` would be a lie
from this branch's standpoint (the fix is not in its diff, and a reader on `dev`
post-merge-3-only would find nothing); `defer` is the honest choice, and it drags
the open-status requirement along with it.

**My judgement: this is not worth changing.** The condition requires three
concurrent unmerged branches, one editing another's file. It has occurred once in
this repo's history — here — and is an artifact of the same concurrency collision
this whole stage exists to clean up. A fourth disposition value would add
vocabulary and a gate branch to serve a case that arises when the process has
already gone wrong. The existing handling (defer + an honest body + Phase B
closing it) is adequate and costs nothing.

**If it were ever worth fixing**, the cheapest option would be to let a `defer`
row's note carry an explicit landed-elsewhere marker that the gate accepts
alongside `closed` — but I recommend **not** doing this, and I have implemented
nothing. The better prompt is the one already in place: Phase B's instruction to
flip D1 to `fixed` and close 380 in one commit.

One genuinely useful observation, unrelated to 380: a Disposition row whose
value is not `fixed|defer|wontfix` is **silently skipped**, not flagged —
`DISPOSITION_RE` only matches those three words, so the row never becomes a
`rows` entry and the `else: unknown disposition` branch is unreachable from the
table. The touchpoints review's `Sp1 … n/a` row is invisible to the gate for
this reason (15 rows parse, 16 are visible). Harmless here, but a mistyped
disposition would vanish rather than fail loudly. Worth a ticket at some point;
not a blocker and not this stage's doing.

### 5. Does this change the verdict? — No. It softens one finding.

**No condition is added, removed or altered.** The four conditions stand exactly
as written.

**Finding 3 is downgraded from medium to low**, and its characterisation
corrected:

- "a gate satisfied by a fiction" → **withdrawn**. 380 is an honest record of a
  cross-branch sequencing state, with the situation stated plainly in its own
  body.
- "the shape is a gate measuring the wrong thing" → **withdrawn**. The gate is
  measuring the right thing; this is a rare edge the vocabulary does not name.
- What survives: 380 is open against completed work, it is the only such ticket,
  and it must **not** be closed before merge 1 lands.

**One practical instruction worth carrying forward**, which strengthens rather
than weakens the plan: **do not close 380 early.** Closing it before merge 1
would turn row D1's status check into an error and block merge 3 — the opposite
failure from the one my first pass implied. Phase B's existing sequence (land
merge 1, then flip D1 to `fixed` and close 380 together) is correct and should
be followed as written.

### CONFIRMED vs PLAUSIBLE for this follow-up

**CONFIRMED:**

- the full defer-row enforcement block and that `fixed`/`wontfix` rows are
  checked for nothing
- `OPEN_STATUSES` / `KNOWN_STATUSES` values
- status is resolved from the working tree (`ROOT`-relative), not the branch
- all four of 380's claims are already satisfied in §10 on the touchpoints branch
- 380 carries `Blocked by:` and `Blocks: none`, and its body states the work is done
- 376's two targets are still stale on both `feat/spec-registry` and `dev`
- 379's blocker is a real unmet condition; 378 is deliberately unfixed
- many `defer` rows on `dev` point at now-closed/resolved/wontfix tickets
- the gate's documented intent, in the docstring, `issue-tracker.md` and the skill
- a non-`fixed|defer|wontfix` disposition is silently skipped by the regex

**PLAUSIBLE:**

- that closing 380 now would make merge 3's `check_merge_ready` fail. The code
  path is unambiguous but I did not execute it — doing so needs a checkout and a
  write, both outside my constraints.
- that no review file outside `docs/reviews/` on `dev` carries defer rows I
  missed. I scanned that directory on `dev` only; unmerged branches' review files
  were not swept except the three in this merge train.

### Still could not determine

1. Whether closing 380 early actually fails merge 3 (not executed — see above).
2. Whether `pnpm issues:open` output would mislead a future reader about 380.
   I did not run it; it needs no write, but it reports on the working tree, which
   currently sits on the touchpoints branch where 380 does not exist.
3. Whether the silent-skip behaviour for unknown dispositions has ever hidden a
   real mistyped row historically. I confirmed the mechanism but did not audit
   every review file's visible-vs-parsed row counts.
