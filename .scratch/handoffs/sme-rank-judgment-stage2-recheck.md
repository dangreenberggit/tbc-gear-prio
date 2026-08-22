# SME rank judgment — stage2-close recheck (ticket 252 follow-up)

**INCOMPLETE — session ended mid-pass.** Machine shutdown was announced while
I was partway through. One verdict reached, two not reached. Do not treat the
missing two as implicit passes.

Seat: SME (gate-sme), Opus 5. Model self-check passed ("Opus 5" contains
"Opus"). Ticket 252's incorrect equality-test reading of that guard did not
recur.

## 1. Verdicts

| character | spec / phase | verdict | status |
| --- | --- | --- | --- |
| slamaltman | ret, maxPhase 3 | **trust-with-caveats** | reached, reasoning below |
| shredzepelin | feral cat, maxPhase 2 | **NOT REACHED** | report not opened |
| nexess | feral cat, maxPhase 2 | **NOT REACHED** | report not opened |

### slamaltman — `trust-with-caveats`

The shortlist reads as believable TBC ret gear advice. I went in expecting to
fail it and did not.

**Why I nearly failed it, and why that was my error.** The top of the list is
dominated by leather agility/attack-power pieces with **zero strength** —
Belt of One-Hundred Deaths (#1, +48.9), Cursed Vision of Sargeras (#6),
Shadow-walker's Cord (#7), Valestalker Girdle (#11), Shadowmaster's Boots
(#15), Bow-stitched Leggings (#20), Forest Prowler's Helm (#29). On a first
read that is the classic wrong-role tell for a plate melee class. It is not
one here. Two things settle it:

- Eight of those rows carry `bisTags: ["BiS"]` against upstream wowsims'
  **pinned ret P3 gear set**, which is an independent source this repo did not
  author. Every non-worn BiS item lands in the top 22; the other eight BiS
  items are already worn and correctly show `0.00`.
- The character already wears three such pieces (Shoulderpads of the Stranger,
  Shapeshifter's Signet, Pendant of the Perilous), all BiS-tagged. The list is
  continuing a gearing direction the character is already on, not inventing one.

**Recalled, unverified:** TBC paladins gain no attack power from agility, so
these pieces are carried by their flat AP and crit budget rather than by agi.
That is consistent with the deltas but I did not verify it against sim output.

Baseline gear reads as a coherent mid-SSC/TK ret set (Girdle of the Endless
Pit, Warboots of Obliteration, Crystalforge Breastplate, Lionheart Executioner,
Dragonspine Trophy, Bloodlust Brooch, Libram of Avengement). Nothing worn is
shown as an upgrade. Ranged slot holds a libram, not a bow — the class equip
rule the skill calls out is respected.

**Caveats that keep this off a clean `trust`:**

| finding | severity | evidence |
| --- | --- | --- |
| Ranks 38–44 sit inside the replicate spread — delta < 2×se for all seven (e.g. #44 Lightbringer Breastplate +3.2 ± 2.17). Their ordering is noise, not judgment. | low | `node -e` over `.scratch/rank-reports/stage2-close-slamaltman.json`, comparing `deltaDps` to `2*se` per row. This is the ticket-236 seed machinery, not a gear-judgment defect. |
| One shoulder candidate (30892 Beast-tamer's Shoulders) was dropped: the pinned sim panics applying a hunter set effect to a paladin. Shoulder slot is therefore judged one candidate short. | low | `ranking.substitutions[0]` in the same JSON; the panic text names `hunter.HunterAgent`. |
| `ranking.plausibilityWarnings` is **absent** from the JSON, though the SME input note (`.scratch/stage-gate/worn-item-pool-coverage/sme-input-recheck.md` line 15) states it is present. Either the note or the emitter is wrong. | medium | `Object.keys(j.ranking)` returns `contentHash, cutoff, fight, baseline, assumptions, caps, substitutions, items, setBonuses, complete` — no `plausibilityWarnings`. Same for the shape check I ran; I did not re-check the other two files. |
| Hit is ~23 rating under cap on an assumed 3/3 Precision and an assumed Blood Elf. Talents are not read from the log. Rows whose gain is mostly hit rating are therefore priced against an assumed cap, and the report says so. | low | `ranking.caps.hit` and `ranking.assumptions.standing`. Disclosed, not hidden — hence a caveat rather than a finding. |

**What would have flipped it to `do-not-trust`:** a top-ten row that the class
cannot equip, an already-worn item shown as a nonzero upgrade, or the leather
cluster *not* being corroborated by the upstream BiS set. None of those hold.

**What would have flipped it to clean `trust`:** ranks 38–44 separating from
the replicate spread, and the `plausibilityWarnings` discrepancy resolved.

**Not contested.** Nothing in my read contradicts a claim the input note states
as fact, with the one exception of `plausibilityWarnings` above — flagging it
as `contested:` would overstate it, since it is a report-shape mismatch rather
than a gear-judgment disagreement. The note's central claim, that the earlier
retraction text was false and the numbers were always measured against worn
gear, is consistent with what I saw: worn items show `0.00` and non-worn items
show real deltas in every slot I inspected.

## 2. What I read and what I did not

**Read, and reflected in the verdict above:**

- `.scratch/stage-gate/worn-item-pool-coverage/sme-input-recheck.md`
- `.claude/skills/sme-rank-review/SKILL.md`
- `.scratch/rank-reports/stage2-close-slamaltman.json` — items, baseline,
  caps, assumptions, substitutions, setBonuses, BiS tags
- `.scratch/rank-reports/stage2-close-slamaltman.html` — text extracted to
  scratchpad; read the ranked list, the worn-item rows, the head and waist
  slot sections, the set-potential block, the standing-assumptions block
- `data/items/index.json` — stat lines for ~20 items named above
- `packages/core/src/proto/common_pb.ts` — the `Stat` enum, needed to decode
  the 42-element stat arrays in `data/items/index.json`

**Not read at all. Redo from cold:**

- `.scratch/rank-reports/stage2-close-shredzepelin.{html,json}`
- `.scratch/rank-reports/stage2-close-nexess.{html,json}`

I ran exactly one cross-character command against those two files — the
SE-versus-delta comparison in section 3. Nothing else about the feral
shortlists has been looked at. In particular I have **not** re-examined the
shredzepelin rows that drew the earlier `do-not-trust`, so that prior verdict
is neither confirmed nor overturned by this pass.

## 3. Expensive to rediscover

- **Stat arrays in `data/items/index.json` are positional, 42 wide, and
  undocumented at the call site.** The index is `Stat` in
  `packages/core/src/proto/common_pb.ts` (~line 1900). The ones that matter
  here: 0 str, 1 agi, 2 sta, 17 AP, 18 rangedAP, 19 feralAP, 20 meleeHit,
  21 meleeCrit, 22 meleeHaste, 23 armorPen, 24 expertise, 31 armor. Reading a
  stat line without this mapping is guesswork.
- **`bisTags` / `bisSets` / `curatedSets` on each item are the fastest honest
  check available.** They encode upstream wowsims' pinned set membership,
  which is not this repo's own opinion, so they corroborate independently. For
  slamaltman: 16 BiS rows, 8 worn at `0.00`, 8 unworn all inside the top 22.
  Start any future SME pass here — it took me most of the session to find it,
  and it is what changed my verdict.
- **The SE-versus-delta picture for all three, already measured:**

  | character | baseline DPS | stdev | ranked rows | rows with delta < 2×se |
  | --- | --- | --- | --- | --- |
  | slamaltman | 2003.0 | 118.8 | 44 | 7 (ranks 38–44) |
  | shredzepelin | 2266.9 | 73.8 | 14 | **0** |
  | nexess | 2302.5 | 77.5 | 12 | **0** |

  Both feral shortlists are short and every ranked row clears twice its own
  standard error. Whatever is or is not wrong with them, **it is not a
  noise-ordering problem** — a ticket-236 explanation will not cover a finding
  there. The next seat can skip that line of inquiry and spend the budget on
  the gear itself.
- Both feral runs share `poolSize` 228 and identical cutoffs, so a pool-level
  defect would be expected to show in both.
- The pinned sim panics when a hunter set effect is applied to a non-hunter
  (`interface conversion: *retribution.RetributionPaladin is not
  hunter.HunterAgent`). If a feral report is missing candidates too, check
  `ranking.substitutions` before concluding the pool is short.

## 4. Confidence

Moderate on slamaltman. The BiS-set corroboration is strong and I checked the
stat lines rather than trusting item names, but I did not verify the paladin
agility/attack-power scaling claim against sim output, and I read only two of
fourteen slot sections in the HTML in full.

No confidence either way on shredzepelin or nexess. They were not reviewed.

Nothing was committed. No git commands were run.
