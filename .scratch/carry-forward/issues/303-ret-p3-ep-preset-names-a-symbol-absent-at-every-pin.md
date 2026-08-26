# ret/p3 EP preset names a fork symbol that exists at no pin we have

Status: open
Origin: pre-merge review feat/upgrades-dedup-wowsims (EP gate acceptance)
Blocks: none

`scripts/check_ep_presets.py` verifies each committed EP-weight file against the
fork symbol it names. 19 of the 20 files match exactly. The 20th cannot be
checked at all:

```
python scripts/check_ep_presets.py
```

→ `ep presets check: NOT VERIFIED -- data\presets\ret\p3.ep-weights.json:
symbol P3_EP_PRESET not found in ui\paladin\retribution\presets.ts`

`data/presets/ret/p3.ep-weights.json` cites
`wowsims/tbc-new ui/paladin/retribution/presets.ts P3_EP_PRESET`, and its own
`pin` field records why that fails: the numbers were transcribed from
`ac0ed034b` (master, 2026-08-13), which is **ahead of** this repo's fork pin.
`P3_EP_PRESET` does not exist at the pinned commit, so there is nothing to
compare against.

The 19/20 state was reviewed and **accepted**: unverifiable is reported loudly
on every run rather than skipped silently, which is the correct handling for a
known and recorded gap. This ticket exists so the gap cannot rot into
permanence unnoticed.

## Note for whoever bumps the pin

The same `pin` field carries a constraint that outlives this ticket: the
matching `p3.gear.json` is **not** in `ac0ed034b`. It landed 26 minutes later in
`5c7491899` ("missed jsons"), so a curated-set pin bump must reach `5c7491899`
or later, not merely `ac0ed034b`.

## Done when

Either:

- the fork pin advances past `5c7491899`, `P3_EP_PRESET` resolves, and
  `check_ep_presets.py` reports 20 of 20 verified; or
- the file's cited source is corrected to a symbol that does exist at the pin,
  if the p3 weights turn out to be traceable to one.

Until then the check must keep printing the NOT VERIFIED line — silently
passing it would be worse than the gap.
