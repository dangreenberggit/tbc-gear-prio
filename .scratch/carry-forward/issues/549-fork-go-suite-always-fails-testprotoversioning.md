Status: open
Type: task
Origin: feat/round-11-followups tickets 540 and 546 (full Go suite runs), 2026-10-04
Blocks: none
Blocked by: none
Related: 540, 546

# The fork's full Go suite always fails on TestProtoVersioning

## What is wrong

`go -C vendor/tbc-new-fork test -tags=with_db ./sim/... -count=1` fails in
`sim/core` on `TestProtoVersioning`, which reports upstream proto
deletions ("Previously present enum BulkStatConstraintOp was deleted",
priest spec renames). The test runs `npx buf breaking --against
https://github.com/wowsims/tbc-new.git#branch=master,subdir=proto`
(fork `sim/core/proto_test.go:37`), so it compares the fork with
upstream's live `master`, not with any pinned ref.

## Where it was found

Branch `feat/round-11-followups` at `2d281ee7`, fork `536645d01`:
`.scratch/stage-gate/round-11-followups/540-sim-all.txt:6` and
`546-sim-all.txt:6` (gitignored; re-run the command above). Every other
package prints `ok`. This branch changed no proto file (`git -C
vendor/tbc-new-fork diff --stat 7d4d69d6a 536645d01 -- proto/` prints
nothing). Whether the test also failed before this branch is unverified: it was not
re-run at the base `7d4d69d6a` (`execution-report.md:155`, same directory).
`BulkStatConstraint` is in neither fork HEAD nor local `upstream/master`
`17a8fb28c` (`git -C vendor/tbc-new-fork grep -c BulkStatConstraint
<ref> -- proto/api.proto`), so upstream probably added it after
`17a8fb28c` (hypothesis, untested; upstream master is now `42c75dc9b`).

## Why it matters

No repo gate runs this suite; agents run it by hand for fork work. A
suite that is never green makes each run need a reading of which failure
is the known one, and a new failure in `sim/core` can hide behind it.

## What would close this

`go -C vendor/tbc-new-fork test -tags=with_db ./sim/... -count=1` gives
rc=0, or the known failure is excluded in a way the run itself shows.
