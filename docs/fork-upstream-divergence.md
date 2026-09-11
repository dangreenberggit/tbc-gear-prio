# Upstream files our fork diverges on

Which files in `vendor/tbc-new-fork` (upstream `wowsims/tbc-new`, branch
`feat/upgrades-tab`) carry an edit to a line upstream wrote, as opposed to a
new file we added. Read this before any merge from upstream — it names the
files a conflict can land on, and for `sim_header.tsx` a line that must
survive that conflict.

Companion to
[`.scratch/carry-forward/issues/369-no-ledger-records-which-upstream-files-the-fork-diverges-on.md`](../.scratch/carry-forward/issues/369-no-ledger-records-which-upstream-files-the-fork-diverges-on.md),
which holds the ticket this note closes. For phase-tier seams in our own added
code (a different question — behavior that changes with the content tier, not
files that diverge from upstream), see
[`fork-phase-seams.md`](fork-phase-seams.md).

## How this was produced

Measured against the fork's actual current HEAD, not the ticket's stale
audit SHA:

```
git -C vendor/tbc-new-fork diff --stat ec5c5f205e61049d730e460967f8488774a7fe2a..f90b12a7bee9268426f3a36a9d6c7c718a6cf5e1 -- ':!*upgrades*' ':!*_upgrades*'
```

`f90b12a7b` is the commit `data/wowsims-fork.lock.json` names as of
2026-09-11. `ec5c5f205` is that lock file's `branchedFrom` — the upstream
commit this fork branch sits on. Everything under `upgrades/**`,
`upgrades_tab.tsx`, `_upgrades_tab.scss` is excluded by the pathspec because
it is ours outright, new files with zero upstream lines touched. Re-run the
diff to re-verify; both shas can move.

Run against `f90b12a7b` — the pin as this note was first written, before the
`sim.ts` revert below — the command returns **fifteen** paths, `ui/core/sim.ts`
among them with a diff-stat of 20. The revert landed as a separate fork commit
`bbad1b8a4` on top of `f90b12a7b`, and the pin has since moved onto it
(`data/wowsims-fork.lock.json`, whose `_comment` records the push and the
`ls-remote` that verified it). So the command as written above, against the
current pin, returns `ui/core/sim.ts` with a diff-stat of 0 — which is the
state the table below reflects. Substitute `f90b12a7b` for the pinned sha to
reproduce the pre-revert fifteen.

The ticket that opened this work
counted thirteen from the same command run against a now-stale SHA
(`0b50f402`); re-running that same command against `0b50f402` today also
returns fifteen, so the ticket's own count was short by two even at the SHA
it audited — `test-layout.mjs` is missing from its table entirely, and the
table lists fourteen rows, not thirteen. `test-layout.mjs` is not upstream
divergence: it is our own tooling living in the fork tree (the fork's copy of
`packages/core`'s layout gate), not a changed upstream file, and the pathspec
above does not catch it because `test-layout.mjs` matches neither `*upgrades*`
nor `*_upgrades*`. It is listed below for completeness, marked local-only,
same as the ticket's own prose already said. The other fourteen paths are the same set the ticket names. Two of them did
move between `0b50f402` and `f90b12a7b`, both additive and both ours:
`assets/locales/en/translation.json` (+91 → +92) and
`schemas/translation.schema.json` (+306 → +310), the i18n key and schema entry
ticket 350 added. No **upstream-authored** file changed across those five
commits, which is the property this ledger cares about — they are documented in
`data/wowsims-fork.lock.json`'s `_comment`. Re-derive with the command above at
each sha rather than trusting this sentence.

## The paths

| Path                                                                                                                                  | What changed                                                                                                                                                         | Why                                                                                                                                                              | Upstream-candidate or local-only                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [`sim/hunter/item_sets.go`](../vendor/tbc-new-fork/sim/hunter/item_sets.go)                                                           | Ten `agent.(HunterAgent)` assertions → comma-ok guards returning no-op                                                                                               | `applyItemEffects` dispatches by item id with no class check, so a mail item a paladin can wear runs hunter code and panics — a real upstream bug, not our tab's | **Upstream-candidate** (ticket 311)                                                              |
| [`ui/core/components/gear_picker/item_list.tsx`](../vendor/tbc-new-fork/ui/core/components/gear_picker/item_list.tsx)                 | `getSourceInfo` extracted from a private method to an exported free function; body moved verbatim, 239 lines                                                         | Our tab needs the source-info formatting outside the gear picker's own class                                                                                     | **Upstream-candidate** — see Highest-risk entry below                                            |
| [`ui/core/components/sim_header.tsx`](../vendor/tbc-new-fork/ui/core/components/sim_header.tsx)                                       | Adds a `.sim-header-container-wrap` div and a scroll-fade affordance                                                                                                 | Local UI fix (Upgrades tab mobile layout)                                                                                                                        | Local-only — see Load-bearing lines below                                                        |
| `ui/core/sim.ts`                                                                                                                      | None remaining — see Item 3 below                                                                                                                                    | —                                                                                                                                                                | Resolved; zero diff vs. upstream                                                                 |
| [`ui/core/individual_sim_ui.tsx`](../vendor/tbc-new-fork/ui/core/individual_sim_ui.tsx)                                               | +6 lines, registers the Upgrades tab                                                                                                                                 | Wiring for our added tab                                                                                                                                         | Local-only                                                                                       |
| [`ui/scss/core/sim_ui/_header.scss`](../vendor/tbc-new-fork/ui/scss/core/sim_ui/_header.scss)                                         | +28 lines, fade mask pairing with `sim_header.tsx`                                                                                                                   | Styles the wrapper div above                                                                                                                                     | Local-only                                                                                       |
| [`ui/scss/core/components/individual_sim_ui/index.scss`](../vendor/tbc-new-fork/ui/scss/core/components/individual_sim_ui/index.scss) | +1 import                                                                                                                                                            | Pulls in our tab's scss                                                                                                                                          | Local-only                                                                                       |
| [`test-locales.mjs`](../vendor/tbc-new-fork/test-locales.mjs)                                                                         | Fixes a Windows `path.join`/glob bug that made the gate exit 0 having validated nothing; adds a `validatedCount` guard so a silently-empty glob fails loudly instead | Genuine upstream bug — the gate was passing on Windows while validating zero files                                                                               | **Upstream-candidate**                                                                           |
| [`assets/locales/en/translation.json`](../vendor/tbc-new-fork/assets/locales/en/translation.json)                                     | +92 lines                                                                                                                                                            | Our tab's own strings, under an `upgrades_tab` key                                                                                                               | Local-only (additive, our namespace)                                                             |
| [`schemas/translation.schema.json`](../vendor/tbc-new-fork/schemas/translation.schema.json)                                           | +310 lines                                                                                                                                                           | Schema entry the locale gate requires for the additive strings above                                                                                             | Local-only (additive)                                                                            |
| [`package.json`](../vendor/tbc-new-fork/package.json)                                                                                 | +1 line, `test:layout` script                                                                                                                                        | Registers our layout-gate tooling                                                                                                                                | Local-only                                                                                       |
| [`tsconfig.json`](../vendor/tbc-new-fork/tsconfig.json)                                                                               | +1 line, `allowImportingTsExtensions`                                                                                                                                | Needed by our tab's own module layout                                                                                                                            | Local-only                                                                                       |
| [`.gitignore`](../vendor/tbc-new-fork/.gitignore)                                                                                     | +3 lines                                                                                                                                                             | Ignores a local WCL-credentials file our tab's importer reads                                                                                                    | Local-only                                                                                       |
| [`package-lock.json`](../vendor/tbc-new-fork/package-lock.json)                                                                       | Full regen, ~2,584 changed lines                                                                                                                                     | Regenerated so native deps record all platforms; not a dependency version change                                                                                 | Local-only, generated                                                                            |
| [`test-layout.mjs`](../vendor/tbc-new-fork/test-layout.mjs)                                                                           | +809 lines (new file, not an upstream file at all)                                                                                                                   | Our own layout gate, ported to run inside the fork tree                                                                                                          | Local-only — not upstream divergence; listed here only because the diff command above returns it |

## Load-bearing lines

**`sim_header.tsx`'s `.sim-header-container-wrap` div**
([sim_header.tsx:268](../vendor/tbc-new-fork/ui/core/components/sim_header.tsx#L268))
is load-bearing: `wireTabStripScrollAffordance`
([sim_header.tsx:67](../vendor/tbc-new-fork/ui/core/components/sim_header.tsx#L67))
does `querySelector<HTMLElement>('.sim-header-container-wrap')!` — a
non-null assertion that throws at runtime if the div is ever merged away.
`ui/scss/core/sim_ui/_header.scss:42` styles the same class.

This file already conflicted once, in merge commit `ab59127d9` ("Merge
upstream feature/backend-reforge at ec5c5f2"), the only conflict that merge
produced. Its body records the reasoning in full; quoting the load-bearing
part:

> The wrapper is load-bearing for our own code. sim_header.tsx:67 does
> `querySelector<HTMLElement>('.sim-header-container-wrap')!` -- a
> non-null assertion that would throw at runtime without it -- and
> ui/scss/core/sim_ui/_header.scss:42 styles it. It came from our
> commit d7ea63197 "Unbreak the Upgrades tab on mobile".
>
> "within-raid-sim-hide" is gone from upstream entirely (0 hits at
> ec5c5f2, 8 at our pre-merge tip) along with raid-sim. The merge had
> already auto-resolved the other 7 away; keeping this one would leave
> an orphan class with no SCSS definition anywhere in the merged tree.

Read the full body with
`git -C vendor/tbc-new-fork show ab59127d9 --no-patch --format=%B`. The
resolution kept our wrapper div and took upstream's unrelated class removal
in the same hunk — a single JSX conflict, not two independent edits, which
is why "keep both" was not the answer. Any future merge that touches this
file's `customRootElement()` should re-read that commit before resolving.

## Item 3: the `sim.ts` `iterations` parameter — reverted

The ticket asked to wire up or revert the dead `iterations?: number`
parameter on `makeRaidSimRequest`. Reverted to upstream's exact shape:

```
git -C vendor/tbc-new-fork diff ec5c5f205e61049d730e460967f8488774a7fe2a -- ui/core/sim.ts
```

now returns **no output** — `sim.ts` has zero diff against upstream. The
parameter existed for a per-request iteration override that
`docs/plans/wowsims-tab/candidate-pool.md` §6.3 argued for, then corrected
(dated 2026-08-15, same section) once the screening pass turned out not to
need it: the upgrades tab's `WasmSimRunner.run`
([upgrades/adapters/wasm_sim_runner.ts](../vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/adapters/wasm_sim_runner.ts))
builds its own request from
`SimRunOpts.iterations`
([upgrades/engine/seams/sim-runner.ts:23-26](../vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/seams/sim-runner.ts#L23))
and never calls `makeRaidSimRequest` at all. All seven call sites (five in
`sim.ts`, one in
[`exporters/individual_cli_exporter.tsx:13`](../vendor/tbc-new-fork/ui/core/components/individual_sim_ui/exporters/individual_cli_exporter.tsx#L13),
one in
[`upgrades/adapters/skeleton.ts:28`](../vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/adapters/skeleton.ts#L28))
passed exactly one argument, confirming the second parameter had no live
caller. Reverting it removes an upstream-file divergence that bought nothing
and would have conflicted for no benefit — exactly what the ticket named as
the risk.

`docs/fork-phase-seams.md`'s line 45 ("Our `sim.ts` change adds an optional
`iterations?` param only — phase-neutral") is now stale; it described the
divergence this note reverts.

## Highest merge risk: `item_list.tsx`

`getSourceInfo`'s extraction moved 239 lines from a private method to an
exported free function, body unchanged. Git diffs a moved function as a
large deletion plus a large addition — it cannot represent "this logic moved
and nothing else changed," so a future merge-tree simulation is more likely
to show a real conflict here than a resolvable rename. Read the extraction's
diff directly rather than trusting a merge preview's conflict count for this
file.

## What is not claimed

No entry here claims sim output is unchanged as measured fact. The
`item_sets.go` guard and the `sim.ts` revert were read, not run through the
sim before and after — reading the diff shows no arithmetic, coefficient, or
aura change, which is a claim about the diff's content, not about simulated
DPS. Where a re-run would settle a question, this note says so rather than
asserting the untested case as verified.
