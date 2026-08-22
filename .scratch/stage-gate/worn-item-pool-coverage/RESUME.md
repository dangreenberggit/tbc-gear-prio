# RESUME — read this first

Paused 2026-08-21, end of session, at the owner's request. Tree clean, nothing
merged, `dev` untouched.

- **Branch:** `fix/worn-item-pool-coverage`
- **Tip:** `3d09b34` ("Regenerate the other two shortlists on the fixed code")
- **`pnpm verify`:** green at `486f977`; re-run it before doing anything.

## The one thing in flight

A `gate-sme` seat was running when the session ended. It writes to:

`.scratch/handoffs/sme-rank-judgment-stage2-recheck.md`

**First action on resume: check whether that file exists.**

- **If it exists** — read it. It carries three verdict strings (slamaltman,
  shredzepelin, nexess) on the corrected reports. Go to "If the verdicts are in"
  below.
- **If it does not exist** — the seat died with the session. Re-run it: spawn
  `gate-sme` with `model: "opus"` named at the call site, pointing at
  `.scratch/stage-gate/worn-item-pool-coverage/sme-input-recheck.md`, which is
  written and ready. Nothing else needs redoing.

## Why this pass exists (the short version)

PLAN.md §14 Stage 2's last gate box — "≥3 real characters produce believable
shortlists" — is open because an SME returned `do-not-trust` on shredzepelin.
**That verdict was formed while the report was lying to the reader.** The
`worn-unrankable` warning said rows "were scored against an empty slot … Do not
read any of them as an upgrade or a loss", and the report desaturated their
deltas. Both false: the baseline is composed from the full logged equipment
(`rank.ts:652`), so those rows were always measured against the worn item.

Fixed in `486f977` — disclosure text and report styling only, four files, **no
scoring logic, no number changed**. All three reports regenerated on the fixed
code in `3d09b34` (nexess had still been carrying the old wording).

So this pass asks a fresh seat to judge the same numbers without the false
retraction in front of it.

## If the verdicts are in

The pre-registered rule, unchanged from the original run:

| verdicts | outcome |
| --- | --- |
| all three `trust` / `trust-with-caveats`, every caveat fixed or SME-agreed-ticketed | **close the box** — PLAN.md:857 |
| one character structurally unjudgeable, other two `trust` | close on a named reduced set, record the third's blocker (Stage 0's ☒ `race` box is the precedent) |
| any `do-not-trust`, or a non-disclosure wrongness finding | **box stays ☐**, name the blocker |

If it closes: tick PLAN.md:857, write a dated `docs/verification-log.md` entry
quoting the verdicts and naming the handoff path plus the regen commands, then
run `pre-merge-review` and **ask before merging**. Never `pnpm merge-to-dev`
without a separate explicit ask.

If it does not close: file the blocker as a carry-forward ticket (allocate from
`.scratch/carry-forward/issues/NEXT`, currently **259**, and bump it **in the
same commit** — see the process note on ticket 252 for why that rule matters).

## Open items the owner has not ruled on

- **257** — meta-socket pricing. Investigated, no bug found; shredzepelin's
  baseline is Wolfshead Helm, which has no sockets, so both sides already match.
  Left `Status: open` with a recommendation to close as works-as-designed.
  **The owner's call, not yours.**
- **252** — the stage-gate seats' `WRONG_MODEL` guard misfires on "Opus 5"
  because it reads a substring test as equality. Every Opus seat spawn in this
  session carried a pre-emptive correction in the prompt as a workaround; keep
  doing that. The real fix edits `.claude/agents/*`, which `AGENTS.md` says must
  be proposed in chat and approved first, and needs a fresh session to take
  effect.

## Closed this session

253 (the disclosure defect above), 250 (upstream's feral rotation is ~43 DPS
*better*, not ~18 worse — the old pair was measured on a binary we no longer pin),
256 (item 31677 is Fel Mana Potion, not Flame Cap). 258 shelved `wontfix` —
powershift and swing-timer behaviour live entirely in wowsims; `packages/core`
has zero references.

## Do not redo

- **The Ahune neck/back ids.** Ticket 108 settled them and the owner verified
  both against Wowhead on 2026-08-11. Legitimate TBC phase-2 epics, correctly
  resolved, worth ~96 DPS for the pair.
- **Widening the heroic gate.** `assemble_universe.py:68-76` excludes all heroics
  but Magisters' Terrace deliberately; that is ticket 17's pre-raid question.
- **The force-include fix for 253.** It was planned, reviewed and killed on
  measured grounds — the anchor row it adds is `delta ≈ 0`, fails `meetsCutoff`,
  and gets filtered from the shortlist (0 of 44 owned rows clear the cutoff
  across the three reports). Ticket 253's closing section records the full
  reasoning.
