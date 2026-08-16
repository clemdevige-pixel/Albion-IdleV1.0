import { describe, expect, it } from "vitest";
import { getAbilityHitBaseDamage, resolveAbilityDamageRatio } from "./WeaponAbilityMechanicsRuntime";

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

describe("weapon ability conditional damage", () => {
  it("adds the health-threshold bonus only when the target is below the authored threshold", () => {
    const mechanic = {
      kind: "damage" as const,
      ratio: 1.55,
      bonusHealthBelow: { ratio: 0.5, bonusRatio: 0.75 },
    };

    expect(resolveAbilityDamageRatio(mechanic, 0.6, () => false)).toBeCloseTo(1.55, 8);
    expect(resolveAbilityDamageRatio(mechanic, 0.5, () => false)).toBeCloseTo(2.3, 8);
  });

  it("uses the same effect-conditioned bonus contract as runtime execution", () => {
    const mechanic = {
      kind: "damage" as const,
      ratio: 0.64,
      bonusEffect: { effectId: "effect_fire_burn", bonusRatio: 0.28 },
    };

    expect(resolveAbilityDamageRatio(mechanic, 1, () => false)).toBeCloseTo(0.64, 8);
    expect(resolveAbilityDamageRatio(mechanic, 1, (effectId) => effectId === "effect_fire_burn")).toBeCloseTo(0.92, 8);
  });
});
