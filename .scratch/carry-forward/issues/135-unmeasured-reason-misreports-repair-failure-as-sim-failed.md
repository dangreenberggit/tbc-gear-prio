Status: open
Type: bug
Origin: round-4 pre-merge review of `feat/set-bonus-value` (spec axis, finding 3)
Blocks: none
Blocked by: none

# Set-bonus package repair failures ride under `unmeasured: "sim-failed"`

When gem repair fails while assembling a completion package, `buildSetBonuses`
(`packages/core/src/rank.ts`) records the threshold as
`unmeasured: "sim-failed"` — but no sim ran. The prose `reason` string is
accurate ("gem repair could not activate its meta"); the machine-readable enum
tag contradicts it. `set-value.ts`'s `UnmeasuredReason` union has no value for
a repair failure, and that file was outside the issue-1 slice's path scope.

## Done when

`UnmeasuredReason` gains a `"repair-failed"` value, the push site in
`buildSetBonuses` uses it, and a test pins that a repair failure on a package
member yields `unmeasured: "repair-failed"` (not `"sim-failed"`) with the
repair message in the reason text. Check any renderer switching on the enum.
