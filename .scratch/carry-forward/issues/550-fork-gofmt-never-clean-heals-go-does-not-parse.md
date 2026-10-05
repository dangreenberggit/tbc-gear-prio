Status: open
Type: task
Origin: feat/round-11-followups ticket 546 gofmt check (stage-gate decision log, 2026-10-04 20:23Z)
Blocks: none
Blocked by: none
Related: 546, 544

# gofmt over the fork's sim/ is never clean: _heals.go does not parse

## What is wrong

`gofmt -l vendor/tbc-new-fork/sim/` gives rc=2 and prints
`sim\shaman\_heals.go:259:45: missing ',' before newline in composite
literal`. No other file is listed. Go skips files whose names start with
`_`, so the build is not affected. The file is upstream's, unchanged
(`git -C vendor/tbc-new-fork diff --quiet upstream/master HEAD --
sim/shaman/_heals.go`, rc=0).

## Where it was found

Branch `feat/round-11-followups` at `2d281ee7`, fork `536645d01`, while
checking ticket 546's edited Go files
(`.scratch/stage-gate/round-11-followups/decision-log.md:151`,
gitignored). Re-run: `gofmt -l vendor/tbc-new-fork/sim/; echo rc=$?`.

## Why it matters

A whole-tree gofmt check cannot be used as pass/fail on fork Go work: it
is never empty, so each run must read past this error, and a real
formatting miss in an edited file is easy to overlook beside it. No repo
gate runs gofmt today (`grep -rn gofmt scripts package.json .github
.githooks` finds nothing).

## What would close this

`gofmt -l vendor/tbc-new-fork/sim/` prints nothing with rc=0, or the
documented fork Go check names a command that skips `_` files.
