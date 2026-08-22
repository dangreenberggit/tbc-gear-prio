# Pre-merge review — `feat/stage-2-close-shortlist-box`

Reviewed range: `9a4b932543e74da9a9a8bb8ce31b55813331f34d..6eafaf75d0061efa3445558c691627108f742e1d`

Four axes, all on the review lane (Opus, effort medium), each with fresh context
and no access to the authoring conversation. `codex exec` is not on `PATH` in
this environment, so dispatch used option 2 of the skill's ladder: fresh
subagents on a review-lane model, all four in one parallel batch. No wall was
hit; no axis was downgraded.

**The branch changes no production code.** It is committed measurement evidence,
documentation, tickets and one `.gitignore` change. Each axis was retargeted
accordingly — the failure mode here is a false or unreproducible claim in a
committed artifact, not a crash.

## Adversarial

Re-ran the artifacts' own commands to try to break the four load-bearing claims.
**Most held**: the Arm 1/Arm 3 splice is genuinely single-variable (`json.dumps`
equality after popping `rotation` → `True`), all three arms carry
`iterations: 20000, randomSeed: "42"`, the DPS/stdev triples match the result
JSONs exactly, both "prints nothing" greps exit 1, and the 3-vs-1
`worn-unrankable` split reproduces from `ranking.plausibilityWarnings`.

**A1 (material) — the shared seed makes the combined-SEM estimator wrong.** All
three arms run `randomSeed = "42"`, so they are **paired, not independent**.
Combining per-arm SEMs in quadrature is the independent-sample estimator; the
correct SE for a paired contrast is that of the per-iteration difference, which
a common seed usually makes much smaller. The bound is therefore conservative
and the sign is safe — 42.91 DPS survives any plausible SE — but "62 σ" was
computed by the wrong formula and stated as fact in three committed artifacts.
Gate C's defence ("the orchestrator recomputed the statistic independently")
does not hold: recomputation confirms arithmetic, not the choice of estimator.

**A2 (material) — "Arm 2 reproduces to the cent" is not rig validation.** Ticket
250 measured on binary `cbf6b75`; Arm 2 ran on v0.0.119 (`3267f8d`). Identical
output across two engine builds is the _seed and inputs_ reproducing. If the
builds really differ, byte-identical DPS is itself the surprising fact, and
spending it as evidence is the brief's own worst case — a plausible number with
no error visible anywhere.

**A3 (minor)** — `ls .scratch/handoffs/sme-rank-judgment-*.md | wc -l` is cited
as → 12, but returns **14** at tip: the command was recorded before this
branch's own two handoffs landed.

**A4 (minor)** — `sme-input-shortlists.md` points the SME at the three `.html`
reports, which `1139926` untracked, so a later reader cannot obtain seat 1's
exact input.

**A5 (minor)** — ticket 227's header reads `Blocked by: none` while a retained
section below still reads `blocked`.

**Cleared, contrary to the framing it was given:** Q3-from-silence is adequately
limited — the ticket states in its own words that the seat read feral **p2**
while the measurement is on the **p3** sweep, and that silence "shows the rows
did not stand out, not that they are harmless."

## Domain

This axis reported last and found the most consequential thing in the review. It
re-derived the cast table from the arm results rather than trusting the handoff.

**D1 (material) — every Q2 arm ran an unequipped druid.** All three requests
carry 17 equipment slots with no item id. Verified independently:

```
python -c "import json;eq=json.load(open('.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/arm1-tip.request.json'))['raid']['parties'][0]['players'][0]['equipment']['items'];print(len([i for i in eq if i.get('id')]),'of',len(eq))"
```

→ `0 of 17`. This is why the arms read 740–782 DPS while the characters' own
baselines are 2266.9 and 2302.5. **The comparison survives** — all arms are
equally unequipped, so the rotation contrast is valid and the sign is safe — but
the _magnitude_ is not transferable to a geared character, because TBC powershift
value scales with attack power and with the Wolfshead Helm interaction the new
APL names in its own variables, and shredzepelin wears Wolfshead. Two committed
artifacts stated −42.91 as a flat fact. `commands.md` calling this "one gear set
at one phase" is misleading; there is no gear.

**The rotation shape claim itself is correct TBC feral.** The numbers reproduce
(powershifts 46.83 vs 39.12, Shred 50.77 vs 47.55, Bite 5.76 vs 3.89, Rip 10.10
vs 10.25) and the energy budget closes on both arms. Flat Rip is the _right_
signature: Rip is a duration debuff capped by its own duration, so a rotation
gaining DPS by re-Ripping would clip ticks and show more Rip casts with less Rip
damage. It shows neither — Rip damage is slightly lower on tip, consistent with
identical uptime. The gain is downstream energy from more powershifts.

**D2 (material) — an unexplained number in the table the branch presents as
fully explained.** White-melee casts are identical to four significant figures
across arms (3,916,861 vs 3,916,799) while powershifts differ by 7.7 per
iteration. Shifting out of cat form and back should cost swing time, so a 20%
swing in shift count producing a 0.0016% swing in white attacks is odd. It may be
an upstream modelling choice (shift treated as instant, off the swing timer) —
worth knowing either way, and nothing in the branch notices it.

**D3 (material) — ticket 253's causes: both confirmed, one described wrongly.**
The domain axis re-derived both. Holiday loot: `data/items/index.json` _does_
carry `278827` and `278819`, and the fixture carries both ids — so "no item with
id > 100000 enters any pool" points at a numeric filter **that does not exist**.
The real mechanism is missing source data (`atlasloot_sources.json` returns
`null` for both, since holiday-boss loot is absent from AtlasLoot's tables).
Heroic exclusion: confirmed wholesale and independently — 583 distinct items
carry a heroic source, and **no pool contains a single `heroic` kind**. So the
three slots split two ways, not one: neck and back are a source-data gap, waist
is a filtered source kind. A fix aimed at one leaves the box open.

**D4 (material) — the head-slot warning's stated cause is incomplete.** The
`gems.meta-preference` substitution leaves meta sockets empty on _candidate_
items while PLAN.md §9 repairs the _worn_ item's meta before the baseline sim.
Meta-socketed candidates are therefore systematically under-priced. For feral
that lands hardest on head — the slot carrying the "no positive candidate"
warning against Wolfshead Helm, currently attributed entirely to Wolfshead's
unique effect.

**D5 (minor) — item `31677` is Fel Mana Potion, not Flame Cap.** Named outright
at `vendor/tbc-new-fork/sim/core/consumes.go:161`. Mislabelled in three
artifacts, originating in `scripts/build_feral_skeleton.py:96`, which predates
this branch. Cosmetic for the measurement, but the 2300/2000 mana thresholds in
that guard are inexplicable under the wrong reading and are the point under the
right one.

**D6 (minor) — `selectedPotion`/`selectedConjured` semantics are inferred, not
read.** They exist as proto declarations added in v0.0.119 and are absent from
the vendored Go source. The branch's claim about what they compare against is
inference from message shape, corroborated by observed cast counts — consistent,
but it should say _unverified_ rather than stating it as read.

**Cleared:** the consumables available-vs-used claim is **correct**, verified
against `consumes.go:139-159` and `:347-405` plus the proto comments. The
shortlists are believable once dead slots are stripped — shredzepelin's honest
list (Merciless Gladiator's Maul, Leggings of Murderous Intent, Tsunami Talisman,
Ancestral Ring of Conquest) is sound P2 feral, and the Maul at #1 is correct,
since S3 arena weapons genuinely beat most P2 raid drops for feral. nexess and
slamaltman both read as real TBC targets. No game-fact error in the verification
log or PLAN.md.

## Standards + Spec

### Standards

**S1 (hard) — ticket 252 was allocated by listing the directory, and `1ecd2e5`
did not bump `NEXT` in the same commit.** `docs/agents/issue-tracker.md` bans
exactly this: _"Never allocate by listing the directory — two branches doing
that pick the same number and merge cleanly under different filenames (it
happened: two 232s and two 233s on 2026-08-19)."_ For six commits the branch
carried a ticket numbered 252 while `NEXT` advertised 246. The counter was later
reconciled to 256 in `7cf9383`, so on-disk state is correct, but the collision
window was real. **This was the orchestrator's breach, not the executor's.**

**S2 (hard) — `docs/reviews/` file absent.** This file. Expected at this point in
the loop.

**S3 (judgement) — ticket 253's `Blocks:` was prose, so no gate read it.**
`PHASE_BRANCH_RE` matches only `phase-N`. Ticket 253 is the sole reason a PLAN.md
gate box stays open and it was machine-invisible.

**S4 (minor)** — seven of eight commit bodies wrap at 73–76 rather than 72;
`7cf9383`'s subject is 60 chars against the 50-char guidance.

**Clean:** durable claims are the branch's strongest axis — `binary-provenance.md`
is called "a model of the rule" for gitignored inputs, giving regen commands and
a `sha256sum` verification and never asserting the binary is present. The
`.gitignore` change follows the file's own re-include idiom and stays narrowly
scoped. Ticket fields, `KNOWN_STATUSES` values and PLAN.md's correct-by-appending
prose all pass. One smell named: the worn-gear finding is written out four times
at near-identical length (PLAN.md, verification log, ticket 253, commit body);
the copies currently agree.

### Spec

**No requirement missing beyond one disclosed gap.** All 8 plan steps landed with
their "Done when" conditions met; all 13 verify-recipe lines re-run green. The
partial: only feral **p2** was run, so C11's p3 half has no counterpart — which
weakens Q3's evidence, since ticket 227's rows live on the p3 sweep. The ticket
says so.

**No scope creep.** Zero files under `packages/`, `scripts/` or `data/`. R7's
expected-unused `cli.ts` fallback was not used, as predicted.

**All three outcomes trace to their pre-registered rules.** Q1 → C fires on the
verdict string alone. Q3 → B verified in both directions. Q2's result matched
**no** pre-registered branch (material effect, opposite sign) and was **flagged,
not rationalised**: `commands.md` says plainly _"The plan pre-registered no
branch for this outcome"_, the executor took only the non-branching work the plan
authorised regardless, refuted the plan's own C14 hypothesis on the record, and
escalated attribution upward.

**One soft spot:** closing ticket 250 applies branch 1's consequence without
branch 1 firing. Correct on the evidence, but an orchestrator judgment rather
than a pre-registered rule — and Gate C says so explicitly, so it is visible
rather than laundered.

## Summary

The branch's substantive conclusions survive four axes of adversarial
re-derivation. **No finding overturns a conclusion.** Every material finding is
about _how confidently a correct result was stated_, and the pattern across
axes is the same one twice over: a number that is right for the comparison it
makes, presented as if it meant more than it does.

- **A1** — "62 σ" computed with the independent-sample estimator on arms that
  share a seed and are therefore paired.
- **A2** — a cross-build coincidence spent as rig validation.
- **D1** — the sharpest. Every Q2 arm ran an **unequipped druid**, which no
  other axis caught and the branch never states. The rotation comparison is
  still valid and its sign is safe, but −42.91 DPS is not a number a geared
  feral would see, and two committed artifacts stated it flat.
- **D3** — ticket 253's causes both confirmed, but one described as an id filter
  that does not exist, which would have sent a fixer to the wrong file.

All of these are corrected in place. Two new tickets (256, 257) carry the
findings that need code work.

The one hard standards breach — **S1**, allocating ticket 252 by listing the
directory without bumping `NEXT` in the same commit — was the orchestrator's,
and is recorded on the ticket rather than repaired by rewriting history. The
later tickets in this review were allocated correctly from `NEXT`.

Worst per axis — Adversarial: A1 (wrong estimator, stated as fact in three
artifacts). Domain: D1 (measurement scope never disclosed). Standards: S1
(allocation-rule breach with a real six-commit collision window). Spec: the
unbranched Q2 outcome, which was handled correctly.

**On the gate box itself:** nothing in this review disturbs the decision to leave
it open. If anything D1 and D3 reinforce it — the branch's own conclusion is that
the pipeline is not yet trustworthy enough to close the box, and two axes
independently found further reasons that is the right call.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                            |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Adversarial | fixed       | Sigma count withdrawn from the verification log, `commands.md` and ticket 250. A "what the bound is, and is not" caveat added at the numbers, naming the paired-vs-independent problem and pointing at ticket 236. Gate C's row 3 reason corrected and a signed correction section added — recomputation confirms arithmetic, not estimator choice.                      |
| A2  | Adversarial | fixed       | Gate C's "this is what validates the whole rig" is qualified in the same correction: identical output across two engine builds is the seed and inputs reproducing, not independent validation.                                                                                                                                                                           |
| A3  | Adversarial | fixed       | Verification log now cites `git ls-tree 9a4b932 …` → 12 and states that the same `ls` at tip returns 14 because this branch added two.                                                                                                                                                                                                                                   |
| A4  | Adversarial | fixed       | Note added to `sme-input-shortlists.md` recording that the `.html` column was untracked in `1139926`, with how to regenerate.                                                                                                                                                                                                                                            |
| A5  | Adversarial | fixed       | Ticket 227's header now states the retained `blocked` line is superseded history and the header is the live state.                                                                                                                                                                                                                                                       |
| S1  | Standards   | fixed       | Recorded on ticket 252 under "Process note — how this ticket got its number", including the six-commit collision window and that the counter is now reconciled at 256. Not repaired by rewriting history.                                                                                                                                                                |
| S2  | Standards   | fixed       | This file.                                                                                                                                                                                                                                                                                                                                                               |
| S3  | Standards   | fixed       | Ticket 253's `Blocks:` changed to `phase-2` so the gate reader matches it; the prose reference stays in the body.                                                                                                                                                                                                                                                        |
| S4  | Standards   | wontfix     | 1–4 chars over the 72-col wrap on already-published commit bodies. Rewriting eight commits to reflow prose is not worth the history churn; noted for future commits.                                                                                                                                                                                                     |
| Sp1 | Spec        | defer       | The feral **p3** run has no counterpart this branch, weakening Q3's evidence. Already recorded as a limit in ticket 227, which stays open.                                                                                                                                                                                                                               |
| Sp2 | Spec        | wontfix     | Ticket 250's closure applies a branch consequence whose branch did not fire. Correct on the evidence and disclosed at Gate C; re-opening to re-derive it under a different label would change no conclusion.                                                                                                                                                             |
| D1  | Domain      | fixed       | Every Q2 arm ran an unequipped druid (`0 of 17` slots filled). Scope note added to the verification-log entry and a full "Scope: the arms ran an unequipped druid" section to ticket 250, both stating the comparison survives but the magnitude is not transferable, with the verifying command. Whether the sign survives on geared characters is marked **untested**. |
| D2  | Domain      | defer       | Identical white-melee casts across arms despite a 20% powershift difference — possibly an upstream modelling choice, unexplained by the branch. Recorded in this review; no ticket, since it is a question about upstream rather than a defect here. Worth resolving if the arms are ever re-run geared.                                                                 |
| D3  | Domain      | fixed       | Ticket 253's two causes re-derived and **both confirmed**; cause 1's description corrected from "ids above 100000" (a filter that does not exist) to the real source-data gap, with re-runnable commands. Its acceptance box is now checked.                                                                                                                             |
| D4  | Domain      | defer       | Meta-socketed candidates under-priced against a repaired baseline; the head-slot warning's stated cause is incomplete. `.scratch/carry-forward/issues/257-meta-socket-candidates-underpriced-against-repaired-baseline.md`                                                                                                                                               |
| D5  | Domain      | defer       | Item 31677 mislabelled "Flame Cap"; originates in `scripts/build_feral_skeleton.py:96`, which predates this branch. `.scratch/carry-forward/issues/256-item-31677-mislabelled-flame-cap.md`                                                                                                                                                                              |
| D6  | Domain      | fixed       | Noted in this review that the `selectedPotion`/`selectedConjured` semantics are inferred from proto shape and corroborated by cast counts, not read from the vendored source.                                                                                                                                                                                            |

No finding blocks the merge. Two material findings were corrections to
overstated confidence, both applied; the conclusions they qualified are unchanged.
