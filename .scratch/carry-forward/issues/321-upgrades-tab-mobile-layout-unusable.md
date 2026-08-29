Status: closed
Type: bug
Origin: owner report, 2026-08-27 ("mobile view bad"); measured in the running page the same day
Blocks: none
Blocked by: none
Closed: 2026-08-28 (fork `0e94d3ea9`, re-pin `c673c1f`)

# Upgrades tab is built desktop-only; run controls land below the results on mobile

Measured live in the Ret Paladin sim at 375x812 (`resize_window` mobile preset,
page reloaded so load-time gates re-ran).

## What is wrong

At 375px `.tab-pane-content-container` stacks to `flex-direction: column`, so the
right-hand settings panel falls **below** the left panel. Absolute offsets
measured on the page:

| Element | Absolute y |
| --- | --- |
| view controls (`.upgrades-view-controls-host`) | 966 |
| results / sub-tabs (`.upgrades-tab-tabs`) | 1025 |
| **settings card** (`.upgrades-settings-container`) | **1383** |
| **Run button** (ours, `.upgrades-run-button`) | **1255** |

So the controls you use *before* a run sit under the output *of* the run — about
1.5 viewport heights down. On desktop the card is a right-hand panel beside the
results and this never appears.

Compounding it: the card's `position` computes to **`static`** at this width —
sticky is dropped below the breakpoint, so nothing pins the controls while you
scroll the results.

## Why it shipped

Verified by grep over `_upgrades_tab.scss`: the file has **8** breakpoint blocks,
but **none of the four classes this stage introduced** — `.upgrades-settings-container`,
`.upgrades-view-controls-host`, `.upgrades-run-controls`, `.upgrades-view-controls` —
appears inside any of them. The rebuild was written for desktop and never given
a narrow-width pass. The stage's own acceptance checks all pinned desktop widths
on purpose (a narrow check would have passed vacuously against the F11 grid
containment, which is inert below `lg`), so nothing looked at this.

## Not in scope of this ticket

Touch-target sizes. Most controls measure 40px tall, marginally under the usual
44px guidance, but that is the site's own Bootstrap sizing and is not something
this stage changed. The one genuine outlier (40x27 `btn-sm` Run) is upstream
header chrome, not the rebuilt card.

## What is not wrong

No horizontal overflow: `document.documentElement.scrollWidth` equals the 375px
viewport and zero elements extend past it. This is a stacking-order and
affordance problem, not a blowout.

## The decision needed

Owner's call on the shape. Options, cheapest first: order the settings card
above the results at narrow widths; make it a collapsible panel; or keep the
run affordance pinned while the results scroll. Each is a different answer to
"what should a phone user see first".


## Closed 2026-08-28

Fixed to the owner's spec: settings card above the results at narrow widths,
the four set-once controls collapsed behind a "Run settings" toggle that starts
closed, Run and Stop always visible. Scoped to `media-breakpoint-down(xl)` —
`xl`, not `lg`, because 1200px is where the container stacks and an `lg` rule
would have left the 992-1200px band broken.

Verified live by the orchestrator, independently of the executor's report:

| Width | Run y | Results y | Settings |
| --- | --- | --- | --- |
| 375 | 1043 | 1271 | collapsed; expands and re-collapses correctly |
| 1100 | 159 | 383 | collapsed (confirms the `xl` scoping) |
| 1280 | — | — | **unchanged**: all four controls `checkVisibility()` true |

Run is now above the results at both narrow widths, inverted from the 1255-vs-1025
that opened this ticket. No horizontal overflow at any width. At 1280px both
`.upgrades-tab-left` children still compute `grid-column: 1 / -1` and the panel
still reserves `31.5px` for the anti-jitter row, so the F11 containment and the
height reservation both survive.

**Note for ticket 322.** The executor's first attempt used `<details>`,
neutralised at `xl` with `display: contents`. All five gates exited 0 while every
one of the four settings controls measured `checkVisibility() === false` at
1280px — desktop would have shipped with no run settings at all. A closed
`<details>` hides its children through a UA behaviour `display: contents` does
not defeat. It was caught only by measuring the DOM, which is the case 322 is
about.