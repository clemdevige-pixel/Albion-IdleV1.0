import { EventBus, World, createRuntimeServices } from "@game/core";
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
  type DamageEventMap,
  type MasteryId,
  type StatId,
  type ZoneDefinitionId,
} from "@game/gameplay";
import { resolveEquipmentInfo, resolveItemStackInfo } from "../data/itemContentCatalog.js";
import { resolveUnlockedWeaponAbilities, resolveWeaponMastery } from "../data/weaponContentCatalog.js";
import { getWorldZonePlacement } from "../data/worldContentCatalog.js";
import { getDungeonDefinition, resolveDungeonCombatProfile } from "../data/dungeonContentCatalog.js";
import { CombatRuntime } from "./CombatRuntime.js";
import { CONTINUOUS_COMBAT_FLOW_POLICY } from "./CombatFlowPolicy.js";
import { ConsumableRuntime } from "./ConsumableRuntime.js";
import { setupCombatEntity, spawnAuthoredEnemy } from "./combatEntityFactory.js";
import { createProgressionFoundation } from "./bootstrap/createProgressionFoundation.js";
import { recalculateWeaponMasteryStats } from "./weaponMasteryStatSync.js";

const DT = 1 / 20;
const MAX_TICKS = 20 * 180;
const POTION_ITEM_ID = "item_health_potion";
const STAT_MAX_HEALTH = "stat_max_health" as StatId;
const STAT_ARMOR = "stat_armor" as StatId;
const STAT_MAGIC_RESISTANCE = "stat_magic_resistance" as StatId;

export type BenchmarkEnchantment = 0 | 1 | 2 | 3;

export interface CombatRuntimeBenchmarkInput {
  readonly label: string;
  readonly weaponItemId: string;
  readonly zoneDefId: ZoneDefinitionId;
  /** Zero-based segment index. */
  readonly segmentIndex: number;
  readonly equipmentItemIds?: readonly string[];
  readonly enchantment?: BenchmarkEnchantment;
  readonly masteryLevel?: number;
  readonly useHealthPotions?: boolean;
  /** Optional authored dungeon. When present, the live runtime uses its five continuous encounters instead of the world segment. */
  readonly dungeonDefinitionId?: string;
}

export interface CombatRuntimeAbilityTelemetry {
  readonly abilityId: string;
  readonly casts: number;
  /** Immediate post-mitigation, non-overkill damage dealt during the cast itself. DoT ticks are reported separately as effect damage. */
  readonly directDamage: number;
}

export interface CombatRuntimeDamageSourceTelemetry {
  readonly autoAttack: number;
  readonly ability: number;
  readonly effect: number;
  readonly other: number;
}

export interface CombatRuntimeBenchmarkResult {
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
  /** Actual post-mitigation, non-overkill damage dealt by the hero during the benchmark. */
  readonly damageDealt: number;
  /** Actual post-mitigation, non-overkill damage received by the hero during the benchmark. */
  readonly damageReceived: number;
  /** Observed hero damage per elapsed combat second. Diagnostic only; never used by runtime balance. */
  readonly observedDps: number;
  /** Benchmark-only breakdown from the live DamageDealt event source type. */
  readonly damageBySource: CombatRuntimeDamageSourceTelemetry;
  /** Benchmark-only live cast counts and immediate damage by authored weapon ability. */
  readonly abilities: readonly CombatRuntimeAbilityTelemetry[];
}

interface MutableAbilityTelemetry {
  casts: number;
  directDamage: number;
}

class TelemetryCombatRuntime extends CombatRuntime {
  public constructor(
    deps: ConstructorParameters<typeof CombatRuntime>[0],
    private readonly abilityIds: readonly string[],
    private readonly abilityTelemetry: Map<string, MutableAbilityTelemetry>,
  ) {
    super(deps);
    this.telemetryDamageManager = deps.damageManager;
  }

  private readonly telemetryDamageManager: DamageManager;

  override useWeaponAbility(slotIndex: number): boolean {
    const abilityId = this.abilityIds[slotIndex];
    const targetId = this.getActiveEnemyId();
    const before = this.telemetryDamageManager.isAlive(targetId)
      ? this.telemetryDamageManager.getHealth(targetId).currentHealth
      : 0;
    const used = super.useWeaponAbility(slotIndex);
    if (!used || abilityId === undefined) return used;

    const telemetry = this.abilityTelemetry.get(abilityId) ?? { casts: 0, directDamage: 0 };
    telemetry.casts += 1;
    const after = this.telemetryDamageManager.getHealth(targetId).currentHealth;
    telemetry.directDamage += Math.max(0, before - after);
    this.abilityTelemetry.set(abilityId, telemetry);
    return used;
  }
}

function equipItem(
  inventoryManager: InventoryManager,
  equipmentManager: EquipmentManager,
  heroId: Parameters<InventoryManager["createInventory"]>[0],
  itemId: string,
  enchantment: BenchmarkEnchantment,
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

function seedOneMasteryLevel(
  masteryId: MasteryId,
  targetLevel: number,
  masteryService: ReturnType<typeof createProgressionFoundation>["masteryService"],
  experienceService: ReturnType<typeof createProgressionFoundation>["experienceService"],
): number {
  const table = masteryService._getTable(masteryId);
  if (table === undefined) throw new Error(`Missing mastery table for ${String(masteryId)}`);
  let totalXp = 0;
  for (let level = 0; level < targetLevel; level += 1) totalXp += table.getRequiredXp(level);
  if (totalXp > 0) experienceService.addExperience(masteryId, totalXp, "combat");
  return masteryService.getMasteryState(masteryId)?.level ?? 0;
}

function seedMasteryLevel(
  input: CombatRuntimeBenchmarkInput,
  masteryService: ReturnType<typeof createProgressionFoundation>["masteryService"],
  experienceService: ReturnType<typeof createProgressionFoundation>["experienceService"],
): number {
  const route = resolveWeaponMastery(input.weaponItemId);
  if (route === undefined) return 0;
  masteryService.discoverMastery(route.familyId);
  masteryService.discoverMastery(route.weaponId);
  const targetLevel = Math.max(1, Math.floor(input.masteryLevel ?? 1));
  seedOneMasteryLevel(route.familyId, targetLevel, masteryService, experienceService);
  return seedOneMasteryLevel(route.weaponId, targetLevel, masteryService, experienceService);
}

/**
 * Generic balance harness that runs the exact live CombatRuntime tick by tick.
 * Zone/world-band/dungeon tuning belongs in authored data, not in this harness.
 * Keep this thin: no alternate DPS/EHP or enemy formulas are allowed here.
 */
export function runCombatRuntimeBenchmark(input: CombatRuntimeBenchmarkInput): CombatRuntimeBenchmarkResult {
  const placement = getWorldZonePlacement(input.zoneDefId);
  const dungeon = input.dungeonDefinitionId === undefined ? undefined : getDungeonDefinition(input.dungeonDefinitionId);

  const world = new World(createRuntimeServices());
  const statsManager = new StatsManager(world, createDefaultStatRegistry());
  const damageManager = new DamageManager(world, statsManager);
  const damageEventBus = new EventBus<DamageEventMap>();
  damageManager.setEventBus(damageEventBus);
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
  const equipmentStatSync = new EquipmentStatSync(statsManager, resolveEquipmentInfo, (entityId, changedStats) => {
    if (changedStats.includes(STAT_MAX_HEALTH)) damageManager.syncMaxHealth(entityId);
  });
  const equipmentManager = new EquipmentManager(world, inventoryManager, resolveEquipmentInfo, equipmentStatSync);

  const heroId = setupCombatEntity(
    { world, statsManager, damageManager, deathManager, targetManager, autoAttackManager, abilityManager },
    { maxHealth: 300, physDamage: 0, attackSpeed: 1.2, armor: 0, magicRes: 0 },
    { x: 0, y: 0 },
  );
  inventoryManager.createInventory(heroId, 32);
  equipmentManager.attachEquipment(heroId);

  let damageDealt = 0;
  let damageReceived = 0;
  const damageBySource = { autoAttack: 0, ability: 0, effect: 0, other: 0 };
  damageEventBus.subscribe("DamageDealt", (event) => {
    if (event.source === heroId) {
      damageDealt += event.finalDamage;
      if (event.sourceType === "auto_attack") damageBySource.autoAttack += event.finalDamage;
      else if (event.sourceType === "ability") damageBySource.ability += event.finalDamage;
      else if (event.sourceType === "effect") damageBySource.effect += event.finalDamage;
      else damageBySource.other += event.finalDamage;
    }
    if (event.target === heroId) damageReceived += event.finalDamage;
  });

  const masteryLevel = seedMasteryLevel(input, masteryService, experienceService);
  const enchantment = input.enchantment ?? 0;
  equipItem(inventoryManager, equipmentManager, heroId, input.weaponItemId, enchantment);
  for (const itemId of input.equipmentItemIds ?? []) equipItem(inventoryManager, equipmentManager, heroId, itemId, enchantment);
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
  let segmentEndHpPercent: number | undefined;
  const abilityDefinitions = resolveUnlockedWeaponAbilities(input.weaponItemId, masteryLevel);
  const abilityTelemetry = new Map<string, MutableAbilityTelemetry>();
  const runtime = new TelemetryCombatRuntime({
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
    ...(dungeon === undefined ? {} : {
      spawnEnemyOverride: () => {
        const encounter = dungeon.encounters[encounterIndex];
        if (encounter === undefined) return undefined;
        return spawnAuthoredEnemy(
          { world, statsManager, damageManager, deathManager, targetManager, autoAttackManager, abilityManager },
          {
            monsterDefinitionId: encounter.monsterDefinitionId,
            profile: resolveDungeonCombatProfile({
              dungeonDefinitionId: dungeon.id,
              encounterIndex,
              monsterDefinitionId: encounter.monsterDefinitionId,
            }),
            contextLabel: `Benchmark ${dungeon.id}`,
          },
        );
      },
    }),
    ports: {
      isCombatSuspended: () => false,
      ...(dungeon === undefined ? {} : { flowPolicy: CONTINUOUS_COMBAT_FLOW_POLICY }),
      onDefeat: () => { defeated = true; },
      onVictory: () => {
        const lastEncounterIndex = dungeon?.encounters.length !== undefined ? dungeon.encounters.length - 1 : 4;
        if (encounterIndex >= lastEncounterIndex) {
          const health = damageManager.getHealth(heroId);
          segmentEndHpPercent = (health.currentHealth / health.maxHealth) * 100;
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
  }, abilityDefinitions.map((definition) => String(definition.id)), abilityTelemetry);

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
  const seconds = Number((ticks * DT).toFixed(1));
  const abilities = abilityDefinitions.map((definition) => {
    const telemetry = abilityTelemetry.get(String(definition.id)) ?? { casts: 0, directDamage: 0 };
    return {
      abilityId: String(definition.id),
      casts: telemetry.casts,
      directDamage: Number(telemetry.directDamage.toFixed(1)),
    };
  });
  return {
    label: input.label,
    weaponItemId: input.weaponItemId,
    clear: finishedSegment && !defeated,
    seconds,
    hpPercent: Number((segmentEndHpPercent ?? ((health.currentHealth / health.maxHealth) * 100)).toFixed(1)),
    encounterReached: encounterIndex + 1,
    maxHealth: health.maxHealth,
    armor: statsManager.getStat(heroId, STAT_ARMOR).computed,
    magicResistance: statsManager.getStat(heroId, STAT_MAGIC_RESISTANCE).computed,
    potionsUsed,
    masteryLevel,
    damageDealt: Number(damageDealt.toFixed(1)),
    damageReceived: Number(damageReceived.toFixed(1)),
    observedDps: seconds > 0 ? Number((damageDealt / seconds).toFixed(1)) : 0,
    damageBySource: {
      autoAttack: Number(damageBySource.autoAttack.toFixed(1)),
      ability: Number(damageBySource.ability.toFixed(1)),
      effect: Number(damageBySource.effect.toFixed(1)),
      other: Number(damageBySource.other.toFixed(1)),
    },
    abilities,
  };
}
