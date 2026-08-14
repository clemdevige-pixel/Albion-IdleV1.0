import {
  BiomeRegistry,
  BiomeResolver,
  WEAPON_MASTERY_XP,
  type EnchantmentLevel,
  type StatId,
} from "@game/gameplay";

import { CombatRuntime } from "../apps/client/src/runtime/CombatRuntime.js";
import { createCombatFoundation } from "../apps/client/src/runtime/bootstrap/createCombatFoundation.js";
import { createProgressionFoundation } from "../apps/client/src/runtime/bootstrap/createProgressionFoundation.js";
import { createCharacterEquipmentFoundation } from "../apps/client/src/runtime/bootstrap/createCharacterFoundation.js";
import { setupCombatEntity } from "../apps/client/src/runtime/combatEntityFactory.js";
import { recalculateWeaponMasteryStats } from "../apps/client/src/runtime/weaponMasteryStatSync.js";
import { WORLD_ZONE_IDS, getWorldZonePlacement } from "../apps/client/src/data/worldContentCatalog.js";
import { resolveUnlockedWeaponAbilities, resolveWeaponMastery } from "../apps/client/src/data/weaponContentCatalog.js";

/** TEMPORARY diagnostic. Delete after Blue runtime balance investigation. */
const DT = 0.5;
const ZONE_ID = WORLD_ZONE_IDS.mountain;
const SEGMENT_INDEX = 7; // Frostpeak S8 (zero-based)
const MASTERY_LEVELS = [12, 14, 15, 20, 25, 29, 30, 31, 32] as const;
const WEAPON_ID = "item_weapon_gloves_t4_spiked_gauntlets";
const ENCHANTMENT: EnchantmentLevel = 3;
const T4_ARMOR = [
  "item_helmet_t4_reinforced",
  "item_armor_t4_leather",
  "item_boots_t4_leather",
] as const;

const STAT_PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;
const STAT_ATTACK_SPEED = "stat_attack_speed" as StatId;
const STAT_ARMOR = "stat_armor" as StatId;
const STAT_MAGIC_RESISTANCE = "stat_magic_resistance" as StatId;

function cumulativeXpForLevel(level: number): number {
  return WEAPON_MASTERY_XP.slice(0, level).reduce((sum, value) => sum + value, 0);
}

interface EncounterTrace {
  encounter: number;
  enemy: string;
  result: "VICTORY" | "DEFEAT";
  seconds: number;
  heroHp: number;
  enemyHp: number;
  heroDamageTaken: number;
  enemyDamageTaken: number;
  q: number;
  w: number;
  e: number;
  enemyAbilities: number;
}

function runOnce(level: number) {
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

  const route = resolveWeaponMastery(WEAPON_ID);
  if (route === undefined) throw new Error("Missing Spiked mastery route");
  progression.progressionOrchestrator.onEquipmentAcquired(route.familyId);
  progression.progressionOrchestrator.onEquipmentAcquired(route.weaponId);
  const xp = cumulativeXpForLevel(level);
  if (xp > 0) progression.experienceService.addExperience(route.weaponId, xp, "combat");

  for (const itemId of [WEAPON_ID, ...T4_ARMOR]) {
    const slot = inventoryManager.findFreeSlots(heroId)[0];
    if (slot === undefined) throw new Error("Diagnostic inventory full");
    const added = inventoryManager.addEntry(heroId, itemId, slot, ENCHANTMENT);
    if (!added.ok) throw new Error(`Unable to add ${itemId}: ${added.reason}`);
    const equipped = equipmentManager.equipFromInventory(heroId, slot);
    if (!equipped.ok) throw new Error(`Unable to equip ${itemId}: ${equipped.reason}`);
  }
  recalculateWeaponMasteryStats(combat.statsManager, equipmentManager, progression.masteryService, heroId);
  combat.damageManager.syncMaxHealth(heroId);
  const initialHealth = combat.damageManager.getHealth(heroId);
  combat.damageManager.healDamage(heroId, initialHealth.maxHealth - initialHealth.currentHealth);

  let encounterIndex = 0;
  let tick = 0;
  let elapsed = 0;
  let encounterStart = 0;
  let currentEnemyName = "";
  let encounterHeroStartHp = initialHealth.maxHealth;
  let encounterEnemyStartHp = 0;
  let q = 0;
  let w = 0;
  let e = 0;
  let enemyAbilities = 0;
  let finished = false;
  let finalResult: "CLEARED" | "DEFEAT" = "DEFEAT";
  const traces: EncounterTrace[] = [];

  const originalHeroExecute = combat.abilityManager.executeIntent.bind(combat.abilityManager);
  combat.abilityManager.executeIntent = ((intent: Parameters<typeof originalHeroExecute>[0]) => {
    const result = originalHeroExecute(intent);
    if (result.ok) {
      if (intent.entityId === heroId) {
        const id = String(intent.abilityId);
        if (id === "ability_gloves_shockwave") q += 1;
        else if (id === "ability_gloves_breaking_combo") w += 1;
        else if (id === "ability_gloves_seismic_impact") e += 1;
      } else {
        enemyAbilities += 1;
      }
    }
    return result;
  }) as typeof combat.abilityManager.executeIntent;

  const placement = getWorldZonePlacement(ZONE_ID);
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
        const hero = combat.damageManager.getHealth(heroId);
        const enemyId = runtime.getActiveEnemyId();
        const enemyHp = combat.damageManager.isAlive(enemyId) ? combat.damageManager.getHealth(enemyId).currentHealth : 0;
        traces.push({
          encounter: encounterIndex + 1,
          enemy: currentEnemyName,
          result: "VICTORY",
          seconds: Number((elapsed - encounterStart).toFixed(2)),
          heroHp: Number(hero.currentHealth.toFixed(2)),
          enemyHp: Number(enemyHp.toFixed(2)),
          heroDamageTaken: Number((encounterHeroStartHp - hero.currentHealth).toFixed(2)),
          enemyDamageTaken: Number((encounterEnemyStartHp - enemyHp).toFixed(2)),
          q, w, e, enemyAbilities,
        });
        if (encounterIndex >= 4) {
          finished = true;
          finalResult = "CLEARED";
          return { enteredNewSegment: true };
        }
        encounterIndex += 1;
        encounterStart = elapsed;
        q = 0; w = 0; e = 0; enemyAbilities = 0;
        return { enteredNewSegment: false };
      },
      onDefeat: () => {},
      isCombatSuspended: () => false,
      getLocationState: () => ({
        zoneIndex: placement.zoneIndexWithinBand,
        segmentIndex: SEGMENT_INDEX,
        encounterIndex,
        zoneDefId: ZONE_ID,
        zoneName: "Frostpeak Mountain",
        highestUnlockedSegment: SEGMENT_INDEX,
        farmMode: false,
      }),
    },
  });

  const initialized = runtime.initialize();
  currentEnemyName = initialized.activeEnemy?.name ?? "";
  encounterEnemyStartHp = initialized.activeEnemy?.maxHealth ?? 0;

  let previousEnemyId = runtime.getActiveEnemyId();
  while (!finished && elapsed < 180) {
    tick += 1;
    elapsed += DT;
    const result = runtime.tick(DT, tick);
    const enemyId = runtime.getActiveEnemyId();
    if (enemyId !== previousEnemyId && result.activeEnemy !== undefined) {
      previousEnemyId = enemyId;
      currentEnemyName = result.activeEnemy.name;
      encounterEnemyStartHp = result.activeEnemy.maxHealth;
      encounterHeroStartHp = result.playerHealth?.currentHealth ?? combat.damageManager.getHealth(heroId).currentHealth;
      encounterStart = elapsed;
    }
    if (result.combatState !== "defeat") continue;
    const hero = combat.damageManager.getHealth(heroId);
    const enemyHp = combat.damageManager.isAlive(enemyId) ? combat.damageManager.getHealth(enemyId).currentHealth : 0;
    traces.push({
      encounter: encounterIndex + 1,
      enemy: currentEnemyName,
      result: "DEFEAT",
      seconds: Number((elapsed - encounterStart).toFixed(2)),
      heroHp: Number(hero.currentHealth.toFixed(2)),
      enemyHp: Number(enemyHp.toFixed(2)),
      heroDamageTaken: Number((encounterHeroStartHp - hero.currentHealth).toFixed(2)),
      enemyDamageTaken: Number((encounterEnemyStartHp - enemyHp).toFixed(2)),
      q, w, e, enemyAbilities,
    });
    finished = true;
  }

  const mastery = progression.masteryService.getMasteryState(route.weaponId)?.level ?? -1;
  const abilities = resolveUnlockedWeaponAbilities(WEAPON_ID, mastery).map(({ name }) => name).join(" + ");
  return {
    mastery,
    abilities,
    physDamage: Number(combat.statsManager.getStat(heroId, STAT_PHYSICAL_DAMAGE).computed.toFixed(2)),
    attackSpeed: Number(combat.statsManager.getStat(heroId, STAT_ATTACK_SPEED).computed.toFixed(2)),
    armor: Number(combat.statsManager.getStat(heroId, STAT_ARMOR).computed.toFixed(2)),
    magicRes: Number(combat.statsManager.getStat(heroId, STAT_MAGIC_RESISTANCE).computed.toFixed(2)),
    maxHp: Number(combat.damageManager.getHealth(heroId).maxHealth.toFixed(2)),
    result: finalResult,
    elapsed: Number(elapsed.toFixed(2)),
    traces,
  };
}

console.log("=== TEMP SPIKED AFK / FROSTPEAK S8 DIAGNOSTIC ===");
console.log("Real CombatRuntime, fixed 4.3 loadout, no potions, DT=0.5.\n");

for (const level of MASTERY_LEVELS) {
  const first = runOnce(level);
  const second = runOnce(level);
  if (JSON.stringify(first) !== JSON.stringify(second)) {
    throw new Error(`Non-deterministic Spiked S8 result at mastery ${level}`);
  }
  console.log(`\n--- MASTERY ${level} ---`);
  console.table([{
    mastery: first.mastery,
    result: first.result,
    elapsed: first.elapsed,
    hp: first.maxHp,
    physDamage: first.physDamage,
    attackSpeed: first.attackSpeed,
    armor: first.armor,
    magicRes: first.magicRes,
    abilities: first.abilities,
  }]);
  console.table(first.traces);
}

console.log("\nPASS: every Spiked Frostpeak S8 scenario was deterministic across two identical runs.");
