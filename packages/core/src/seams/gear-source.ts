/**
 * GearSource seam — hide WCL's vocabulary behind findFights / readGear
 * (PLAN.md §5.2). Race is intentionally absent from LoggedGear (R8 / R18).
 */

import type { CharacterRef, FightRef, SpecId } from "../types.js";

export type FightSummary = {
  reportCode: string;
  fightId: number;
  encounterName: string;
  killedAt: string;
  route: "ranked" | "report-events";
  /** Spec confidence 0–1; feral form uptime may lower this (PLAN.md §5.4). */
  confidence: number;
};

export type LoggedItem = {
  id: number;
  slot: string;
  enchant?: number;
  gems?: number[];
};

/**
 * talentPointsByTree is spec-detection input only — never a sim input
 * (PLAN.md §5.2 / R7). Derived from WCL's talents[].id points-spent shape.
 */
export type LoggedGear = {
  items: LoggedItem[];
  talentPointsByTree: [number, number, number];
  /** Raw CombatantInfo.specID when present; classification still uses trees. */
  specIdHint?: number;
  provenance: {
    reportCode: string;
    fightId: number;
    sourceID: number;
  };
};

export interface GearSource {
  findFights(c: CharacterRef, spec: SpecId): Promise<FightSummary[]>;
  readGear(f: FightRef): Promise<LoggedGear>;
}

export type RecordedGearSourceData = {
  fights: ReadonlyMap<string, FightSummary[]>;
  gear: ReadonlyMap<string, LoggedGear>;
};

export function characterFightKey(c: CharacterRef, spec: SpecId): string {
  return `${c.region}|${c.realm.toLowerCase()}|${c.name.toLowerCase()}|${spec}`;
}

export function fightGearKey(f: FightRef): string {
  return `${f.reportCode}|${f.fightId}`;
}

export class RecordedGearSource implements GearSource {
  constructor(private readonly data: RecordedGearSourceData) {}

  async findFights(c: CharacterRef, spec: SpecId): Promise<FightSummary[]> {
    return this.data.fights.get(characterFightKey(c, spec)) ?? [];
  }

  async readGear(f: FightRef): Promise<LoggedGear> {
    const hit = this.data.gear.get(fightGearKey(f));
    if (!hit) {
      throw new Error(`no recording for fight ${fightGearKey(f)}`);
    }
    return hit;
  }
}
