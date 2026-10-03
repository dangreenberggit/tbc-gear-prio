Status: open
Type: task
Origin: pre-merge-review standards axis (round 2), feat/tab-signoff-followups, 2026-09-18
Blocks: none
Blocked by: none
Related: 428 (Content content-block), 429 (Sim-sets content-block), the resultsBlock pattern

# ContentBlock header scaffold is hand-written three times in the tab

Standards finding (minor, judgement call) from the round-2 review. The
`.content-block` header scaffold — `div.content-block > div.content-block-header
> h6.content-block-title` + `div.content-block-body` — is now written out THREE
times in `upgrades_tab.tsx`: `resultsBlock` (~2218-2227) and the two new wraps
added by 428 (~740-744) and 429 (~761-765).

`resultsBlock`'s own comment explains why IT is inlined rather than
`new ContentBlock(...)` — a persistent-root lifecycle reason. But that reason
does NOT apply to the two new static wraps, which are built once inside the
settings render. So the duplication is copy-paste ×3, and it cuts against this
batch's own "borrow native wowsims components" theme — the honest borrow is the
`ContentBlock` component itself, or a one-line local `contentBlock(title, body)`
helper both new wraps (and possibly `resultsBlock`) call.

## What would close this

- A single local helper (or the native `ContentBlock` where the lifecycle
  allows) produces the header+body scaffold, called by the 428 and 429 groups
  (and `resultsBlock` if its persistent-root constraint permits). No behaviour
  change; `pnpm fork-lint:check` + the layout gate stay green.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(the three `.content-block` scaffolds), and `ui/core/components/content_block.ts`
(the native component, if reused).

## Notes

Minor, deferred from the round-2 pre-merge review (not merge-blocking — no
behaviour issue, fork-lint clean). A tidy-up that removes the 3× repetition.
