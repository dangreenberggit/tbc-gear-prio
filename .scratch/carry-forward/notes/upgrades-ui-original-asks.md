# The owner's original eleven UI asks — verification rubric

**Purpose.** Ticket 304 closed all eleven of these as *Fixed*. The owner has
since found at least one that was closed on a technically-true disposition that
did not do the thing (item 3 — see below). This note is the **rubric for an
independent verification pass**: one checker per point, checking the running
page, not the ticket.

Reproduced verbatim from the owner's original review (2026-08-27, with three
screenshots) so no checker has to work from a summary. The numbering is the
owner's and is the numbering 304's disposition table uses.

## The asks, verbatim

> 1. this unreadable grey text is shit
> 2. the empty state :"No finished ranking to show" positioning and message is
>    terrible, its practically a lack of any styling thought whatsoever.
>    <https://www.pencilandpaper.io/articles/empty-states> here is an empty state
>    sort of UI design guide, very basic. here is a very basic guide to states:
>    <https://medium.com/@lapomeray/designing-for-every-state-a-comprehensive-guide-to-ui-states-in-product-design-77b72cef0034>
> 3. the one row of options is shit: there's too much on one line and stuff
>    inside the numbers iterations field for example gets cut off
> 4. (second picture) the spacing vertically between these components is
>    absolute crap
> 5. massive jitter between simming and no longer simming
> 6. the table spacing is absolute crap
>
> Overall, there was a total failure to be imaginative, to make a practical UI,
> and most importantly to borrow from existing styling elsewhere on the site
> (spacing, text styling, layout options)
>
> 7. "items below the cutoff" includes items already worn. of course they dont
>    provide an increase. dumb
> 8. "assumptions" looks like total ass. its hard to read, the horizontal space
>    between the label and the data is big and bad too
> 9. something like "Pool source ret-p3.universe.json (467 entries)" is kind of
>    just for development anyway, wtf is a normal user supposed to do with this?
>    look at what data is already presented to a user in the UI and think about
>    it that way. maybe assumptions should just be a console log for now if these
>    specific details are never presented to the user elsewhere.
> 10. more inspiration should be taken from the batch UI. for example it can show
>     the #1 in the ranks for gear that way, and then smaller similar elements
>     below. or maybe we can just have better tabs: they look really bad (third
>     picture) and theres no organizaton of them and they can show how many
>     options are in that category in parenthesis in the tab label and maybe be
>     slightly disabled if they have nothing
> 11. the progress bar jitters back and forth left and right between when it
>     first pops up and when it shows progress and even during it showing
>     progress (probably the text next to it and really dumb styling/css)

**The overall judgment is itself an ask**, not preamble: imagination,
practicality, and above all **borrowing existing site styling** rather than
inventing a second idiom. A checker should weigh it.

## How to verify

- **Check the running page, not the ticket.** 304's disposition table is the
  claim under test — reading it first biases the check. Look, then compare.
- **Check the state the owner was complaining about.** Item 3's disposition is
  true of the post-run DOM and false of the pre-run page. Several of these are
  state-dependent (2 is pre-run, 5 and 11 are during a run, 7/8/9/10 are
  post-run).
- **Measure where the ask is measurable.** 1 is a contrast ratio. 5 and 11 are
  positional spreads across a run. 3 is a field width against its content.
- Screenshots need the **Chrome extension** (`mcp__claude-in-chrome__*`); the
  in-app browser pane could not composite frames.

## Known state of each, as of 2026-08-27

304 marks **all eleven Fixed**, each with a measurement. Two carry admitted
residue in the disposition itself:

- **Item 3 — the reason this note exists.** Disposition claims *"Toolbar split
  into two rows."* Verified in markup: `.upgrades-run-controls`
  (`upgrades_tab.tsx:461`) holds all seven crowded controls, and
  `.upgrades-view-controls` (`:514`) is a **separate, pre-existing** row of
  post-run view toggles carrying `d-none` until a run finishes. The split did
  not touch the crowded row. **Re-filed as ticket 312.** The `8ch` iterations
  width was closed honestly (6ch/7ch measured as clipping "3000"), and the
  disposition states plainly that five-digit values still clip — but the owner's
  screenshot shows `3000` tight against the edge, so re-measure rather than
  assume.
- **Item 10** — the hero-#1 card was dropped with a stated reason and the
  divider idiom shipped under ticket 307 instead. Whether all 17 equip slots
  render greyed-when-empty is recorded as still open (ticket 305).

Everything else is claimed Fixed with no admitted residue, which is exactly what
an independent pass is for.

## Related open tickets on the same surface

- **310** — results table wraps character-by-character at narrow width;
  contradicts the mobile rule that exists to prevent it. Touches item 6's
  surface.
- **311** — raw Go stack trace rendered in end-user UI; the panic behind it may
  matter more than the presentation.
- **312** — item 3, re-filed (see above).
- **305** — whether empty slot tabs render; the open half of item 10.
