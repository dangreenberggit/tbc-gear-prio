Status: open
Type: bug
Origin: docs/reviews/feat-set-bonus-value.md round 5 (adversarial 5-A1, domain 5-D1)
Blocks: none
Blocked by: none

# `emptyMetaSocket` marks rows whose meta socket is filled

`metaSocketUnpriced` (`packages/core/src/candidate-gems.ts:167`) decides from
`socketsFor(itemId)` and the spec table alone. It never inspects the gems the
candidate actually ends up with:

    if (spec === undefined || SPEC_PREFERRED_METAS[spec]) return false;
    return socketsFor(itemId).includes(GemColor.GemColorMeta);

But `swapItemAt` (`rank.ts:1659`) fills candidate gems from
`migrateGemsToItem(...)`, which carries the player's **worn meta** onto the
candidate before fill runs. When a feral player already wears a meta, the
socket is filled and the row is still labelled empty.

Reproduced against `packages/core/dist/`:

    migrateGemsToItem([34220, 0], 29073, 29073)  -> [0, 34220]
    fillEmptyCandidateGems(29073, [0,34220], PALETTE, ep, {spec:"feral"})
                                                 -> [0, 34220]
    metaSocketUnpriced(29073, "feral")            -> true

So the row is priced *with* gem 34220's stats and effect, and
`rank-report.ts:384` prints "priced with an empty meta socket — no meta gem
preference is recorded for this spec". Both clauses are false for that row.

The **fill logic is correct** — `bestGemForSocket` genuinely leaves the socket
empty when nothing was migrated. Only the label is derived independently of
the fill, so the two disagree.

Reachable population: any feral / feral-tank character who currently wears a
meta gem — the common case for any feral not in a Wolfshead helm. The
adversarial reviewer measured the flag firing on all 268 meta-socket items in
`db.json` for feral; the 268 count was reproduced independently.

## Why it shipped green

See ticket 141. There is no `rankUpgrades` coverage for feral at all, and
`metaSocketUnpriced`'s unit test (`candidate-gems.test.ts:224`) passes bare
item ids, so it structurally asserts the buggy behaviour is correct.

## Fix

Derive the flag from the **post-fill gem array** — the meta socket's entry is
`0` — rather than from socket colours and the spec table. That makes the label
a statement about what was priced, which is what its docstring already claims.
