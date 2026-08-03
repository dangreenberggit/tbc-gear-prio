# Writing review: raid-scoped-pool plan and subplans

Scope: prose quality only. No technical decisions checked, no measurements
re-verified, no source documents edited.

Standard applied: figurative language and vague quantifiers cause bad
engineering decisions because a reader cannot tell what was measured from
what was guessed. Every flag below serves that test, not a taste preference.

---

## raid-scoped-pool-plan.md (parent plan)

| Location | Category | Offending text | Plain replacement |
|---|---|---|---|
| §1, line 27 | Vague quantifier | "The pool is then narrowed only by rules that are safe (section 6)" | "safe" is a conclusion asserted before the reader has seen section 6's evidence. Either cut "that are safe" here and let section 6 earn the word, or write "narrowed only by rules whose false-negative rate is measured (section 6)." |
| §2 table, "EP score vs actual simulated DPS gain" row | Unexplained jargon | "Spearman correlation 0.183" | Define once: "Spearman correlation (a 0–1 measure of how well two rankings agree; 0.183 is close to no agreement)." Used again in 05-rank-wiring.md without definition — see that entry. |
| §3, "The source gap is about 673 items, not 2,769" | Fine — this is exactly the corrected-claim pattern the standard wants. No flag. | | |
| §5.1, "Pin it the same way wowsims is pinned" | Minor — acceptable, points at a concrete precedent in the repo rather than describing a vague process. | | |
| §5.3, "This is a hand-built mapping. It is small and bounded" | Vague quantifier undercut by its own next sentence | "small and bounded" | The next clause already gives the number ("three ret tier sets, 18 pieces"). Cut "small and bounded" — the number does the work; the adjectives add nothing and would survive even if the number changed. |
| §6, "The parent handoff proposes using EP as a generous rejection rule" | Vague quantifier | "generous" | Say what generous means numerically, or cut it — the paragraph goes on to give exact percentages (0%, 10%, 25%, 50%), so "generous" is doing no work the numbers don't already do. |
| §6, "Why that 100% is not as strong as it looks" | Borderline dramatic framing | "not as strong as it looks" | Acceptable — it is immediately cashed out with the actual mechanism (the test character already had the best libram). Not flagged as a violation, but note it as the pattern other sections should follow: assertion immediately followed by the specific reason, not left as color. |
| §7 title, "A limitation that applies to every recall number in this plan" | Fine, plain. | | |
| §9, S1 wording, "'the score liked it'" | Mild personification | "the score liked it" | Minor. Replace with "a higher score" or "an EP threshold." Low priority — it's inside quotes framing what membership must NOT be explainable as, so the informality is arguably intentional contrast, but it still personifies a number. |

**Verdict:** This is the strongest-written document in the set. Every major
causal claim in §2 and §3 points at a re-runnable script or another document
plus a measurement table. Section 4's restatement of D4 is a genuine
clarification, not padding. The few flags above are small (one undefined
term, two disposable adjectives). An engineer could act on this without
follow-up questions.

---

## 00-decisions.md

| Location | Category | Offending text | Plain replacement |
|---|---|---|---|
| Decision 1, "This confirms the prior measurement cited in the parent plan" | Fine — points at a re-run command above it. | | |
| Decision 1 recommendation, reason 2: "It matches how players actually play." | Unsupported factual claim stated as established | "It matches how players actually play." | This is a claim about player behavior with zero backing — no player count, no survey, no citation. It is followed by one anecdote ("a raider at maxPhase 3 keeps attending SSC...") which is itself asserted, not measured. Replace with: "This matches the scenario the parent plan already assumes (a P3 player still wants the Vashj belt from SSC) — untested against real player behavior, but consistent with the product framing already adopted." Mark it hypothesis, don't state it as fact. |
| Decision 2 recommendation, "badge gear is frequently BiS-competitive in TBC (the parent plan's own framing)" | Vague quantifier + attribution loop | "frequently" | No frequency is given, and the parent plan is cited for "framing," not for a number. Either find the count (how many badge items are BiS-competitive, out of how many slots) or write "badge gear is sometimes the best-in-slot option (unmeasured here; the parent plan assumes this without a count)." |
| Decision 2, "What breaks if badges are excluded... silently reintroduces the 'pool doesn't tell the whole story' problem" | Mild decoration | "silently reintroduces" | "silently" is doing rhetorical work — cut it, the sentence is fine as "reintroduces the problem the redesign is meant to fix." |
| Decision 4, "Zero rare-quality items exist inside the nine target raid zones at any maxPhase." | Strong claim, well-supported — good example of the standard being met. No flag. | | |
| Decision 4, "the safer default is to leave the floor at rare" | Fine, plain word "safer" backed by the reasoning in the same paragraph. | | |
| "What this sub-phase did not measure" section | This whole section is the single best piece of writing in the set — it explicitly lists what was NOT checked instead of letting silence imply completeness. No flag; hold this section up as the model for the others. | | |

**Verdict:** Very strong. Every decision has a measured table above its
recommendation, and the "what this did not measure" section closes the loop
the standard cares about most. The one real problem is Decision 1's second
reason ("matches how players actually play") — that is exactly the failure
mode the standard exists to catch: a sentence that reads as established fact
with no backing, sitting right next to sentences that do have backing, making
it easy to mistake one for the other. Fix that one line and this document is
clean.

---

## 01-atlasloot.md

| Location | Category | Offending text | Plain replacement |
|---|---|---|---|
| §3.1, "This parser is being pointed only at data-tbc.lua, which the spike says contains both dungeon and raid instances in one file" | Structure — buried conditional inside a run-on sentence | (whole sentence, ~90 words) | Split into two sentences: state the constraint, then state the decision it forces. As written the reader has to hold four clauses in memory to find the actual instruction. |
| §3.4, "Recommendation: parse both, tagging dungeon-instance bosses as kind: 'heroic' only if difficulty metadata says heroic, otherwise treat a normal-dungeon drop as out of scope... or kept and filtered downstream; either is fine" | Structure — a recommendation that resolves to "either is fine" is not a recommendation | "either is fine, but state the choice" | If both options are acceptable, say that up front in one clause, not after 80 words of framing that sound like a decision is being made. This reads as more decisive than it is. |
| §6, "Licence... This needs a decision from the repo owner before the parsed output is committed" | Correctly hedged — flagged as needing a decision, not asserted as resolved. Good example, no flag. | | |
| §6, "Item IDs in AtlasLoot but not in the pinned db.json... Expect this population to be small — both projects track the same live TBC Classic item set — but it is not measured by this plan and should not be assumed to be zero." | This is the standard done correctly — an expectation stated, immediately labeled as unmeasured. No flag. | | |
| §3.2, "well under 50 items" (in 4.2, actually in 02-two-hop.md — skip, wrong doc) | — | — | — |
| Throughout §2–§4 | Jargon used before definition | "two-hop" | Used repeatedly (title implication, §5 heading) without being defined in THIS document — it relies on the reader having already read the parent plan. Since sub-plans are meant to be picked up independently by an implementer, add one clause on first use: "the 'two-hop' pattern (an item reached through an intermediate object — a token or recipe — rather than a direct boss drop, defined in the parent plan §5.3)." |
| §4.1, "Reuse ret_equippable() from scripts/generate_pool.py rather than re-deriving eligibility rules by hand" | Fine, concrete, points at a file and function name. | | |

**Verdict:** Long but mostly sound — nearly every instruction is paired with
a command or a file/line reference. The two structural problems (buried
recommendation in §3.4, run-on constraint in §3.1) cost a reader real time
without adding content; both are fixable by splitting sentences, not by
cutting substance. Missing a stated definition of "two-hop" is a real gap
since this document is meant to stand alone for an implementer. Usable
without asking questions, but slower to read than it needs to be.

---

## 02-two-hop.md

| Location | Category | Offending text | Plain replacement |
|---|---|---|---|
| §1.2, "A bug in the existing entries, found while checking this plan" | Good — flags a real bug, names how it was found, gives the exact wrong code. No flag; this is the standard done right. | | |
| §1.2, "I checked this by reading the file directly... I did not need Wowhead to see the mismatch, but Wowhead is needed to find the real token IDs" | Fine — precisely distinguishes what was verified from what still needs verification. Model example. | | |
| §2.2, "A paladin's T5 pieces might come from a 'Hero' token while a different class's T5 pieces come from 'Champion'" | Hedged correctly with "might" — acceptable, this is genuinely conditional pending the Wowhead check that hasn't happened yet. No flag. | | |
| §4.3, "Expect single digits to low teens of ret-relevant raid-recipe crafted items in TBC (examples from general TBC knowledge, unverified against this repo's data and not to be trusted without the Wowhead check..." | This is the standard applied correctly — a guess labeled as a guess, with the verification step named. No flag, but worth noting the phrase "not to be trusted" is slightly informal; "unverified, do not use without the check in 4.2" says the same thing without the color. Low priority. |
| §6, effort estimate table, "roughly 1.5 hours", "under an hour", "roughly half a day" | Vague quantifier — but here it's an honest estimate labeled as an estimate, not a disguised fact | none needed, acceptable | These are explicitly framed as estimates in an "Effort estimate" table, not asserted as measured fact. This is the correct use of a rough number — flagging only to note it is NOT a violation, since context makes the epistemic status clear. |
| §5.2, "Once the Wowhead verification in section 2 is done, this set may change... Do not write the test's expected-ID list until section 2's verification is complete." | Correctly hedged, explicit warning against baking in a guess. No flag. | | |

**Verdict:** The cleanest document in the set on the measured-vs-assumed
axis. It finds and documents a real bug with evidence, distinguishes what
was checked by reading a file from what still requires an external lookup,
and refuses to write down an expected-value list it cannot yet verify. No
material rewrites needed.

---

## 03-wowhead-lists.md

| Location | Category | Offending text | Plain replacement |
|---|---|---|---|
| §1.1, "Important naming trap found while surveying, stated plainly" | Mild decoration | "trap" | "Trap" is figurative — the actual content (a URL slug says "phase-2" but covers two of this repo's phases) is a plain naming mismatch, not a trap. Replace with: "Naming mismatch found while surveying." |
| §1.1, "I looked at the live pages, not cached knowledge." | Good — explicit provenance statement distinguishing observed fact from memory. No flag, this is the standard's ask met directly. | | |
| §1.2, "confirmed by inspecting the live, rendered DOM... not from a static fetch" | Good, same pattern. No flag. | | |
| §1.2, "Other rows use tags like 'Near Best', 'Best: Human'... The tag is prose, not a fixed enum" | Good — explicitly warns the reader against over-structuring free text. No flag. | | |
| §5, "This is on the order of 15–30 minutes per page for a careful human pass, faster for an agent" | Vague quantifier for a time estimate, partially backed | "faster for an agent" | The 15-30 minute figure has a stated basis (13 slots, under 100 links). "Faster for an agent" has none — no number, no basis. Either give an estimate or cut the clause; as written it reads as a fact appended to a measured estimate, borrowing its credibility. |
| §1.1, "it is possible the guide changed since this survey. This point was verified only against the pages fetched on 2026-07-28 and is not certain to be Wowhead's permanent structure." | Exactly the standard's ask — dated, scoped, explicit about what could invalidate it. No flag, model example. | | |
| §7, "Explicitly out of scope for this sub-phase" | Good structural habit — up front listing of what wasn't done, consistent with 00-decisions.md's closing section. No flag. | | |

**Verdict:** Very strong. Provenance is stated repeatedly and specifically
("I looked at the live pages," "confirmed by inspecting the live DOM," dated
survey caveat). The only real flags are one figurative word ("trap") and one
unbacked estimate tacked onto a backed one. Usable as-is by an implementer.

---

## 04-universe.md

| Location | Category | Offending text | Plain replacement |
|---|---|---|---|
| §0, "Give that rule a character with a worse libram and it deletes a real upgrade" | Fine — concrete claim, causally clear, matches the parent plan's own measured finding. No flag. | | |
| §3.1, "roughly 200 to 310 items" repeated from parent plan without re-derivation flag at first use | Measured-vs-assumed | "roughly 200 to 310 items" | This number is carried over from the spike/parent plan. The document does eventually say (§5.4) "No number from the spike should be restated as this sub-phase's own result without rerunning it" — but that caveat is 400 lines after several uses of the number as if settled (§0, §3.1). Move a one-line version of the §5.4 caveat to the first use in §0, not only to the closing exit-criteria section, so a reader skimming from the top isn't misled before reaching the caveat. |
| §2.3, "This is a real cleanup step, but it is not what makes the pool simulation-sized." | Fine, plain, correctly contrastive. No flag. | | |
| §3.4, "roughly the same order of magnitude as the 191-item run already completed — call it comparable cost, since 201 is within 5% of 191 — say untested for the exact minutes" | Good — refuses to assert a number it doesn't have, gives the actual math for why the analogy is fair. No flag, exemplary. | | |
| §4.1, "PLAN.md §8.3.3 already names hit cap as exactly this kind of player-specific variable" | Unexplained jargon on first use | "hit cap" | Never defined in this document. A reader without TBC gear-scoring background does not know what "hit cap" means or why it matters for ranking. One clause needed: "hit cap (a stat threshold below which attacks can miss; a character below it values hit-rating gear differently than one above it)." |
| §5, item 3, "3. If the full assembled universe is already small enough to simulate directly within the phase-turnaround budget" | Vague quantifier, undefined term | "phase-turnaround budget" | Never defined anywhere in this document or (as far as this review checked) the parent plan. Either state the actual budget (a number of minutes/hours) or replace with "within an acceptable run time (no threshold set by this plan — see §3.4)." As written it implies a budget exists and was consulted, when the document itself says no threshold is set. |
| §6, "Sequencing note" | Good — explicit dependency list with a stop-and-report instruction rather than silently guessing. No flag. | | |

**Verdict:** Strong on measured-vs-assumed discipline in its second half
(§3.4, §5.4) but inconsistent about deploying that discipline early — the
191–310 item figures get used casually before the caveat about not trusting
them shows up. One undefined term ("hit cap") and one phantom-defined term
("phase-turnaround budget," referenced as if a real number exists when none
does) should be fixed. Usable by an implementer, but a reader moving top to
bottom will treat some numbers as settled before the document itself says
they aren't.

---

## 05-rank-wiring.md

| Location | Category | Offending text | Plain replacement |
|---|---|---|---|
| §2, "This is a straight simplification, not a new escape hatch: there is no longer a 'small' mode to escape from." | Fine, plain, well-argued. No flag. | | |
| §2, "The measured cost of the second gate: ... Spearman correlation... 0.183" | Unexplained jargon (repeat of parent-plan issue) | "Spearman correlation" | Same fix as flagged in raid-scoped-pool-plan.md: define once, in whichever document a reader is most likely to open first. Since this document is downstream, a two-word parenthetical suffices: "Spearman correlation (rank-agreement score, 0 to 1)." |
| §2, "the corrrelation number says the ranking it uses to choose what to discard is close to arbitrary (0.183 is weak-to-none, not 'noisy but usable')" | Contains a typo ("corrrelation") — not a writing-quality flag under this rubric, but worth noting since it affects credibility of a document whose whole point is precision. | "corrrelation" → "correlation" | Fix the typo. |
| §2, "an 80-item global cap from a universe of several hundred is a harder cut than 50%, so it is at least as likely to discard a real upgrade" | This is an inference presented as following necessarily ("is at least as likely"), but no comparative measurement of the 80-item-cap's own recall is given anywhere in this document — the 50%-cut recall figure comes from a different measurement (the parent plan's 191-item test) against a different cut mechanism (percentile, not fixed-N). | "is at least as likely to discard a real upgrade" | This is a plausible inference, not a measured fact, and the document states it in the same voice as the sentences that ARE measured (the 0.183 correlation, the Khorium Battleplate example). Mark it: "is plausibly at least as likely to discard a real upgrade — untested directly, since no fixed-80 cut was itself simulated against the larger universe." |
| §4, "Recommended: report-time... This does cost more DPS-seconds on any single invocation" | Good — recommendation given with an explicit named cost, not hidden. No flag. | | |
| §5, "This is affordable in the sense the parent plan already asserts... This sub-phase inherits that judgment rather than re-deriving it, but should re-verify" | Good — explicitly flags an inherited, unverified assumption as such. No flag. | | |
| §5, "Not acceptable... ask the user what is tolerable before treating any specific number as a hard limit" | Good, refuses to invent a threshold. No flag. | | |

**Verdict:** Second-strongest document after the parent plan and
00-decisions.md. One typo, one unexplained term inherited from upstream, and
one inference dressed in more certainty than it has earned (the 80-vs-50%
comparison). All three are small, surgical fixes. Everything else in this
document is careful about separating "the parent plan already measured this"
from "this document is choosing to inherit that without re-checking."

---

## 06-hardening.md

| Location | Category | Offending text | Plain replacement |
|---|---|---|---|
| §1, "The proof (success criterion S6)... Prove this with a test that is mechanical, not a code-reading argument" | Good, precise, gives the actual test code. No flag. | | |
| §2, opening paragraph, "Each test below should assert on specific item IDs, per the task instruction, not on aggregate counts alone — counts can pass by accident" | Good, concrete reasoning given for a stylistic rule. No flag. | | |
| §2.1, "**Today's measured failure:** 2 of 16 items per set survive the generator" | Measured-vs-assumed problem: this reasserts the parent plan's number but the "Re-run target for this claim" sentence right after admits "check ... for the exact command before writing the test, since this plan does not re-derive it." | "measured failure" stated as a header/fact, with the actual re-run command deferred to "check that other file" | Weaker than the standard's bar: a document restating a number as fact while pointing at an unnamed, unlocated command in another file is not fully re-runnable from this document alone. Name the exact command or script path, not "check X before writing the test." |
| §2.2, "exact numeric/proto source, not a re-derived string, to avoid the test and the generator silently drifting apart" | Fine, precise, good engineering reasoning plainly stated. No flag. | | |
| §3, "The gap, stated precisely" heading, then: "nothing in this repo detects that automatically" | Fine, plain. No flag. | | |
| §3, item 2, "since they are what determines pool membership going forward (parent plan D6), not the wowsims curated sets (which are display-tag input only, per D3/D4 and this plan's section 1)" | Dense but each clause is backed by a citation (D6, D3/D4, "this plan's section 1"). Acceptable density, not vague — leave as is. | | |
| §4, "Current text (measured, read directly from the file)" then quoted docstring | Good, exact quote with file/line reference. No flag. | | |
| §5, summary table | Fine, standard implementer handoff table. No flag. | | |

**Verdict:** Solid, close to the standard everywhere except §2.1, where a
"measured failure" is asserted as this document's own fact while the actual
re-run command is deferred to "whatever script produced it... check
[filename] for the exact command." That is a pointer to a pointer, not a
re-runnable command, and it sits directly under a bolded "measured" label —
exactly the pattern that should be flagged, since the bold claim reads as
stronger than what's actually behind it. One fix needed; otherwise clean and
actionable.

---

## Ranking, worst to best on clarity

1. **04-universe.md** — the numbers-used-before-their-own-caveat problem
   (§0/§3.1 using 200–310 before the "don't trust this yet" caveat appears in
   §5.4) plus two undefined/phantom terms ("hit cap," "phase-turnaround
   budget") make it the document most likely to mislead a reader who doesn't
   read to the end first.
2. **01-atlasloot.md** — no factual problems, but two structural issues
   (buried recommendation in §3.4, run-on sentence in §3.1) and one
   undefined term used repeatedly ("two-hop") cost real reading time and make
   it the least efficient document to act on, even though nothing in it is
   actually wrong.
3. **06-hardening.md** — one weak link (§2.1's "measured failure" pointing at
   an unnamed command in another file) in an otherwise careful document.
4. **05-rank-wiring.md** — a typo, one inherited undefined term, and one
   inference stated with more confidence than it has earned; otherwise
   consistently disciplined about what's inherited vs. re-verified.
5. **03-wowhead-lists.md** — one figurative word, one unbacked estimate
   riding alongside a backed one; otherwise exemplary provenance discipline.
6. **02-two-hop.md** — no material issues found. Finds and documents a real
   bug, separates what-was-checked from what-needs-checking throughout.
7. **00-decisions.md** — one real problem (an unsupported "how players
   actually play" claim stated as fact) in an otherwise exemplary document,
   including the best "what we did not measure" section in the set.
8. **raid-scoped-pool-plan.md** (parent plan, best) — one undefined term
   (Spearman correlation) and two disposable adjectives; otherwise the model
   for the rest.

Note on ranking method: 00-decisions.md and raid-scoped-pool-plan.md have
fewer and smaller problems than 02-two-hop.md's zero found problems would
suggest they should rank below it — but 00-decisions.md's single flagged
issue (an unbacked behavioral claim presented as fact) is exactly the
highest-severity category (#3, measured-vs-assumed) the standard cares
about, which is why it sits below 02-two-hop.md despite otherwise stronger
structure. Severity of the worst flaw outweighs count of flaws in this
ranking.

## Cross-document issues

- **"Spearman correlation" is used undefined in two documents**
  (raid-scoped-pool-plan.md §2, 05-rank-wiring.md §2) and never defined in
  either. Define it once, in the parent plan (since it's read first), and
  the downstream document can then just use the term.
- **"Two-hop" is defined well in the parent plan (§5.3) and in
  02-two-hop.md (§0), but used undefined in 01-atlasloot.md and
  04-universe.md.** Since each subplan is meant to be independently
  pickable, either restate the one-line definition on first use in every
  subplan, or add a standing note at the top of the subplans directory that
  all subplans assume the parent plan's terms are already known — pick one,
  don't leave it inconsistent.
- **The "what this did not measure / explicitly out of scope" closing
  section pattern** (00-decisions.md, 03-wowhead-lists.md §7,
  01-atlasloot.md §7) is the single best structural habit in this document
  set and is missing from 04-universe.md and 06-hardening.md. Both would
  benefit from the same closing-section treatment; 04-universe.md has the
  ingredients (§7 "Out of scope") but it's thinner than the others' versions
  and doesn't do the same job of listing what was NOT measured, only what
  wasn't built.
