/**
 * GearSource seam — hide WCL's vocabulary behind findFights / readGear
 * (PLAN.md §5.2). Race is intentionally absent from LoggedGear (R8 / R18).
 */

import type { CharacterRef, FightRef, SpecId } from "../types.js";
import type { Store } from "./store.js";

export type FightSummary = {
  reportCode: string;
  fightId: number;
  encounterName: string;
  /** Absent when the source cannot supply one — see ResolvedFight.killedAt. */
  killedAt?: string;
  route: "ranked" | "report-events";
  /** Spec confidence 0–1; feral form uptime may lower this (PLAN.md §5.4). */
  confidence: number;
  /**
   * Share of the fight under Blessing of Salvation, 0–1. Absent when the
   * source cannot supply buff uptimes at all — distinct from `0`, which is a
   * measurement saying the player never had it.
   *
   * Here because form uptime cannot see role: a backup tank who never had to
   * tank reads as ~100% cat and confident, and salv is what separates that
   * from a real DPS parse (ticket 06).
   */
  salvationUptime?: number;
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
  /**
   * WCL `actors[].subType`, which is **class-level only** — `Paladin`, never
   * `Retribution` (docs/stage0-findings.md). Present because talent plurality
   * cannot name a spec without it: 45 points in the third tree is ret on a
   * paladin and nothing of the sort on another class. Optional so a source
   * that cannot supply it degrades to "cannot classify" rather than throwing
   * (carry-forward 61).
   */
  className?: string;
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

/**
 * Serves a fight's gear from the Store instead of re-fetching it (PLAN.md §11,
 * "the gear cache is the primary defence of the WCL point budget").
 *
 * It wraps the *fetching* source — the WCL adapter — rather than sitting inside
 * `rankUpgrades`, and the distinction is load-bearing. A cache above
 * `rankUpgrades` would decide the content hash from a previously stored
 * snapshot, so a character whose gear changed between runs would be served the
 * old numbers (ADR-0019). Here the only thing skipped is the HTTP call that
 * costs points; whatever gear comes back still reaches the hash.
 *
 * Scoped to one character because `readGear` takes only a `FightRef`, and a
 * fight is a raid rather than a player: 25 people share one (reportCode,
 * fightId). This repo has already been bitten by that ambiguity once — the
 * `events[0]` footgun in docs/stage0-findings.md §11, where a warrior's gear
 * was reported for a slamaltman run — and a cache keyed on the fight alone
 * would make it permanent instead of merely wrong once.
 *
 * `findFights` is deliberately not cached: a fight list grows as a character
 * raids, so it is not immutable. PLAN.md §12 [R9] calls it a live query and
 * wants a short TTL *and* per-IP rate limiting, both Stage 3.
 */
export class CachingGearSource implements GearSource {
  constructor(
    private readonly inner: GearSource,
    private readonly store: Pick<Store, "get" | "put">,
    private readonly character: CharacterRef,
    private readonly spec: SpecId
  ) {}

  findFights(c: CharacterRef, spec: SpecId): Promise<FightSummary[]> {
    return this.inner.findFights(c, spec);
  }

  async readGear(f: FightRef): Promise<LoggedGear> {
    const key = gearCacheKey(f, this.character, this.spec);
    const cached = await this.store.get<LoggedGear>(key);
    if (cached) return cached;
    const logged = await this.inner.readGear(f);
    await this.store.put(key, logged);
    return logged;
  }
}

/**
 * A completed fight's logged gear never changes, so no TTL — but the fight is
 * only half the address. The character is the other half, because one fight
 * holds every raider's gear (stage0-findings §11). Built from the two existing
 * key helpers so it cannot drift from what RecordedGearSource replays.
 */
export function gearCacheKey(
  f: FightRef,
  c: CharacterRef,
  spec: SpecId
): string {
  return `gear:${fightGearKey(f)}|${characterFightKey(c, spec)}`;
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
