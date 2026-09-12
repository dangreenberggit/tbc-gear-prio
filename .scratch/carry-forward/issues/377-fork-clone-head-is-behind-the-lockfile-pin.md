# 377 — Fork clone HEAD is behind the lockfile pin, failing equip-eligibility:check

Status: closed
Closed: see the Resolution section below
Filed: 2026-09-11
Found by: stage-gate `spec-registry`, confirmed independently by the plan
reviewer and the orchestrator
Formerly: 372 on feat/spec-registry, renumbered 2026-09-12 to clear a
collision with `fix/sim-header-null-assertion`'s tickets. Commit messages on
this branch still name the old number; see
`.scratch/stage-gate/ledger-consolidation-and-merge-train/merge-order.md`
§ Ticket renumber map.

**The diagnosis below is inverted. Do not act on it.** The title, the "So the
pin moved ahead of the local clone" reading, and the suggested route are all
backwards; the Resolution at the end of this file has the measurement.

## What

On this checkout `pnpm verify` fails at `equip-eligibility:check` with rc=2:

```
equip eligibility check: clone HEAD is bbad1b8a4325d8168758a909a520cf4dced875f6
but data\wowsims-fork.lock.json pins f90b12a7bee9268426f3a36a9d6c7c718a6cf5e1.
The committed artifact describes the pinned commit, so re-deriving it from a
different commit compares two different questions. Reset the clone to the pin,
or bump the pin and regenerate.
```

The clone `vendor/tbc-new-fork` sits on `feat/upgrades-tab` at `bbad1b8`,
clean. The lockfile pins `f90b12a`, which the lockfile's own comment records
as pushed 2026-09-11 (an import-sort pass over the fork files we own).

So the **pin moved ahead of the local clone** — the clone was not pulled
forward after that push.

## Why it matters

It is environmental and predates any feature branch: it blocks a fully green
`pnpm verify` on this machine for every branch, not just the one that found
it. Steps after `equip-eligibility:check` do not run, so it also masks any
later gate.

Note `engine-port-drift:check` is **green** (rc=0, 33 ported files match), so
this is purely a pin-vs-clone mismatch, not ported-engine drift.

## Not claimed

Nobody has checked whether `git -C vendor/tbc-new-fork pull` fast-forwards
cleanly to `f90b12a`, nor whether any local fork work sits on `bbad1b8` that a
reset would discard. The clone reports clean, but "clean" is not "contains
nothing the remote lacks" — resolve that before moving it.

## Suggested route

Most likely a one-line fast-forward of the clone to the pinned commit. The
non-destructive read-only workaround, if a green verify is needed before then:

```
git -C vendor/tbc-new-fork checkout --detach f90b12a7bee9268426f3a36a9d6c7c718a6cf5e1
# run verify
git -C vendor/tbc-new-fork checkout feat/upgrades-tab
```

This touches no tracked file. Do not bump the pin to `bbad1b8` — that is
backwards, and `data/sim-implemented-effects.json` is keyed on the pin.

## Resolution — the diagnosis was inverted, and the fix already landed on `dev`

**The clone was ahead of the pin, not behind it.** Ancestry is strictly linear,
and each check returns rc 0:

```
git -C vendor/tbc-new-fork merge-base --is-ancestor f90b12a7b bbad1b8a4   # rc 0
git -C vendor/tbc-new-fork merge-base --is-ancestor bbad1b8a4 5e9013b78   # rc 0
```

So `f90b12a7b` (what this branch's lockfile pinned) is an **ancestor** of
`bbad1b8a4` (where the clone sat). The clone had the newer commit. This
ticket's "Suggested route" — `checkout --detach f90b12a7b`, and the
"reset the clone to the pin" reading of the gate message — would have moved the
checkout **backwards** onto an older commit, and the last line's instruction not
to bump the pin to `bbad1b8` was the exact opposite of the right move. Because
the clone is gitignored and no branch can carry its state, a reset that
discarded work would have left `pnpm verify` green while the work was gone.
That is the failure mode this ticket is being closed to prevent.

What actually resolved it: a concurrent session moved `dev`'s pin **forward** to
`bbad1b8a4` (commit `3398f7d`), which is what the ancestry says was correct.
Clone and pin now agree, and the four fork gates pass:

```
git show dev:data/wowsims-fork.lock.json     # "commit": "bbad1b8a4...", "pushed": true
git -C vendor/tbc-new-fork rev-parse HEAD    # bbad1b8a4...
```

**A note on the gate message that misled this ticket.** `scripts/_fork_gate.py:109`
ends with "Reset the clone to the pin, or bump the pin and regenerate." It offers
two options and gives no way to choose between them — and the two are not
symmetric in cost. Resetting a gitignored clone backwards can destroy committed
fork work with no recovery path; bumping the pin forward is a tracked, reviewable
edit. This ticket picked the destructive option because the message presented it
first and read as the default. Rewording that line is **out of scope here** and
is not being changed by this stage; it is recorded because the next reader of
that message faces the same fork in the road.
