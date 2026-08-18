Status: open
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

- [ ] `ENGINE_FORK_COMMIT` names the fork commit actually running, verified by
      a served build whose drawer is read after the update.
- [ ] A decision is recorded on whether the maintenance rule gets a gate
      (option 1/2) or is accepted as best-effort (option 3).
