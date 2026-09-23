# Overview plan: Upgrades tab — close out and review

For the overseeing agent. Detailed plans and execution belong to the agents
it delegates to; this file names the phases, each phase's done-condition,
and the one question that is the owner's. Read
`upgrades-tab-polish-HANDOFF.md` first.

## Goal

`feat/tab-signoff-followups` merge-ready by the owner's bar: every open
Upgrades-tab ticket closed or deferred with the owner's consent, review
round 10 written, `pnpm merge-to-dev --check-only` rc=0. The merge itself is
the owner's ask and is outside this plan.

## Phase 1 — Small fixes, one worker at a time on the fork

489 Source cap → 482 favorite-marks-stale → 480 baseline scope → 479
tooltip count. Each closes when its ticket Comments record the fork sha, the
main re-pin sha, `pnpm verify` rc=0, layout gate `failed:0 a11yFailed:0`,
and what was measured. 482 and 489 also get a live look on both servers.

Done: `pnpm issues:open` lists none of 479/480/482/489; both trees clean.

## Phase 2 — Engine math 476/477/478: the owner's question first

These change ranking for tier-set swaps and touch `upgrades/engine/`
(PROVENANCE cycle). Put one question to the owner in prose before any code:
fix before the merge, or defer to a post-merge branch. If now, run them as
one `stage-gate` with the fixtures written first in
`packages/core/test/fork-set-net.test.ts` and an SME seat on the resulting
ranking; 467 closes with them.

Done: the owner's answer recorded in 467's Comments; if fixed, exact-net
fixtures green and E-W3 parity green.

## Phase 3 — Review round 10

`pre-merge-review` on `7c54848f..HEAD`. Tidy findings fixed in-branch, the
rest deferred to tickets (a `defer` row needs a ticket path or merge-ready
fails). Round written into `docs/reviews/feat-tab-signoff-followups.md`.

Done: `pnpm merge-to-dev --check-only` rc=0, review committed, owner given
the summary. Stop there; the merge waits for the owner's ask.

## Rules specific to this arc

- One writer in the fork at a time: one clone, one index.
- Decisions on taste (any render) and Phase 2's question go to the owner;
  everything else the overseer decides and logs in the ticket.
