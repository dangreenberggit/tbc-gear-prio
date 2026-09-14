Status: open
Origin: pre-merge review of `feat/tab-scope-truth` (domain axis, finding 3)
Blocks: none

# Row 314 calls itself a correctness concern but now lists only styling

`docs/upgrades-tab-scope.md` row 314 (TMB export box) previously read:

> its correctness sub-concerns — 126 (must emit token/pattern ids, not gear ids)
> and 328 (native styling)

It now reads:

> its correctness sub-concerns — 328 (native styling)

Ticket 126 is `Status: resolved`, so removing its own row was right. But 314's
justification is now styling only, while the row still calls it a **correctness**
concern and asserts the export "must be correct, not merely present". The em-dash
list promises a set and delivers one item.

## The domain rule that went missing

TMB tracks what drops — class tokens and crafting patterns — not the finished
gear item. An export emitting gear item ids gives a player a loot list TMB
cannot match. That rule was the 126 half of the row, and it now appears nowhere
in the doc.

## The question to settle

Either 126's rule is genuinely satisfied in the tab's export, and 314's row
should say styling; or it is not satisfied, and the domain-critical half is
invisible to anyone deciding whether 314 still blocks. Read 126's resolution
note against what the tab's export actually emits before rewording.

```
git -C C:/Users/dgree/Code/lulz/tbc-gear-prio show HEAD:.scratch/carry-forward/issues/126-tmb-export-should-use-token-and-pattern-ids.md
grep -n 'export' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx
```

## Acceptance

- [ ] Determine whether the tab's TMB export emits token/pattern ids or gear ids
- [ ] Row 314 states the sub-concerns that actually remain, and its
      correctness-vs-styling label matches them
- [ ] If gear ids are still emitted, that is a live defect: file it or reopen 126
