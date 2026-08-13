import { compareCombatBalance } from "../apps/client/src/data/combatBalanceSimulator.js";
import { getSegmentRecommendedItemPower } from "../apps/client/src/data/itemPower.js";

const enemy = { id: "t4", health: 3000, armor: 25, magicResistance: 25, physicalDamage: 44, magicalDamage: 0, attackSpeed: 0.9 };
const weapons = ["item_weapon_sword_t4_broadsword", "item_weapon_bow_t4_longbow", "item_weapon_bow_t4_badon", "item_weapon_staff_t4_infernal", "item_weapon_gloves_t4_spiked_gauntlets", "item_weapon_dagger_t4_pair"];
const armor = ["item_helmet_t4_reinforced", "item_armor_t4_leather", "item_boots_t4_leather"];

function make(weaponId: string, masteryLevel: number, enchantment: 0 | 1 | 2 | 3) {
  return { weaponId, masteryLevel, weaponEnchantment: enchantment, equipment: armor.map((itemId) => ({ itemId, enchantment })), ...(weaponId.includes("sword") ? { offHandId: "item_shield_t4_reinforced", offHandEnchantment: enchantment } : {}) };
}

for (const enchantment of [0, 1, 2, 3] as const) {
  console.log(`\nT4.${enchantment} M30`);
  console.table(compareCombatBalance(weapons.map((weapon) => make(weapon, 30, enchantment)), enemy));
}

console.log("\nStage progression");
for (let zone = 1; zone <= 5; zone += 1) {
  for (let segment = 1; segment <= 10; segment += 1) {
    const ip = getSegmentRecommendedItemPower(zone, segment, "blue");
    const enchantment = Math.max(0, Math.min(3, Math.ceil((ip - 400) / 100)));
    console.log(`Z${zone} S${segment}: ${ip} IP -> T4.${enchantment}`);
  }
}

console.log("\nSword M10 4.3 vs Daggers M30 4.3");
console.table(compareCombatBalance([make("item_weapon_sword_t4_broadsword", 10, 3), make("item_weapon_dagger_t4_pair", 30, 3)], enemy));
