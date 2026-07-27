import { describe, expect, it } from "vitest";
import { Stat, statAt } from "../src/stats.js";

describe("Stat indices", () => {
  it("matches common.proto (Strength=0 … PhysicalDamage=41)", () => {
    expect(Stat.StatStrength).toBe(0);
    expect(Stat.StatAgility).toBe(1);
    expect(Stat.StatAttackPower).toBe(17);
    expect(Stat.StatMeleeHitRating).toBe(20);
    expect(Stat.StatMeleeCritRating).toBe(21);
    expect(Stat.StatPhysicalDamage).toBe(41);
  });

  it("reads a dense stats array by Stat index", () => {
    const stats = Array.from({ length: 42 }, () => 0);
    stats[Stat.StatStrength] = 40;
    stats[Stat.StatAttackPower] = 120;
    expect(statAt(stats, Stat.StatStrength)).toBe(40);
    expect(statAt(stats, Stat.StatAttackPower)).toBe(120);
    expect(statAt(stats, Stat.StatAgility)).toBe(0);
    expect(statAt([], Stat.StatStrength)).toBe(0);
  });
});
