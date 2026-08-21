# `owner-p2.settings-export.json`

The owner's 22-action feral cat APL — the input ticket 244 exists to unblock.
Committed as the provenance record of what we were handed, verbatim.

Source: <https://gist.github.com/Santiclause/4dd4fc30a3dd0e59ded608a516e26429>
Fetched 2026-08-20 from the `/raw` endpoint, unmodified.
sha256 `5798330e63c44ea5531ec21bc885d9a2a36506dcc40165368377ff9628fbd0c6`

Verified on fetch, matching ticket 244's counts exactly:

- 22 actions at `/player/rotation/priorityList`
- `timeToNextEnergyTick` x17
- `energyTimeToTarget` x0 and `energyRegenPerSecond` x0 — it uses only the new
  field, so there is no old-engine fallback hiding in it.

## It is not the same shape as the skeleton

Worth reading before anyone tries to swap this in as a file. wowsims calls
these things by several names; these are two genuinely different formats:

| | `p2.raid-sim-skeleton.json` | this file |
| --- | --- | --- |
| what it is | a full `RaidSimRequest` | a wowsims **UI settings export** |
| top-level keys | `requestId`, `raid`, `encounter`, `simOptions`, `type` | `apiVersion`, `raidBuffs`, `debuffs`, `partyBuffs`, `player`, `encounter` |
| player at | `raid/parties[0]/players[0]` | `player` |
| rotation at | `raid/parties[0]/players[0]/rotation/priorityList` | `player/rotation/priorityList` |

So landing it is a **graft of the rotation into the skeleton**, not a
replacement. That is also how ticket 244 demonstrated the silent-drop bug.

`apiVersion: 14` is itself evidence of the version gap: our pin (v0.0.101)
carries `current_version_number` 13, and 14 first appears at v0.0.105. This was
exported from an engine newer than the one we build with.
