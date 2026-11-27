Status: closed
Type: bug (tooling)
Origin: ticket 901 investigation, .scratch/agent-reports/2026-11-26-901-layout-compare/
Blocks: none
Blocked by: none
Related: 861, 901

# The layout gate's page loads outside resources, so sandbox and desktop runs measure different pages

## What happens

The page the layout gate renders (`ui/index_template.html` in the fork)
loads resources from outside the local server: Font Awesome's CSS from
cdnjs (line 16), Google Tag Manager (line 24), Wowhead's `tooltips.js`
(line 41), plus item icons from `wow.zamimg.com`, Wowhead tooltip data
and the GitHub releases API.

Inside the agent sandbox every one of those requests fails (the headless
shell reports `net::ERR_FAILED`, `net::ERR_ABORTED` or
`net::ERR_TUNNEL_CONNECTION_FAILED`;
`.scratch/agent-reports/2026-11-26-901-layout-compare/boot-probe.mjs`).
On a desktop run outside the sandbox they load. So the two runs measure
different pages, with or without Font Awesome's CSS and the icon images,
even with the same browser.

## Not known

Whether any of these resources moves the Upgrades tab's measured geometry.
The tab's own source uses no `fa-` class
(`grep -rln "fa-" vendor/tbc-new-fork/ui/features/upgrades` finds nothing),
and `tooltips.js` runs with `colorLinks: true` only (line 39), which
changes colour, not layout. Icon images with fixed CSS sizes would not
move layout either (hypothesis, untested).

## Done when

Either a desktop run and a sandbox run of `pnpm layout-gate:check` are
shown to measure the same geometry (a geometry dump like
`geom-dump.mjs` in the folder above, diffed), or the harness makes every
run see the same page, for example by blocking outside requests.

## Closed (2026-11-26, branch `fix/902-layout-gate-outside-resources`)

The "Not known" question is answered: Font Awesome moves the geometry,
and nothing else does. The tab does use Font Awesome, through wowsims'
`Icon` (`ui/features/upgrades/components/RowToggles/FavoriteToggle.tsx`,
`BatchToggle.tsx`), which the `fa-` grep above could not see. Without its
CSS the favorite and batch buttons are 0 px tall: 2528 of 21405 boxes
differ, all of them those buttons, their icons and one icon span.

The layout gate now blocks every outside request in the browser and serves
Font Awesome from the pinned `@fortawesome/fontawesome-free@6.0.0`
devDependency, which is byte-identical to the cdnjs files the page asks
for. With that, all 21405 boxes, all 496 checks with their measured
details, and the axe results equal a run where every outside resource
loaded. Check 24 fails the gate if the page asks for a Font Awesome file
the package does not have. Evidence:
`.scratch/agent-reports/2026-11-26-902-outside-resources/README.md`.

Not done: a real desktop run. The "all loaded" run was made in the
sandbox through a local forward proxy, with the same browser.

Verified by: docs/reviews/fix-902-layout-gate-outside-resources.md
