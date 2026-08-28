# Execution report — tickets 306 and 308

Final message of the `gate-executor` seat, verbatim. Written to disk by the
orchestrator at Gate C.

---

**Status: complete.** Both tracks executed as planned, in the mandated order (B
then A, strictly serial). No plan gate was hit, no stop condition fired, and no
ranking behaviour changed anywhere.

## Commits

Main repo `feat/upgrades-dedup-wowsims`, on base `7da8196`:

| SHA | Subject |
| --- | --- |
| `8d94174` | Close ticket 308 as deliberately out of scope |
| `4b948e4` | Close ticket 306 with a scoped fmt gate |

Fork `vendor/tbc-new-fork` (`feat/upgrades-tab`), on `38cb8ff`, **not pushed**:

| SHA | Subject |
| --- | --- |
| `ada242cb` | Record second-copy placement as out of scope |
| `342f6a74` | Format the ten files this project owns |

Final lock pin `342f6a74e68bfb5604d043bc32c0bca324a2f1de` equals
`git -C vendor/tbc-new-fork rev-parse HEAD`.

## What I did, per step

**B1** — parity green at baseline before any hash moved: exit 0.

**B2/B3** — out-of-scope comments at both guards, each written in its own file's
idiom (the copies are deliberately divergent; nothing was copied byte-for-byte).
Main copy `rank.ts:943`, fork copy `rank.ts:687`.

**B4** — `rank.ts`'s sha256 row in the fork's `engine/PROVENANCE.md` updated by
Edit tool to `d00c65e7...`; drift gate reports *33 ported files match*.

**B5** — the `rowsTable` comment block extended at `upgrades_tab.tsx:1433`,
naming the guard coupling, ticket 309, and the missing `ViewRow` worn-slot
signal. **The filter expression itself is byte-identical** — the fork diff for
Track B was 32 insertions, 0 deletions.

**B6** — fork commit, re-pin, `sim-implemented-effects:generate`, `pnpm verify`
exit 0.

**B7** — ticket 309 filed (number confirmed free by directory listing, not just
`NEXT`), `NEXT` bumped to 310, ticket 308 closed with all four boxes
dispositioned.

**A1** — re-measured from scratch. Reproduced the plan exactly: tip **194/643**,
base **85/529**, difference **109 = 34 engine + 65 data + 10 ours**, and the ten
files match the manifest item-for-item. `sim_header.tsx` authorship non-empty
(`d7ea6319 "Unbreak the Upgrades tab on mobile"`), so it stayed in.

**A2** — formatted exactly those ten. **A3** — added the scoped `fmt` row to
`fork-gates.md`. **A4** — fork commit, re-pin, regenerate, verify. **A5** —
ticket 306 closed.

## Deviation ledger

| Step | Plan said | Found | Action | Why |
| --- | --- | --- | --- | --- |
| B5 | Write B5's comment already oxfmt-clean so A2 does not rewrite it | To *prove* that rather than assume it, I ran oxfmt on the two edited fork files as a probe — which also reformatted `upgrades/engine/rank.ts`, a file that must never be formatted (it reindents 2-space to tabs and would break the PROVENANCE hashes) | **adapt** — reverted both files with `git checkout`, reapplied the edits with the Edit tool only, confirmed 32 insertions / 0 deletions | My error, caught before any commit. The probe did answer the question: my comment lines are byte-identical through a format pass. Recorded because a silent paper-over is the failure mode, and because it is direct evidence for the `engine/**` exclusion — I now cite it in `fork-gates.md`. |
| B6 | Fork commit | The fork's git hook died with the fnm error; the failed commit also rolled back staging | **adapt** — pinned PATH per `known-traps.md`, re-staged, committed | Documented trap, documented fix. |
| B6 | — | `Out-File -Encoding utf8` wrote a BOM into the commit subject | **adapt** — amended with `UTF8Encoding($false)` | Not in the plan; a clean subject line is a commit-message rule. Subsequent messages all use the BOM-free writer. |
| A2 | "No file's changed-line count approaches its full length" (line-endings trap) | Several files exceeded it — `sim_database.ts` 45+/52- of 42 lines, `wcl_import_modal.tsx` 200+/218- of 204 | **adapt** — measured instead of assuming: **0 CR bytes** in the working copies, and the diff survives `--ignore-cr-at-eol`, so no flip. Sampled the largest diff: quote style, tab indentation, and import joining at width 160. Cosmetic only | The plan's heuristic gives a false positive here because oxfmt legitimately rewrites most lines of a small file. The underlying concern (a flip) was checked directly and is absent. |
| A2 | Judge `lint:js` by whether new warnings name touched files | Warnings *do* name seven of the ten | **adapt** — measured before/after by stashing the format pass: **265 warnings both times** | oxlint and oxfmt disagree on import order. Pre-existing baseline, not introduced. Recorded in `fork-gates.md` and ticket 306 so the next reader does not re-investigate. |
| A3 | Gate table gets five rows | `lint:css`'s path in `fork-gates.md` is wrong — the scss is at `ui/scss/core/components/...`, not `ui/core/components/...` | **flag** — did not edit the existing row | Outside both tickets' scope and it is a pre-existing doc defect in a row I was not asked to touch. Worth a one-line fix by whoever owns that doc next. |
| — | Tree clean before each commit | `decision-log.md` was dirty at spawn (the orchestrator's own row recording my spawn, written after status was sampled) | **adapt** — stashed it before Track B's commit, restored after Track A's | lint-staged runs against `*` with `--no-stash`, so it would have ridden into my commit. It is the orchestrator's artifact; it is restored exactly as found and is the only dirty file now. |

C20 was independently re-run before I quoted it (467 pool entries, 70
finger+trinket, 3 non-unique — the same three items) and is cited in ticket 309
**as a payoff note explicitly scoped to one pool file**, never as the reason 308
is out of scope. That decision rests on C13/C14/C15 in both the ticket and the
code comments.

## Gate results

`pnpm verify` on the tip:

```
fork universes check ok: 63 bundled copies byte-match their data/ sources
pool listings check ok: both listings match a fresh regeneration
upstream drift (warning only -- does not fail the build):
  DRIFT: new release available: v0.0.119 -> v0.0.122
  DRIFT: watched ref feature/backend-reforge moved: cbf6b75a889e -> ebe54e734d22
VERIFY_EXIT=0
```

(The drift lines are the standing informational warning, unrelated to this
work.)

Parity test:

```
 PASS packages/core/test/wowsims-fork-parity.test.ts (2 tests | 1 skipped) 3163ms
 Test Files  1 passed (1)
PARITY_EXIT=0
```

Engine byte gate: `engine port drift check ok: 33 ported files match
PROVENANCE.md`

The fork's four gates plus the new scoped one:

```
tsc          TSC_EXIT=0
lint:js      LINTJS_EXIT=0   (265 warnings, identical before and after A2)
lint:css     CSS_EXIT=0
test:locales validated 3 locale file(s)   LOCALES_EXIT=0
fmt (scoped) All matched files use the correct format.
             Finished in 298ms on 10 files      SCOPED_FMT_EXIT=0
```

A1's measurements, both invocation forms:

```
tip,  from inside:  194 files ... Finished in 646ms on 643 files
base, from inside:   85 files ... Finished in 1562ms on 529 files
base, by path:      157 files ... Finished in 612ms on 674 files   <- the artifact
```

The 157/674 run reproduces the brief's wrong figure exactly, confirming its
diagnosis.

## Not completed / for the next seat

- **Nothing from the plan is outstanding.** Every Verify-recipe item passes.
- The `lint:css` row in `fork-gates.md` names a path that does not exist
  (flagged above, not fixed).
  <!-- Orchestrator note, added at Gate C: discharged. The row now spells the
  path out in full and the command was re-verified (CSS_EXIT=0). The rest of
  this report is the executor's verbatim final message and is unedited. -->

## Orchestrator note

Everything above this heading is the executor's final message, verbatim. Gate C
dispositions are in `decision-log.md`. One of them was revised after the owner
challenged it: the `lint:css` defect was fixed in place rather than escalated,
and the ticket 310 that briefly held it was deleted.
- Nothing was pushed; `pushed: false` is untouched. No merge to `dev`, no
  `pre-merge-review` — the orchestrator owns Gate C.
- `.scratch/stage-gate/tickets-306-308/decision-log.md` is dirty by design; that
  edit is the orchestrator's.

## Files worth opening

- `.scratch/stage-gate/tickets-306-308/fmt-owned-files.txt` — the pinned ten,
  with the measurement and the invocation-form warning in its header.
- `.scratch/stage-gate/upgrades-ui-quality/fork-gates.md` — the new `fmt` row and
  the exclusion reasoning.
- `.scratch/carry-forward/issues/309-per-placement-rows-second-copy.md` — the
  deferred design work.
