/**
 * The 17 sim equipment slots, for the character page's gear list.
 *
 * Restated here rather than imported from `@tbc-gear-prio/core`: the package
 * root's runtime closure reaches `items.ts`, which imports the 6.8 MB
 * `data/items/index.json`, and a value import would pull it into the browser
 * bundle. Only `@tbc-gear-prio/core/view` is safe to import for a value; every
 * other core import in `src/` is `import type`, which the build erases.
 *
 * Kept in step with `packages/core/src/slots-sim-order.generated.ts` — the
 * order and spelling are that file's, and `SLOT_LABELS` only adds display
 * names. A drift shows up as a slot rendering empty for gear that has one.
 */
export const UI_SLOT_ORDER = [
  "head",
  "neck",
  "shoulder",
  "back",
  "chest",
  "wrist",
  "hands",
  "waist",
  "legs",
  "feet",
  "finger1",
  "finger2",
  "trinket1",
  "trinket2",
  "mainhand",
  "offhand",
  "ranged",
] as const;

export type UiSlotName = (typeof UI_SLOT_ORDER)[number];

export const SLOT_LABELS: Record<UiSlotName, string> = {
  head: "Head",
  neck: "Neck",
  shoulder: "Shoulder",
  back: "Back",
  chest: "Chest",
  wrist: "Wrist",
  hands: "Hands",
  waist: "Waist",
  legs: "Legs",
  feet: "Feet",
  finger1: "Ring 1",
  finger2: "Ring 2",
  trinket1: "Trinket 1",
  trinket2: "Trinket 2",
  mainhand: "Main hand",
  offhand: "Off hand",
  ranged: "Ranged",
};
