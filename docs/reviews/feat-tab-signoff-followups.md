# Pre-merge review — feat/tab-signoff-followups

Reviewed range: `e13edd4d6ccb46977d7984e924ef9dc8c6302d1e..875e5dc4a06912847a667f548cc8d64b0a63bbf6`

The branch closes nine owner-sign-off tickets from the 2026-09-18 walkthrough,
built through the stage-gate pipeline (plan → adversarial plan-review → executor,
artifacts in `.scratch/stage-gate/tab-signoff-followups/`). The substantive code
lives in the fork (`vendor/tbc-new-fork`, `feat/upgrades-tab`,
`d754ac1b4..d17587b5a`): `upgrades_tab.tsx` (+663), `_upgrades_tab.scss` (+171),
`translation.json`, `test-layout.mjs`, `run-tab-cdp.mjs`. The main-repo diff is
the nine closed ticket files plus three re-pin data files across three re-pin
commits. Reviewers read the fork diff, not just the pin bump.

Tickets: 415 (hide empty pre-run headings + reword), 416 (baseline below the
table), 417 (content filter → pre-sim source checkboxes), 419 (set-potential
total on the DPS cell), 420 (tooltip on the whole checkbox), 421 (remove the
above-cutoff count), 422 (export box polish), 423 (mobile alignment + BiS
spacing), 424 (guarantee gear sets into the sim + result tags).

All four axes ran on the review lane (Opus, effort medium) with fresh context.

## Adversarial

Nothing blocking or material survived scrutiny. The four highest-risk areas all
checked out against the engine source at `d17587b5a`:

- **419 sort/display agreement** — the displayed DPS figure (`deltaDps + setBonus`
  when `setBonus > 0`) and the header sort key (`deltaDps +
rankableSetPotential(row, floor)`) are the same number in every branch:
  confounded rows and noise-floor-zero rows both make `rankableSetPotential`
  return 0, and toggle-off / mid-run collapse both paths to bare `deltaDps`. The
  bug class this family keeps hitting does not reproduce.
- **417 pool filter** — `sourceKeyOf`/`sourceMatches` faithfully transcribe the
  engine's private `zoneKeyOf`/`matchesRaidFilter`; exclusions default-empty (a
  source first seen after a phase change defaults ON); stale exclusions are pruned
  so an invisible pool cannot be silently narrowed.
- **424 union + cap** — union dedupes on `itemId:slot` against the filtered set
  (no double-count); a source-excluded item in a guaranteed set is correctly added
  back. The candidate cap CAN drop a non-owned guaranteed item outside the top-N
  EP order (`rank.ts:1194`), but the caption's cap note appears exactly when a real
  cap is set and a set is selected — disclosed, not silent. Both localStorage
  parse paths are caught (outer for `JSON.parse`, inner per-entry for
  `SavedGearSet.fromJson`).
- **Harness/gate** — the `run-tab-cdp.mjs` edit is required by 416's DOM move
  ("Ranking failed" still lands in `.upgrades-status`), not a weakening.

Two minor findings, both deferred to tickets (see Disposition).

## Domain

Clean — no findings. The TBC/wowsims facts are sound:

- 424 phase→label mapping is TBC-correct (P1 Kara/Gruul/Mag … P5 Sunwell); ret's
  preset names and phase assignments match reality (Bulwark is a P3/BT set).
- The row→set tag test compares gear-**piece** id to piece id — the token id
  enters only at export (`exportIdForRow`), so ticket-126's token concern does not
  leak into 424's tagging. This was the sharpest domain risk; it is right.
- 417's 14 sources are the right set for the P1–P3 model this build ships (ZA/SWP
  absent because they aren't in the phase-3 pool; options derive from `poolFor`,
  not hardcoded).
- 419's total attributes the 2pc/4pc bonus via the engine's own figure, no
  re-derivation.

## Standards + Spec

**Standards: conforms.** No hard violations. Comment policy is well-followed
(load-bearing, why-not-what); the named-mirror comments for the byte-gated engine
transcription are correctly present; the borrow-native direction (BooleanPicker,
chip classes) is the theme of the change. `effectivePool` composes prune + source
filter + set union in one place — not duplicated. One minor: a single `as any` on
the untrusted-localStorage parse (defensible; the same read `loadUserData` does).
A perf smell noted for the record — `guaranteedSetsAvailable()` re-parses
localStorage on each call including per result row — is a quality item, not a
standards violation, and is not merge-blocking.

**Spec: clean.** All nine tickets faithfully met — every "What would close this"
maps to concrete diff hunks; no missing requirements, no scope creep, nothing
wrong against acceptance. The `run-tab-cdp.mjs` edit is a forced consequence of
416 (the harness read the "done" signal from an element 416 emptied), not creep —
and the executor flagged it rather than adapting silently. The two executor flags
(419 on-state not live-exercisable; the harness fix outside the manifest) are
honest dispositions, not gaps. Two documentation nits (the 417 mirror comment
cites `zoneKeyOf` where the private helper is `sourcesOf`/`matchesZone`; one
`raidFilter` doc-comment token survives the Step 9 grep) change no behaviour.

## Summary

Adversarial: 2 minor (deferred). Domain: clean. Standards: conforms (1 minor
advisory + 1 perf smell, not blocking). Spec: clean. No blocking or material
finding on any axis. The build implements exactly the nine tickets, the fork
re-pin discipline held (three units, three re-pins, desktop gate passed each with
no golden churn), and `pnpm verify` is rc=0 on the tip (re-run by the orchestrator
at Gate C). The worst issue anywhere is a layout assertion that can pass vacuously
if no BiS badge wraps in the fixture — minor, and it never false-fails.

Two owner eyeball items remain (not review findings, carried from the execution
report): 419's with-set-bonus total needs a character built toward a tier set to
see live (correct by construction; no default character surfaces a non-confounded
bonus), and 423's narrow-width result wants a 375/653/767 look. Plus the copy
strings ("View options", "Content", "Always sim these sets" + caption, "JSON
export", the token-id label) are the owner's to confirm.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                  |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Adversarial | defer       | `.scratch/carry-forward/issues/425-bis-tag-gap-layout-assertion-may-pass-vacuously.md` — the BiS-gap layout assertion can pass without a wrapped badge to exercise it (never false-fails)                                      |
| A2  | Adversarial | defer       | `.scratch/carry-forward/issues/426-multi-source-item-survives-if-any-source-ticked.md` — 417 keeps a multi-source item if any of its sources stays ticked; coherent, make the choice explicit                                  |
| S1  | Standards   | wontfix     | Single `as any` parsing untrusted localStorage JSON — the same read `loadUserData` does; defensible, no safer typed shape available at that boundary                                                                           |
| S2  | Standards   | defer       | `.scratch/carry-forward/issues/426-multi-source-item-survives-if-any-source-ticked.md` — perf smell: `guaranteedSetsAvailable()` re-parses localStorage per call incl. per result row; folded into the 417/424 settings ticket |

Domain and Spec found nothing — no rows (see their sections above).

---

# Round 2 — UI refinements (427–431) + default-BiS (433)

Reviewed range: `875e5dc4..39fc1707` (main); fork `d17587b5a..587dcfae6` (the substantive diff — 7 commits: Step 0 schema reconcile, 427/428/429/430/431, 433).

Second-round review of the work added after round 1. All four axes ran fresh-context on the review lane (Opus, effort medium). No blocking or material finding on any axis.

## Adversarial

Nothing blocking or material. Verified against the fork source at `587dcfae6`:

- **433 default-selection**: the `${specId}:${maxPhase}` scope guard replaces `guaranteedSetKeys` wholesale on scope change (no stale prior-phase keys), fires once at construction and once per new scope, and a user untick survives same-scope gear refreshes. `bisTagPhaseFor` undefined and `poolFor` empty are both handled without throwing.
- **430 tags**: one badge per containing selected set, generic bisLabel fallback when none — no zero-tag hole; name-collision disambiguation fires only when two selected sets sharing a name both contain the row.
- **431 total**: `deltaLabel` byte-identical to pre-diff; displayed total still equals the sort key. Ranking untouched.
- **427 announce**: reordered after `renderSubTabs`; the empty-state element is guaranteed present for idle/unsupported, so it cannot announce "".
- **Step 0 schema**: the 5 dropped keys have zero references in `ui/` and the locale; all added keys are present+required. No new drift.

One minor (deferred): tippy instances are created per render on the DPS cells and chips and never `.destroy()`'d, so re-renders accumulate orphaned tooltips — bounded by GC, and matches the file's pre-existing no-destroy pattern rather than a regression this diff introduced. Ticket 435.

## Domain

Sound — no contradictions of `docs/stage0-findings.md`. The 433 default is domain-correct: feral defaults to BOTH phase BiS presets (the 6pc/9pc hit-cap variants the old "BiS" badge marked); ret defaults to its single per-phase preset; the tag labels read the gear-tab set names, the owner's named source of truth. One nuance for the owner's P5 sign-off (not a defect): feral P4/P5 curated presets **do** exist in the fork tree, but the pipeline's `bisSets` tokens only carry `p3_*`, so the feral P5 default follows the degraded universe tag to the P3 pair rather than the fork's own P5 set. Defensible (matches the old badge; P3 feral BiS carries into P5; the P5 chip stays hand-tickable) but it is fork-preset-vs-pipeline-lag, not absence.

## Standards + Spec

**Standards: conforms.** Comment policy followed well (load-bearing why-not-what throughout); the new helpers (`defaultGuaranteedSetKeys`, `rowTagLabels`, `setBonusPresentation`) compose existing accessors with clear names and no Feature Envy; the tippy idiom matches the existing one; the schema edit is minimal and consistent. One minor (deferred): the `.content-block` header scaffold is hand-written 3× (resultsBlock + the two new wraps) — the persistent-root reason for inlining doesn't apply to the two new static wraps, so a local helper should collapse them; cuts against the batch's own borrow-native theme. Ticket 436.

**Spec: clean.** All six tickets faithfully implemented, no missing requirements, no acceptance violations. The Step 0 schema drop of 5 keys (vs the 2 the plan named) is justified debt-paydown, not creep — the extra 3 were dead `required` entries Ajv never reached; verified unreferenced. Owner-taste items (star drop, tag multiplicity, feral-P5 default, new copy strings) are all left exactly as the plan decided, routed to the Step 8 sign-off pack — none silently changed, none gating merge.

## Round 2 summary

No blocking or material finding on any axis. Two minors deferred to tickets (435 tippy cleanup, 436 content-block duplication). Domain flagged the feral-P5 default as an owner-awareness item, not a defect. `pnpm verify` rc=0 on the tip; layout gate 45/45; desktop gate green with the golden unmoved (C38 no-op); locale gate red→green (ticket 432's schema half fixed). The independent plain-English copy review (separate deliverable) suggested six wording tweaks, all owner-taste, none blocking.

## Round 2 disposition

| ID    | Axis        | Disposition | Ticket / note                                                                                                                                                                    |
| ----- | ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R2-A1 | Adversarial | defer       | `.scratch/carry-forward/issues/435-tab-tippy-instances-not-destroyed-on-rerender.md` — tippy instances not destroyed on re-render; GC-bounded, pre-existing pattern              |
| R2-S1 | Standards   | defer       | `.scratch/carry-forward/issues/436-content-block-markup-duplicated-three-times.md` — content-block scaffold hand-written 3×; local helper should collapse it                     |
| R2-D1 | Domain      | wontfix     | feral P5 default follows the degraded universe tag (P3 pair), not the fork's P5 preset — matches the old "BiS" badge; owner-awareness item routed to sign-off, not a code change |

Domain and Spec found no other findings. Copy-review tweaks are tracked in the owner sign-off pack, not as review findings.

---

# Round 3 — tab-finish-arc (fixes 437/439/440/441/442/443 + owner corrections + copy picks)

Reviewed range: `39fc1707..cb7cc6f0` (main); fork `587dcfae6..faaad6908` (the substantive diff reviewed — 10 commits: c122a3012 six copy rewords [carried from prior chunk], then the arc: 442/440 export+source, 437 error message, 441+443 toggles, 439 scroll, and the owner-correction pass 2dc294c66/e01718feb/6c08a6a56/faaad6908 rewriting 437 plain, dropping the 443 hover mode, and the two owner copy picks). The one material finding (A-r3-1) was fixed in-branch after review at fork `ae02df4e9` (main re-pin below); that fix is a comment + one-clause guard change in the error path, re-gated (verify rc=0, layout 45/45, desktop golden unchanged) — a follow-up round on that single commit would find nothing new.

_Dispatch: three axes in parallel on the review lane — adversarial + domain as fresh gate-reviewer subagents (Opus, effort medium), Standards+Spec via the code-review skill. Fresh context, diff-only._

## Adversarial

One material finding, since fixed; rest clean.

- **A-r3-1 (MATERIAL, FIXED)** — `describeRunError` (`upgrades_tab.tsx:277`) matched the whole `TypeError` class, but `run()` wraps the entire ranking pipeline (fetch, sim, result parse, row assembly). A downstream deterministic bug throwing a `TypeError` (a null-deref reading a `RaidSimResult` field or building rows) was relabelled "Something went wrong running the sim. Refresh the page." — advice that re-hits the same bug, with the true cause surviving only in `console.error`. Directly undercuts ticket 437's intent (stop hiding real failures behind friendly text). **Fixed** in fork commit `ae02df4e9`: the guard now keys on `message.startsWith('Failed to fetch')` alone, which covers both genuine load origins (the browser `fetch` `TypeError` message and `worker_pool.ts:49`'s HTTP error); a real pipeline `TypeError` falls through to `Ranking failed: {{message}}`.
- **A-r3-2 (MINOR)** — a disabled Set-potential checkbox stays visually ticked (`Input.update()` re-applies only `.disabled`/`hide`, never `setInputValue`). Cosmetic only: rows read the internal `value` (forced false), and `refreshViewControlVisibility` runs before rows compute, so DPS figures stay correct. A greyed-but-ticked box, no wrong number.
- Cleared under scrutiny: 443 dead locale keys (no dangling refs, schema mirrors track the rename), tippy re-enable restore, 439 overflow scoping (no clip below xl), 442 export width additivity.

## Domain

Clean — no blocking or material domain-honesty findings.

- **D-r3-1 (MINOR, wontfix)** — the 441 disabled tooltip "None of these upgrades gain a set bonus." is technically loose: `hasRankableSetPotential` also returns false for a _confounded_ bonus (breaks another set, `(k-1)*B` inflation, ticket 90) and a _sub-noise_ bonus, so a row that "gains" such a bonus still trips the tooltip. Not a domain lie: the confounded exclusion is domain-correct (a set-breaking bonus gets no credit anywhere in the view, so the toggle would change nothing) and a sub-noise figure is "nothing measurable." The tooltip means "no bonus this toggle can rank on," the honest statement for the control it describes. A tighter string ("no upgrade gains a _rankable_ set bonus") would remove the ambiguity but the current one does not mislead about mechanics.
- Confirmed honest: the inline `"{{threshold}}pc: +{{dps}} DPS"` figure (a sim measurement — `prospectiveBonusDps` / `packages[0].deltaDps`, the same figures the hover tooltip and the sort key use, never the discounted weight); threshold/DPS always paired from one source; confounded/crossing states return early with their own strings, so no double-count.

## Standards + Spec

**Standards:** no hard violations (the comment policy is advisory — `docs/workflow.md`, not tooling-enforced). Judgement calls only: three call-site comments (the `setState` catch and two "already display-ready" echoes) largely restate the code and could trim to their ticket refs; the load-bearing docblocks (`describeRunError`'s external-quirk note, the tippy cast) earn their place. No Mysterious Names, Message Chains, Middle Man, or Speculative Generality; new names all reveal intent. (The `describeRunError` docblock was rewritten by the A-r3-1 fix, tightening the "why".)

**Spec:** clean against all six tickets on resolved intent. No missing/partial requirements, no scope creep, no wrong implementations. 437 maps both load origins and removes the double-wrap; 439 scopes the overflow to xl+ per the ticket's own diagnosis; 440 wraps the fallback to match the native anchor with text unchanged; 442 caps all four export children at one bound; 441 ships keep-visible-disabled-with-tooltip (owner-resolved) with the value forced off; 443 ships inline-only, no toggle (owner-resolved, hover mode dropped in `e01718feb`), the inline figure agreeing with the hover tooltip. The `sources_title`/`sets_caption`/flavour copy rewrites are the owner copy picks named in the endpoint commit, not stray work.

## Summary (round 3)

Four axes, all fresh-context diff-only. **One material finding (adversarial, the over-broad `TypeError` guard), fixed in-branch at `ae02df4e9` and re-gated (verify rc=0, layout 45/45, desktop gate golden unchanged).** Remaining: two minors (a cosmetic greyed-but-ticked checkbox; a domain-loose but honest 441 tooltip) and standards judgement-call comment trims — all non-blocking, none deferred to tickets (the checkbox is cosmetic-only, the tooltip is honest for the control, the comment trims are advisory). The batch faithfully implements the six tickets on resolved intent with no scope creep.

## Disposition (round 3)

| ID     | Axis        | Disposition | Ticket / note                                                                                                                                                      |
| ------ | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A-r3-1 | Adversarial | fixed       | Guard narrowed to the fetch-load origin; fork commit `ae02df4e9`, re-pinned. Real pipeline `TypeError` now keeps its own message.                                  |
| A-r3-2 | Adversarial | wontfix     | Cosmetic only (greyed-but-ticked box); rows read the forced-false internal value, DPS stays correct. Not worth a native `Input` change.                            |
| D-r3-1 | Domain      | wontfix     | 441 tooltip is domain-honest for the control ("no bonus this toggle can rank on"); confounded/sub-noise exclusions are correct. Owner already picked this wording. |
| S-r3-1 | Standards   | wontfix     | Comment-trim suggestions are advisory judgement calls; the A-r3-1 fix already rewrote the main docblock. No hard violation.                                        |

---

# Round 4 — visual+a11y reviewer infra + 438 impl (Sources popup + Sim-sets disclosure)

Reviewed range: `cb7cc6f0..ac45755c` (main); fork `ae02df4e9..994fcb9f3` (the substantive diff — 4 commits: 9b407a5f3 a11y probes + review capture harness, d315ca5d2 capture scroll-into-view fix, 3f19c283c the 447 Sources modal, 994fcb9f3 the 448 Sim-sets disclosure). The main range's first commit a761ab40 (narrow the 437 error guard) was already reviewed in round 3 and is not re-litigated here. Two stage-gates landed in this window: the visual+a11y reviewer infrastructure (its own stage, proposal items 1–15) and the 438 implementation (both owner-confirmed designs, each visual-reviewed by the new gate-visual seat).

_Dispatch: four axes fresh-context on the review lane (Opus, effort medium) — adversarial + domain as gate-reviewer subagents, Standards+Spec via the code-review skill's two sub-agents. Diff-only, both the main and fork diffs supplied._

## Adversarial

Nothing blocking survived scrutiny. Two material coverage-limitations of the new gate + one minor silent-empty path — all disclosed in the artifacts, none a confidently-wrong-number defect.

- **A-r4-1 (material, deferred → 449)** — the blocking a11y ratchet (`test-layout.mjs`) scans `#upgrades-tab` but never opens the Sources modal, which is `display:none` while closed, so axe skips its subtree. Proven, not hypothetical: the visual seat's own capture found a new serious `aria-dialog-name` on the open modal that sailed past the layout gate. Any future critical violation inside the modal merges green too. This is exactly the open-overlay blind spot ticket 449 already names (filed at execution time from the same finding).
- **A-r4-2 (material, deferred → 450)** — the keyboard focus-walk passes green when it measures nothing: `a11yClassify` only synthesises focus-miss violations `if (walk && !walk.unmeasured)`, so in an environment where synthetic Tab doesn't move DOM focus, a keyboard-unreachable control ships with only a WARN. Disclosed (WARN + banner), so honest, not silent — but the gate promises an operability guarantee it doesn't enforce when the env declines to focus. (C23 resolved MEASURED in session 2's env, so this is a latent-regression concern, not live.)
- **A-r4-3 (minor, deferred → 451)** — `test-review.mjs` reports `captured`/exit 0 for a manifest entry with empty/missing `widths` (no capture, no error row, errorCount stays 0). An authoring mistake yields a green run with zero evidence for that ticket.
- **Cleared under scrutiny:** 447 pool semantics (excludedSources add/delete byte-identical; stale pruning intact at :1899; default empty=all-on; `refreshCandidatesPlaceholder` still calls refreshSourceFilter→refreshSetChips→updateEligibleCount in order; setValue still fires updateEligibleCount + the new summary) — a genuine presentation swap. 448 duplication/count (both mounts `replaceChildren()`+`d-none` at the top of refreshSetChips, above the `!specId` return; hidden recounted per rebuild; a selected off-phase chip stays visible via the guaranteedSetKeys clause; defaults resolved before the loop). Exit-code gating (blocks on any measured nonzero; GATE_UNMEASURED→0 baseline untouched). Baseline keying (`ruleId\0selector`, specific not match-everything; unmatched entries fail closed).

## Domain

Clean — no findings. The narrow domain surface all resolves:

- **447 Sources taxonomy** is TBC-correct and presentation-only: Raids (zone keys) vs Other (`Object.values(SOURCE_LABELS)` = Badge/Crafted/Rep/PvP/World-drop/Heroic/Source-not-recorded, `view.ts:77-85`). Both the modal and `effectivePool` read the same `sourceOptions` through `sourceKeyOf`; the offered set is unchanged.
- **448 phase grouping** correctly handles the feral-P5-degrades-to-P3 nuance: at P5-with-only-P3-data the default preset is `phase===3`, off-phase against `maxPhase===5`, so it fails the first two `visible` clauses but passes the third (`guaranteedSetKeys.has`) — the degraded default stays in the shown row, not behind the disclosure. "Current phase" + selected-override is the right relevance criterion for TBC tier sets; default selection (433) unchanged.
- **a11y baseline classifications** (444 image-alt on item icons, 445 select-name on the upstream phase selector, 446 aria-progressbar-name on the run bar, 449 aria-dialog-name on the new modal) are all real and correctly classified.

## Standards + Spec

**Standards: conforms.** No hard documented-standard violations. Comment policy followed (one soft narration case in the `GateResult` docstring, judged load-bearing — it warns a reader off adding a redundant Python branch). Harness split is clean (extraction removed duplication; `test-layout.mjs` keeps assertions/main, `test-review.mjs` is a genuine second consumer — not a Middle Man); `_layout_command`→`_npm_command` is a named seam, not a Middle Man; `check_tab_review.py` imports from `check_layout_gate` (doesn't copy). Borrow-native 447 modal: the `newMenuSection` markup copy is documented in-comment (newSection is private; subclassing FiltersMenu would drag in the gear picker's own sections) and reuses the `filters-menu` SCSS with zero new rules — the clean half of borrow-native. Types-from-JSON ban holds (no TS type derived from a JSON import). One minor judgement-call smell: `cssPath` is inlined twice in `focusWalk` (both are page-eval string templates, so a shared JS helper can't cross the boundary directly; contained to one function).

**Spec: clean.** All 15 approved infra items present and faithful (harness split + axe/focus-walk, test-review.mjs, axe-core 4.13.0 pin + scripts, check_layout_gate a11y wiring + translation.json hashed, check_tab_review.py exit 0/1/2, seeded baseline, .gitignore PNG line, gate-visual.md, the SKILL/plan-template/gate-executor edits, known-traps line, baseline tickets 444/445/446 + NEXT advanced). The spec axis flagged item 14 (known-traps line) as missing, but the orchestrator verified it IS present (docs/agents/known-traps.md:183-184, landed in commit b004ab60 within the range) — a false positive from the diff read, so item 14 is faithful. Tickets 447 and 448 both fully met: every "What would close this" clause is backed by captured facts in the committed gate-visual handoffs (447: button+modal+2-col grid+summary, card 1106.8→672.7px; 448: current-phase+saved shown, "Other phases (3)" count correct, expand/collapse, selection logic byte-unchanged). The narrow-width modal-open gap (447) and ticked-then-collapsed transition (448) are honestly labelled harness-limitation / code-inspection, not captured — no spec clause requires those states. The `.agents/skills/` mirror is a deliberate required doc-copy (check_skill_mirrors), not creep. No missing/partial/wrong requirement.

## Summary (round 4)

**One blocking finding (A-r4-1, reclassified by the owner 2026-09-19): the open Sources modal has no accessible name (serious `aria-dialog-name`) — a real a11y defect on UI this branch ships, and this branch's whole purpose is the a11y review, so it gates the merge.** It is NOT fixed this session (owner instruction: "fix nothing; reclassify and list"), so the branch is **NOT merge-ready** until 449 is fixed and re-tested through gate-visual. The two other adversarial findings are coverage limits of the new gate itself (450 focus-walk-unmeasured; 451 test-review-empty-widths), deferred. Domain and Spec are clean; Standards conforms with one minor advisory. The 438 controls implement exactly the two owner-confirmed designs with the pool-semantics invariant preserved and the chip-duplication class provably closed. `pnpm verify` rc=0 on the tip, desktop gate (a)-(h) green with the golden unchanged on both re-pins. The layout-gate a11y ratchet reported "0 unbaselined critical/serious" — but only because it scans the closed shell and never opened the modal (that blind spot is 450); the visual seat's own capture is what caught A-r4-1, the reviewer earning its keep on its first outing. Note `pnpm merge-to-dev --check-only` still prints `merge-ready: ok` because that gate only checks the review FILE EXISTS, not its dispositions — the blocking row in the table below is the real gate, and it is red.

Owner-taste items still open (not review findings): the copy strings for the 447 button/summary/sections and the 448 disclosure label are shipped as plain placeholders for the owner's pass; and the owner's final taste check on the two controls' look (the visual+a11y reviewer's stated division — the seat does the render-defect class, the owner does taste).

## Round 4 disposition

| ID      | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A-r4-1  | Adversarial | **fixed**   | `.scratch/carry-forward/issues/449-sources-modal-missing-accessible-name.md` — new serious `aria-dialog-name` on the open Sources modal, a real a11y defect on shipped UI. Owner-reclassified BLOCKING 2026-09-19. **FIXED** in fork commit `27363b925` (BaseModal now wires the title `h5`'s id into the root's `aria-labelledby`, clearing every titled BaseModal), re-pinned here. Proven by `pnpm tab-review` on the 447 manifest: the modal-open captures (447-c/447-e) no longer report `aria-dialog-name`. See round 5. |
| A-r4-2  | Adversarial | defer       | `.scratch/carry-forward/issues/450-focus-walk-passes-when-unmeasured.md` — focus-walk passes green when it measures nothing; pick + enforce a contract                                                                                                                                                                                                                                                                                                                                                                         |
| A-r4-3  | Adversarial | defer       | `.scratch/carry-forward/issues/451-tab-review-green-on-empty-widths.md` — test-review.mjs reports captured/exit 0 on an entry with no widths                                                                                                                                                                                                                                                                                                                                                                                   |
| S-r4-1  | Standards   | wontfix     | `cssPath` inlined twice in `focusWalk` — both are page-eval string templates that can't share a JS helper across the boundary; contained to one function                                                                                                                                                                                                                                                                                                                                                                       |
| Sp-r4-1 | Spec        | wontfix     | Spec axis flagged item 14 (known-traps line) missing — VERIFIED PRESENT (known-traps.md:183-184, commit b004ab60); false positive, item 14 is faithful                                                                                                                                                                                                                                                                                                                                                                         |

Domain found no findings (see its section). Spec found no real gap (the one flagged item was a false positive, dispositioned above).

---

# Round 5 — the 449 merge-blocker fix

Main range: `04608efe..` (this session); fork `994fcb9f3..27363b925` (one commit).

Round 4's sole blocking finding (A-r4-1) is fixed. This round is not a fresh
four-axis pass — it is the record of that one fix and its proof.

**The defect.** Bootstrap marks the modal root `role="dialog" aria-modal="true"`
on show but never names it, so axe fired `aria-dialog-name` (serious) on the open
447 Sources popup. A visible `.modal-title` is not a programmatic name.

**The fix** (`vendor/tbc-new-fork/ui/core/components/base_modal.tsx`, fork
`27363b925`): when a modal carries a title, the title `h5` gets a unique id and
the root gets `aria-labelledby` pointing at it. This clears the violation for
every BaseModal with a title — the borrow-native fix ticket 449 preferred, not a
tab-local patch — so the gear picker's own FiltersMenu is covered too. Diff is
one file, +12/−1, no line-ending flip. Not a ported engine file (no PROVENANCE
row moved); nothing under `sim/`/`proto/` touched (sim-implemented-effects counts
unchanged at 221/451, only the embedded forkCommit moved).

**Proof — the ticket's own acceptance route.** `pnpm tab-review` on the same 447
manifest that surfaced the finding (states 447-c and 447-e open the modal): the
captured `a11y.json` for the modal-open states has **no `aria-dialog-name`**
(only the pre-existing baselined `select-name` on `#phase-selector`, ticket 445,
remains). The pre-fix capture had `aria-dialog-name:serious` on
`.upgrades-sources-modal` in exactly those states. `aria-dialog-name` is absent
from `data/wowsims-fork-a11y-baseline.json`, so it counted as a real violation,
not a masked one. `TAB_REVIEW_VERDICT` = captured, errors 0.

**Gates.** Desktop gate at `27363b925` (ret P5, all sources, cap 40): (a)–(h)
all pass, rowCount=40, eligibleCount=617, (h) matches `golden-ret-p5-cap40.json`
with no `--update-golden` — the a11y attribute moves no ranking. Layout gate
**SKIPPED** (digest `c5ada6377d6b` unchanged): its content digest covers the
tab's own layout source, not `base_modal.tsx`, so a shared-component edit does
not move `testedTabHash`; and it would not have exercised the modal's a11y anyway
(that closed-shell blind spot is ticket 450 — the modal-open proof is the
tab-review above, not the layout gate). `pnpm verify` rc=0 on the tip.

**Still open, not this fix (unchanged):** 450 (ratchet open-modal blind spot),
451 (tab-review green on empty widths), and the pre-existing a11y baseline debt
444/445/446. The owner-taste copy strings and the visual look of the two 438
controls remain the owner's call.

## Round 5 disposition

| ID     | Axis        | Disposition | Ticket / note                                                                                                                                                      |
| ------ | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A-r4-1 | Adversarial | fixed       | Fork `27363b925`: BaseModal names the dialog via `aria-labelledby`. `pnpm tab-review` 447-c/447-e a11y.json has no `aria-dialog-name`. The round-4 blocker clears. |

---

# Round 6 — the two gate-honesty gaps (450, 451)

Main range: this session; fork `27363b925..baf02292d` (one commit). Both were
round-4 deferrals: the gates reported green while measuring nothing. Not a fresh
review pass — the record of two fixes and their proof.

**450 — focus-walk unmeasured now FAILs.** The keyboard focus-walk returns
`unmeasured` when a synthetic Tab leaves focus on `body` (headless C23);
`a11yClassify` previously synthesised focus-miss FAILs only when the walk _was_
measured, so an environment (or a regression) that stops moving focus dropped the
operability guarantee to a silent WARN. `a11yClassify` (`test-tab-harness.mjs`)
now pushes a FAIL on `unmeasured`. **Contract chosen: (a) fail**, not (c)
document-as-best-effort — the 449 lesson is that a gate must not advertise a
guarantee it silently drops. Safe here because this repo's Playwright Chromium
does move focus: a direct `node test-layout.mjs` at `baf02292d` reported **0
focus miss at every width** (375/653/768/1280), `LAYOUT_GATE_VERDICT`
measured/a11yFailed:0, 53 assertions. A genuinely focus-incapable env crashes
before geometry and is a whole-gate SKIP on a separate path, so the hard FAIL
does not red unrelated merges. Unit-proven: `a11yClassify` returns 1 fail on
unmeasured, 0 on a clean measured walk, 1 on a real focus miss (unchanged), 0 on
the post-run no-walk call.

**451 — widthless manifest entry now errors.** `test-review.mjs` iterated
`entry.widths || []`, so an entry with no `widths` produced no capture, no error
row, `errorCount` 0, exit 0 — a green run with zero evidence for that ticket. It
now pushes an error row (exit 1) for any entry with empty effective widths.
Proven with a two-entry manifest (one valid at 1280, one widthless): `pnpm
tab-review` exits 1 and names the widthless entry in `index.json`, the valid
entry still capturing cleanly.

**Scope/gates.** Both edited files are gate tooling (`.mjs`), never imported by
the served bundle, not ported engine files (no PROVENANCE row moved), nothing
under `sim/`/`proto/` — sim-implemented-effects moved only its forkCommit (counts
221/451). The desktop gate was not re-run (the served ranking is byte-identical
to `27363b925`, where (h) matched golden with no `--update-golden`); the direct
layout-gate run above is the live gate exercise at this tip. `pnpm verify` rc=0.

## Round 6 disposition

| ID     | Axis        | Disposition | Ticket / note                                                                                                            |
| ------ | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| A-r4-2 | Adversarial | fixed       | Fork `baf02292d`: `a11yClassify` FAILs on an unmeasured focus-walk. Ticket 450 closed; env confirmed to measure focus.   |
| A-r4-3 | Adversarial | fixed       | Fork `baf02292d`: `test-review.mjs` errors (exit 1) on a widthless manifest entry. Ticket 451 closed; proven end-to-end. |

---

# Round 7 — the seeded a11y-baseline debt (444, 445, 446)

Main range: this session; fork `baf02292d..93f402bce` (one commit). These three
were pre-existing a11y violations seeded into the baseline at the start of the
arc (not new to 438), tracked as debt. Fixed now at the owner's ask, all
tab-side — no upstream widget edited.

- **444 (image-alt, was critical).** The result-row item icon takes `alt=""`.
  The item name follows as text in the same link, so the icon is decorative; an
  empty alt lets a screen reader skip it rather than read the icon URL.
- **446 (aria-progressbar-name, was serious).** The run progress bar gets an
  `aria-label` from a new `upgrades_tab.progress.aria_label` ("Ranking
  progress"). The stage text beside it changes each tick, so the bar needs a
  stable name of its own, not the changing label.
- **445 (select-name, was critical).** The phase `<select>` is rendered nameless
  by the shared upstream `EnumPicker`. This repo does not edit upstream widgets,
  so the tab sets `aria-label` on the select (from a new
  `upgrades_tab.settings.phase_label` = "Phase") after `makePhaseSelector` mounts
  it into the tab's own container. A tab-side workaround, not a widget change.

Two new locale keys, each mirrored in `schemas/translation.schema.json`
(properties + required); the fork's `test-locales.mjs` exits 0. Edited files are
the fork's own renderer + locale + schema — no ported engine file, no PROVENANCE
row moved, nothing under `sim/`/`proto/` (sim-implemented-effects moved only its
forkCommit, 221/451).

**Proof.** `check_layout_gate.py` ran (the digest moved — `upgrades_tab.tsx` and
`translation.json` are in it) and **passed 53 assertions, a11yFailed:0**,
advancing `testedTabHash` to `8384833d6672`. A dump run confirmed the three fixed
rules stopped firing (each printed a stale-baseline WARN under the old baseline);
their entries were removed from `data/wowsims-fork-a11y-baseline.json`, leaving
only the `color-contrast .btn-outline-danger` wontfix. A re-run against the
trimmed baseline reports **0 stale-baseline WARNs**, `a11yWarned:4` (the wontfix
at four widths). The desktop gate was not re-run — an aria attribute plus one new
locale string moves no ranking; the served output is byte-identical to
`27363b925`, where (h) matched golden. `pnpm verify` rc=0.

The a11y baseline now carries a single entry, the `color-contrast` wontfix
(inherited Bootstrap `.btn-outline-danger` theme colour on the dark background,
kept by the borrow-native-styling rule).

## Round 7 disposition

| ID    | Axis | Disposition | Ticket / note                                                                                              |
| ----- | ---- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| B-444 | a11y | fixed       | Fork `93f402bce`: item icon `alt=""` (decorative). Ticket 444 closed; baseline entry removed, gate clean.  |
| B-445 | a11y | fixed       | Fork `93f402bce`: phase `<select>` labelled tab-side after mount (no upstream edit). Ticket 445 closed.    |
| B-446 | a11y | fixed       | Fork `93f402bce`: progress bar `aria-label` "Ranking progress". Ticket 446 closed; baseline entry removed. |
