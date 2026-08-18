Status: resolved
Type: defect (stale hand-maintained literal; wrong label, no behaviour change)
Origin: stage-gate execution of tickets 156/214-219, 2026-08-17
Blocks: none
Blocked by: none

# `ENGINE_FORK_COMMIT` still says `f7146dd69` after the ticket 214 port

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine_provenance.ts`
exports a hand-maintained literal that the Upgrades tab's assumptions drawer
renders as "Engine (fork commit)":

```
export const ENGINE_FORK_COMMIT = "f7146dd69";
```

Its own doc comment states the maintenance rule:

> update it in the same commit that changes anything under `upgrades/`, so the
> drawer never claims a commit that isn't the one running

Ticket 214's port (fork commit `4018f9bf8ea1afa885f9fe3c3735db3286c670e7`)
changed two files under `upgrades/engine/` and did **not** update this literal.
The drawer therefore now names a commit that is not the one running.

## Observed

In the ticket 219 acceptance run (served production build, 2026-08-17), the
assumptions drawer read:

```
Engine (fork commit)
f7146dd69
```

while the running bundle demonstrably contained the ticket 214 port — the
warning prose introduced by that port was fetched over HTTP from the served
entry chunk:

```
curl -s "http://127.0.0.1:8899/tbc/bundle/ui/paladin/retribution/index.html-Cm_XtUcd.entry.js" \
  | grep -c "is not in the candidate pool for"
# -> 1
```

`f7146dd69` is a real commit in the fork (`git -C vendor/tbc-new-fork cat-file
-t f7146dd69` -> `commit`), which is what makes the label plausible rather than
obviously broken.

## Impact

Low, and bounded by the file's own comment: "the cost is a wrong-but-honest-looking
label in the drawer, not a silent behavior change — nothing downstream reads it."
Confirmed for this round: nothing in the parent repo reads `ENGINE_FORK_COMMIT`
(`grep -rn "ENGINE_FORK_COMMIT" packages/ scripts/` returns nothing outside the
fork).

The reason it is still worth fixing is that the drawer exists to tell a reader
which engine produced a shortlist. A stale-but-real commit hash is the worst
version of that: it reads as provenance while pointing at the wrong code.

## Why it was not fixed in place

Found during stage-gate execution whose Paths manifest for the fork repo listed
exactly three files (`dead-slots.ts`, `plausibility.ts`, `PROVENANCE.md`).
`engine_provenance.ts` is not among them, so editing it would have been an
unflagged scope expansion in a two-repo change. Flagged here instead.

## Suggested fix

Update the literal to the fork HEAD in the same fork commit, and consider
whether the maintenance rule is enforceable rather than aspirational — a
hand-maintained hash that must be updated by every future `upgrades/` commit
has now been missed at least once. Options worth weighing:

1. A drift check in the parent repo comparing `ENGINE_FORK_COMMIT` against
   `data/wowsims-fork.lock.json`'s `commit` field, run under `pnpm verify`.
   Cheap, and catches exactly this. Note it can only compare against the pin,
   so it would false-positive mid-slice while the clone sits ahead — the same
   pin-vs-HEAD trap ticket 215 documents, and worth reading that ticket first.
2. Build-time git plumbing in the fork (`vite.config.mts`), which the doc
   comment says does not exist today.
3. Leave it hand-maintained and accept periodic drift, given nothing reads it.

## Acceptance criteria

- [x] `ENGINE_FORK_COMMIT` names the fork commit actually running, verified by
      a served build whose drawer is read after the update.
- [x] A decision is recorded on whether the maintenance rule gets a gate
      (option 1/2) or is accepted as best-effort (option 3).

## Comments

### 2026-08-18 — fixed under an explicitly stated convention; both boxes checked

**AC1 is checked against a stated convention, and the convention is part of the
fix.** The honest problem with AC1 as originally worded — "names the fork commit
actually running" — is that **a commit cannot contain its own hash**. Any commit
that writes a literal into this file makes that literal name something other
than itself. So AC1 is satisfiable only under a rule that says what the literal
is allowed to name. That rule is now written in the file itself rather than left
implicit:

> Convention: the literal names the last fork commit that changed engine
> behaviour. It may lag HEAD by provenance-only commits — such as the commit
> that updates this literal — because a commit cannot contain its own hash.

This **replaces** the file's old rule ("update it in the same commit that
changes anything under `upgrades/`"), which was quoted in this ticket's opening
section and is the incoherent part: `engine_provenance.ts` is *itself* under
`upgrades/`, so the old rule demanded the impossible thing above. Rewriting it
is the fix, not a dodge around it.

**The literal now reads `4018f9bf8`** — fork commit
`4018f9bf8ea1afa885f9fe3c3735db3286c670e7`, the ticket 214 port, which is the
last commit that changed engine behaviour. The fix commit itself is
`7de45ea080d294d04399878b3b3f0a4cbd0039b5` and changes **only this one file**,
so it changes no engine behaviour and `4018f9bf8` remains correct under the
stated convention:

```
git -C vendor/tbc-new-fork show --stat 7de45ea08
#  ui/core/components/individual_sim_ui/upgrades/engine_provenance.ts | 16 +++++++++++-----
#  1 file changed, 11 insertions(+), 5 deletions(-)
```

**Drawer read from the served build**, after rebuilding and re-serving — the
Upgrades tab assumptions drawer on the feral cat page, read at the end of the
ticket 219 full-pool run:

```
Assumptions
Seeds                  11, 22, 33, 44, 55
Iterations             3000
Max phase              3
Engine (fork commit)   4018f9bf8
Sim version            api-v13
```

Also confirmed in the served JavaScript, which is the stronger check because it
is what the browser actually executed. The literal lives in a shared chunk, not
the per-spec entry chunk:

```
grep -rl "4018f9bf8" vendor/tbc-new-fork/dist/tbc/bundle/
# -> dist/tbc/bundle/suggest_reforges_action-B2VO3vl6.chunk.js   (mtime 19:38, this build)
curl -s "http://127.0.0.1:8899/tbc/bundle/suggest_reforges_action-B2VO3vl6.chunk.js" | grep -c "4018f9bf8"
# -> 1
```

**Note for the next reader: stale chunks in `dist/` still contain the old
literal, and they are not what runs.** `vite build` does not empty `dist/`
(ticket 219 recorded the same behaviour for `lib.wasm`), so a grep for the old
hash still hits seven **paladin** entry chunks left over from earlier builds:

```
grep -rl "f7146dd69" vendor/tbc-new-fork/dist/tbc/bundle/
# -> 7 files, all dist/tbc/bundle/ui/paladin/retribution/index.html-*.entry.js (mtime 18:17 and earlier)
```

None of them is referenced by a current page. The pages built this round point
elsewhere, so those files are unreachable dead weight, not the running code:

```
grep -o 'index.html-[A-Za-z0-9_]*\.entry\.js' vendor/tbc-new-fork/dist/tbc/paladin/retribution/index.html
# -> index.html-spLwkZf9.entry.js
grep -o 'index.html-[A-Za-z0-9_]*\.entry\.js' vendor/tbc-new-fork/dist/tbc/druid/feralcat/index.html
# -> index.html-SbhgZrQ_.entry.js
```

**AC2 decision: option 3 — hand-maintained, best-effort, now with a stated
convention.** Rationale, against the three options this ticket listed:

- **Option 1 (a `pnpm verify` drift check against the lockfile pin) is
  rejected.** It can only compare the literal against
  `data/wowsims-fork.lock.json`'s `commit`, so it **false-positives mid-slice**
  whenever the clone sits ahead of the pin — the same pin-vs-HEAD trap ticket
  215 documents. Worse under the new convention: the literal is *supposed* to
  lag HEAD by provenance-only commits, so an equality check would now be
  wrong by design, not merely noisy.
- **Option 2 (build-time git plumbing in the fork) is rejected as
  disproportionate** — real build machinery in a vendored fork to produce a
  label.
- **Option 3 is taken.** Nothing downstream reads the literal, re-confirmed at
  this tip: `grep -rn "ENGINE_FORK_COMMIT" packages/ scripts/` returns nothing.
  The cost of drift is a wrong-but-honest-looking label, and the convention now
  in the file states the bound on how far it may drift.

**Pin bumped with the artifact in the same Repo A commit** (`7085617`), because
`scripts/check_sim_implemented_effects.py` compares the artifact's `forkCommit`
against the pin and a pin bump alone leaves `pnpm verify` red. The fork change
is TypeScript-only, so regeneration moved the `forkCommit` line and nothing
else — both id sets unchanged at 215 implemented / 460 stub-only.

**Nothing was pushed** from either repo, and `pushed` in the lockfile is still
`false`.
