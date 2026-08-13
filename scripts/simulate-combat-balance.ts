import {
  compareCombatBalance,
  type CombatBalanceEnemyProfile,
  type CombatBalanceLoadout,
} from "../apps/client/src/data/combatBalanceSimulator.js";

const enemy: CombatBalanceEnemyProfile = {
  id: "t4_reference_target",
  health: 3000,
  armor: 25,
  magicResistance: 25,
  physicalDamage: 44,
  magicalDamage: 0,
  attackSpeed: 0.9,
};

const weaponIds = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_bow_t4_badon",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;

for (const masteryLevel of [1, 10, 30] as const) {
  const loadouts: CombatBalanceLoadout[] = weaponIds.map((weaponId) => ({
    weaponId,
    masteryLevel,
    ...(weaponId === "item_weapon_sword_t4_broadsword"
      ? { offHandId: "item_shield_t4_reinforced" }
      : {}),
  }));
  const results = compareCombatBalance(loadouts, enemy);

  console.log(`\n=== T4 reference combat — mastery ${String(masteryLevel)} ===`);
  console.table(results.map((result) => ({
    weapon: result.weaponId.replace("item_weapon_", ""),
    offhand: result.offHandId?.replace("item_", "") ?? "—",
    result: result.victory ? "WIN" : "LOSS",
    ttk: result.victory ? result.elapsedSeconds : "—",
    dps: result.dps,
    hpLeft: result.heroHealthRemaining,
    damageTaken: result.breakdown.damageTaken,
    aaDamage: result.breakdown.autoAttackDamage,
    abilityDamage: result.breakdown.abilityDamage,
    dotDamage: result.breakdown.dotDamage,
    casts: result.breakdown.abilityCasts,
    dots: result.breakdown.dotTicks,
  })));
}
