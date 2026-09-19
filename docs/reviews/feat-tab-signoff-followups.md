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

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                 |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | defer       | `.scratch/carry-forward/issues/425-bis-tag-gap-layout-assertion-may-pass-vacuously.md` — the BiS-gap layout assertion can pass without a wrapped badge to exercise it (never false-fails)     |
| A2  | Adversarial | defer       | `.scratch/carry-forward/issues/426-multi-source-item-survives-if-any-source-ticked.md` — 417 keeps a multi-source item if any of its sources stays ticked; coherent, make the choice explicit |
| S1  | Standards   | wontfix     | Single `as any` parsing untrusted localStorage JSON — the same read `loadUserData` does; defensible, no safer typed shape available at that boundary                                          |
| S2  | Standards   | defer       | Perf smell: `guaranteedSetsAvailable()` re-parses localStorage per call incl. per result row — folded into A2's ticket family as a quality follow-up if it bites; not blocking                |
| D1  | Domain      | —           | No findings (clean)                                                                                                                                                                           |
| Sp1 | Spec        | —           | No findings (clean)                                                                                                                                                                           |
