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
