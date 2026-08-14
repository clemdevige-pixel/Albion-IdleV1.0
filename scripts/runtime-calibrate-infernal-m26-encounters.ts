import {
  BiomeRegistry,
  BiomeResolver,
  type EnchantmentLevel,
  type StatId,
} from "@game/gameplay";

import { CombatRuntime } from "../apps/client/src/runtime/CombatRuntime.js";
import { createCombatFoundation } from "../apps/client/src/runtime/bootstrap/createCombatFoundation.js";
import { createProgressionFoundation } from "../apps/client/src/runtime/bootstrap/createProgressionFoundation.js";
import { createCharacterEquipmentFoundation } from "../apps/client/src/runtime/bootstrap/createCharacterFoundation.js";
import { setupCombatEntity } from "../apps/client/src/runtime/combatEntityFactory.js";
import { recalculateWeaponMasteryStats } from "../apps/client/src/runtime/weaponMasteryStatSync.js";
import { resolveWeaponMastery } from "../apps/client/src/data/weaponContentCatalog.js";
import {
  WORLD_ZONE_IDS_BY_BAND,
  ZONE_DEFINITIONS,
  getWorldZonePlacement,
} from "../apps/client/src/data/worldContentCatalog.js";

const DT = 0.05;
const MAX_SECONDS = 300;
const MASTERY_LEVEL = 26;
const LOADOUT = [
  { itemId: "item_weapon_staff_t4_infernal", enchantment: 3 },
  { itemId: "item_helmet_t4_reinforced", enchantment: 2 },
  { itemId: "item_armor_t4_leather", enchantment: 3 },
  { itemId: "item_boots_t4_leather", enchantment: 1 },
] as const satisfies readonly { itemId: string; enchantment: EnchantmentLevel }[];

const STAT_IDS = {
  hp: "stat_max_health" as StatId,
  phys: "stat_physical_damage" as StatId,
  mag: "stat_magical_damage" as StatId,
  speed: "stat_attack_speed" as StatId,
  armor: "stat_armor" as StatId,
  mr: "stat_magic_resistance" as StatId,
};

function totalXpForLevel(table: { getRequiredXp(level: number): number }, level: number): number {
  let total = 0;
  for (let current = 0; current < level; current += 1) total += table.getRequiredXp(current);
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
  { maxHealth: 500, physDamage: 0, magDamage: 0, attackSpeed: 1.2, armor: 10, magicRes: 5 },
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

const masteryRoute = resolveWeaponMastery("item_weapon_staff_t4_infernal");
if (masteryRoute === undefined) throw new Error("Missing infernal mastery route");
for (const masteryId of [masteryRoute.familyId, masteryRoute.weaponId]) {
  progression.masteryService.discoverMastery(masteryId);
  const table = progression.masteryService._getTable(masteryId);
  if (table === undefined) throw new Error(`Missing mastery table: ${String(masteryId)}`);
  progression.experienceService._restore(masteryId, table, 100, totalXpForLevel(table, MASTERY_LEVEL));
}
recalculateWeaponMasteryStats(combat.statsManager, equipmentManager, progression.masteryService, heroId);
combat.damageManager.syncMaxHealth(heroId);
const initialHealth = combat.damageManager.getHealth(heroId);
combat.damageManager.healDamage(heroId, initialHealth.maxHealth - initialHealth.currentHealth);

const zoneDefId = WORLD_ZONE_IDS_BY_BAND.blue[4]!;
const segmentIndex = 9;
const placement = getWorldZonePlacement(zoneDefId);
const zone = ZONE_DEFINITIONS.find(({ id }) => id === zoneDefId);
if (zone === undefined) throw new Error(`Unknown zone: ${String(zoneDefId)}`);

let encounterIndex = 0;
let cleared = false;
let defeated = false;
const rows: Array<Record<string, string | number>> = [];
let encounterStartHp = combat.damageManager.getHealth(heroId).currentHealth;
let lastSpawnedEnemyId = 0;
let lastEnemyName = "";
let lastMonsterId = "";
let lastEnemyStats: Record<string, number> = {};
let lastEncounterStartElapsed = 0;

function readEnemyStats(enemyId: number): Record<string, number> {
  return {
    enemyHp: combat.statsManager.getStat(enemyId, STAT_IDS.hp).computed,
    enemyPhys: combat.statsManager.getStat(enemyId, STAT_IDS.phys).computed,
    enemyMag: combat.statsManager.getStat(enemyId, STAT_IDS.mag).computed,
    enemyAS: combat.statsManager.getStat(enemyId, STAT_IDS.speed).computed,
    enemyArmor: combat.statsManager.getStat(enemyId, STAT_IDS.armor).computed,
    enemyMR: combat.statsManager.getStat(enemyId, STAT_IDS.mr).computed,
  };
}

function recordEncounter(result: "WIN" | "LOSS", elapsed: number): void {
  const heroHealth = combat.damageManager.getHealth(heroId);
  rows.push({
    encounter: encounterIndex + 1,
    monsterId: lastMonsterId,
    enemy: lastEnemyName,
    ...lastEnemyStats,
    heroHpStart: Number(encounterStartHp.toFixed(2)),
    heroHpEnd: Number(heroHealth.currentHealth.toFixed(2)),
    duration: Number((elapsed - lastEncounterStartElapsed).toFixed(2)),
    result,
  });
}

let elapsed = 0;
let tick = 0;
const runtime = new CombatRuntime({
  world: combat.world,
  heroId,
  combatService: combat.combatService,
  orchestrator: combat.orchestrator,
  damageManager: combat.damageManager,
  deathManager: combat.deathManager,
  targetManager: combat.targetManager,
  autoAttackManager: combat.autoAttackManager,
  abilityManager: combat.abilityManager,
  effectManager: combat.effectManager,
  statsManager: combat.statsManager,
  equipmentManager,
  masteryService: progression.masteryService,
  biomeResolver: new BiomeResolver(new BiomeRegistry()),
  ports: {
    onVictory: () => {
      recordEncounter("WIN", elapsed);
      if (encounterIndex < 4) {
        encounterIndex += 1;
        return { enteredNewSegment: false };
      }
      cleared = true;
      return { enteredNewSegment: true };
    },
    onDefeat: () => {
      recordEncounter("LOSS", elapsed);
      defeated = true;
    },
    isCombatSuspended: () => false,
    getLocationState: () => ({
      zoneIndex: placement.zoneIndexWithinBand,
      segmentIndex,
      encounterIndex,
      zoneDefId,
      zoneName: zone.name,
      highestUnlockedSegment: segmentIndex,
      farmMode: false,
    }),
  },
});

const initialized = runtime.initialize();
if (initialized.spawnedEnemy !== undefined) {
  lastSpawnedEnemyId = initialized.spawnedEnemy.id as number;
  lastEnemyName = initialized.spawnedEnemy.name;
  lastMonsterId = initialized.spawnedEnemy.monsterDefinitionId;
  lastEnemyStats = readEnemyStats(lastSpawnedEnemyId);
}

while (!cleared && !defeated && elapsed < MAX_SECONDS) {
  tick += 1;
  elapsed += DT;
  const result = runtime.tick(DT, tick);
  if (result.spawnedEnemy !== undefined) {
    lastSpawnedEnemyId = result.spawnedEnemy.id as number;
    lastEnemyName = result.spawnedEnemy.name;
    lastMonsterId = result.spawnedEnemy.monsterDefinitionId;
    lastEnemyStats = readEnemyStats(lastSpawnedEnemyId);
    const hp = combat.damageManager.getHealth(heroId);
    encounterStartHp = hp.currentHealth;
    lastEncounterStartElapsed = elapsed;
    console.log(`SPAWN E${encounterIndex + 1}: hero ${hp.currentHealth.toFixed(2)}/${hp.maxHealth.toFixed(2)} | ${lastMonsterId} | ${lastEnemyName}`);
  }
  if (result.combatState === "defeat") defeated = true;
}

console.log("\n=== ENCOUNTER TRACE: Infernal M26 / Frostpeak Mountain S10 / AFK ===");
console.table(rows);
console.log({
  result: cleared ? "CLEARED" : defeated ? "DEFEAT" : "TIMEOUT",
  encounterReached: encounterIndex + 1,
  elapsedSeconds: Number(elapsed.toFixed(2)),
  expectedRule: "Hero HP must be restored before encounter 5 (boss)",
});

if (!cleared) process.exitCode = 2;
