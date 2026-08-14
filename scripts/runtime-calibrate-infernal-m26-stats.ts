import type { StatId } from "@game/gameplay";
import type { EnchantmentLevel } from "@game/gameplay";

import { createCombatFoundation } from "../apps/client/src/runtime/bootstrap/createCombatFoundation.js";
import { createProgressionFoundation } from "../apps/client/src/runtime/bootstrap/createProgressionFoundation.js";
import { createCharacterEquipmentFoundation } from "../apps/client/src/runtime/bootstrap/createCharacterFoundation.js";
import { setupCombatEntity } from "../apps/client/src/runtime/combatEntityFactory.js";
import { recalculateWeaponMasteryStats } from "../apps/client/src/runtime/weaponMasteryStatSync.js";
import {
  resolveUnlockedWeaponAbilities,
  resolveWeaponMastery,
} from "../apps/client/src/data/weaponContentCatalog.js";
import { getEffectiveItemPower } from "../apps/client/src/data/itemPower.js";

const MASTERY_LEVEL = 26;
const WEAPON_ID = "item_weapon_staff_t4_infernal";

const LOADOUT = [
  { itemId: WEAPON_ID, enchantment: 3 },
  { itemId: "item_helmet_t4_reinforced", enchantment: 2 },
  { itemId: "item_armor_t4_leather", enchantment: 3 },
  { itemId: "item_boots_t4_leather", enchantment: 1 },
] as const satisfies readonly { itemId: string; enchantment: EnchantmentLevel }[];

function totalXpForLevel(
  table: { getRequiredXp(level: number): number },
  level: number,
): number {
  let total = 0;
  for (let current = 0; current < level; current += 1) {
    total += table.getRequiredXp(current);
  }
  return total;
}

const combat = createCombatFoundation();
const progression = createProgressionFoundation();

const heroId = setupCombatEntity(
  {
    world: combat.world,
    statsManager: combat.statsManager,
    damageManager: combat.damageManager,
    deathManager: combat.deathManager,
    targetManager: combat.targetManager,
    autoAttackManager: combat.autoAttackManager,
    abilityManager: combat.abilityManager,
  },
  {
    maxHealth: 500,
    physDamage: 0,
    magDamage: 0,
    attackSpeed: 1.2,
    armor: 10,
    magicRes: 5,
  },
  { x: 0, y: 0 },
);

const { inventoryManager, equipmentManager } = createCharacterEquipmentFoundation({
  world: combat.world,
  statsManager: combat.statsManager,
  damageManager: combat.damageManager,
  masteryService: progression.masteryService,
  onPlayerHealthChanged: () => {},
  onStatsChanged: () => {},
});

inventoryManager.createInventory(heroId, 32);
equipmentManager.attachEquipment(heroId);

for (const [position, item] of LOADOUT.entries()) {
  const added = inventoryManager.addEntry(heroId, item.itemId, position, item.enchantment);
  if (!added.ok) throw new Error(`Failed to add ${item.itemId}: ${added.reason}`);
  const equipped = equipmentManager.equipFromInventory(heroId, position);
  if (!equipped.ok) throw new Error(`Failed to equip ${item.itemId}: ${equipped.reason}`);
}

const route = resolveWeaponMastery(WEAPON_ID);
if (route === undefined) throw new Error("Missing infernal mastery route");

for (const masteryId of [route.familyId, route.weaponId]) {
  progression.masteryService.discoverMastery(masteryId);
  const table = progression.masteryService._getTable(masteryId);
  if (table === undefined) throw new Error(`Missing mastery table: ${String(masteryId)}`);
  progression.experienceService._restore(
    masteryId,
    table,
    100,
    totalXpForLevel(table, MASTERY_LEVEL),
  );
}

recalculateWeaponMasteryStats(
  combat.statsManager,
  equipmentManager,
  progression.masteryService,
  heroId,
);
combat.damageManager.syncMaxHealth(heroId);

const stat = (id: string): number =>
  combat.statsManager.getStat(heroId, id as StatId).computed;

const specialization = progression.masteryService.getMasteryState(route.weaponId)?.level ?? 0;
const family = progression.masteryService.getMasteryState(route.familyId)?.level ?? 0;
const masteryLevels = [
  { id: String(route.familyId), level: family },
  { id: String(route.weaponId), level: specialization },
];
const weaponIp = getEffectiveItemPower(WEAPON_ID, masteryLevels, 3);
const abilities = resolveUnlockedWeaponAbilities(WEAPON_ID, specialization);

const expected = {
  maxHp: 721,
  magicalDamage: 211.4,
  armor: 50.8,
  magicResistance: 34.2,
  attackSpeed: 0.9,
  weaponIp: 739,
};

const harness = {
  maxHp: combat.damageManager.getHealth(heroId).maxHealth,
  magicalDamage: stat("stat_magical_damage"),
  armor: stat("stat_armor"),
  magicResistance: stat("stat_magic_resistance"),
  attackSpeed: stat("stat_attack_speed"),
  weaponIp,
};

console.log("\n=== LIVE vs HARNESS: Infernal M26 exact stats ===");
console.table(
  Object.keys(expected).map((key) => {
    const typedKey = key as keyof typeof expected;
    const live = expected[typedKey];
    const simulated = harness[typedKey];
    return {
      stat: typedKey,
      live,
      harness: simulated,
      delta: simulated === undefined ? "—" : Number((simulated - live).toFixed(4)),
    };
  }),
);

console.log("\n=== MASTERY / ABILITIES ===");
console.log({
  specializationMastery: specialization,
  familyMastery: family,
  unlockedAbilities: abilities.map((ability) => ({
    id: ability.id,
    name: ability.name,
    cooldown: ability.cooldown,
    damageType: ability.damageType,
  })),
});
