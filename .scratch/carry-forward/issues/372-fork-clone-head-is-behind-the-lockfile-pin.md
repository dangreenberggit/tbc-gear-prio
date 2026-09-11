# 372 — Fork clone HEAD is behind the lockfile pin, failing equip-eligibility:check

Status: open
Filed: 2026-09-11
Found by: stage-gate `spec-registry`, confirmed independently by the plan
reviewer and the orchestrator

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
