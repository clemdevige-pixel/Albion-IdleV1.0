import { World, createRuntimeServices } from "@game/core";
import {
  AbilityManager,
  AutoAttackManager,
  BiomeRegistry,
  BiomeResolver,
  CombatOrchestrator,
  CombatService,
  DamageManager,
  DeathManager,
  EffectManager,
  EquipmentManager,
  EquipmentStatSync,
  InventoryManager,
  StatsManager,
  TargetManager,
  TargetValidator,
  createDefaultStatRegistry,
  type StatId,
  type ZoneDefinitionId,
} from "@game/gameplay";
import { resolveEquipmentInfo, resolveItemStackInfo } from "../data/itemContentCatalog.js";
import { resolveWeaponMastery } from "../data/weaponContentCatalog.js";
import { getWorldZonePlacement } from "../data/worldContentCatalog.js";
import { CombatRuntime } from "./CombatRuntime.js";
import { ConsumableRuntime } from "./ConsumableRuntime.js";
import { setupCombatEntity } from "./combatEntityFactory.js";
import { createProgressionFoundation } from "./bootstrap/createProgressionFoundation.js";
import { recalculateWeaponMasteryStats } from "./weaponMasteryStatSync.js";

const DT = 1 / 20;
const MAX_TICKS = 20 * 180;
const POTION_ITEM_ID = "item_health_potion";
const STAT_ARMOR = "stat_armor" as StatId;
const STAT_MAGIC_RESISTANCE = "stat_magic_resistance" as StatId;

export interface BlueRuntimeBenchmarkInput {
  readonly label: string;
  readonly weaponItemId: string;
  readonly zoneDefId: ZoneDefinitionId;
  /** Zero-based segment index. */
  readonly segmentIndex: number;
  readonly equipmentItemIds?: readonly string[];
  readonly enchantment?: 0 | 1 | 2 | 3;
  readonly masteryLevel?: number;
  readonly useHealthPotions?: boolean;
}

export interface BlueRuntimeBenchmarkResult {
  readonly label: string;
  readonly weaponItemId: string;
  readonly clear: boolean;
  readonly seconds: number;
  readonly hpPercent: number;
  readonly encounterReached: number;
  readonly maxHealth: number;
  readonly armor: number;
  readonly magicResistance: number;
  readonly potionsUsed: number;
  readonly masteryLevel: number;
}

function equipItem(
  inventoryManager: InventoryManager,
  equipmentManager: EquipmentManager,
  heroId: Parameters<InventoryManager["createInventory"]>[0],
  itemId: string,
  enchantment: 0 | 1 | 2 | 3,
): void {
  const added = inventoryManager.addQuantity(heroId, itemId, 1, {
    itemId,
    stackable: false,
    maxStack: 1,
  });
  if (!added.ok || added.value.remainder !== 0) throw new Error(`Failed to seed ${itemId}`);
  const position = added.value.affectedPositions[0];
  if (position === undefined) throw new Error(`Missing inventory slot for ${itemId}`);
  const equipped = equipmentManager.equipFromInventory(heroId, position);
  if (!equipped.ok) throw new Error(`Failed to equip ${itemId}: ${equipped.reason}`);
  if (enchantment <= 0) return;
  const entry = equipmentManager.getEquippedItem(heroId, equipped.value.slot);
  if (entry === undefined) throw new Error(`Missing equipped ${itemId}`);
  if (!equipmentManager.changeEquippedEnchantment(heroId, entry.instanceId, enchantment)) {
    throw new Error(`Failed to enchant ${itemId} to .${enchantment}`);
  }
}

function seedMasteryLevel(
  input: BlueRuntimeBenchmarkInput,
  masteryService: ReturnType<typeof createProgressionFoundation>["masteryService"],
  experienceService: ReturnType<typeof createProgressionFoundation>["experienceService"],
): number {
  const route = resolveWeaponMastery(input.weaponItemId);
  if (route === undefined) return 0;
  masteryService.discoverMastery(route.familyId);
  masteryService.discoverMastery(route.weaponId);
  const targetLevel = Math.max(1, Math.floor(input.masteryLevel ?? 1));
  const table = masteryService._getTable(route.weaponId);
  if (table === undefined) throw new Error(`Missing mastery table for ${input.weaponItemId}`);
  let totalXp = 0;
  for (let level = 0; level < targetLevel; level += 1) totalXp += table.getRequiredXp(level);
  if (totalXp > 0) experienceService.addExperience(route.weaponId, totalXp, "combat");
  return masteryService.getMasteryState(route.weaponId)?.level ?? 0;
}

/**
 * Balance harness that intentionally runs the exact live combat stack tick by tick.
 * It must remain thin: no alternate DPS/EHP formulas are allowed here.
 */
export function runBlueRuntimeBenchmark(input: BlueRuntimeBenchmarkInput): BlueRuntimeBenchmarkResult {
  const placement = getWorldZonePlacement(input.zoneDefId);
  if (placement.bandId !== "blue") throw new Error(`Blue runtime benchmark cannot run ${placement.bandId} content`);

  const world = new World(createRuntimeServices());
  const statsManager = new StatsManager(world, createDefaultStatRegistry());
  const damageManager = new DamageManager(world, statsManager);
  const deathManager = new DeathManager(world, damageManager);
  const targetManager = new TargetManager(world, new TargetValidator(world));
  const autoAttackManager = new AutoAttackManager(world, targetManager, statsManager);
  const abilityManager = new AbilityManager(world, statsManager);
  const effectManager = new EffectManager();
  const combatService = new CombatService(damageManager, deathManager, targetManager, autoAttackManager, statsManager);
  const orchestrator = new CombatOrchestrator({ combatService, effectManager, abilityManager });
  orchestrator.initialize();

  const { masteryService, experienceService } = createProgressionFoundation();
  const inventoryManager = new InventoryManager(world, resolveItemStackInfo);
  const equipmentStatSync = new EquipmentStatSync(statsManager, resolveEquipmentInfo, () => {});
  const equipmentManager = new EquipmentManager(world, inventoryManager, resolveEquipmentInfo, equipmentStatSync);

  const heroId = setupCombatEntity(
    { world, statsManager, damageManager, deathManager, targetManager, autoAttackManager, abilityManager },
    { maxHealth: 300, physDamage: 0, attackSpeed: 1.2, armor: 0, magicRes: 0 },
    { x: 0, y: 0 },
  );
  inventoryManager.createInventory(heroId, 32);
  equipmentManager.attachEquipment(heroId);

  const masteryLevel = seedMasteryLevel(input, masteryService, experienceService);
  const enchantment = input.enchantment ?? 0;
  equipItem(inventoryManager, equipmentManager, heroId, input.weaponItemId, enchantment);
  for (const itemId of input.equipmentItemIds ?? []) {
    equipItem(inventoryManager, equipmentManager, heroId, itemId, enchantment);
  }
  recalculateWeaponMasteryStats(statsManager, equipmentManager, masteryService, heroId);

  const useHealthPotions = input.useHealthPotions === true;
  if (useHealthPotions) {
    const seeded = inventoryManager.addQuantity(heroId, POTION_ITEM_ID, 99);
    if (!seeded.ok) throw new Error("Failed to seed benchmark health potions");
  }
  const consumableRuntime = new ConsumableRuntime({ inventoryManager, damageManager, deathManager, heroId });

  let encounterIndex = 0;
  let finishedSegment = false;
  let defeated = false;
  let potionsUsed = 0;
  const runtime = new CombatRuntime({
    world,
    heroId,
    combatService,
    orchestrator,
    damageManager,
    deathManager,
    targetManager,
    autoAttackManager,
    abilityManager,
    effectManager,
    statsManager,
    equipmentManager,
    masteryService,
    biomeResolver: new BiomeResolver(new BiomeRegistry()),
    ports: {
      isCombatSuspended: () => false,
      onDefeat: () => { defeated = true; },
      onVictory: () => {
        if (encounterIndex >= 4) {
          finishedSegment = true;
          return { enteredNewSegment: true };
        }
        encounterIndex += 1;
        return { enteredNewSegment: false };
      },
      getLocationState: () => ({
        zoneIndex: placement.zoneIndexWithinBand,
        segmentIndex: input.segmentIndex,
        encounterIndex,
        zoneDefId: input.zoneDefId,
        zoneName: String(input.zoneDefId),
        highestUnlockedSegment: input.segmentIndex,
        farmMode: false,
      }),
    },
  });

  let ticks = 0;
  while (!finishedSegment && !defeated && ticks < MAX_TICKS) {
    ticks += 1;
    runtime.tick(DT, ticks);
    consumableRuntime.tick(DT);
    if (useHealthPotions && !deathManager.isDead(heroId)) {
      const health = damageManager.getHealth(heroId);
      const state = consumableRuntime.getState();
      if (health.currentHealth / health.maxHealth <= 0.7 && state.healthPotionCooldownRemaining <= 0) {
        const used = consumableRuntime.useConsumable(POTION_ITEM_ID);
        if (used.ok) potionsUsed += 1;
      }
    }
  }

  const health = damageManager.getHealth(heroId);
  return {
    label: input.label,
    weaponItemId: input.weaponItemId,
    clear: finishedSegment && !defeated,
    seconds: Number((ticks * DT).toFixed(1)),
    hpPercent: Number(((health.currentHealth / health.maxHealth) * 100).toFixed(1)),
    encounterReached: encounterIndex + 1,
    maxHealth: health.maxHealth,
    armor: statsManager.getStat(heroId, STAT_ARMOR).computed,
    magicResistance: statsManager.getStat(heroId, STAT_MAGIC_RESISTANCE).computed,
    potionsUsed,
    masteryLevel,
  };
}
