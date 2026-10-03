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

# Round 8 — owner-walkthrough tickets 453–466 (via stage-gate)

Reviewed range: `4723294d..0eccb290` (main); fork `93f402bce..af421fa5` (the
substantive diff — 4 fork commits: 7cc65f5 Batch-tab chrome + modal stacking,
8bc15cad Sim-sets-define-the-prune reshape, 85f0a545 mid-run table + live fixes,
af421fa5 layout-gate regressions). Landed through the `stage-gate` pipeline
(brief → plan → adversarial plan-review → fresh-context executor → Gate C);
artifacts in `.scratch/stage-gate/upgrades-tab-walkthrough-453-466/`. Four review
axes ran fresh (adversarial, domain, standards, spec), Opus, in parallel.

## Adversarial

**Sound to merge — no correctness bug, no silent-failure mode, no test theatre.**
The two most-scrutinised changes both hold under a concrete trace:

- `effectivePool` reshape (`upgrades_tab.tsx:1462`) — new filter
  `pool.filter(sourceKept ∧ (¬pruned ∨ selected.has(itemId)))`. `selected` is
  `guaranteedItemIds()` (a `Set<number>`); `itemId` is a number everywhere, so no
  vacuous match. The empty-set branch is unreachable (`pruneEffective()` is false
  when the toggle is `d-none`, and the toggle is hidden when the selection is
  empty). Default run (no source excluded, prune off) is byte-identical to before.
  Row-tagging survives the union removal.
- Disable gate `done && !stale` (`:1658`) can't get stuck — `setState` always
  `render()`s; the iterations/candidates pickers `emit(settingsChangedEmitter)`
  and the new stale listener flips `done→stale` and re-renders. `stopped`/`error`
  are never `done && !stale`, so re-run stays live. No lock-out.
- Stopped-run elapsed removal correct; hidden Candidates changes no read path;
  colgroup/`table-layout:fixed` scoped to the provisional table only; no dangling
  reference to the removed `sets_caption`/`sets_cap_note`/`refreshSetsCaption`.

All six findings wontfix (checked, not defects).

## Domain

**Domain-sound to merge — no game-fact contradictions.**

- Phase-3 default (`CURRENT_PHASE = Phase.Phase3`) matches `data/wowsims.lock.json`
  `currentPhase: 3` / `defaultMaxPhase: 3` — the tab reads the pinned content
  tier, does not re-derive it.
- The set-bonus inline shows only thresholds with a real DPS effect body in the
  pinned sim (`nextMeasurableThreshold` filters against `IMPLEMENTED_IN_SIM`), so
  it never misattributes an unimplemented bonus; the higher reachable threshold is
  disclosed in the tooltip. Domain-honest.
- Removing the old force-include union drops nothing the ranker should see by
  default (prune applies only with a set selected and the toggle ticked).
- Description copy accurately describes single-swap-vs-current ranking in TBC terms.

All findings wontfix (checked, fine); one minor with no domain risk (remaining
strings assert no game fact).

## Standards + Spec

**Standards: no hard violations.** No fork coding-standards doc; applied project
AGENTS.md/CLAUDE.md + the Fowler smell baseline. Every new comment checked is
load-bearing (WHY, not WHAT). One writing-style judgement call: the
`upgrades_tab.description` string used "Rows land as each sim finishes" — "land"
is on the AGENTS.md banned-vocabulary list, and the rule covers user-facing
strings. One latent-duplication note (the inline `?upgrades-dev` URL-param gate;
extract only on a second occurrence — not actionable now).

**Spec: clean.** All 14 tickets close with code matching their Resolution lines —
no missing acceptance, no wrong implementation, no unauthorized scope. Notes: 464
also reworded `set_bonus.total_inline` (a harmless consistency fix beyond the
ticket's named `inline` key); 456's "phase picker" is delivered as the existing
Phase picker + the always-include-union removal (feature reshape, not new picking
UI) — the owner decision explicitly endorsed that reading.

## Summary

Adversarial 6 findings (all wontfix), Domain ~5 (all wontfix/minor), Standards 1
writing-style judgement call + 1 latent-dup note, Spec clean. Worst within each
axis: Adversarial — the `effectivePool` reshape (traced, sound); Standards — the
"Rows land" banned verb. Nothing blocking. The one actionable item (the banned
verb) was fixed in-branch (see Disposition).

The stage's one honest residual is carried from Gate C, not a review finding: the
desktop-gate byte-compare (plan Step 7) could not run on this Windows host (Unix
`make wowsimtbc` tooling; the recurring stray-binary trap is ticket 434). The
"golden unmoved" conclusion is source+live reasoning (with prune off and no source
excluded, old and new `effectivePool` both reduce to `pool.filter(sourceKept)`),
independently corroborated by the plan-reviewer — but it is reasoning, not the
gate's own measurement.

## Round 8 disposition

| ID      | Axis            | Disposition | Ticket / note                                                                                                                                                                                                                   |
| ------- | --------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A8-1    | Adversarial     | wontfix     | `effectivePool` reshape — traced sound; empty-set branch unreachable, default run byte-identical.                                                                                                                               |
| A8-2    | Adversarial     | wontfix     | `done && !stale` disable gate — stale listener re-enables; stopped/error never match, no lock-out.                                                                                                                              |
| A8-3..6 | Adversarial     | wontfix     | Stopped elapsed / hidden Candidates / colgroup scope / removed-locale refs — all checked clean.                                                                                                                                 |
| D8-1    | Domain          | wontfix     | Phase-3 default matches the pinned content tier; not re-derived.                                                                                                                                                                |
| D8-2    | Domain          | wontfix     | Set-bonus inline shows only sim-implemented thresholds; higher disclosed in tooltip. Honest.                                                                                                                                    |
| D8-3    | Domain          | wontfix     | Union removal drops no default-visible BiS; description copy domain-accurate.                                                                                                                                                   |
| S8-1    | Standards       | fixed       | `upgrades_tab.description` "Rows land" → "Each row appears as its sim finishes" (banned "land" verb). Fork `e30bed8fa`, re-pinned. Value-only locale, no schema/ranking change.                                                 |
| S8-2    | Standards       | wontfix     | Inline `?upgrades-dev` URL-param gate — single occurrence; extract only on a second. Not actionable.                                                                                                                            |
| SP8-1   | Spec            | wontfix     | 464 also reworded `total_inline` (consistency); 456 "phase picker" = existing picker + union removal (owner-endorsed). Acceptance met.                                                                                          |
| G-1     | Gate C residual | defer       | Desktop-gate byte-compare (Step 7) unverified on this Windows host — ticket 434 (stray binary) + Unix build tooling. "Golden unmoved" is source+live reasoning, not the gate's measurement. Needs a Unix-capable host to close. |

## Round 8 follow-up — description placement + copy (owner walkthrough)

Owner reported the pre-run description sat in the wrong spot vs the Batch tab and
wanted Batch's simpler copy with a "please report" line. Fixed on
`feat/tab-signoff-followups` (fork `e30bed8f..6b811de3`, three re-pins
`8fd631fb`→`2adf2547`→`b7d4443a`):

- **Copy** now mirrors `bulk_tab.description`'s shape — bold name, one sentence of
  what the tab does, then the Alpha/"please report it!" line.
- **Placement**: `.upgrades-description` spans `grid-column: 1 / -1` so it fills the
  panel width across the native multi-track grid, matching Batch's description
  position (live: full 634px panel width, two-track grid intact).

**Caught regression (process note).** The first attempt collapsed the panel grid
to one track (`grid-template-columns: auto`) to fix the sliver. That passed
`pnpm verify` (rc=0) but broke the layout gate, which `pnpm verify` does not run —
the gate only runs under `pnpm merge-to-dev`. The orchestrator ran
`pnpm merge-to-dev --check-only` independently and caught 1 layout failure
(view-controls-host span dropped — the escape hatch ticket 326 hardened) plus 4
keyboard focus-walk a11y failures, both from the single-track collapse +
`grid-column: 1` reshuffle. The fix reverted the collapse and spanned the
description instead. Final verdict:
`LAYOUT_GATE_VERDICT {"outcome":"measured","passed":53,"failed":0,"a11yFailed":0,"a11yWarned":4}`
(the 4 warns are the pre-existing `.btn-outline-danger` contrast wontfix). The
focus-walk failures were present only in the broken single-track state and are
gone with its reversion. Lesson reinforced: for a gated visual change, the
acceptance is the gate, not `pnpm verify`.

# Round 9 — 467 net set-bonus engine + owner UI pass 468–475 (tickets and commits call this "round 6")

Reviewed range: `0eccb290..7c54848f` (main); fork `af421fa5..7965a7d8` (the
substantive diff — 21 fork commits: 467 net set-bonus value in the engine
(a30920410, 994d5a7b9) with `packages/core/test/fork-set-net.test.ts`; the
Upgrades description rewrites; UI fixes 468–471; 472 rows restyled after the
Gear-tab item list via the `upgrades-rowstyle` stage-gate (six commits,
shared `item_toggles.tsx` + `_item_row.scss`); 473 a11y baseline `match: css`;
474 name-over-tags; 475 Set credit control removed; locale schema fix).
Fixes for this round landed after dispatch at fork `7c001b365` / main
`bd51853d` and belong to the next round's window.

Dispatch: four fresh Opus (effort medium) subagents — adversarial and domain
on the `.agents/reviews/` briefs, standards and spec via the `code-review`
skill. No `codex` binary on PATH. Every axis wrote nothing; both trees were
clean at dispatch.

## Adversarial

Nothing blocking. Two material engine findings in the 467 net-value math:
A1 — a `commitBreaks` entry with no measured `dps` is skipped while the
fallback checks only `futureBonuses`, so the row keeps the gain and loses
nothing; A2 — `brokenSetBonuses` reports only the highest lost threshold per
set, so a tier swap that breaks a worn 4pc _and_ its 2pc never subtracts the
2pc (the full T4-4pc → T5-4pc case). Minor: A3 divergent-slot 2pc/4pc
correction and first-pool-slot-per-item; A4 the removed `advancesPieceCount`
guard; A5 the new test is `describe.skipIf(!forkPresent)` and the fork is
gitignored, so CI never runs it. Clean: vacate-sim `B` algebra, toggle module
(WeakMap keyed on buttons, one tab-level subscription, fresh `getFilters`),
Gear-list parity (only `aria-label` + `data-item-toggle` added), css-match
baseline cannot hide other elements, i18n removals unreferenced, positional
`td[0..4]` readback intact, 7-column colgroup sums to 100%, pinned `'full'`
credit equals the old default.

## Domain

D1 = A2 (same root cause, independently derived: at worn=4 the measured 2pc
`B` comes out as B2 − 2·B4, at worn=5 as B2 + B4). D2 with `'full'` credit
row values are not additive across a shortlist (each piece carries the whole
2pc+4pc) — acceptable as a sort key, must be documented. D3 = A4. D4 tooltip
"{pc} ({have}/{pc})" counts pieces worn _before_ the hovered piece, which a
TBC player will misread. D5 `tip_activates_included` passes
`piecesAfterSwap` as the threshold number (equal only for the +1 step).
Clean: inflation correction signs, no double subtraction of a row's own
break, crossing pieces not credited twice, noise floor, cutoff.ts
comment-only, no WCL facts touched.

## Standards + Spec

**Standards:** hard — the banned verb "carries" in three `rank.ts` comments
and one SCSS comment; a comment on `createFavoriteToggle` describing an
`initial` parameter the function never reads; one comment restating the
`candidateSlotIndex` doc comment. Judgement — unused `_sim`/`_bt` params on
`refreshToggles`; the `subscribe` boolean flag; duplicated repaint sequence
in the two `refresh` closures; `FavoriteKey.method` widened through
`as never`. No untested causal claims found in comments.

**Spec:** nothing blocking. S1 three dead locale keys (`tip_total_full`,
`tip_total_split`, `ranked_marker`) survived 475's cleanup. S2 ticket 467 is
still open with its engine work shipped and no closing check recorded. S3
horizontal scroll now at every width (not asked). S4 Gear list gained
`aria-label`s. S5 dead `void setCredit;` and the unused `initial`. S6 the 473
baseline covers `.text-epic` only (hypothesis). Passed: keep rank order,
aria-labels, batch hidden when `bt` absent, 475 ranking math unchanged, 474
stacked layout in both tables.

## Summary

The UI pass (468–475) is sound: the Gear list is byte-identical in capture
and behaviourally unchanged, the shared toggle and row-style code holds, and
every gate is green (verify rc=0, layout 53/0/0, desktop gate golden
unchanged, live-verified on :5173). The material findings are all in the 467
net set-bonus engine math that landed earlier in this window and had not
been reviewed: a multi-threshold break undercounts the loss (476) and an
unmeasured commit break credits gain only (477). Both change the sort key
for the tier-swap case and need the PROVENANCE cycle plus test fixtures, so
they are tickets, not in-branch fixes. Tidy items were fixed in-branch.

## Disposition

| ID                  | Axis                | Disposition | Ticket / note                                                                                                                                                                                                                                                                                       |
| ------------------- | ------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1                  | Adversarial         | fixed       | Fork `371da7dce`, main `7f4b98af`: a commit break without a measured B zeroes the row's credit, and every shown commit break is a B target (477 closed; fixtures 477-P, 477-T). Superseded in round 2 of upgrades-tab-closeout.                                                                     |
| A2 / D1             | Adversarial, Domain | fixed       | Fork `371da7dce`, main `7f4b98af`: every lost threshold reported and each B solved from the higher ones (476 closed; fixtures 476-A, 476-B). Superseded in round 2 of upgrades-tab-closeout.                                                                                                        |
| A3, A4 / D3, A5, D2 | Adversarial, Domain | fixed       | Fork `371da7dce`, main `7f4b98af`/`9d0a8575`: inflation sign fixed (`netInflation`), key union unreachable today and unit-tested, ring/trinket wontfix pinned by A3-R, owned-row guard restored (A4), CI gap in known-traps, ADR-0034 (478 closed). Superseded in round 2 of upgrades-tab-closeout. |
| D4, D5              | Domain              | fixed       | Fork `2cb7da932` (activates line) and `f6355d529` (count = pieces worn before the swap, on the owner's answer), main `f72f1a6b`: 479 closed. Superseded in round 2b of upgrades-tab-closeout.                                                                                                       |
| S1                  | Spec                | fixed       | Fork `7c001b365`: the three dead keys removed from translation.json and its schema; `test-locales.mjs` rc=0.                                                                                                                                                                                        |
| S2                  | Spec                | defer       | `.scratch/carry-forward/issues/467-set-bonus-ranking-hides-net-value.md` (left open; round-9 comment points at 476–479; owner's live check still unrecorded)                                                                                                                                        |
| S3                  | Spec                | wontfix     | The 7-column table is wider than its ~606 px host at 1280; the layout gate's own assertion 7b requires scroll, not clip. Owner told in 472's Comments.                                                                                                                                              |
| S4                  | Spec                | wontfix     | `aria-label` on the Gear list's two buttons is the 472 brief's a11y constraint applied to the shared module; capture byte-identical.                                                                                                                                                                |
| S5                  | Spec                | fixed       | Fork `7c001b365`: `void setCredit;` removed, `initial` option removed from `createFavoriteToggle` and both callers.                                                                                                                                                                                 |
| S6                  | Spec                | fixed       | Main `8eb098d57`: rare (#0070dd, 3.26:1 / 3.65:1 on the zebra rows) baselined as `.upgrades-item-name.text-rare` (css); legendary/junk/uncommon/common pass 4.5:1. See ticket 480.                                                                                                                  |
| ST1                 | Standards           | fixed       | Fork `7c001b365`: "carries" → "includes"/"has" in rank.ts (PROVENANCE row updated, E-W3 green) and `_upgrades_tab.scss`.                                                                                                                                                                            |
| ST2                 | Standards           | fixed       | Fork `7c001b365`: the `initial` comment/parameter and the duplicate `candidateSlotIndex` comment removed; unused `_sim`/`_bt` params dropped from `refreshToggles`.                                                                                                                                 |
| ST3                 | Standards           | wontfix     | `subscribe` flag and the two `refresh` closures stay: the Gear list subscribes per row by design (parity) and the Upgrades tab must not; a shared `paint()` helper is a judgement call not worth a PROVENANCE-free churn commit now.                                                                |
| ST4                 | Standards           | wontfix     | `FavoriteKey.method: keyof DatabaseFilters` mirrors the Gear picker's five favourite arrays; narrowing it would fork the two callers' types.                                                                                                                                                        |

# Targeted engine review (2026-09-25) — not a full round

Reviewed range: `5d84ffff9..7ed8c9941` (fork, engine/** only); main `a40588ae..7c2f84ff` (fork-set-net.test.ts, ADR-0034 only)

Round 10's full window (main `7c54848f..`, fork `7965a7d8..`) is still owed;
this section covers only the set-bonus engine files, their test and ADR-0034.

The fork range holds three engine commits: `371da7dce` (tickets 476–478),
`7b7f2da28` (490–492) and `7ed8c9941` (comment-only). The three axis reports
are in `.scratch/stage-gate/upgrades-tab-closeout/engine-review/`
(`adversarial.md`, `domain.md`, `standards-spec.md`). That folder is
gitignored, so each section below states the findings in full enough to
act on.

## Adversarial

One blocking finding and one material. **A1:** the ticket-492 pair sim
checked that each piece was break-free alone but not that the two were
break-free together. With a worn Malorne 3, two pieces that each leave it at
2 take it to 1 as a pair. That break then lands in `B2`, and every
Thunderheart row was credited 120 where the model gives 40. **A2:** when no
usable pair existed, or the pair sim or its gem repair failed, the
confounded `raw4 = B4 − (n−1)·B2` became `bonusDpsNet` and was credited, with
nothing to show it. Minor: **A3**, two `rank.ts` doc comments no longer
matched the code. **A4**, no test reached `dependent-unmeasured`, the
`full-path` branch never ran, the test copied `RULE_490`, and A3-U works out
its expected value with the code's own formula. **A5**, ADR-0034 called
`commitPackageDeltaDps` the package total and said the other rule was "one
constant" away. Checked by hand and correct: the `B_t` solve, the
`netInflation` sign, and fixtures 476-A, 476-B and 492-F.

## Domain

Three material findings and two minor. **D1:** the ret set credit counts
bonuses that cannot add ret DPS: the Crystalforge 4pc is a party heal, and
the Justicar 4pc affects only Judgement of Command, which the default ret
rotation never casts. Scenarios H and I still credit them +9.5 to +21.1. The
likely cause (hypothesis) is that the floor is a single-sim cutoff while a
net is a difference of five or more sims. **D2:** "stop where it pays" leaves
out the other path pieces' own stat cost: scenario D credits +108 per
Malorne row against a +8.5 end state. **D3:** breaks model only six tier
sets at 2pc and 4pc. Pre-raid feral Wastewalker 4pc and ret Burning Rage 2pc
are never charged, and `SetThreshold = 2 | 4` cannot hold a 3pc. **D4:** the
Justicar 2pc does have an effect body (`sim/paladin/seals.go:553`, also at
pin `8aa378b3`), which the table comments denied. **D5:** test A3-R hard-coded
the implemented-set list.

## Standards + Spec

**Standards:** seven findings. **S1** (material): the committed test cited
derivations in gitignored `round-2*/plan.md`. **S2:** ADR-0034 did not say
that CI skips the fixture suite. **S3:** the `full-path` branch never ran.
**S4:** stale "today" wording in the tests. **S5:** the `7ed8c9941` commit
body was unwrapped, and no fork-gated run was recorded for it. **S6:**
optional cleanup (a duplicated derivation and comparator, inline keys,
unused `InflationKey` fields, the ticket-named `RULE_490`, a dangling
header line). **S7:** A3-R hard-coded the set list, the same point as D5.
PROVENANCE hashes and labels were clean at `7ed8c9941`.

**Spec:** six findings. **P1** is A1, found independently as a hypothesis.
**P2:** 477's closing comment still gave the legs credit as 90 and did not
link 491. **P3:** 491 item 2 is met only at the key level. **P4:**
ADR-0034 did not say that an unmeasured commit break still zeroes the
credit. **P5:** 490 did not record the wording fix. **P6:** 478's
one-piece-per-slot claim had no re-runnable command. All six tickets'
close items were otherwise delivered.

## Summary

A1/P1 and A2 are fixed in fork `2cf4ec46e`, re-pinned in main `5c4b8002`,
with red-first fixtures 492-J and 492-N. The derivations are now tracked in
`docs/set-bonus-fixture-derivations.md`. D1, D3 and S6 are new tickets 511,
512 and 513. D2 and P3 are comments on open tickets 502 and 494. Checks at
main `5c4b8002`: `npx vitest run packages/core/test/fork-set-net.test.ts
packages/core/test/wowsims-fork-parity.test.ts` rc=0 (25 passed, 1 skipped);
`pnpm verify` rc=0; layout gate
`{"outcome":"measured","passed":121,"failed":0,"a11yFailed":0}`. CI skips the
fork-gated suites, so the local rc is the evidence.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                     |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | Fork `2cf4ec46e`, main `5c4b8002`: the 492 pair must be break-free alone and together. Fixture 492-J: red `selfConfound` 90, net 160, row credit 120; green 50, 80, 40.                                                                                                                                                                           |
| A2  | Adversarial | fixed       | Fork `2cf4ec46e`, main `5c4b8002`: with no usable pair, or a failed pair sim or repair, `bonusDpsNet` stays unset and the row shows `not_counted`. Fixture 492-N: red net −20. No `packageSimSkips` note: its text says the package sim failed, which is false here; `selfConfound` without `dps` is the record.                                  |
| A3  | Adversarial | fixed       | Fork `2cf4ec46e`: the `bonusDps` and `bonusDpsNet` doc comments, plus `measurePairTwoPiece` and `SelfSetConfound.dps`, now match the code.                                                                                                                                                                                                        |
| A4  | Adversarial | fixed       | Main `5c4b8002`: fixture 476-D reaches `dependent-unmeasured`; 490-B reads `RULE_490` from `view.ts` and calls `setPotentialCredit` under both rules. The A3-U tautology is listed in `.scratch/carry-forward/issues/513-set-engine-optional-cleanup.md`.                                                                                         |
| A5  | Adversarial | fixed       | Main `5c4b8002`: ADR-0034 calls `commitPackageDeltaDps` the gross package delta (420 in 476-A, not the net 90) and says `setPotentialCredit` implements both rules, selected by `RULE_490`.                                                                                                                                                       |
| D1  | Domain      | fixed       | Ticket 511 (`.scratch/carry-forward/issues/511-ret-set-credit-counts-bonuses-with-no-ret-dps.md`) closed at main `d119fc82`: ret set credit now comes from same-gear sims (ADR-0035). Reviewed in round 10.                                                                                                                                       |
| D2  | Domain      | fixed       | Ticket 502 (`.scratch/carry-forward/issues/502-scenario-d-tier4-outranks-new-tier-staff.md`) closed at main `e76799a9` with the owner's other-pieces rule (fork `ebd38a6ae` counts path pieces' own stats); set rows are now valued by simmed gear (ADR-0035). Reviewed in round 10.                                                              |
| D3  | Domain      | fixed       | Ticket 512 (`.scratch/carry-forward/issues/512-set-breaks-model-only-six-tier-sets.md`) closed at main `d119fc82`: breaks come from the worn-set ladder with no set table (ADR-0035). Reviewed in round 10.                                                                                                                                       |
| D4  | Domain      | fixed       | Fork `2cf4ec46e` (fork table comment), main `5c4b8002` (core table comment and a `verification.md` V1 note): the effect body at `seals.go:553` is named; the value stays `false`.                                                                                                                                                                 |
| D5  | Domain      | fixed       | Fork `2cf4ec46e` exports `IMPLEMENTED_SET_IDS`; main `5c4b8002` A3-R reads it and asserts the list is not empty.                                                                                                                                                                                                                                  |
| S1  | Standards   | fixed       | Main `5c4b8002`: derivations moved to `docs/set-bonus-fixture-derivations.md`; the test comments point there.                                                                                                                                                                                                                                     |
| S2  | Standards   | fixed       | Main `5c4b8002`: ADR-0034 says CI skips the suite, gives the local command, and corrects "one constant away".                                                                                                                                                                                                                                     |
| S3  | Standards   | fixed       | Main `5c4b8002`: 490-B asserts `setPotentialCredit` under `"full-path"` (20, −22.5) and `"best-stop"` (40, 20), with `RULE_490` imported.                                                                                                                                                                                                         |
| S4  | Standards   | fixed       | Main `5c4b8002`: "Today's sign" became "the pre-476 correction", `TODAY_492_RUNS` became `PRE_FIX_492_RUNS`, and case 8's title lost "today's".                                                                                                                                                                                                   |
| S5  | Standards   | fixed       | Main `8807b620`: ticket 490 records the fork-gated run at `7ed8c9941` (rc=0, 22 passed, 1 skipped). The unwrapped commit body stays; commits are not amended.                                                                                                                                                                                     |
| S6  | Standards   | defer       | `.scratch/carry-forward/issues/513-set-engine-optional-cleanup.md` — optional cleanup.                                                                                                                                                                                                                                                            |
| S7  | Standards   | fixed       | Same change as D5: fork `2cf4ec46e`, main `5c4b8002`.                                                                                                                                                                                                                                                                                             |
| P1  | Spec        | fixed       | Same fix as A1: fork `2cf4ec46e`, main `5c4b8002`, fixture 492-J.                                                                                                                                                                                                                                                                                 |
| P2  | Spec        | fixed       | Main `8807b620`: comment on 477 (legs credit 130 since 490; 491 closed the display gap).                                                                                                                                                                                                                                                          |
| P3  | Spec        | wontfix     | Ticket 494 (`.scratch/carry-forward/issues/494-set-bonus-tooltip-lines-lack-set-and-meaning.md`) closed at main `0b75903d` and its closing comment records P3 as not done. The 494 redo dropped 491's distinct "not counted" text with the owner's confirmed copy (round 10, P6), so a rendered-text test of that text has nothing left to check. |
| P4  | Spec        | fixed       | Main `5c4b8002`: ADR-0034 says an unmeasured commit break still zeroes the credit.                                                                                                                                                                                                                                                                |
| P5  | Spec        | fixed       | Main `8807b620`: comment on 490 recording the `7ed8c9941` wording fix.                                                                                                                                                                                                                                                                            |
| P6  | Spec        | fixed       | Main `8807b620`: comment on 478 with a `node -e` check over `db.json` (`pairs 36 dups 0`, rc=0).                                                                                                                                                                                                                                                  |

# Round 10 — the owed window: polish 481–489, set engine 490–502, tab fixtures 504/520, consumables 522, set credit 511/512

Reviewed range: `7c54848f7a6e9799c295ad8839d870db32267eb1..fbd2e3dfb5d74a0d6ef535b1730ceedd35abafa2` (main); fork `7965a7d8482d1cd9c4a561882e1f5b14106544ff..f09d218ed4e9afc2d1a1350f3b67572c33b5cd0b`

This round covers the whole window the targeted engine review left owed
(its own note: "Round 10's full window (main `7c54848f..`, fork
`7965a7d8..`) is still owed"). Main holds 150 commits, 132 of them this
branch's own (`git log --no-merges --oneline 7c54848f..fbd2e3df ^dev`);
the two `dev` merges (6f598de8, 59fb2e4b) were left out by diffing
against tree `85120dd353e561b46540346e6ee3c39e2152a281`
(`git merge-tree --write-tree 7c54848f a744c2ec`). Its own change is 33
code and doc files (about 9k lines) plus recorded fixture and measurement
JSON, which the axes spot-checked only. The fork window is 44 commits, 28
files, +5561/−885.

Dispatch: four fresh `general-task` agents on Opus (effort high) —
adversarial and domain on the `.agents/reviews/` briefs, standards and
spec via the `code-review` skill. No `codex` binary on PATH. Every axis
was told it writes nothing; each reported the same dirty state (five
untracked owner handoffs and this file's round header) and a clean fork
at `f09d218e`. The spec axis ran
`npx vitest run packages/core/test/fork-set-net.test.ts packages/core/test/fork-set-fixtures.test.ts packages/core/test/fork-sim-database.test.ts packages/core/test/wowsims-fork-parity.test.ts`
under Node 22.17.1: rc=0, 89 passed, 1 skipped, 20.7 s.

## Adversarial

Nothing blocking. Every failure traced in the set-credit path either
keeps the set or marks the row not counted; no path shows a wrong number
with no warning. Material: **A1** `scripts/check_layout_gate.py` about
lines 714-727 — with `data/tab-fixtures/feral-p3-p2bis.json` missing,
the gate prints "the post-run checks are skipped", passes and still calls
`write_baseline(digest)`; it also drops `check_fixture`'s readable flag,
so a fixture marked ERROR does not stop a green run; and
`check_tab_fixtures.py` exits 0 on zero fixtures. **A2** (known item K-a)
— the `beforeAll` in `packages/core/test/fork-sim-database.test.ts`
(line 169) has no timeout argument and `vitest.config.ts:30` sets only
`testTimeout`, so the hook gets vitest's default 10 s for a 3.1 MB
`db.json` parse plus proto transforms (about 3.3 s idle). **A3** — a set
the screen drops gives its rows no future and no sub-line, with no
"screened" wording anywhere; ADR-0035 accepts this as limit (i). Minor:
**A4** Stop is not checked anywhere in the set phase (fork `rank.ts`
reads `signal` before `buildSetBonuses` only). **A5** the same-gear
gate's `se = √(on.se² + off.se²)` ignores the shared seed and overstates
the noise; it errs toward no credit. **A6** `pairedSe` is only tested
with zero spread (record mode). **A7** two checks in
`fork-sim-database.test.ts` cannot fail. **A8** the layout-gate digest
leaves out `upgrades/adapters/fixture.ts`, `upgrades/data/` and
`vite.config.mts`. Known items: **K-b** minor (the lock is written only
on a green run with a changed digest; CI never writes it, because
`run_verify.mjs` passes `--preview-skip`); **K-c** cosmetic (the marker
is text, `tip_figure_marker`); **K-d** not a defect on the shipped path
(the tab always sets `measureBrokenSetValue: true`, and step credit reads
no package-minus-singles figure). Checked clean: copies with unknown ids
panic in Go rather than become empty items; failed screen readings keep
the set; a failed ladder rung still counts as a break; the ranking cache
key includes `partnerRule` and `setScreen`; fixture code and check hooks
compile only under `__TBC_TAB_FIXTURES__`.

## Domain

No blocking findings. Every set-bonus and hit-cap fact checked matches
the Go sim at fork `f09d218e`: Justicar 4pc affects only Judgement of
Command and the default ret APL never judges Command
(`sim/paladin/item_sets.go:13-28`,
`ui/paladin/retribution/apls/default.apl.json`); Crystalforge 4pc is a
party heal; Lightbringer 4pc's Hammer of Wrath is never cast; the hit cap
(8% base, 1% suppression, Improved Faerie Fire 3%) and whole-point
expertise; Burning Rage needs Blacksmithing; Go matches sets by id then
name, which makes set-less copies work. Minor: **D1** the core/CLI path
still credits Justicar 4pc and Crystalforge 4pc by "package minus
singles" (`packages/core/src/set-value.ts:53-54`, `view.ts`,
`rank-report.ts`), and ticket 514's close condition does not say whether
that path is in scope. **D2** the popover shows one lost bonus at −96.3
and −59.1 without naming the gear (the SME caveat in ticket 511, lines
125-127). **D3** meta-gem repair may put hit gems on hit-capped set gear
(hypothesis, untested). K-c has no domain angle.

## Standards + Spec

**Standards:** no code breaks a written repo rule, and all 36 PROVENANCE
rows hash-match the fork files at `f09d218e`. Hard, writing style only:
**ST1** commit messages with subjects over 50 characters (21 main, 9
fork), unwrapped bodies, and bodies over six lines; **ST2** banned words
in commit messages; **ST3** banned words ("carries", "lands"/"landed",
"shapes") in new comments and docs — 17 added lines in the fork diff,
more in `docs/set-bonus-fixture-derivations.md`, ADR-0034,
`fork-sim-database.test.ts` and tickets 520-532. Judgement: **ST4** fork
comments in `partner-choice.ts` (lines 13, 74) and `set-screen.ts`
(lines 6, 61, 401) cite the gitignored stage folder as their source
without saying it is gitignored; **ST5** `docs/agents/known-traps.md`
"Fork-gated suites never run in CI" names two suites, and this branch
adds two more; **ST6** the committed layout lock's `_comment` no longer
matches what `write_baseline` writes, and its hash (`76c5e508…`) differs
from the current digest (`607b6a56…`), so `pnpm merge-to-dev` will run
the full gate; **ST7** the `partner-choice.ts` PROVENANCE row opens with
the old provisional rule name; **ST8** duplicated test helpers and
constants; **ST9** fork `rank.ts` is 3942 lines; **ST10** the same
`stepRanking` branch at six sites; **ST11** partner rules and screen
modes kept for scoring and dev hooks only; **ST12** `upgrades_tab.tsx`
retells the ticket 312 → 486 history three times and keeps a process note
("Confirmed no test asserts on the removed heading", line 2872). K-b is
documented design; K-c is not a breach (the marker is text, and
`docs/ui-tooltip-table-conventions.md:258` says colour is never the only
sign).

**Spec:** every closing item of tickets 511 and 512 holds at the tips.
All 45 case ids named in 511, 512 and the plan appear in passing test
titles and in `docs/set-bonus-fixture-derivations.md`; no set table came
back into the fork engine
(`git diff 063600a3 HEAD -- <engine>/set-value.ts` adds no
`IMPLEMENTED_IN_SIM` entry); the ret fixture
`data/tab-fixtures/ret-p3-p2.json` gives no ret row step credit; the
owner's decisions are reflected in ADR-0035. No scope creep. The 27 other
tickets closed in the window each meet their closing items or were
changed by a later owner decision (479, 494, 502). Findings: **P1** most
of 511/512's measurement evidence is in the gitignored stage folder,
which ADR-0035 lines 37-53 states; **P2** ticket 514's missing reading
was ruled out by the orchestrator, not the owner; **P3** (known item
K-c) no spec asks for a marker colour (`plan-k6b-patch.md:511` puts it
out of scope; ADR-0035:615 records it), and no gate-visual pass has
judged the separate-outcomes layout on a real row; **P4** = D2; **P5** =
A2 (522's closing evidence and 511/512's test command include that
file); **P6** both `set_bonus.hover_hint` and `set_bonus.not_counted`
read "set detail", so ticket 491's distinction no longer shows; **P7**
some closed tickets quote old literals in dated comments (476, 477, 490,
480), and ticket 520's body still says "Open until the owner rules".

## Summary

Nothing blocks a merge on correctness, domain facts or spec. Tickets 511
and 512 meet their closing items, the set tests pass (89 passed, 1
skipped), and PROVENANCE is clean. The findings worth acting on are small
and are proposed as inline fixes (rows marked `pending` below): the 522
test hook's timeout (A2, the known flake), the layout gate passing
without its fixture checks (A1) and its digest gaps (A8), a stale
known-traps entry (ST5), ticket 520's stale body line (P7), and one fork
tidy commit for banned words, gitignored-source citations, a PROVENANCE
wording slip and two comment-policy breaches (ST3, ST4, ST7, ST12). Three
real follow-ups are new tickets: Stop during the set phase (533), the
popover not naming the gear of a Breaks figure (534), and possible dead
hit gems from meta repair (535). D1/P2 are a comment on ticket 514, and
the optional test and smell items are a comment on ticket 513. Each
`pending` row becomes `fixed` when its fix is applied, or `wontfix` when
it is dropped; until then `pnpm merge-to-dev --check-only` refuses this
file.

This round also re-disposed four targeted-review rows whose defer tickets
have since closed (D1 → 511, D2 → 502, D3 → 512 as `fixed`; P3 → 494 as
`wontfix`), because the check refuses a `defer` row that links a closed
ticket.

## Disposition

| ID                  | Axis                         | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------- | ---------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1                  | Adversarial                  | fixed       | Main `927a1b64` (PF2): the layout gate returns 1, before `run_gate` and `write_baseline`, when its tab fixture is missing or unreadable, and `check_tab_fixtures.py` returns 1 on zero fixtures when the fork is present. Caller check: `merge_to_dev.py` dies on a nonzero `check_layout_gate.run()`; `pnpm verify` runs the gate only as `--preview-skip`, which never reaches the new returns; with the fork absent (CI) both scripts skip with 0 before them. |
| A2 / P5             | Adversarial, Spec            | fixed       | Main `927a1b64` (PF1): `beforeAll(..., 30_000)` in `fork-sim-database.test.ts`, as `bulk-boundary.test.ts:115` does. This is known item K-a.                                                                                                                                                                                                                                                                                                                      |
| A3                  | Adversarial                  | wontfix     | ADR-0035 accepts screened-out sets showing no Set potential as its limit (i); a screened-out set's rows keep their breaks and crossing.                                                                                                                                                                                                                                                                                                                           |
| A4                  | Adversarial                  | fixed       | Fork `74db453ff`, `84c841cf8`, `105a6f38e`, `26a89e58d`, re-pinned in main `a489955e` (ticket 533 closed): a Stop during the set phase or paired replication sends no further sim and returns the same `PartialRanking` as a Stop during the last candidate sim. Tests 533-S/W, 533-R and 533-K in `fork-set-net.test.ts`.                                                                                                                                        |
| A5                  | Adversarial                  | wontfix     | The overstated `se` makes the same-gear gate stricter, so it can only withhold credit, never add a wrong figure. A paired formula would change which bonuses clear the gate, which needs its own measurement.                                                                                                                                                                                                                                                     |
| A6, A7              | Adversarial                  | defer       | `.scratch/carry-forward/issues/513-set-engine-optional-cleanup.md` (comment added)                                                                                                                                                                                                                                                                                                                                                                                |
| A8                  | Adversarial                  | fixed       | Main `927a1b64` (PF3): the digest adds `vite.config.mts`, `upgrades/adapters/**` and `upgrades/data/**`, except the fork-gitignored `local.wcl-credentials.ts`, so the committed digest does not depend on one machine's credentials file. The layout lock is not updated; the next `pnpm merge-to-dev` runs the full gate (ST6).                                                                                                                                 |
| K-b                 | Adversarial, Standards       | wontfix     | Writing the lock after a green run on changed source is the documented design (the lock's `_comment`); CI never writes it, and `git checkout -- data/wowsims-fork-layout.lock.json` is the safe restore.                                                                                                                                                                                                                                                          |
| D1 / P2             | Domain, Spec                 | fixed       | Ticket 514 closed: the ret pre-raid same-gear reading is taken (Justicar 4pc +0.0000, se 1.6213; Crystalforge 4pc −0.9518, se 1.6533; 10,000 iterations, seed 11), which answers P2. D1: the core/CLI path is out of scope (ADR-0035 lines 520-525, ADR-0027 lines 35-39, `docs/plans/wowsims-tab/plan.md` lines 180-182 and 196-199).                                                                                                                            |
| D2 / P4             | Domain, Spec                 | defer       | `.scratch/carry-forward/issues/534-popover-does-not-say-which-gear-a-break-is-measured-on.md`                                                                                                                                                                                                                                                                                                                                                                     |
| D3                  | Domain                       | defer       | `.scratch/carry-forward/issues/535-meta-repair-may-add-dead-hit-gems-to-set-gear.md`                                                                                                                                                                                                                                                                                                                                                                              |
| ST1, ST2            | Standards                    | wontfix     | Pushed history; commits are not amended.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ST3, ST4, ST7, ST12 | Standards                    | fixed       | Fork `587fe9f24` (PF5), re-pinned in main `8dfffad6`; the main-repo ST3 rewording is in `927a1b64` (test comments) and `8a3ecc12` (fixture derivations, ADR-0034). E-W3, `check_engine_port_drift.py`, `check_fork_lint.py` and `pnpm verify` rc=0.                                                                                                                                                                                                               |
| ST5                 | Standards                    | fixed       | Main `8a3ecc12` (PF4): known-traps lists all four fork-gated suites and the four-file command, notes the parity suite's `describe.runIf(canRunForkSide)`, and gives `grep -l forkPresent packages/core/test/*.test.ts` for the `bulk-*` suites.                                                                                                                                                                                                                   |
| ST6                 | Standards                    | wontfix     | The lock is generated: the next green gate run rewrites its `_comment` and hash, and `pnpm merge-to-dev` runs that gate because the hash differs.                                                                                                                                                                                                                                                                                                                 |
| ST8, ST10, ST11     | Standards                    | defer       | `.scratch/carry-forward/issues/513-set-engine-optional-cleanup.md` (comment added)                                                                                                                                                                                                                                                                                                                                                                                |
| ST9                 | Standards                    | wontfix     | Splitting the ported `rank.ts` is a PROVENANCE-heavy refactor with no spec need now.                                                                                                                                                                                                                                                                                                                                                                              |
| P1                  | Spec                         | wontfix     | Stage-gate folders are gitignored by repo convention; ADR-0035 lines 37-53 say so, and the re-runnable part (tests and fixtures) passes.                                                                                                                                                                                                                                                                                                                          |
| P3 / K-c            | Spec, Standards, Adversarial | wontfix     | No spec, owner decision or visual acceptance asks for a marker colour, and the marker is text, so its meaning does not depend on colour. ADR-0035 lines 615-617 record why it has none (the stylesheet was outside K6's paths) and that no saved ranking has a row that shows it, so a colour could not be checked on a real render now.                                                                                                                          |
| P6                  | Spec                         | wontfix     | Intended by the 494 redo: its plan review made `not_counted` an internal kind name with no "not counted" label (`.scratch/stage-gate/494-set-hover-redo/gate-b-amendments.md` N4), and ticket 494's closing comment records that the owner confirmed the copy and that `not_counted` now reads "set detail".                                                                                                                                                      |
| P7                  | Spec                         | fixed       | Old literals in dated comments on closed tickets stay as records. Main `8a3ecc12` (PF6): ticket 520's body line "Open until the owner rules" is removed.                                                                                                                                                                                                                                                                                                          |
