import { describe, expect, it } from "vitest";
import { getAbilityHitBaseDamage } from "./WeaponAbilityMechanicsRuntime";

describe("weapon ability multihit damage budget", () => {
  it("keeps a two-hit ability at the same total authored damage as one hit", () => {
    const sourceDamage = 100;
    const bonusRatio = 0.435;
    const hits = 2;
    const baseDamagePerHit = getAbilityHitBaseDamage(sourceDamage, bonusRatio, hits);

    // DamageManager adds sourceDamage once per request.
    const totalRawDamage = hits * (sourceDamage + baseDamagePerHit);
    expect(totalRawDamage).toBeCloseTo(sourceDamage * (1 + bonusRatio), 8);
  });

  it("keeps a three-hit combo at the authored total ratio instead of triple-counting source damage", () => {
    const sourceDamage = 100;
    const bonusRatio = 0.97;
    const hits = 3;
    const baseDamagePerHit = getAbilityHitBaseDamage(sourceDamage, bonusRatio, hits);
    const totalRawDamage = hits * (sourceDamage + baseDamagePerHit);

    expect(totalRawDamage).toBeCloseTo(197, 8);
  });
});
