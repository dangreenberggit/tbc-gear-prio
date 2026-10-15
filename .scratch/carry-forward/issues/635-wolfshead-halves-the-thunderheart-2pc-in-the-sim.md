Status: open
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
