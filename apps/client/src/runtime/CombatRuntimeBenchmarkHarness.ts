import { EventBus, World, createRuntimeServices } from "@game/core";
import {
  AbilityManager,
  AutoAttackManager,
  AwakenedWeaponService,
  BiomeRegistry,
  BiomeResolver,
  CombatOrchestrator,
  CombatService,
  CurrencyRegistry,
  CurrencyService,
  DamageManager,
  DeathManager,
  EffectManager,
  EquipmentManager,
  EquipmentStatSync,
  InventoryManager,
  StatsManager,
  TargetManager,
  TargetValidator,
  asMasteryId,
  asPlayerId,
  asWalletId,
  createDefaultStatRegistry,
  type AwakenedTraitState,
  type DamageEventMap,
  type MasteryId,
  type StatId,
  type ZoneDefinitionId,
} from "@game/gameplay";
import {
  resolveEnchantmentItemInfo,
  resolveEquipmentInfo,
  resolveItemStackInfo,
} from "../data/itemContentCatalog.js";
import { getItemTier } from "../data/itemPower.js";
import {
  getWeaponMasteryFamilyDefinitions,
  resolveUnlockedWeaponAbilities,
  resolveWeaponMastery,
} from "../data/weaponContentCatalog.js";
import { getWorldZonePlacement } from "../data/worldContentCatalog.js";
import { getDungeonDefinition, resolveDungeonCombatProfile } from "../data/dungeonContentCatalog.js";
import { resolveFactionCapeDungeonDamageReductionPercent } from "../data/factionCapeContentCatalog.js";
import { CombatRuntime } from "./CombatRuntime.js";
import { CONTINUOUS_COMBAT_FLOW_POLICY } from "./CombatFlowPolicy.js";
import { ConsumableRuntime } from "./ConsumableRuntime.js";
import {
  setupCombatEntity,
  spawnAuthoredEnemy,
  type AuthoredEnemyCombatProfile,
  type SpawnedEnemyResult,
} from "./combatEntityFactory.js";
import { createProgressionFoundation } from "./bootstrap/createProgressionFoundation.js";
import {
  recalculateWeaponMasteryStats,
  recalculateWeaponProgressionStats,
} from "./weaponMasteryStatSync.js";
import { RUNTIME_DELTA_SECONDS } from "./runtimeTiming.js";

const DT = RUNTIME_DELTA_SECONDS;
const MAX_TICKS = Math.ceil(180 / DT);
const POTION_ITEM_ID = "item_health_potion";
const STAT_MAX_HEALTH = "stat_max_health" as StatId;
const STAT_ARMOR = "stat_armor" as StatId;
const STAT_MAGIC_RESISTANCE = "stat_magic_resistance" as StatId;

export type BenchmarkEnchantment = 0 | 1 | 2 | 3 | 4;

export interface CombatRuntimeBenchmarkDamageTuning {
  /** Benchmark-only multiplier applied to hero auto-attacks after mitigation. */
  readonly autoAttackMultiplier?: number;
  /** Benchmark-only multiplier applied to direct damage from the currently executing ability. */
  readonly directAbilityMultiplierById?: Readonly<Record<string, number>>;
  /** Benchmark-only multiplier applied to hero effect damage (weapon DoTs in the current roster). */
  readonly effectDamageMultiplier?: number;
}

export interface CombatRuntimeBenchmarkEncounter {
  readonly monsterDefinitionId: string;
  readonly profile: AuthoredEnemyCombatProfile;
}

export interface CombatRuntimeBenchmarkAwakenedWeapon {
  readonly strain: number;
  readonly traits: readonly AwakenedTraitState[];
}

export interface CombatRuntimeBenchmarkInput {
  readonly label: string;
  readonly weaponItemId: string;
  readonly zoneDefId: ZoneDefinitionId;
  /** Zero-based segment index. */
  readonly segmentIndex: number;
  /** Optional zero-based encounter to start from. Useful for isolated world boss diagnostics. */
  readonly startingEncounterIndex?: number;
  readonly equipmentItemIds?: readonly string[];
  /** Weapon enchantment. */
  readonly enchantment?: BenchmarkEnchantment;
  /** Optional separate enchantment for armor/cape. Defaults to weapon enchantment. */
  readonly equipmentEnchantment?: BenchmarkEnchantment;
  /** Optional real .4 awakened state injected on the equipped weapon instance. */
  readonly awakenedWeapon?: CombatRuntimeBenchmarkAwakenedWeapon;
  /** Legacy shorthand: seeds both family and equipped specialization to the same level. */
  readonly masteryLevel?: number;
  /** Explicit family mastery level. Falls back to masteryLevel. */
  readonly familyMasteryLevel?: number;
  /** Explicit equipped specialization mastery level. Falls back to masteryLevel. */
  readonly specializationMasteryLevel?: number;
  /** Optional level seeded on every other specialization in the equipped weapon family. */
  readonly siblingSpecializationMasteryLevel?: number;
  readonly useHealthPotions?: boolean;
  /** Optional exact number of health potions seeded for deterministic inventory-capped benchmarks. Defaults to 99 for backward compatibility. */
  readonly healthPotionQuantity?: number;
  /** Benchmark-only outgoing hero damage multiplier. Defaults to 1 and never changes authored weapon data. */
  readonly heroDamageMultiplier?: number;
  /** Optional benchmark-only incoming damage reduction percentage for non-Dungeon authored sequences. */
  readonly incomingDamageReductionPercent?: number;
  /** Optional benchmark-only targeted tuning. Authored weapon data and live runtime balance remain unchanged. */
  readonly damageTuning?: CombatRuntimeBenchmarkDamageTuning;
  /** Optional authored dungeon. When present, the live runtime uses its continuous authored encounters instead of the world segment. */
  readonly dungeonDefinitionId?: string;
  /** Optional explicit continuous authored encounter sequence. Mutually exclusive with dungeonDefinitionId. */
  readonly authoredEncounters?: readonly CombatRuntimeBenchmarkEncounter[];
}

export interface CombatRuntimeAbilityTelemetry {
  readonly abilityId: string;
  readonly casts: number;
  readonly directDamage: number;
  readonly dotDamage: number;
  readonly totalDamage: number;
}

export interface CombatRuntimeDamageSourceTelemetry {
  readonly autoAttack: number;
  readonly ability: number;
  readonly effect: number;
  readonly other: number;
}

export interface CombatRuntimeEncounterTelemetry {
  readonly encounterIndex: number;
  readonly cleared: boolean;
  readonly seconds: number;
  readonly hpBeforePercent: number;
  readonly hpAfterPercent: number;
  readonly enemyHpRemainingPercent: number;
  readonly encounterProgressPercent: number;
  readonly potionsUsed: number;
  readonly damageDealt: number;
  readonly damageReceived: number;
  readonly observedDps: number;
  readonly incomingDps: number;
  readonly damageBySource: CombatRuntimeDamageSourceTelemetry;
  readonly abilities: readonly CombatRuntimeAbilityTelemetry[];
}

export interface CombatRuntimeBenchmarkResult {
  readonly label: string;
  readonly weaponItemId: string;
  readonly clear: boolean;
  readonly seconds: number;
  readonly hpPercent: number;
  readonly encounterReached: number;
  readonly encounterProgressPercent: number;
  readonly bossProgressPercent: number;
  readonly enemyHpRemainingPercent: number;
  readonly maxHealth: number;
  readonly armor: number;
  readonly magicResistance: number;
  readonly dungeonDamageReductionPercent: number;
  readonly potionsUsed: number;
  readonly masteryLevel: number;
  readonly damageDealt: number;
  readonly damageReceived: number;
  readonly observedDps: number;
  readonly incomingDps: number;
  readonly damageBySource: CombatRuntimeDamageSourceTelemetry;
  readonly abilities: readonly CombatRuntimeAbilityTelemetry[];
  readonly encounters: readonly CombatRuntimeEncounterTelemetry[];
}

interface MutableAbilityTelemetry {
  casts: number;
  directDamage: number;
  dotDamage: number;
}

const emptyAbilityTelemetry = (): MutableAbilityTelemetry => ({ casts: 0, directDamage: 0, dotDamage: 0 });

class TelemetryCombatRuntime extends CombatRuntime {
  public constructor(
    deps: ConstructorParameters<typeof CombatRuntime>[0],
    private readonly abilityIds: readonly string[],
    private readonly abilityTelemetry: Map<string, MutableAbilityTelemetry>,
    private readonly setActiveAbilityId: (abilityId: string | undefined) => void,
  ) {
    super(deps);
  }

  override useWeaponAbility(slotIndex: number): boolean {
    const abilityId = this.abilityIds[slotIndex];
    if (abilityId === undefined) return super.useWeaponAbility(slotIndex);

    this.setActiveAbilityId(abilityId);
    try {
      const used = super.useWeaponAbility(slotIndex);
      if (!used) return used;
      const telemetry = this.abilityTelemetry.get(abilityId) ?? emptyAbilityTelemetry();
      telemetry.casts += 1;
      this.abilityTelemetry.set(abilityId, telemetry);
      return used;
    } finally {
      this.setActiveAbilityId(undefined);
    }
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

  const enchantmentInfo = resolveEnchantmentItemInfo(itemId);
  if (
    enchantmentInfo === undefined
    || !enchantmentInfo.enchantable
    || enchantment > enchantmentInfo.maximumLevel
  ) return;

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

  const fallbackLevel = Math.max(1, Math.floor(input.masteryLevel ?? 1));
  const familyTargetLevel = Math.max(0, Math.floor(input.familyMasteryLevel ?? fallbackLevel));
  const specializationTargetLevel = Math.max(0, Math.floor(input.specializationMasteryLevel ?? fallbackLevel));
  const siblingTargetLevel = Math.max(0, Math.floor(input.siblingSpecializationMasteryLevel ?? 0));

  masteryService.discoverMastery(route.familyId);
  masteryService.discoverMastery(route.weaponId);
  seedOneMasteryLevel(route.familyId, familyTargetLevel, masteryService, experienceService);

  if (siblingTargetLevel > 0) {
    const family = getWeaponMasteryFamilyDefinitions().find(
      (definition) => definition.masteryId === String(route.familyId),
    );
    for (const specializationId of family?.specializationMasteryIds ?? []) {
      if (specializationId === String(route.weaponId)) continue;
      const masteryId = asMasteryId(specializationId);
      masteryService.discoverMastery(masteryId);
      seedOneMasteryLevel(masteryId, siblingTargetLevel, masteryService, experienceService);
    }
  }

  return seedOneMasteryLevel(route.weaponId, specializationTargetLevel, masteryService, experienceService);
}

function createBenchmarkAwakenedWeaponService(): AwakenedWeaponService {
  const currencyRegistry = new CurrencyRegistry();
  currencyRegistry.register({
    id: "currency_silver",
    enabled: true,
    minValue: 0,
    maxValue: null,
    acquisitionSources: ["Loot"],
    spendingSources: ["Awakening"],
  });
  const currencyService = new CurrencyService(currencyRegistry);
  currencyService.createWallet(asWalletId("benchmark_wallet"), asPlayerId("benchmark_player"));
  return new AwakenedWeaponService(currencyService, {
    silverCurrencyId: "currency_silver",
    silverSpendSource: "Awakening",
  });
}

function round1(value: number): number {
  return Number(value.toFixed(1));
}

export function runCombatRuntimeBenchmark(input: CombatRuntimeBenchmarkInput): CombatRuntimeBenchmarkResult {
  const placement = getWorldZonePlacement(input.zoneDefId);
  const dungeon = input.dungeonDefinitionId === undefined ? undefined : getDungeonDefinition(input.dungeonDefinitionId);
  const authoredEncounters = input.authoredEncounters;
  if (dungeon !== undefined && authoredEncounters !== undefined) {
    throw new Error("Benchmark dungeonDefinitionId and authoredEncounters are mutually exclusive");
  }
  if (authoredEncounters !== undefined && authoredEncounters.length === 0) {
    throw new Error("Benchmark authoredEncounters must not be empty");
  }

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
  const masteryRoute = resolveWeaponMastery(input.weaponItemId);
  const familyMasteryLevel = masteryRoute === undefined
    ? 0
    : masteryService.getMasteryState(masteryRoute.familyId)?.level ?? 0;
  const enchantment = input.enchantment ?? 0;
  const equipmentEnchantment = input.equipmentEnchantment ?? enchantment;
  equipItem(inventoryManager, equipmentManager, heroId, input.weaponItemId, enchantment);
  for (const itemId of input.equipmentItemIds ?? []) {
    equipItem(inventoryManager, equipmentManager, heroId, itemId, equipmentEnchantment);
  }

  if (input.awakenedWeapon === undefined) {
    recalculateWeaponMasteryStats(statsManager, equipmentManager, masteryService, heroId);
  } else {
    if (enchantment !== 4) {
      throw new Error("Benchmark awakenedWeapon requires enchantment .4");
    }
    const equippedWeapon = equipmentManager.getEquippedItem(heroId, "weapon");
    if (equippedWeapon === undefined) throw new Error("Benchmark awakened weapon is not equipped");
    const tier = getItemTier(input.weaponItemId);
    if (tier !== 4 && tier !== 5 && tier !== 6 && tier !== 7 && tier !== 8) {
      throw new Error(`Benchmark awakened weapon has unsupported tier: ${String(tier)}`);
    }
    const awakenedWeaponService = createBenchmarkAwakenedWeaponService();
    awakenedWeaponService._restore([{
      itemInstanceId: equippedWeapon.instanceId,
      tier,
      awakened: true,
      storedAttunement: 0,
      lifetimeAttunementInvested: 0,
      strain: Math.max(0, Math.floor(input.awakenedWeapon.strain)),
      traits: input.awakenedWeapon.traits,
    }]);
    recalculateWeaponProgressionStats(
      statsManager,
      equipmentManager,
      masteryService,
      heroId,
      awakenedWeaponService,
    );
    damageManager.syncMaxHealth(heroId);
  }

  const equippedCape = equipmentManager.getEquippedItem(heroId, "cape");
  const derivedDungeonDamageReductionPercent = dungeon === undefined || equippedCape === undefined
    ? 0
    : resolveFactionCapeDungeonDamageReductionPercent(
        equippedCape.itemId,
        { factionId: dungeon.faction, tier: dungeon.tier },
      );
  const dungeonDamageReductionPercent = input.incomingDamageReductionPercent
    ?? derivedDungeonDamageReductionPercent;
  const heroDamageMultiplier = input.heroDamageMultiplier ?? 1;
  const autoAttackMultiplier = input.damageTuning?.autoAttackMultiplier ?? 1;
  const effectDamageMultiplier = input.damageTuning?.effectDamageMultiplier ?? 1;
  const directAbilityMultiplierById = input.damageTuning?.directAbilityMultiplierById ?? {};
  let activeAbilityId: string | undefined;

  if (
    dungeonDamageReductionPercent > 0
    || heroDamageMultiplier !== 1
    || autoAttackMultiplier !== 1
    || effectDamageMultiplier !== 1
    || Object.keys(directAbilityMultiplierById).length > 0
  ) {
    damageManager.setPostMitigationDamageResolver((request, mitigatedDamage) => {
      let resolvedDamage = mitigatedDamage;
      if (request.source === heroId) {
        resolvedDamage *= heroDamageMultiplier;
        if (request.source_type === "auto_attack") resolvedDamage *= autoAttackMultiplier;
        else if (request.source_type === "effect") resolvedDamage *= effectDamageMultiplier;
        else if (request.source_type === "ability" && activeAbilityId !== undefined) {
          resolvedDamage *= directAbilityMultiplierById[activeAbilityId] ?? 1;
        }
      }
      if (request.target === heroId && dungeonDamageReductionPercent > 0) {
        resolvedDamage *= 1 - dungeonDamageReductionPercent / 100;
      }
      return resolvedDamage;
    });
  }

  const useHealthPotions = input.useHealthPotions === true;
  const healthPotionQuantity = Math.max(0, Math.floor(input.healthPotionQuantity ?? 99));
  if (useHealthPotions && healthPotionQuantity > 0) {
    const seeded = inventoryManager.addQuantity(heroId, POTION_ITEM_ID, healthPotionQuantity);
    if (!seeded.ok || seeded.value.remainder !== 0) throw new Error("Failed to seed benchmark health potions");
  }
  const consumableRuntime = new ConsumableRuntime({ inventoryManager, damageManager, deathManager, heroId });

  const encounterCount = authoredEncounters?.length ?? dungeon?.encounters.length ?? 5;
  const lastEncounterIndex = encounterCount - 1;
  let encounterIndex = Math.max(0, Math.min(lastEncounterIndex, Math.floor(input.startingEncounterIndex ?? 0)));
  let finishedSegment = false;
  let defeated = false;
  let potionsUsed = 0;
  let segmentEndHpPercent: number | undefined;
  let activeEnemy: SpawnedEnemyResult | undefined;
  const abilityDefinitions = resolveUnlockedWeaponAbilities(input.weaponItemId, familyMasteryLevel);
  const abilityIds = abilityDefinitions.map((definition) => String(definition.id));
  const abilityTelemetry = new Map<string, MutableAbilityTelemetry>();
  const encounterTelemetry: CombatRuntimeEncounterTelemetry[] = [];
  let ticks = 0;
  let encounterStartTick = 0;
  let encounterStartHp = damageManager.getHealth(heroId).currentHealth;
  let encounterStartDamageDealt = 0;
  let encounterStartDamageReceived = 0;
  let encounterStartPotions = 0;
  let encounterStartDamageBySource = { autoAttack: 0, ability: 0, effect: 0, other: 0 };
  let encounterStartAbilities = new Map<string, MutableAbilityTelemetry>();

  const copyAbilityTelemetry = (): Map<string, MutableAbilityTelemetry> =>
    new Map(abilityIds.map((abilityId) => {
      const current = abilityTelemetry.get(abilityId) ?? emptyAbilityTelemetry();
      return [abilityId, { ...current }] as const;
    }));

  const beginEncounter = (): void => {
    const health = damageManager.getHealth(heroId);
    encounterStartTick = ticks;
    encounterStartHp = health.currentHealth;
    encounterStartDamageDealt = damageDealt;
    encounterStartDamageReceived = damageReceived;
    encounterStartPotions = potionsUsed;
    encounterStartDamageBySource = { ...damageBySource };
    encounterStartAbilities = copyAbilityTelemetry();
  };

  const resolveEnemyHpRemainingPercent = (cleared: boolean): number => {
    if (cleared) return 0;
    if (activeEnemy === undefined || !damageManager.isAlive(activeEnemy.id)) return 0;
    const enemyHealth = damageManager.getHealth(activeEnemy.id);
    return Math.max(0, Math.min(100, (enemyHealth.currentHealth / enemyHealth.maxHealth) * 100));
  };

  const recordEncounter = (cleared: boolean): void => {
    const health = damageManager.getHealth(heroId);
    const seconds = (ticks - encounterStartTick) * DT;
    const dealt = damageDealt - encounterStartDamageDealt;
    const received = damageReceived - encounterStartDamageReceived;
    const enemyHpRemainingPercent = resolveEnemyHpRemainingPercent(cleared);
    const encounterProgressPercent = Math.max(0, Math.min(100, 100 - enemyHpRemainingPercent));
    const abilities = abilityIds.map((abilityId) => {
      const before = encounterStartAbilities.get(abilityId) ?? emptyAbilityTelemetry();
      const after = abilityTelemetry.get(abilityId) ?? emptyAbilityTelemetry();
      const directDamage = after.directDamage - before.directDamage;
      const dotDamage = after.dotDamage - before.dotDamage;
      return {
        abilityId,
        casts: after.casts - before.casts,
        directDamage: round1(directDamage),
        dotDamage: round1(dotDamage),
        totalDamage: round1(directDamage + dotDamage),
      };
    });
    encounterTelemetry.push({
      encounterIndex: encounterIndex + 1,
      cleared,
      seconds: round1(seconds),
      hpBeforePercent: round1((encounterStartHp / health.maxHealth) * 100),
      hpAfterPercent: round1((health.currentHealth / health.maxHealth) * 100),
      enemyHpRemainingPercent: round1(enemyHpRemainingPercent),
      encounterProgressPercent: round1(encounterProgressPercent),
      potionsUsed: potionsUsed - encounterStartPotions,
      damageDealt: round1(dealt),
      damageReceived: round1(received),
      observedDps: seconds > 0 ? round1(dealt / seconds) : 0,
      incomingDps: seconds > 0 ? round1(received / seconds) : 0,
      damageBySource: {
        autoAttack: round1(damageBySource.autoAttack - encounterStartDamageBySource.autoAttack),
        ability: round1(damageBySource.ability - encounterStartDamageBySource.ability),
        effect: round1(damageBySource.effect - encounterStartDamageBySource.effect),
        other: round1(damageBySource.other - encounterStartDamageBySource.other),
      },
      abilities,
    });
  };

  const hasContinuousEncounterSource = dungeon !== undefined || authoredEncounters !== undefined;
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
    onWeaponAbilityDamage: (event) => {
      const telemetry = abilityTelemetry.get(event.abilityId) ?? emptyAbilityTelemetry();
      if (event.kind === "direct") telemetry.directDamage += event.finalDamage;
      else telemetry.dotDamage += event.finalDamage;
      abilityTelemetry.set(event.abilityId, telemetry);
    },
    ...(hasContinuousEncounterSource ? {
      spawnEnemyOverride: () => {
        const authoredEncounter = authoredEncounters?.[encounterIndex];
        if (authoredEncounter !== undefined) {
          activeEnemy = spawnAuthoredEnemy(
            { world, statsManager, damageManager, deathManager, targetManager, autoAttackManager, abilityManager },
            authoredEncounter,
          );
          return activeEnemy;
        }
        if (dungeon === undefined) return undefined;
        const encounter = dungeon.encounters[encounterIndex];
        if (encounter === undefined) return undefined;
        activeEnemy = spawnAuthoredEnemy(
          { world, statsManager, damageManager, deathManager, targetManager, autoAttackManager, abilityManager },
          {
            monsterDefinitionId: encounter.monsterDefinitionId,
            profile: resolveDungeonCombatProfile({
              dungeonDefinitionId: dungeon.id,
              encounterIndex,
              monsterDefinitionId: encounter.monsterDefinitionId,
            }),
          },
        );
        return activeEnemy;
      },
    } : {}),
    ports: {
      isCombatSuspended: () => false,
      ...(hasContinuousEncounterSource ? { flowPolicy: CONTINUOUS_COMBAT_FLOW_POLICY } : {}),
      onDefeat: () => {
        if (!defeated) recordEncounter(false);
        defeated = true;
      },
      onVictory: () => {
        recordEncounter(true);
        if (encounterIndex >= lastEncounterIndex) {
          const health = damageManager.getHealth(heroId);
          segmentEndHpPercent = (health.currentHealth / health.maxHealth) * 100;
          finishedSegment = true;
          return { enteredNewSegment: true };
        }
        encounterIndex += 1;
        activeEnemy = undefined;
        beginEncounter();
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
  }, abilityIds, abilityTelemetry, (abilityId) => { activeAbilityId = abilityId; });

  beginEncounter();
  while (!finishedSegment && !defeated && ticks < MAX_TICKS) {
    ticks += 1;
    consumableRuntime.tick(DT);
    if (useHealthPotions && !deathManager.isDead(heroId)) {
      const health = damageManager.getHealth(heroId);
      const state = consumableRuntime.getState();
      if (health.currentHealth / health.maxHealth <= 0.7 && state.healthPotionCooldownRemaining <= 0) {
        const used = consumableRuntime.useConsumable(POTION_ITEM_ID);
        if (used.ok) potionsUsed += 1;
      }
    }
    runtime.tick(DT, ticks);
  }

  const health = damageManager.getHealth(heroId);
  const seconds = round1(ticks * DT);
  const abilities = abilityDefinitions.map((definition) => {
    const telemetry = abilityTelemetry.get(String(definition.id)) ?? emptyAbilityTelemetry();
    return {
      abilityId: String(definition.id),
      casts: telemetry.casts,
      directDamage: round1(telemetry.directDamage),
      dotDamage: round1(telemetry.dotDamage),
      totalDamage: round1(telemetry.directDamage + telemetry.dotDamage),
    };
  });
  const finalEncounter = encounterTelemetry.at(-1);
  const encounterProgressPercent = finalEncounter?.encounterProgressPercent ?? 0;
  const enemyHpRemainingPercent = finalEncounter?.enemyHpRemainingPercent ?? 0;
  const bossProgressPercent = encounterIndex >= lastEncounterIndex ? encounterProgressPercent : 0;
  return {
    label: input.label,
    weaponItemId: input.weaponItemId,
    clear: finishedSegment && !defeated,
    seconds,
    hpPercent: round1(segmentEndHpPercent ?? ((health.currentHealth / health.maxHealth) * 100)),
    encounterReached: encounterIndex + 1,
    encounterProgressPercent,
    bossProgressPercent,
    enemyHpRemainingPercent,
    maxHealth: health.maxHealth,
    armor: statsManager.getStat(heroId, STAT_ARMOR).computed,
    magicResistance: statsManager.getStat(heroId, STAT_MAGIC_RESISTANCE).computed,
    dungeonDamageReductionPercent,
    potionsUsed,
    masteryLevel,
    damageDealt: round1(damageDealt),
    damageReceived: round1(damageReceived),
    observedDps: seconds > 0 ? round1(damageDealt / seconds) : 0,
    incomingDps: seconds > 0 ? round1(damageReceived / seconds) : 0,
    damageBySource: {
      autoAttack: round1(damageBySource.autoAttack),
      ability: round1(damageBySource.ability),
      effect: round1(damageBySource.effect),
      other: round1(damageBySource.other),
    },
    abilities,
    encounters: encounterTelemetry,
  };
}