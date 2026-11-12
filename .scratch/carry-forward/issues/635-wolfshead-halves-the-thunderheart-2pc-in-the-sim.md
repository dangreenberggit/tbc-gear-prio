Status: closed
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 follow-on (Out-of-scope)
Type: research
Origin: gate-sme finding F2, stage-gate tab-set-bonus K2 (.scratch/handoffs/sme-rank-judgment-467-worn-thunderheart-sweep.md, committed 93ad75b5)
Blocks: none
Blocked by: none
Related: 467, 497, 498, 258

# The sim values the Thunderheart 2pc about half as much while Wolfshead Helm is worn

In the live feral sweep at worn Thunderheart 0 to 4 (fork `176268e7c`,
phase 3, 3000 iterations), the Thunderheart 2pc is worth about 95 to 120
DPS while Wolfshead Helm is worn and about 204 DPS on the one row that
removes it. The tab prints these figures as the sim gives them; this ticket
records the interaction so it is not lost. It is upstream's combat
modelling (ticket 258: combat modelling is upstream's), so no tab change is
planned here.

## The numbers (gate-sme F2)

- Thunderheart Cover alone, which replaces Wolfshead: −198.3 DPS at worn 0,
  −88.5 at worn 2, −68.0 at worn 4.
- Thunderheart 2pc implied by the add steps with Wolfshead worn: about 95
  to 120 DPS (worn 0 rows: the Pauldrons and Gauntlets 2pc steps; worn 1
  toggle-off lines +97.9, +95.2 and +85.0 minus each piece's own stats).
- On the Cover row, where Wolfshead is gone: about 204 DPS (worn 0 Cover row
  "Thunderheart Gauntlets (2pc): +211.6"; worn 1 Cover toggle-off figure
  +4.8).
- The Malorne 2pc on Stag-Helm shows the same shape: about 106 against
  about 80.

The SME found the figure consistent across four independent measurements,
so the printed lines report the sim faithfully. Whether the 2pc's Mangle
cost cut is worth 4 to 8% DPS in game, the SME could not confirm:
**recalled, unverified** (the SME's words). Why Wolfshead changes the
2pc's value is a hypothesis, untested.

Evidence: `python -I .scratch/stage-gate/tab-set-bonus/497-read.py` in the
main checkout prints `497-read.txt` (gitignored stage folder); the SME cites
its lines 5-16, 53-56, 83-97, 192-195, 255-257 and 335.

## What would close this

1. A check of upstream wowsims' feral model for how Wolfshead Helm's effect
   and the Thunderheart 2pc combine, with the code lines named; and
2. either a note that the sim matches the game (close as research done), or
   an upstream issue or note for the owner to decide on (this repo files
   none itself).

**2026-10-15 — lead from the pre-merge review of `feat/tab-set-bonus`
(finding D2).** Upstream's feral rotation reads both Wolfshead and the
Mangle cost that the 2pc lowers: `sim/druid/feralcat/rotation.go:52` sets
`Wolfshead` when item 8345 is worn in the head slot, `:189` reads
`waitToMangle := mangleNext || (!rotation.Wolfshead && mangleCost <= 38)`,
and `:268-272` run a Mangle step gated on `mangleCost == 35` that the code
comment calls relevant for no-Wolfshead rotations (fork `f4b78f65d`). That
these lines explain the halved 2pc value is a hypothesis, untested; they
are where close condition 1's check starts.

## Closed 2026-11-12: research done, no tab bug and no wowsims ticket

The sim still prices the Thunderheart 2pc at about half while Wolfshead
Helm is worn. That is what the bonus is worth on that gear: a bonus's worth
depends on the rest of the gear worn, and the helm is part of it. The tab
prints the sim's figure, and wowsims applies both items' effects as their
tooltips say, so there is no tab bug and no wowsims ticket follows. The
measurement below splits the gap into two parts, and neither is a bug. The
cat rotation plays a different line with each helm and picks the stronger
one each time. On a fixed line, the 2pc is still worth less with the helm's
effect than without it. Full triage:
`.scratch/agent-reports/2026-11-12-general-task-635-triage.md` (gitignored;
this note stands without it).

**The measurement** (fork `bf9c26a00`, 100,000 iterations, seed 635). Base:
the feral `p2_6p` preset (phase 3's previous phase) with hands and legs
swapped to Thunderheart Gauntlets 31034 and Leggings 31044; buffs, target,
talents and the 180 s fight are the feral page defaults. Each variant has the
same stats: "2pc off" empties the hands slot and adds the Gauntlets' stats as
bonus stats; "Wolfshead off" empties the head slot and adds the stats of Wolfshead and
its head enchant, Glyph of Ferocity. So only the set bonus and the helm's effect (with the
rotation's checks for it) differ. Each run's SE is 0.23 to 0.26.

| Rotation | Wolfshead effect | 2pc on | 2pc off | 2pc worth |
|---|---|---|---|---|
| Default APL (the page's "Auto") | on | 2416.4 | 2336.0 | 80.5 ± 0.4 |
| Default APL | off | 2169.4 | 2019.3 | 150.0 ± 0.4 |
| Simple rotation | on | 2332.7 | 2283.0 | 49.8 ± 0.3 |
| Simple rotation | off | 2135.4 | 1980.8 | 154.6 ± 0.3 |

Flipping only the default APL's "Wait To Mangle" branch, 2pc on: without
Wolfshead, 2169.4 as shipped against 2124.4 on the Wolfshead line; with
Wolfshead, 2416.4 as shipped against 2387.5 on the no-Wolfshead line. So the
shipped line is the higher-DPS one for each helm. With the line held fixed,
the 2pc is still worth less with the helm's effect: 80.5 against 105.1 on the
Wolfshead line, and 51.5 against 150.0 on the no-Wolfshead line.

**Where the two effects meet in the code.** Wolfshead gives +20 energy per
shift into Cat (`sim/druid/items.go:214-229`); the 2pc cuts Mangle (Cat) by 5
energy (`sim/druid/item_sets.go:226-234`). Neither effect reads the other.
The rotation reads both: the APL's "Wait To Mangle"
(`ui/specs/druid/feralcat/apls/default.apl.json:54`: Mangle Next, or Mangle
cost ≤ 38 and no Wolfshead aura 17768) and the simple rotation's
`waitToMangle` (`sim/druid/feralcat/rotation.go:189`) and two-Mangles trick
(`:267-273`, "relevant for no-Wolfshead rotations"). The rotation is ported
from NerdEgghead's TBC_cat_sim (`rotation.go:11`), whose author explains the
choice at `tbc_cat_sim.py:1297-1310` (commit 59cc8576): without Wolfshead,
Mangle beats Shred as the second special when a bonus like 2pT6 brings
Mangle to 38 energy or below. These files are upstream's: `git diff --stat
upstream/master HEAD -- sim/druid ui/specs/druid/feralcat/apls` in the fork
prints nothing (2026-11-12). The tab simulates the page's own raid proto,
rotation included, and no tab code reads Wolfshead to price anything. Game
truth is unverified: the effect texts are tooltip copies, and the rotation
preference is the reference sim author's theorycraft.

**Re-run** (about a minute of sims at 100,000 iterations). The three scripts are
tracked copies of the triage's. `635-make_requests.py` writes the eight
requests out by hand from the fork's `p2_6p` gear set and default APL, with
the page's buffs, debuffs, consumables, talents, target and the simple
rotation's options; `635-make_attribution.py` flips "Wait To Mangle" in the
two default-APL 2pc-on requests. From the main repo root, with `F` the fork
checkout and `O` a scratch folder:

```sh
N=.scratch/carry-forward/notes
(cd $F && GOFLAGS=-buildvcs=false go build -tags=with_db -o $O/wowsimcli ./cmd/wowsimcli)
python3 -I $N/635-make_requests.py $F $O/runs 100000
for q in $O/runs/*.req.json; do $O/wowsimcli sim --infile $q --outfile ${q%.req.json}.out.json; done
python3 -I $N/635-summarize.py $O/runs
python3 -I $N/635-make_attribution.py $O/runs $O/attrib
for q in $O/attrib/*.req.json; do $O/wowsimcli sim --infile $q --outfile ${q%.req.json}.out.json; done
python3 -I $N/635-summarize.py $O/attrib
```

Without `-tags=with_db` the build fails on item 8345. The pre-merge review
(`docs/reviews/fix-623-set-floor.md`) ran these commands at 10,000 iterations
on fork `adf591743`: 81.2, 149.6, 48.9 and 155.2 for the four rows (each
± 1.1), and 2123.2 and 2386.9 for the two flipped lines, all within about 1 SE
of the table.

Verified by: `tbc-new-fork@bf9c26a00` (`sim/druid/feralcat/rotation.go:52,189,267-273`,
`ui/specs/druid/feralcat/apls/default.apl.json:54`, `sim/druid/items.go:214-229`,
`sim/druid/item_sets.go:226-234`, read 2026-11-12), the runs in the table
above, and the 10,000-iteration re-run in `docs/reviews/fix-623-set-floor.md`.
