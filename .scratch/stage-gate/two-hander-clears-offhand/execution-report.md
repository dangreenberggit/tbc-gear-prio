# Execution report — two-hander-clears-offhand

Two executions ran on this branch, in sequence. Both reports are kept verbatim.

---

# Part 1 — ticket 350: the two-hander off-hand clear

Written by `gate-executor` (Opus) 2026-09-10 against `plan.md` revision 1, base
`d4fdca5b`.

## What landed

A two-handed candidate for the main hand now clears the worn off-hand item in
both engine copies, prices the swap honestly, and discloses the two-item change
on all three reader surfaces. Six commits, one fork commit pushed and verified.

`clearOffHandForTwoHander` runs **first** inside `candidateSwapWithRepairs` and
hands the cleared array to `swapItemAt` — the C8 ordering the review flagged as
load-bearing:

```
core  2107:  const { equipment: cleared, removed } = clearOffHandForTwoHander(
core  2112:  const swapped = swapItemAt(cleared, slotIndex, itemId, gems);
fork  2030:  const { equipment: cleared, removed } = clearOffHandForTwoHander(
fork  2035:  const swapped = swapItemAt(cleared, slotIndex, itemId, gems);
```

`grep -c 'removedItems?:'` is **1** in each copy, directly above
`emptyMetaSocket?: boolean;` — it did not land on the package type. The existing
off-hand guard, its comment and `mainHandIsOneHanded` are untouched. No
"override" appears in anything written.

## The T2 red run — judged, not edited

The STOP condition did not trigger. Actual red delta was `{0: 49, 1: 43, 2: 32}`
against the expected `{0: 49, 1: 28, 2: 32, 17: -40, 18: -40, 20: -20, 31: -168}`.
Every difference is exactly Talon of Azshara's stat block still being counted:
key `1` off by precisely its Agi 15, keys `17/18/20/31` absent because the off
hand still supplies them so the diff is zero. Keys `0` and `2` match exactly. No
key differs for any other reason, so the expectation stands as written.

Two risks to that literal closed by measurement before trusting it: `sumStat`
reads item and gem stats only and **never** enchants, so the `enchant: 2673`
Mongoose on both worn weapons cannot contribute; and all three weapons carry
`sockets: []`, so `fillEmptyCandidateGems` seats nothing.

## Deviation ledger

| Step | Plan said | Found | Action | Why |
| --- | --- | --- | --- | --- |
| 2 | T4: non-two-hander requests differ in "exactly 1" index | Identity swaps differ in **0**. Sixteen of the fury fixture's seventeen worn items are in `warrior-p2`, and `runCandidate` keeps every owned row regardless of cap | **adapt** | Test bug, not engine bug. Relaxed to `toBeLessThanOrEqual(1)`: the property forbids a candidate moving a slot it never claimed, not an identity swap moving none. 55 two-handers still reach the `{14,15}` branch and `twoHanderAttempts > 0` guards vacuity |
| 2 | Plan imported `PoolEntry` implicitly | `PoolEntry` is exported from `pool.ts`, not `types.ts` | adapt | Mechanical import-path correction; vitest strips type imports so tests ran, but `tsc` would fail |
| 4 | Add one render assertion to `rank-report.test.ts` | The byte-identical digest test also moved: 32565 → 32575 bytes | **adapt** | +10 is exactly 2 rows x ("\n" + 4-space indent) from the new `${removedItems}` slot. Confirmed no markup renders: neither test row carries `removedItems`, so the formatter returns `[]`. Re-pinned with a comment in the file's established style |
| 4 | — | Prettier failed `format:check` on the formatter's template line | adapt | Ran `prettier --write` on that one file |
| 5 | Port "unchanged from core" | First draft used single quotes and `map(r =>` in the fork copy | adapt | The fork has no `.prettierrc` (C24), so nothing would have caught it. Matched the surrounding file's style |
| 13 | "The ticket text must not contain the word 'override'" | Ticket 350 already reads **"Option 2 is not an override of that comment"** — the owner's own recorded negation, pre-existing | **flag** | Added no "override" anywhere; did not delete the owner's sentence, since removing a negation that is part of the decision record would falsify it |
| — | C24: fork lint convention untested | Still untested at this point | flag | The tab was not type-checked or linted by anything in `pnpm verify`. **Closed by Part 2 below.** |

## Verification

Final `pnpm verify` rc=0. `engine-port-drift:check` ok at 33 ported files; all
three lock-vs-HEAD gates ok; core suite 58 files / 1199 passed; E-W3 green before
the fork hash moved **and** after the port; `node test-locales.mjs` rc=0; schema
reads 19 properties / 19 required; `pnpm issues:open` no longer lists 350.

The step 8→9 red window behaved exactly as predicted — the three gates exited 2
naming `clone HEAD is 812db29d… but lock pins 0b50f402…`, and went green once
the lock was re-pinned. Expected, not a finding.

Commits: `a2bfba3` (failing tests), `9c977e9` (the clear), `74070cf`
(renderers), `12a266e` (pin), `6c4cbf4` (pushed tip), `d4e6ac5` (close 350).
Fork commit `812db29d`, pushed and verified by `ls-remote`.

---

# Part 2 — the fork lint gate

Written by `gate-executor` (Opus) 2026-09-11, base `d4e6ac5`. Prompted by the
gap Part 1's ledger flagged: nothing in `pnpm verify` linted or type-checked our
files inside the fork.

## Summary

`pnpm verify` now lints and type-checks the files we own inside the wowsims
fork. The gate is scoped to our three paths, proven red on our own code, and
proven not to fire on upstream code.

## Deviation ledger

| Step | Plan said | Found | Action | Why |
|---|---|---|---|---|
| 1 | "`oxlint --fix` resolves them cleanly" | `--fix` cleared 23 of 24. The `import(no-duplicates)` warning in `upgrades_tab.tsx` is not autofixable — it survived and `--deny-warnings` still returned rc=1 | adapt | Intent unambiguous ("fix our existing warnings, then gate strictly"); hand-merged three separate imports of `./upgrades/engine/pool` into one statement |
| 2 | Typecheck "if too slow, measure and split out" | Measured 21s, twice | adapt | The rule's own condition was not met, so it stays in the chain |
| 6 | "update the PROVENANCE hash for any ported engine file you touched" | 14 of the 24 files carry PROVENANCE rows, not one or two | adapt | Same action, larger scope than the phrasing implied; all 14 rewritten, drift gate re-validates all 33 rows |
| 6 | Ported-engine cycle implies updating provenance identifiers | `engine_provenance.ts`'s `ENGINE_FORK_COMMIT` left at `8db275d7d` | adapt (deliberate non-action) | Its own documented convention names the last commit that **changed engine behaviour**; an import reorder changes none, and E-W3 proves it |
| 5 | "Introduce a violation in an upstream file" | Upstream `gear_picker` **already** fails `--deny-warnings` today (rc=1, 6 warnings) | adapt | Did the injection as asked, and reported the pre-existing failure as stronger evidence — the owner's "they may add things that fail our lint" is already true, not hypothetical |

Two corrections to inherited claims, both measured: the fork's PROVENANCE prose
says this clone has `core.autocrlf=true` and the drift gate is "unpassable across
a checkout/merge cycle" — measured `core.autocrlf=false` in both trees, and the
gate passes. And a first `grep` for PROVENANCE rows returned nothing; that was a
wrong regex, not a missing table.

## Red proof

Duplicate import injected into our `upgrades/engine/disclosure.ts`:

```
rc=1
fork lint check: oxlint (our TypeScript/TSX) failed.
ui/core/components/individual_sim_ui/upgrades/engine/disclosure.ts:9:42: warning import(no-duplicates): Module './caps.js' is imported more than once in this file
fork lint check: 1 of 3 checks failed at fork commit f90b12a7bee9.
```

Reverted; `disclosure.ts` back to its exact PROVENANCE hash, gate green again.

## Scoping proof

The same violation injected into upstream
`ui/core/components/gear_picker/item_list.tsx` (upstream-owned: created in
`7cdab3744`, an ancestor of our branch point `ec5c5f2`):

```
=== gate ===                          rc=0   fork lint check ok at fork commit f90b12a7bee9
=== oxlint aimed at that file ===     rc=1   item_list.tsx:4:31 import(no-duplicates)
```

The green is because the scope excludes upstream, not because the injection was
inert — the second line establishes that. Reverted; fork tree empty.

## One thing worth attention

The gate's narrow scope has a single deliberate hole, documented in the script:
the type-check is the fork's **whole-project** `tsc --noEmit`, because a type
error in our tab usually surfaces in the file importing it and tsc cannot check
one file with its dependencies. It passes today, but if upstream ever lands a
type error of their own, this gate goes red for a reason that is not ours. The
script's failure message says so and tells the reader to report it rather than
edit upstream's file. The alternative — dropping the typecheck to our paths only
— loses the cross-file coverage, and was not chosen unilaterally.

## Commits

Fork: `f90b12a7b` — Sort imports across our own tab and engine files (24 files,
+134/-137), pushed.

Repo: `49e309b` — Lint and type-check our files inside the fork
(`scripts/check_fork_lint.py`, `package.json`); `0a0aa01` — Re-pin the fork to
the import-sort commit.

## Verify

`VERIFY_RC=0`, with the new gate at chain position 22:

```
$ python scripts/check_fork_lint.py
fork lint check ok at fork commit f90b12a7bee9: oxlint clean over upgrades/ and
upgrades_tab.tsx (--deny-warnings), stylelint clean over _upgrades_tab.scss,
fork type-check clean
```
