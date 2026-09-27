# Owner feedback on the five cases (proposal-cases.md), 2026-09-27

Verbatim. The owner was answering Q-popover-cases. Each numbered item quotes the orchestrator's summary of a case, then gives the owner's answer.

> 1. "The tool has no separate figure for the 2pc it completes, so the stats and the bonus share one line. " that makes sense, sure.
> 2. "Set potential adds nothing (Nordrassil Chestplate). The popover is just "Item stats +16.8 / Total +16.8", and it is the same with the toggle on or off. There is no "Set potential" section in this case." this is a tooltip that redunantly shows the same info twice, and its the same info that would also be in the row already without the tooltip, so its recursive redundancy. I think the answer here is no tooltip needed Or a message saying that there's no measurable benefit from set bonuses
> 3. "getting 2 pc breaks" seems unnecessary. that could be wrong but i dont get this wordiness. you could just say "breaks..."
> 4. fine i guess. "couldnt measure" and "not measured" are two different things though, so if theres a better way thats not longer text that would be more accurate, that would be better. Maybe even "error measuring" (and presumably wed already have a log of that error in the console)
> 5. sounds good
>
> it seems like the ticket 517 "gap" is addressed by my comments on 2.

Context (agent): case 5 was the Mantle popover at widths 768 and 375. The "517 gap" was the Nordrassil Chestplate row showing the "set detail" hint with no set line in its popover. Ticket 517 quotes the owner: "item stats" should only display if thats not the same as the dps figure.
