# Pre-merge review — phase-2/trust

Diffed against: dev...phase-2/trust (976f4f8, 144 commits)

Integration review of the `phase-2/trust` branch as a whole. Five slices
(`caches` → `disclosure-and-caps` → `apply-view` → `resolution-and-fallback`
→ `feral`) already went through their own pre-merge reviews
(`docs/reviews/phase-2-caches.md`, `phase-2-disclosure-and-caps.md`,
`phase-2-apply-view.md`, `phase-2-resolution-and-fallback.md`,
`phase-2-feral.md`). This review targets the _integration_ — defects visible
only once the slices are combined, and anything a slice-scoped review would
have missed — not a re-litigation of settled per-slice findings.

Dispatch: four fresh-context sub-agents on Opus at effort medium (sharp
lane), `codex` not on `PATH` so no cross-vendor pass. Adversarial and domain
via the `Agent` tool directly; Standards and Spec via the `code-review`
skill's own two-agent split.

Reviewable source surface: `packages/core/src/*.ts`,
`packages/core/src/fixtures/*.ts`, `packages/core/test/*.ts` (~7,500 net
lines). The rest of the diff (195 files, ~550k lines) is vendored recorded
fixture JSON and `.scratch/**` tickets/handoffs.

## Adversarial

Four findings, ranked most severe first. Nothing at the top tier — no path
produces a confidently-wrong DPS number with zero signal.

**A1 (fixed).** `feralOfflineRecordings` (`fixtures/feral-offline.ts`) never
copied `actors[].subType` onto the returned `LoggedGear`, so `className` was
always `undefined` on the feral offline path even though the sibling
report-events fixture builder populates it from the same field. Re-checked
against `classifySpec`: because `DRUID_TREE_SPEC` is deliberately empty (cat
vs. bear share one talent tree by design), this omission did **not** in fact
leave the `spec-mismatch` throw dead for feral — a druid always resolves to
`needs-form-uptime`, which the resolution path already treats as "absence of
evidence" by design, and `classifyFeralForm`'s confidence score (not the
class/tree guard) is the real feral protection, already covered by an
existing test. The bug is real regardless: `className` is a documented
`LoggedGear` field other paths (mismatch messaging for non-druid classes,
any future caller of this builder) depend on, and the two fixture builders
silently disagreed about populating it. Fixed by copying `subType` through;
added a regression assertion in `feral-preset.test.ts`.

**A2 (fixed).** `cli.ts`'s offline-fixture selection (`isSlamaltman`,
`feralMatch`) matched on character identity only, never checking
`args.spec`. `--spec feral --character slamaltman` silently loaded ret's
recording (keyed `…|ret`), then the feral lookup on `…|feral` found nothing
and died with "no qualifying fight for slamaltman" — blaming the character's
log instead of the incompatible flag combination. Fixed by gating both
predicates on `args.spec`.

**A3 (deferred — ticket 75).** `--boss` has no validation (unlike `--raid`,
which checks `zonesInPool` and lists known zones on a miss). A typo like
`"Prince Malchezar"` (real spelling `Malchezaar`) silently returns an empty
shortlist with exit 0 — indistinguishable from "this boss drops nothing for
you."

**A4 (deferred — ticket 80).** Four `RankErrorKind` variants
(`character-not-found`, `gear-unreadable`, `wcl-budget-exhausted`,
`not-implemented`) are declared but never constructed; separately,
`RecordedGearSource.readGear` throws a bare `Error` for exactly the
condition `gear-unreadable` names, which escapes the CLI's `RankError`
handling as an unhandled stack trace. Low severity today (no live
`GearSource` exists yet to need these), deferred until that lands.

**Checked and clean:** the three seams hold, no fourth port; purity (no
`fs`/network/`process`/`console` leaking into `packages/core/src` outside
`cli.ts`/`seams/`); `statDeltaBetween` is like-for-like since `equipment` is
already meta-repaired before the delta; `assignTieGroups`'s
non-transitivity under mixed `seMethod` is the documented consequence of
leader anchoring, not a defect; the paired-replicate tests are genuinely
non-tautological (seed-dependent DPS via `SeedAwareSimRunner`, baseline
identified by item id not exclusion); `cli-shortlist.test.ts` is scoped
honesty (states plainly it doesn't drive `main()`, names the recorded run as
the end-to-end proof) rather than test theatre.

## Domain

Source of truth: `docs/phase0-findings.md`, `docs/verification-log.md`,
cross-checked against the pinned upstream wowsims source
(`.scratch/wowsims-tbc-new-src/`, commit `8aa378b3`).

**No contradictions of recorded findings.** `specID` still unread (R18);
race still never inferred and disclosed; 19→17 mapping has no drop-only
path; `permanentEnchant`/`temporaryEnchant` handling matches the standing
disclosure; eligibility-aware synthesis intact.

**New domain claims spot-verified correct:** hit-rating-per-percent
constants byte-match upstream mechanics; paladin Precision decode
(`treeSegment: 1, talentIndex: 2`) confirmed against `paladin.proto` and
`sim/paladin/talents.go`; `feral: undefined` in `TALENT_HIT_BY_SPEC`
confirmed (zero hit talents on the druid tree); all ten feral EP weight keys
match `P1_EP_PRESET` exactly including `FeralAP`; form uptimes reproduce
from the raw fixtures; paired-replicate SE mechanism is sound; expertise
`capRating: null` is the right call (TBC weapon-skill racials plus unread
weapon type make a per-character cap uncomputable).

**D1 (deferred — ticket 76, MEDIUM).** The HTML report renders per-row
hit-gap text ("costs N hit rating — widens your gap to X") but
`RankReportMeta` has no field for `hitCapBanner` or
`fightProvenanceLines`, both of which exist and are called only from
`cli.ts`. Confirmed on the committed `nexess-p3-all.html` artifact: zero
occurrences of the banner, the "gear read from" line, or the salvation/
off-tank warning, while gap-referencing rows are present. A reader of the
shared HTML sees advice with no cap context and no off-tank warning — the
exact class of silent-wrong-answer ticket 06 was filed to prevent, just not
reaching this surface. Data is present in the JSON sidecar; this is a
rendering gap.

**D2 (deferred — ticket 77, LOW).** `hitRegression.gapAfter` renders
unrounded in the HTML report (`64.92309699999998`), inconsistent with
`hitCapBanner`'s own rounding. Test fixtures happen to use whole numbers,
which is why it was never caught.

**D3 (deferred — ticket 81, LOW, latent).** Druid idols are flagged
`enchantable: true` in `data/items/index.json`, but idols take no enchant
in TBC. No current impact — verified zero eligible enchants exist for the
idol item type, and the only consumer gates on `enchantAppliesToItem`, which
fails closed. Flagged because the field is documented as authoritative and
a future caller trusting it alone would synthesize impossible idol
enchants.

**Unverified, flagged not defects:** `Hand of Salvation` treated as
equivalent to the Blessing is domain-reasonable but one fixture shows 100%
"uptime" for a 10-second spell (a WCL bookkeeping artifact) — doesn't affect
the current `salv === 0` check, but would mislead any future ratio-based
use; feral tier coverage stops at T5 by construction, self-disclosed;
`two-hop/feral-tokens.json`'s token/class join still self-declares as
needing a human check (carried from the feral slice review, unchanged).

**On the headline gate claim:** "feral needed only a preset plus the
disambiguation confidence field, no structural change to `rankUpgrades` or
its seams" holds domain-wise. `PRESET_ID_BY_SPEC` is a two-entry lookup; the
one place a second spec could have silently corrupted numbers — borrowing
ret's EP weights and zeroing `FeralAttackPower` across 49 items — is
explicitly guarded in the preset's own notes.

## Standards + Spec

_(via the `code-review` skill's own parallel Standards/Spec split, same
diff and scope as above)_

### Standards

**Hard violations:**

- **S1 (deferred — ticket 78).** `SqliteStore` and `CachingGearSource` are
  exported from `index.ts` and tested, but no production path constructs
  either — `cli.ts` still builds `MemoryStore`, and `RecordedGearSource` is
  the only wired gear source. `CachingGearSource`'s own docstring calls the
  gear cache "the primary defence of the WCL point budget," a budget
  nothing currently defends. Not a defect under Phase 0-2's offline-only
  scope; real risk once Phase 3's live-`GearSource` plan lands.
- **S2 (deferred — ticket 79).** `index.ts`'s barrel exports are
  inconsistent about which fixture builders are public: report-events'
  `REPORT_EVENTS_REF`/`reportEventsOfflineRecordings` are re-exported,
  feral's equivalents are not (`cli.ts` imports them directly instead).
- **S3 (wontfix — judgement call).** Comment volume: ~1,400 comment lines
  across ~2,000 changed source lines, several arguing with reviewers
  (`view.ts`'s `tieWindow`/`assignTieGroups` blocks) rather than stating a
  constraint. Individually each cites a finding or ADR per AGENTS.md's
  comment policy; the aggregate reads as retro material. Not fixing this
  pass — each block is independently defensible and trimming ~1,400 lines
  of already-cited rationale is a separate editorial task, not a
  merge-blocking defect.
- **Types-from-JSON and seam rules: clean.** No `(typeof jsonImport)[number]`
  pattern anywhere; no fourth port introduced; stage-internals rule
  respected (only one stage-name assertion, and it asserts an observable
  contract — absence of `simming` on a cache hit — not internal structure).

**Judgement calls (Fowler baseline), noted but not fixed:** Speculative
Generality on `ItemSourceOrigin` (populated by the pipeline, read only by
tests); a seven-positional-parameter data clump in `buildOfflineRecordings`;
Divergent Change on `rank.ts` (+596 lines: fight resolution, spec-mismatch
refusal, sim caching, cap computation, and paired replication all in one
function with shared mutable closure state); Duplicated Code between
`feral-offline.ts`'s hand-rolled gear-mapping walk and the shared
`buildOfflineRecordings` builder the branch extracted specifically to kill
this duplication (feral's differing needs — form uptime, different talent
read — may justify the divergence, but it wasn't stated as a deliberate
choice); Feature Envy / Message Chain in `talentsStringFromRequest`'s
four-level structural cast into `RaidSimRequest`, duplicating an identical
cast four lines above it. None severe enough to block; noted for a future
`rank.ts`-focused cleanup pass rather than ticketed individually.

### Spec

Checked against `.scratch/phase-2/spec.md` and PLAN.md §14's Phase 2 gate.

**SP1 — not a defect.** The one open gate box (`≥3 real characters produce
believable shortlists`) is correctly left open; `docs/verification-log.md`
is honest that only shredzepelin has been through `sme-rank-review`
(trust-with-caveats), and PLAN.md explicitly scopes the remaining SME passes
to _after_ this branch lands, since the feral universe they'd review doesn't
exist on `dev` yet.

**SP2 — wontfix, noted.** `feat/phase-3-vendor-and-craft-coverage` (merged
at `c3d66b4`, ~44 files: `parse_atlasloot.py`, `sync_atlasloot.py`,
`assemble_universe.py`, four gate scripts) is not one of the five planned
Phase 2 slices — it's an unplanned Phase 3 data slice absorbed into this
integration branch. Not re-reviewing it here: it already has its own
pre-merge review (`docs/reviews/feat-phase-3-vendor-and-craft-coverage.md`).
Noting as scope creep relative to `.scratch/phase-2/spec.md`'s named
topology, not as an unreviewed risk.

**SP3 (deferred — ticket 82).** The verification log's evidence command for
the feral "no structural change" claim
(`git diff phase-2/trust~1...phase-2/feral --stat`) no longer resolves — the
ref moved under later merges. The claim itself re-verified true against the
real merge-base (`rank.ts` +20 lines, all `PRESET_ID_BY_SPEC` plumbing; no
seam file touched) — only the citation is stale.

**SP4 (fixed via ticket — ticket 74, the most consequential finding of this
review).** `docs/verification-log.md`'s claim that `ret-p*.json` "grew by
additions only ... zero deletions, no existing row altered" does not
reproduce. Independently re-measured:

```
git diff dev...phase-2/trust --stat -- data/universes/ret-p2.json data/universes/ret-p3.json data/universes/ret-p4.json data/universes/ret-p5.json
```

shows 366/624/689/827 deletion lines respectively — not zero. This is a
durable-claims violation (AGENTS.md): the log cites evidence, but the
evidence doesn't say what the log says it says. Not fixed inline — the
ticket scopes the follow-up (semantic diff of what actually changed,
including a reported-but-unverified BiS-tag-loss on ~11-12 rows) because it
needs its own investigation, not a one-line patch.

**SP5 (fixed).** `DEFAULT_SEEDS`'s comment claimed the shipped constant and
`docs/five-seed-spread.json`'s evidence "stay the same numbers" — true for
the seed values, misleading on iteration count (the evidence file ran at
5000 iterations, the shipped default is 3000). Reworded in place.

## Summary

Two HIGH-severity adversarial findings fixed on this branch (feral
`className` never populated; CLI offline-fixture selection ignoring
`--spec`), both regression-tested. One MEDIUM domain finding (HTML report
missing hit-cap/provenance context) and one MEDIUM-equivalent spec-integrity
finding (verification log's ret-universe claim doesn't reproduce) deferred
to tickets, both worth prompt follow-up but neither blocks `dev` — the first
is a display gap with the underlying data intact, the second is a
paper-trail defect, not a data-correctness one (the actual universe content
wasn't independently shown wrong, only the log's characterization of its
diff). Remaining findings are LOW severity or judgement calls, ticketed or
noted as `wontfix` with reasoning.

The Phase 2 headline claim — feral cost only a preset plus a confidence
field, no seam/signature change — holds under both adversarial and domain
scrutiny at the integrated tip.

`pnpm verify` green post-fix: 463 tests, 32 files, all checks passing.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                       |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `feralOfflineRecordings` now copies `className` from `actors[].subType`; regression test added in `packages/core/test/feral-preset.test.ts`                                         |
| A2  | Adversarial | fixed       | `cli.ts`'s `isSlamaltman`/`feralMatch` now gated on `args.spec`                                                                                                                     |
| A3  | Adversarial | fixed       | Deferred to ticket 75 at review time; fixed in `fix/75-82-review-tickets` (7b313e5), merged here. Ticket closed                                                                     |
| A4  | Adversarial | defer       | `.scratch/carry-forward/issues/80-unused-rank-error-kinds-and-bare-error-escape.md`                                                                                                 |
| D1  | Domain      | fixed       | Deferred to ticket 76 at review time; fixed in `fix/75-82-review-tickets` (ae5c50b), merged here. Ticket closed                                                                     |
| D2  | Domain      | fixed       | Deferred to ticket 77 at review time; fixed in `fix/75-82-review-tickets` (8306ff1), merged here. Ticket closed                                                                     |
| D3  | Domain      | fixed       | Deferred to ticket 81 at review time; documented in `fix/75-82-review-tickets` (a8f2a24), merged here. Ticket closed                                                                |
| S1  | Standards   | defer       | `.scratch/carry-forward/issues/78-sqlitestore-and-cachinggearsource-unreachable.md`                                                                                                 |
| S2  | Standards   | fixed       | Deferred to ticket 79 at review time; fixed in `fix/75-82-review-tickets` (23a42e6), merged here. Ticket closed                                                                     |
| S3  | Standards   | wontfix     | Comment volume is a judgement call; each block independently cites a finding/ADR per AGENTS.md's comment policy. Trimming is a separate editorial pass, not a merge blocker.        |
| SP1 | Spec        | wontfix     | Open gate box is intentional per PLAN.md — SME passes on slamaltman/nexess are explicitly scoped to after this branch lands                                                         |
| SP2 | Spec        | wontfix     | Phase-3 vendor slice already has its own pre-merge review (`docs/reviews/feat-phase-3-vendor-and-craft-coverage.md`); scope-creep-relative-to-spec.md noted, not an unreviewed risk |
| SP3 | Spec        | fixed       | Deferred to ticket 82 at review time; fixed in `fix/75-82-review-tickets` (c33ce91), merged here. Ticket closed                                                                     |
| SP4 | Spec        | fixed       | Deferred to ticket 74 at review time; fixed in `fix/75-82-review-tickets` (575c71d), merged here. Ticket closed                                                                     |
| SP5 | Spec        | fixed       | Reworded `DEFAULT_SEEDS` comment in `packages/core/src/rank.ts` to separate "seed values match" from "iteration count does not"                                                     |
