import { describe, expect, it } from "vitest";
import {
  toItemInstanceId,
  type EquipmentSlot,
  type InventoryEntry,
  type MasteryId,
  type StatId,
} from "@game/gameplay";
import { CombatRuntime } from "./CombatRuntime.js";
import { setupCombatEntity } from "./combatEntityFactory.js";
import { recalculateWeaponMasteryStats } from "./weaponMasteryStatSync.js";
import { createCombatFoundation } from "./bootstrap/createCombatFoundation.js";
import { createProgressionFoundation } from "./bootstrap/createProgressionFoundation.js";
import { createCharacterEquipmentFoundation } from "./bootstrap/createCharacterFoundation.js";
import { resolveWeaponMastery } from "../data/weaponContentCatalog.js";
import { WORLD_ZONE_IDS } from "../data/worldContentCatalog.js";

/**
 * TEMPORARY DIAGNOSTIC TESTS.
 *
 * Purpose: explain the large AFK divergence observed in the Blue runtime
 * without changing production balance. Delete this whole file once the Blue
 * runtime has been validated and the conclusions have been folded into stable
 * regression tests.
 */

const DT = 0.5;
const MAX_TICKS = 2_000;
const FROSTPEAK_ZONE_INDEX = 4;
const FROSTPEAK_ZONE_NAME = "Frostpeak Mountain";

const STAT_MAX_HEALTH = "stat_max_health" as StatId;
const STAT_PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;
const STAT_MAGICAL_DAMAGE = "stat_magical_damage" as StatId;
const STAT_ATTACK_SPEED = "stat_attack_speed" as StatId;
const STAT_ARMOR = "stat_armor" as StatId;
const STAT_MAGIC_RESISTANCE = "stat_magic_resistance" as StatId;

type DiagnosticWeapon = "spiked" | "dagger" | "broadsword";

type DiagnosticConfig = {
  readonly weapon: DiagnosticWeapon;
  readonly masteryLevel: number;
  /** Runtime index: S8 = 7, S10 = 9. */
  readonly segmentIndex: number;
};

type AbilityUse = {
  readonly t: number;
  readonly side: "hero" | "enemy";
  readonly abilityId: string;
};

type EncounterSpawn = {
  readonly encounter: number;
  readonly enemy: string;
  readonly maxHealth: number;
};

type DiagnosticResult = {
  readonly weapon: DiagnosticWeapon;
  readonly masteryLevel: number;
  readonly segment: number;
  readonly outcome: "CLEARED" | "DEFEAT" | "TIMEOUT";
  readonly encounterReached: number;
  readonly elapsedSeconds: number;
  readonly heroStats: {
    readonly maxHealth: number;
    readonly physicalDamage: number;
    readonly magicalDamage: number;
    readonly attackSpeed: number;
    readonly armor: number;
    readonly magicResistance: number;
  };
  readonly finalHeroHp: number;
  readonly finalEnemyHp: number;
  readonly heroAutoAttacks: number;
  readonly enemyAutoAttacks: number;
  readonly heroDamage: number;
  readonly enemyDamage: number;
  readonly heroAbilities: string;
  readonly enemyAbilities: string;
  readonly spawns: readonly EncounterSpawn[];
  readonly abilityTimeline: readonly AbilityUse[];
};

const WEAPON_ITEM: Readonly<Record<DiagnosticWeapon, string>> = {
  spiked: "item_weapon_gloves_t4_spiked_gauntlets",
  dagger: "item_weapon_dagger_t4_pair",
  broadsword: "item_weapon_sword_t4_broadsword",
};

function equipmentEntry(counter: number, itemId: string, enchantment: 0 | 1 | 2 | 3 | 4): InventoryEntry {
  return {
    instanceId: toItemInstanceId(counter),
    itemId,
    quantity: 1,
    enchantment,
  };
}

function buildBlue43Loadout(weapon: DiagnosticWeapon): ReadonlyMap<EquipmentSlot, InventoryEntry> {
  let counter = 1;
  const slots = new Map<EquipmentSlot, InventoryEntry>();
  slots.set("weapon", equipmentEntry(counter++, WEAPON_ITEM[weapon], 3));
  slots.set("head", equipmentEntry(counter++, "item_helmet_t4_reinforced", 3));
  slots.set("chest", equipmentEntry(counter++, "item_armor_t4_leather", 3));
  slots.set("boots", equipmentEntry(counter++, "item_boots_t4_leather", 3));

  // Current Blue content has no authored T4 cape. Keep the existing traveler
  // cape unenchanted rather than manufacturing an impossible 4.3 cape state.
  slots.set("cape", equipmentEntry(counter++, "item_traveler_cape", 0));

  if (weapon === "broadsword") {
    slots.set("off_hand", equipmentEntry(counter++, "item_shield_t4_reinforced", 3));
  }
  return slots;
}

function xpRequiredForLevel(
  masteryService: ReturnType<typeof createProgressionFoundation>["masteryService"],
  masteryId: MasteryId,
  level: number,
): number {
  const table = masteryService._getTable(masteryId);
  if (table === undefined) throw new Error(`Missing mastery table: ${String(masteryId)}`);
  let total = 0;
  for (let current = 0; current < level; current += 1) {
    total += table.getRequiredXp(current);
  }
  return total;
}

function setWeaponMasteryLevel(
  masteryService: ReturnType<typeof createProgressionFoundation>["masteryService"],
  experienceService: ReturnType<typeof createProgressionFoundation>["experienceService"],
  weaponItemId: string,
  level: number,
): void {
  const route = resolveWeaponMastery(weaponItemId);
  if (route === undefined) throw new Error(`Missing weapon mastery route: ${weaponItemId}`);

  for (const masteryId of [route.familyId, route.weaponId]) {
    const discovered = masteryService.discoverMastery(masteryId);
    if (!discovered.ok && discovered.reason !== "mastery_already_unlocked") {
      throw new Error(`Unable to discover mastery: ${String(masteryId)}`);
    }
    const xp = xpRequiredForLevel(masteryService, masteryId, level);
    if (xp > 0) {
      const result = experienceService.addExperience(masteryId, xp, "combat");
      if (!result.ok) throw new Error(`Unable to set mastery level: ${String(masteryId)}`);
    }
  }
}

function countAbilityUses(timeline: readonly AbilityUse[], side: "hero" | "enemy"): string {
  const counts = new Map<string, number>();
  for (const event of timeline) {
    if (event.side !== side) continue;
    counts.set(event.abilityId, (counts.get(event.abilityId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([abilityId, count]) => `${abilityId}:${String(count)}`)
    .join(" | ");
}

function runDiagnostic(config: DiagnosticConfig): DiagnosticResult {
  const combat = createCombatFoundation();
  const progression = createProgressionFoundation();
  const character = createCharacterEquipmentFoundation({
    world: combat.world,
    statsManager: combat.statsManager,
    damageManager: combat.damageManager,
    masteryService: progression.masteryService,
    onPlayerHealthChanged: () => {},
    onStatsChanged: () => {},
  });

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
    // Production hero baseline from GameContext.
    { maxHealth: 500, physDamage: 0, attackSpeed: 1.2, armor: 10, magicRes: 5 },
    { x: 0, y: 0 },
  );

  character.inventoryManager.createInventory(heroId, 24);
  character.equipmentManager.attachEquipment(heroId);
  character.equipmentManager._restore(heroId, {
    slots: new Map(buildBlue43Loadout(config.weapon)),
  });

  const weaponItemId = WEAPON_ITEM[config.weapon];
  setWeaponMasteryLevel(
    progression.masteryService,
    progression.experienceService,
    weaponItemId,
    config.masteryLevel,
  );
  recalculateWeaponMasteryStats(
    combat.statsManager,
    character.equipmentManager,
    progression.masteryService,
    heroId,
  );
  const heroHealth = combat.damageManager.getHealth(heroId);
  heroHealth.currentHealth = heroHealth.maxHealth;

  let encounterIndex = 0;
  let currentTick = 0;
  let heroAutoAttacks = 0;
  let enemyAutoAttacks = 0;
  let heroDamage = 0;
  let enemyDamage = 0;
  const abilityTimeline: AbilityUse[] = [];
  const spawns: EncounterSpawn[] = [];

  const unsubscribeAbility = combat.abilityManager.subscribeAbilityExecuted((event) => {
    abilityTimeline.push({
      t: currentTick * DT,
      side: event.entityId === heroId ? "hero" : "enemy",
      abilityId: String(event.abilityId),
    });
  });
  const unsubscribeAttack = combat.combatService.events.subscribe("attackExecuted", (event) => {
    if (event.source === heroId) heroAutoAttacks += 1;
    else enemyAutoAttacks += 1;
  });
  const unsubscribeDamage = combat.damageEventBus.subscribe("DamageDealt", (event) => {
    if (event.source === heroId) heroDamage += event.finalDamage;
    else if (event.target === heroId) enemyDamage += event.finalDamage;
  });

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
    equipmentManager: character.equipmentManager,
    masteryService: progression.masteryService,
    // Spawn currently ignores biomeResolver; production still provides one.
    biomeResolver: {} as never,
    ports: {
      onVictory: () => {
        if (encounterIndex < 4) encounterIndex += 1;
        return { enteredNewSegment: false };
      },
      onDefeat: () => {},
      getLocationState: () => ({
        zoneIndex: FROSTPEAK_ZONE_INDEX,
        segmentIndex: config.segmentIndex,
        encounterIndex,
        zoneDefId: WORLD_ZONE_IDS.mountain,
        zoneName: FROSTPEAK_ZONE_NAME,
        highestUnlockedSegment: config.segmentIndex,
        farmMode: false,
      }),
      isCombatSuspended: () => false,
    },
  });

  const initial = runtime.initialize();
  if (initial.spawnedEnemy !== undefined) {
    spawns.push({
      encounter: 1,
      enemy: initial.spawnedEnemy.name,
      maxHealth: initial.spawnedEnemy.maxHealth,
    });
  }

  let outcome: DiagnosticResult["outcome"] = "TIMEOUT";
  for (let tick = 1; tick <= MAX_TICKS; tick += 1) {
    currentTick = tick;
    const result = runtime.tick(DT, tick);
    if (result.spawnedEnemy !== undefined) {
      spawns.push({
        encounter: encounterIndex + 1,
        enemy: result.spawnedEnemy.name,
        maxHealth: result.spawnedEnemy.maxHealth,
      });
    }
    if (result.combatState === "defeat") {
      outcome = "DEFEAT";
      break;
    }
    if (result.combatState === "victory" && encounterIndex === 4) {
      outcome = "CLEARED";
      break;
    }
  }

  const activeEnemyId = runtime.getActiveEnemyId();
  const finalHeroHealth = combat.damageManager.getHealth(heroId);
  const finalEnemyHealth = combat.world.hasEntity(activeEnemyId)
    ? combat.damageManager.getHealth(activeEnemyId)
    : { currentHealth: 0 };

  const read = (statId: StatId): number => combat.statsManager.getStat(heroId, statId).computed;
  const result: DiagnosticResult = {
    weapon: config.weapon,
    masteryLevel: config.masteryLevel,
    segment: config.segmentIndex + 1,
    outcome,
    encounterReached: encounterIndex + 1,
    elapsedSeconds: currentTick * DT,
    heroStats: {
      maxHealth: read(STAT_MAX_HEALTH),
      physicalDamage: read(STAT_PHYSICAL_DAMAGE),
      magicalDamage: read(STAT_MAGICAL_DAMAGE),
      attackSpeed: read(STAT_ATTACK_SPEED),
      armor: read(STAT_ARMOR),
      magicResistance: read(STAT_MAGIC_RESISTANCE),
    },
    finalHeroHp: finalHeroHealth.currentHealth,
    finalEnemyHp: finalEnemyHealth.currentHealth,
    heroAutoAttacks,
    enemyAutoAttacks,
    heroDamage,
    enemyDamage,
    heroAbilities: countAbilityUses(abilityTimeline, "hero"),
    enemyAbilities: countAbilityUses(abilityTimeline, "enemy"),
    spawns,
    abilityTimeline,
  };

  unsubscribeAbility();
  unsubscribeAttack();
  unsubscribeDamage();
  combat.orchestrator.dispose();
  progression.progressionOrchestrator.dispose();

  return result;
}

function compact(result: DiagnosticResult) {
  return {
    weapon: result.weapon,
    mastery: result.masteryLevel,
    segment: result.segment,
    result: result.outcome,
    encounter: result.encounterReached,
    seconds: result.elapsedSeconds,
    hp: `${Math.round(result.finalHeroHp)}/${Math.round(result.heroStats.maxHealth)}`,
    damage: Math.round(result.heroStats.physicalDamage || result.heroStats.magicalDamage),
    armor: Math.round(result.heroStats.armor * 10) / 10,
    mr: Math.round(result.heroStats.magicResistance * 10) / 10,
    heroAA: result.heroAutoAttacks,
    enemyAA: result.enemyAutoAttacks,
    dealt: Math.round(result.heroDamage),
    taken: Math.round(result.enemyDamage),
    heroAbilities: result.heroAbilities,
    enemyAbilities: result.enemyAbilities,
  };
}

describe("TEMP Blue runtime deterministic diagnostics", () => {
  it("Spiked Frostpeak S8 is deterministic across the mastery 12→31 threshold", () => {
    const levels = [12, 15, 20, 25, 29, 30, 31];
    const results = levels.map((masteryLevel) => {
      const first = runDiagnostic({ weapon: "spiked", masteryLevel, segmentIndex: 7 });
      const second = runDiagnostic({ weapon: "spiked", masteryLevel, segmentIndex: 7 });
      expect(second).toEqual(first);
      return first;
    });

    console.log("\n=== TEMP SPIKED FROSTPEAK S8 ===");
    console.table(results.map(compact));
    console.log("\n--- Spiked mastery 29 ability timeline ---");
    console.table(results.find((entry) => entry.masteryLevel === 29)?.abilityTimeline ?? []);
    console.log("\n--- Spiked mastery 30 ability timeline ---");
    console.table(results.find((entry) => entry.masteryLevel === 30)?.abilityTimeline ?? []);
  });

  it("Dagger provides a deterministic same-gear/same-mastery Frostpeak S8 control", () => {
    const first = runDiagnostic({ weapon: "dagger", masteryLevel: 12, segmentIndex: 7 });
    const second = runDiagnostic({ weapon: "dagger", masteryLevel: 12, segmentIndex: 7 });
    expect(second).toEqual(first);

    console.log("\n=== TEMP DAGGER CONTROL FROSTPEAK S8 ===");
    console.table([compact(first)]);
    console.table(first.abilityTimeline);
  });

  it("Broadsword Frostpeak S10 is deterministic and includes the real 4.3 shield scaling", () => {
    const levels = [12, 25, 29, 30];
    const results = levels.map((masteryLevel) => {
      const first = runDiagnostic({ weapon: "broadsword", masteryLevel, segmentIndex: 9 });
      const second = runDiagnostic({ weapon: "broadsword", masteryLevel, segmentIndex: 9 });
      expect(second).toEqual(first);
      return first;
    });

    // Full production-like Blue 4.3 defensive totals with the current authored
    // equipment: 732 HP, 78.8 armor, 55.4 MR. The traveler cape remains 3.0.
    for (const result of results) {
      expect(result.heroStats.maxHealth).toBeCloseTo(732, 5);
      expect(result.heroStats.armor).toBeCloseTo(78.8, 5);
      expect(result.heroStats.magicResistance).toBeCloseTo(55.4, 5);
    }

    console.log("\n=== TEMP BROADSWORD FROSTPEAK S10 (FULL 4.3 + SHIELD 4.3) ===");
    console.table(results.map(compact));
    console.log("\n--- Broadsword mastery 30 ability timeline ---");
    console.table(results.find((entry) => entry.masteryLevel === 30)?.abilityTimeline ?? []);
  });
});