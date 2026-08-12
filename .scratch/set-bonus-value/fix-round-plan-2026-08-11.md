# Fix round plan — 2026-08-11

Branch: `feat/set-bonus-value`. Serial synchronous workers, TDD, `pnpm verify`
green before each commit, `git status` before each commit. Per-worker logs in
`.scratch/set-bonus-value/fix-round/NN-*.md`; `DIRECTOR.md` there updated after
every worker. Style rule for everything written this round: plain English, no
jargon.

## Owner decisions being implemented

- **Ticket 117**: the gem-swapping step that keeps a meta gem active must pick
  replacement gems from the same rare-quality-capped list the socket-filling
  step uses. We are comparing gear upgrades, not sneaking in gem upgrades.
  Before writing our own rule, check what the pinned wowsims upstream
  (8aa378b3671a0923fd11fb34b4b3753e53f20c9b) actually does when it suggests
  gems, and copy that approach where it fits. Pin with a test, then re-run the
  helm comparison (Cursed Vision 32235 vs Vengeful 33672, wowsimcli v0.0.101,
  seeds 11/22/33/44/55, 3000 iters) and record the new number against the
  owner's web measurement of +10.69.
- **Ticket 118**: every measured set-bonus threshold's package value rides on
  member rows as its own number (2pc worth X, 4pc worth Y, shown separately in
  the row detail and the chip marker). Package mode sorts by the best of the
  measured package values for that row's set. Do not hide the control, do not
  add advisory prose, keep the default view unchanged. Append a dated note to
  ADR-0024 and reconcile spec.md.

## Workers (serial)

1. **W1 — ticket 117** (meta repair gem cap + upstream check + helm re-measure).
2. **W2 — ticket 118** (per-threshold packages on rows + sort + docs).
3. **W3 — cheap sweep**: ticket 120 (warn on implausibly negative bonuses),
   ticket 123 (trim the crash text in the report to its first line), ticket 115
   (chip package marker keyed on the real package fact, not a number
   comparison).
4. **W4 — judgment sweep**: ticket 119 (assess; if option B — print the
   unmeasurable 2pc as unmeasured instead of 0.00 — is cheap, do it; otherwise
   leave open with a written plan), ticket 122 (do if cheap, else record the
   drop-and-disclose behaviour as accepted with a test), ticket 116 (judge:
   likely a guarding comment or a required-parameter change).
5. **Regenerate both reports** (feral shredzepelin, ret slamaltman) and check
   the new numbers and displays.
6. **W5 — fresh-context review**, adversarial + spec axes, over this round's
   commits. Findings reported verbatim to the owner; not fixed by this round
   unless one-line factual corrections.

Parked unless trivially adjacent: 105, 109, 113, 114, 121, 124.
