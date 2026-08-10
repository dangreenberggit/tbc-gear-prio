/**
 * Cheap sanity checks on a finished ranking (ticket 98).
 *
 * The set-bonus confound of tickets 90–96 took a multi-agent investigation to
 * find, and both of the checks here would have surfaced it from the artifact
 * alone. They exist to catch the *next* one.
 *
 * Every check is a warning. An unusually strong bonus is possible and a dead
 * slot can be entirely legitimate, so a hard failure would have to be right
 * every time — and nothing in that investigation establishes a threshold that
 * precisely (ticket 97). The figures stay in the report; the warning only says
 * "check this".
 */

import {
  classifyDeadSlots,
  type ClassifyDeadSlotsOptions,
  type DeadSlotCause,
  type DeadSlotRow,
} from "./dead-slots.js";
import type { SetBonusValue } from "./rank.js";
import type { SetThreshold } from "./set-value.js";

/**
 * The share of baseline DPS above which a single set bonus is more likely
 * confounded than real.
 *
 * Calibrated against sim measurements, not chosen round
 * (`.scratch/set-bonus-value/measurements-2026-08-10.md`, seeds [11,22,33,44,55],
 * 3000 iterations, wowsimcli v0.0.101):
 *
 * - Must fire on the engine's Thunderheart 4pc, 193.89 on a 2152.10 baseline
 *   (**9.0%**) — the confounded figure, ~2.6x the 73.5 ± 6.3 measured for the
 *   same bonus in isolation.
 * - Must NOT fire on Malorne 2pc, measured **directly** at 131.1 ± 6.6 on its
 *   own 2227 reference baseline (**5.9%**). This is why the threshold is not
 *   the SME's original "~5% of baseline is suspect" rule of thumb: that rule
 *   produces a false positive on a real, unconfounded, sim-measured bonus.
 *
 * 7.5% sits roughly midway between those two in log terms and leaves each about
 * 1.25x of room, which is the most separation the two anchors allow.
 *
 * Ticket 98 asks for a band derived from each bonus's own mechanics — a +15%
 * modifier on a ~30% damage share caps near 4.5%, whereas Malorne 2pc's energy
 * proc has no such ceiling, and the two really do warrant different bands.
 * That is deliberately not attempted: it would need a per-bonus mechanics table
 * keyed to the pinned Go source, which is exactly the hand-transcription ticket
 * 97 flags as unverified. One calibrated fraction separates the only two cases
 * anyone has measured, so the mechanics-specific version buys nothing yet.
 */
export const IMPLAUSIBLE_BONUS_FRACTION = 0.075;

/**
 * Dead-slot causes worth a warning. `thin-pool` and `benign-nothing-better` are
 * omitted on purpose: the feral ranged pool is four idols, so the worn one being
 * best is unremarkable, and warning there would fire on every idol, relic and
 * ranged slot in the game (ticket 94's over-collection).
 *
 * Which cause a slot gets depends on `THIN_POOL_CANDIDATES` and
 * `UNIQUE_EFFECT_GAP_DPS`, and both were **fitted to one artifact**
 * (shredzepelin-p3) rather than measured. A slot near either boundary can
 * therefore flip between warning and silence on a judgement call nobody has
 * validated — a reason to treat a missing warning as weak evidence, not proof.
 */
const WARNED_DEAD_SLOT_CAUSES: readonly DeadSlotCause[] = [
  "set-break-toll",
  "unique-effect",
  // `unknown-item` warns for the opposite reason to the other two: not a
  // finding, but the absence of one. Silence would hide a data gap behind a
  // clean report, and the wording below is careful to claim no cause at all.
  "unknown-item",
];

export type ImplausibleSetBonusWarning = {
  kind: "implausible-set-bonus";
  setId: number;
  setName: string;
  threshold: SetThreshold;
  bonusDps: number;
  fractionOfBaseline: number;
  /** The band it exceeded, carried so a reader can judge the call, not just the verdict. */
  thresholdFraction: number;
  message: string;
};

export type DeadSlotWarning = {
  kind: "dead-slot";
  slot: string;
  cause: DeadSlotCause;
  wornItemName: string;
  message: string;
};

export type PlausibilityWarning = ImplausibleSetBonusWarning | DeadSlotWarning;

export type MagnitudeGateOptions = {
  /** `Ranking.baseline.dps`; a non-positive value disables the gate. */
  baselineDps: number;
};

/**
 * Set bonuses whose measured DPS is too large a share of baseline to believe.
 *
 * Only positive measured figures are considered. A strongly negative bonus is
 * suspect too, but for the opposite reason, and reporting it as "too large"
 * would misdescribe it.
 */
export function setBonusMagnitudeWarnings(
  bonuses: readonly SetBonusValue[],
  options: MagnitudeGateOptions
): ImplausibleSetBonusWarning[] {
  if (!(options.baselineDps > 0)) return [];

  const warnings: ImplausibleSetBonusWarning[] = [];
  for (const b of bonuses) {
    if (b.bonusDps === undefined || b.bonusDps <= 0) continue;
    const fractionOfBaseline = b.bonusDps / options.baselineDps;
    if (fractionOfBaseline <= IMPLAUSIBLE_BONUS_FRACTION) continue;
    warnings.push({
      kind: "implausible-set-bonus",
      setId: b.setId,
      setName: b.setName,
      threshold: b.threshold,
      bonusDps: b.bonusDps,
      fractionOfBaseline,
      thresholdFraction: IMPLAUSIBLE_BONUS_FRACTION,
      // "reports", never "measures": the flagged figure is the engine's output,
      // and the whole point of the gate is that it is probably not a
      // measurement of the bonus. Stating it in measurement voice would restate
      // the suspect number as authoritative.
      message:
        `${b.setName} ${b.threshold}pc reports ${b.bonusDps.toFixed(2)} DPS — ` +
        `~${(fractionOfBaseline * 100).toFixed(1)}% of a ${options.baselineDps.toFixed(2)} baseline, ` +
        `above the ${(IMPLAUSIBLE_BONUS_FRACTION * 100).toFixed(1)}% plausibility band. ` +
        `Treat as a suspected confound, not a bonus this large; check what the package breaks.`,
    });
  }
  return warnings;
}

function deadSlotMessage(
  cause: DeadSlotCause,
  slot: string,
  wornItemName: string,
  setName: string | null
): string {
  if (cause === "set-break-toll") {
    return (
      `No positive candidate in ${slot}: every alternative displaces ${wornItemName} ` +
      `and pays ${setName ?? "its set"}'s lost bonus. Check that toll is real before trusting the slot.`
    );
  }
  if (cause === "unknown-item") {
    return (
      `No positive candidate in ${slot}, and the worn ${wornItemName} could not be resolved ` +
      `in the item index — its set membership is unknown, so why the slot is dead is unknown too. ` +
      `Check the item data before reading anything into this slot.`
    );
  }
  return (
    `No positive candidate in ${slot}: nothing in a full pool matches ${wornItemName}'s effect. ` +
    `Expected for a unique effect, but worth confirming it is not a measurement fault.`
  );
}

/**
 * Slots with no positive candidate, restricted to the causes that mean
 * something. Delegates the join to ticket 94's classifier so the two features
 * cannot drift apart on what counts as a thin pool.
 */
export function deadSlotWarnings(
  rows: readonly DeadSlotRow[],
  options: ClassifyDeadSlotsOptions
): DeadSlotWarning[] {
  return classifyDeadSlots(rows, options)
    .filter((d) => WARNED_DEAD_SLOT_CAUSES.includes(d.cause))
    .map((d) => ({
      kind: "dead-slot" as const,
      slot: d.slot,
      cause: d.cause,
      wornItemName: d.wornItemName,
      message: deadSlotMessage(d.cause, d.slot, d.wornItemName, d.wornSetName),
    }));
}

export type PlausibilityInput = {
  baselineDps: number;
  setBonuses?: readonly SetBonusValue[];
  rows: readonly DeadSlotRow[];
} & ClassifyDeadSlotsOptions;

/** Both gates over one ranking, magnitude warnings first. */
export function plausibilityWarnings(
  input: PlausibilityInput
): PlausibilityWarning[] {
  return [
    ...setBonusMagnitudeWarnings(input.setBonuses ?? [], {
      baselineDps: input.baselineDps,
    }),
    ...deadSlotWarnings(input.rows, { wornSetCounts: input.wornSetCounts }),
  ];
}
