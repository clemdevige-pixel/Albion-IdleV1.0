import { describe, expect, it } from "vitest";
import { calculateAbilityBudgetedEnemyDamage } from "./combatEntityFactory";

describe("enemy Combat Identity damage budget", () => {
  it("keeps enemies without abilities unchanged", () => {
    expect(calculateAbilityBudgetedEnemyDamage(40, 1.2, [])).toBe(40);
  });

  it("preserves the previous long-run raw DPS when abilities are added", () => {
    const oldDamage = 40;
    const attackSpeed = 1.2;
    const abilities = [
      { cooldown: 9, damageMultiplier: 1.5 },
      { cooldown: 6, damageMultiplier: 1.25 },
    ];
    const adjustedDamage = calculateAbilityBudgetedEnemyDamage(
      oldDamage,
      attackSpeed,
      abilities,
    );
    const oldDps = oldDamage * attackSpeed;
    const abilityPressure = abilities.reduce(
      (total, ability) => total + ability.damageMultiplier / ability.cooldown,
      0,
    );
    const newDps = adjustedDamage * (attackSpeed + abilityPressure);

    expect(newDps).toBeCloseTo(oldDps, 10);
    expect(adjustedDamage).toBeLessThan(oldDamage);
  });
});
