import { describe, expect, it } from "vitest";
import {
  CLIENT_ABILITIES,
  WEAPON_ITEM_DEFINITIONS,
  resolveUnlockedWeaponAbilities,
  resolveWeaponAttackSpeed,
} from "./weaponContentCatalog.js";
import { getWeaponAbilityMechanics } from "./weaponAbilityMechanics.js";
import { getWeaponHandlingOffensiveMultiplier } from "./weaponHandlingBalance.js";

const T4_WEAPONS = [
  "item_weapon_bow_t4_longbow",
  "item_weapon_bow_t4_badon",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;

function effectiveDamage(itemId: string): number {
  const definition = WEAPON_ITEM_DEFINITIONS[itemId];
  if (definition === undefined || definition.stats === undefined) return 0;
  const authored = definition.stats.stat_physical_damage ?? definition.stats.stat_magical_damage ?? 0;
  return authored * getWeaponHandlingOffensiveMultiplier(definition.handling);
}

function sustainedAbilityDps(itemId: string): number {
  const damage = effectiveDamage(itemId);
  return resolveUnlockedWeaponAbilities(itemId, 30).reduce((total, ability) => {
    const profile = getWeaponAbilityMechanics(ability.id);
    if (profile === undefined) return total + damage * ability.bonusDamageRatio / ability.cooldown;
    const ratio = profile.mechanics.reduce((sum, mechanic) => {
      if (mechanic.kind === "damage") return sum + mechanic.ratio;
      if (mechanic.kind === "dot") return sum + mechanic.ratio * mechanic.ticks;
      return sum;
    }, 0);
    return total + damage * ratio / ability.cooldown;
  }, 0);
}

function sustainedDps(itemId: string): number {
  const damage = effectiveDamage(itemId);
  return damage * (resolveWeaponAttackSpeed(itemId) ?? 0) + sustainedAbilityDps(itemId);
}

describe("weapon ability balance envelope", () => {
  it("keeps current T4 two-handed weapons within a narrow sustained-DPS band", () => {
    const values = T4_WEAPONS.map(sustainedDps);
    const min = Math.min(...values);
    const max = Math.max(...values);
    expect(max / min).toBeLessThan(1.08);
  });

  it("preserves branch Q/W and specialization E at mastery 30", () => {
    const longbow = resolveUnlockedWeaponAbilities("item_weapon_bow_t4_longbow", 30);
    const badon = resolveUnlockedWeaponAbilities("item_weapon_bow_t4_badon", 30);
    expect(longbow.slice(0, 2).map((ability) => ability.id)).toEqual(badon.slice(0, 2).map((ability) => ability.id));
    expect(longbow[2]?.id).not.toBe(badon[2]?.id);
  });

  it("keeps execution conditional in auto while manual data remains available", () => {
    const execution = CLIENT_ABILITIES.ability_sword_execution;
    expect(execution).toBeDefined();
    expect(execution?.autoCast).toEqual({ kind: "target_health_below", ratio: 0.3 });
    expect(getWeaponAbilityMechanics("ability_sword_execution")?.autoRule).toEqual({ kind: "target_health_below", ratio: 0.3 });
  });
});
