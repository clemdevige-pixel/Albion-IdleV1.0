import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { RuntimeLifecycle } from "../runtime/RuntimeLifecycle.js";
import { RuntimePersistence } from "../runtime/RuntimePersistence.js";
import { WorldRuntime } from "../runtime/WorldRuntime.js";
import { EventBus, World, createRuntimeServices } from "@game/core";
import {
  CombatService,
  CombatOrchestrator,
  DamageManager,
  HealthComponent,
  EnergyComponent,
  DeathManager,
  DeathComponent,
  TargetManager,
  AutoAttackManager,
  EffectManager,
  AbilityManager,
  PositionComponent,
  createDefaultStatRegistry,
  StatsManager,
  TargetValidator,
  asEncounterId,
  InventoryManager,
  EquipmentManager,
  EquipmentStatSync,
  EnchantmentService,
  ENCHANTMENT_MINIMUM_ITEM_TIER,
  CurrencyRegistry,
  CurrencyService,
  VendorRegistry,
  VendorService,
  EconomyEventEmitter,
  TransactionRegistry,
  EconomyTransactionService,
  asEconomyTransactionId,
  asWalletId,
  asPlayerId,
  ExperienceService,
  FameService,
  MasteryService,
  DestinyBoardService,
  ProgressionOrchestrator,
  DurabilityStore,
  RepairStationRegistry,
  RepairCostResolver,
  RepairService,
  asMasteryId,
  asDestinyNodeId,
  ZoneManager,
  BiomeRegistry,
  BiomeResolver,
  WorldProgressionManager,
  ExplorationManager,
  WorldCoordinator,
  ResourceRegistry,
  ResourceRuntime,
  ResourceNodeRegistry,
  ResourceNodeManager,
  GatheringManager,
  GatheringToolRegistry,
  GatheringCoordinator,
  asResourceDefinitionId,
  asResourceNodeDefinitionId,
  asResourceId,
  asGatheringToolId,
  RefiningManager,
  WorkerRegistry,
  WorkerManager,
  WorkerTaskRegistry,
  WorkerAssignmentManager,
  WorkerExecutor,
  WorkerScheduler,
  WorldSaveProvider,
  getEnemyCombatProfile,
  getEncounterRewards,
} from "@game/gameplay";
import type { EntityId } from "@game/core";
import type { StatId, ModifierId, DamageEventMap, WalletId, PlayerId, EquipmentInfoLike, ZoneDefinitionId, WorldIntegrationEventMap, WorkerId, WorkerExecutionEventMap, AbilityDefinitionLike, AbilityId, DamageType, ItemInstanceId, ResourceFamily, MasteryId, WorkerTaskDefinitionId, WorkerDefinitionId, WorldLocationSaveState } from "@game/gameplay";

import { SEGMENTS_PER_ZONE, ENCOUNTERS_PER_SEGMENT } from "@game/data";
import { GameBridge, type GameBridgeState, type MasteryVM, type WorldVM, type WorkerProfessionVM } from "../game/GameBridge";
import { GatheringRuntime } from "../runtime/GatheringRuntime";
import { RefiningRuntime } from "../runtime/RefiningRuntime";
import { CraftingRuntime } from "../runtime/CraftingRuntime";
import { resolveEnvironmentPresentation } from "../data/environmentPresentation";
import {
  syncInventoryToBridge,
  syncBankToBridge,
  syncEquipmentToBridge,
  syncStatsToBridge,
  syncWalletToBridge,
  syncVendorToBridge,
  syncProgressionToBridge,
  syncRepairToBridge,
  syncWorkersToBridge,
  syncCraftingToBridge,
  syncGatheringToBridge,
  syncRefiningToBridge,
  WORKER_PROFESSION_LABELS,
  getWorkerResourceLabel,
  syncAllToBridge,
} from "./bridgeSync";
import {
  BIRCH_PLANK_RECIPE,
  COPPER_BAR_RECIPE,
  PINE_PLANK_RECIPE,
  IRON_BAR_RECIPE,
  STURDY_LEATHER_RECIPE,
  LINEN_CLOTH_RECIPE,
  THICK_LEATHER_RECIPE,
  FINE_CLOTH_RECIPE,
  EQUIPMENT_CRAFT_RECIPES,
} from "../data/refiningRecipes";
import {
  getItemPower,
  getItemTier,
  getMasteryItemPowerBonus,
  getWeaponAttackSpeed,
} from "../data/itemPower";
import {
  CLIENT_ABILITIES as CATALOG_CLIENT_ABILITIES,
  WEAPON_ITEM_DEFINITIONS,
  WEAPON_MASTERY_DEFINITIONS,
  WEAPON_VENDOR_OFFERS,
  getWeaponMasteryDisplayName,
  resolvePrimaryAbilityId as resolveCatalogPrimaryAbilityId,
  resolveWeaponMastery as resolveCatalogWeaponMastery,
} from "../data/weaponContentCatalog";
import {
  ENCHANTMENT_MATERIAL_NAMES,
  GENERAL_VENDOR_FIXED_OFFERS,
  REPAIR_COST_DEFINITIONS,
  rollEnchantmentMaterial,
  rollGenericCombatLoot,
} from "../data/economyContentCatalog";
import {
  NON_WEAPON_ITEM_DEFINITIONS,
  resolveCatalogStackInfo,
} from "../data/itemContentCatalog";
import {
  GATHERING_MASTERY_DEFINITIONS,
  getGatheringMasteryDisplayName,
} from "../data/progressionContentCatalog";
import {
  WORKER_DEFINITIONS,
  WORKER_DEFINITION_IDS,
  WORKER_TASK_DEFINITIONS,
  WORKER_TASK_IDS,
} from "../data/workerContentCatalog";
import {
  BIOME_BY_ZONE,
  BIOME_DEFINITIONS,
  WORLD_ZONE_IDS,
  WORLD_ZONE_ORDER,
  ZONE_DEFINITIONS,
  ZONE_UNLOCK_DEFINITIONS,
} from "../data/worldContentCatalog";

/** Event map for the UI-layer event bus. Starts empty; later phases add entries. */
export type UIEventMap = Record<string, unknown>;

/**
 * Minimal game services exposed to the React UI layer.
 */
export interface GameServices {
  readonly eventBus: EventBus<UIEventMap>;
  readonly bridge: GameBridge;
  readonly orchestrator: CombatOrchestrator;
  readonly heroId: EntityId;
  readonly bankId: EntityId;
  readonly inventoryManager: InventoryManager;
  readonly equipmentManager: EquipmentManager;
  readonly enchantmentService: EnchantmentService;
  readonly statsManager: StatsManager;
  readonly currencyService: CurrencyService;
  readonly economyTransactionService: EconomyTransactionService;
  readonly vendorRegistry: VendorRegistry;
  readonly walletId: WalletId;
  readonly playerId: PlayerId;
  readonly worldCoordinator: WorldCoordinator;
  readonly useConsumable: (itemId: string) => boolean;
  readonly usePrimaryAbility: () => boolean;
  readonly setPrimaryAbilityAutoCast: (enabled: boolean) => void;
  readonly resumeExploration: () => boolean;
  readonly selectSegment: (segmentNumber: number) => boolean;
  readonly setSegmentFarmMode: (enabled: boolean) => void;
  readonly selectZone: (zoneNumber: number, segmentNumber?: number) => boolean;
  readonly returnToCombat: () => boolean;
  readonly toggleGathering: () => boolean;
  readonly performGatheringStrike: (
    resourceFamily: string,
    quality: "miss" | "correct" | "perfect",
  ) => boolean;
  readonly toggleOreGathering: () => boolean;
  readonly toggleHideGathering: () => boolean;
  readonly toggleFiberGathering: () => boolean;
  readonly toggleRefining: () => boolean;
  readonly toggleMetalRefining: () => boolean;
  readonly toggleLeatherRefining: () => boolean;
  readonly toggleClothRefining: () => boolean;
  readonly refineAllAvailable: () => boolean;
  readonly setProductionTier: (tier: 3 | 4) => boolean;
  readonly craftEquipment: (outputItemId: string) => boolean;
  readonly recruitWorker: (profession: WorkerProfessionVM) => boolean;
  readonly toggleWorker: (profession: WorkerProfessionVM) => boolean;
  readonly repairAll: () => boolean;
  readonly saveGame: () => void;
  readonly loadGame: () => boolean;
  readonly hasSave: () => boolean;
}


const GameServiceContext = createContext<GameServices | null>(null);

// -- Stat ids ---------------------------------------------------------------

const STAT_MAX_HEALTH = "stat_max_health" as StatId;
const STAT_PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;
const STAT_ATTACK_SPEED = "stat_attack_speed" as StatId;
const STAT_ARMOR = "stat_armor" as StatId;
const STAT_MAGIC_RESISTANCE = "stat_magic_resistance" as StatId;
const STAT_MAGICAL_DAMAGE = "stat_magical_damage" as StatId;
const HERO_BASE_ATTACK_SPEED = 1.2;
const MASTERY_PHYSICAL_DAMAGE_MODIFIER = "mastery_weapon_physical_damage" as ModifierId;
const MASTERY_MAGICAL_DAMAGE_MODIFIER = "mastery_weapon_magical_damage" as ModifierId;

interface ClientAbilityDefinition extends AbilityDefinitionLike {
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly damageType: DamageType;
  readonly bonusDamageRatio: number;
}

const CLIENT_ABILITIES: Record<string, ClientAbilityDefinition> = {
  ...CATALOG_CLIENT_ABILITIES,
  ability_sword_heroic_strike: {
    id: "ability_sword_heroic_strike",
    name: "Frappe héroïque",
    description: "Une frappe lourde infligeant 175 % des dégâts physiques.",
    icon: "⚔️",
    category: "active",
    cooldown: 8,
    castTime: 0,
    resourceCost: { energy: 12 },
    interruptible: false,
    targetRule: "current_target",
    damageType: "physical",
    bonusDamageRatio: 0.75,
  },
  ability_bow_aimed_shot: {
    id: "ability_bow_aimed_shot",
    name: "Tir ajusté",
    description: "Un tir précis infligeant 160 % des dégâts physiques.",
    icon: "🏹",
    category: "active",
    cooldown: 6,
    castTime: 0,
    resourceCost: { energy: 8 },
    interruptible: true,
    targetRule: "current_target",
    damageType: "physical",
    bonusDamageRatio: 0.6,
  },
  ability_fire_fireball: {
    id: "ability_fire_fireball",
    name: "Boule de feu",
    description: "Un projectile ardent infligeant 170 % des dégâts magiques.",
    icon: "🔥",
    category: "active",
    cooldown: 5,
    castTime: 0,
    resourceCost: { energy: 15 },
    interruptible: true,
    targetRule: "current_target",
    damageType: "magical",
    bonusDamageRatio: 0.7,
  },
  ability_gloves_shockwave: {
    id: "ability_gloves_shockwave",
    name: "Onde percutante",
    description: "Un double impact libère une onde de choc infligeant 180 % des dégâts physiques.",
    icon: "🥊",
    category: "active",
    cooldown: 7,
    castTime: 0,
    resourceCost: { energy: 10 },
    interruptible: false,
    targetRule: "current_target",
    damageType: "physical",
    bonusDamageRatio: 0.8,
  },
};

function resolvePrimaryAbilityId(itemId: string | null | undefined): string | undefined {
  const catalogAbilityId = resolveCatalogPrimaryAbilityId(itemId);
  if (catalogAbilityId !== undefined) return catalogAbilityId;
  if (itemId?.includes("_sword_") === true) return "ability_sword_heroic_strike";
  if (itemId?.includes("_bow_") === true) return "ability_bow_aimed_shot";
  if (itemId?.includes("_staff_") === true) return "ability_fire_fireball";
  if (itemId?.includes("_gloves_") === true) return "ability_gloves_shockwave";
  return undefined;
}

// -- Item definitions (static data for vertical slice) ----------------------

const ITEM_DEFINITIONS: Record<string, EquipmentInfoLike> = {
  ...WEAPON_ITEM_DEFINITIONS,
  ...NON_WEAPON_ITEM_DEFINITIONS,
  item_weapon_sword_t3_broadsword: {
    itemId: "item_weapon_sword_t3_broadsword",
    slot: "weapon",
    handling: "one_handed",
    stats: { stat_physical_damage: 45 },
  },
  item_weapon_bow_t3_longbow: {
    itemId: "item_weapon_bow_t3_longbow",
    slot: "weapon",
    handling: "two_handed",
    stats: { stat_physical_damage: 40 },
  },
  item_weapon_staff_t3_fire: {
    itemId: "item_weapon_staff_t3_fire",
    slot: "weapon",
    handling: "two_handed",
    stats: { stat_magical_damage: 45 },
  },
  item_weapon_gloves_t3_spiked_gauntlets: {
    itemId: "item_weapon_gloves_t3_spiked_gauntlets",
    slot: "weapon",
    handling: "two_handed",
    stats: { stat_physical_damage: 34 },
  },
  item_weapon_sword_t4_broadsword: {
    itemId: "item_weapon_sword_t4_broadsword",
    slot: "weapon",
    handling: "one_handed",
    stats: { stat_physical_damage: 75 },
  },
  item_weapon_bow_t4_longbow: {
    itemId: "item_weapon_bow_t4_longbow",
    slot: "weapon",
    handling: "two_handed",
    stats: { stat_physical_damage: 68 },
  },
  item_weapon_bow_t4_badon: {
    itemId: "item_weapon_bow_t4_badon",
    slot: "weapon",
    handling: "two_handed",
    stats: { stat_physical_damage: 72 },
  },
  item_weapon_staff_t4_fire: {
    itemId: "item_weapon_staff_t4_fire",
    slot: "weapon",
    handling: "two_handed",
    stats: { stat_magical_damage: 85 },
  },
  item_weapon_gloves_t4_spiked_gauntlets: {
    itemId: "item_weapon_gloves_t4_spiked_gauntlets",
    slot: "weapon",
    handling: "two_handed",
    stats: { stat_physical_damage: 58 },
  },
  item_leather_armor: {
    itemId: "item_leather_armor",
    slot: "chest",
    handling: "one_handed",
    stats: { stat_armor: 8, stat_max_health: 50 },
  },
  item_wooden_shield: {
    itemId: "item_wooden_shield",
    slot: "off_hand",
    handling: "one_handed",
    stats: { stat_armor: 5, stat_magic_resistance: 3 },
  },
  item_shield_t3_reinforced: {
    itemId: "item_shield_t3_reinforced",
    slot: "off_hand",
    handling: "one_handed",
    stats: { stat_armor: 9, stat_magic_resistance: 5 },
  },
  item_shield_t4_reinforced: {
    itemId: "item_shield_t4_reinforced",
    slot: "off_hand",
    handling: "one_handed",
    stats: { stat_armor: 15, stat_magic_resistance: 9 },
  },
  item_iron_helmet: {
    itemId: "item_iron_helmet",
    slot: "head",
    handling: "one_handed",
    stats: { stat_armor: 4, stat_max_health: 30 },
  },
  item_leather_boots: {
    itemId: "item_leather_boots",
    slot: "boots",
    handling: "one_handed",
    stats: { stat_armor: 3 },
  },
  item_traveler_cape: {
    itemId: "item_traveler_cape",
    slot: "cape",
    handling: "one_handed",
    stats: { stat_magic_resistance: 4 },
  },
  item_helmet_t4_reinforced: {
    itemId: "item_helmet_t4_reinforced",
    slot: "head",
    handling: "one_handed",
    stats: { stat_armor: 8, stat_max_health: 55 },
  },
  item_armor_t4_leather: {
    itemId: "item_armor_t4_leather",
    slot: "chest",
    handling: "one_handed",
    stats: { stat_armor: 14, stat_max_health: 90 },
  },
  item_boots_t4_leather: {
    itemId: "item_boots_t4_leather",
    slot: "boots",
    handling: "one_handed",
    stats: { stat_armor: 6 },
  },
};

/** Resolve equipment info from static definitions. */
function resolveEquipmentInfo(itemId: string): EquipmentInfoLike | undefined {
  const definition = ITEM_DEFINITIONS[itemId];
  if (definition === undefined) return undefined;

  // Attack speed belongs exclusively to the weapon profile. Any attack-speed
  // bonus accidentally added to equipment data is ignored by this boundary.
  const { stat_attack_speed: _ignoredAttackSpeed, ...stats } = definition.stats ?? {};
  const intrinsicAttackSpeed = getWeaponAttackSpeed(itemId);
  if (definition.slot !== "weapon" || intrinsicAttackSpeed === undefined) {
    return { ...definition, stats };
  }

  return {
    ...definition,
    stats: {
      ...stats,
      stat_attack_speed: intrinsicAttackSpeed - HERO_BASE_ATTACK_SPEED,
    },
  };
}

function resolveEnchantmentItemInfo(itemId: string) {
  const definition = ITEM_DEFINITIONS[itemId];
  if (definition === undefined) return undefined;
  const explicitTier = getItemTier(itemId);
  const parsedTier = Number(itemId.match(/_t(\d+)(?:_|$)/)?.[1] ?? 0);
  const itemTier = explicitTier ?? (parsedTier >= 3 ? parsedTier : 3);
  const costCategory =
    definition.slot === "weapon"
      ? definition.handling === "two_handed"
        ? "two_handed_weapon" as const
        : "one_handed_weapon" as const
      : definition.slot === "off_hand"
        ? "off_hand" as const
        : definition.slot === "cape"
          ? "cape" as const
          : "armor" as const;
  const craftRecipe = EQUIPMENT_CRAFT_RECIPES.find(
    (recipe) => recipe.outputItemId === itemId,
  );
  return {
    enchantable:
      itemTier >= ENCHANTMENT_MINIMUM_ITEM_TIER
      && craftRecipe !== undefined,
    maximumLevel: 3 as const,
    itemTier,
    costCategory,
    craftMaterials:
      craftRecipe?.requirements
        .filter((requirement) => requirement.itemId.startsWith("item_refined_"))
        .map((requirement) => ({
          itemId: requirement.itemId,
          quantity: requirement.quantity,
        })) ?? [],
  };
}

/**
 * 13_ITEM_SYSTEM: two items with the same definition, tier, quality and
 * enchantment share one inventory stack. The current vertical slice only
 * exposes one variant per itemId, so itemId is the complete stack identity.
 */
function resolveItemStackInfo(itemId: string) {
  const catalogStackInfo = resolveCatalogStackInfo(itemId);
  if (catalogStackInfo !== undefined) return catalogStackInfo;
  if (ITEM_DEFINITIONS[itemId] !== undefined) {
    return { itemId, stackable: true, maxStack: 20 };
  }
  if (itemId === "item_health_potion" || itemId === "item_energy_potion") {
    return { itemId, stackable: true, maxStack: 99 };
  }
  if (itemId.startsWith("item_resource_") || itemId.startsWith("item_refined_")) {
    return { itemId, stackable: true, maxStack: 999 };
  }
  if (
    itemId === BIRCH_PLANK_RECIPE.rawItemId ||
    itemId === BIRCH_PLANK_RECIPE.outputItemId ||
    itemId === COPPER_BAR_RECIPE.rawItemId ||
    itemId === COPPER_BAR_RECIPE.outputItemId ||
    itemId === PINE_PLANK_RECIPE.rawItemId ||
    itemId === PINE_PLANK_RECIPE.outputItemId ||
    itemId === IRON_BAR_RECIPE.rawItemId ||
    itemId === IRON_BAR_RECIPE.outputItemId
  ) {
    return { itemId, stackable: true, maxStack: 999 };
  }
  return undefined;
}

// -- Mastery / Destiny Board definitions (vertical-slice minimal) -----------

const SWORD_MASTERY_ID = asMasteryId("mastery_sword");
const BOW_MASTERY_ID = asMasteryId("mastery_bow");
const FIRE_STAFF_MASTERY_ID = asMasteryId("mastery_fire_staff");
const GLOVES_MASTERY_ID = asMasteryId("mastery_gloves");
const BROADSWORD_MASTERY_ID = asMasteryId("mastery_broadsword");
const LONGBOW_MASTERY_ID = asMasteryId("mastery_longbow");
const BADON_MASTERY_ID = asMasteryId("mastery_badon");
const T4_FIRE_STAFF_MASTERY_ID = asMasteryId("mastery_t4_fire_staff");
const SPIKED_GAUNTLETS_MASTERY_ID = asMasteryId("mastery_spiked_gauntlets");
const WOOD_GATHERING_MASTERY_ID = asMasteryId("mastery_gathering_wood");
const ORE_GATHERING_MASTERY_ID = asMasteryId("mastery_gathering_ore");
const HIDE_GATHERING_MASTERY_ID = asMasteryId("mastery_gathering_hide");
const FIBER_GATHERING_MASTERY_ID = asMasteryId("mastery_gathering_fiber");

const WEAPON_MASTERY_XP = [100, 200, 300, 450, 650, 900, 1200, 1600, 2100, 2700];
const GATHERING_MASTERY_XP = [50, 100, 175, 275, 400, 550, 750, 1000, 1300, 1700];
const HEALTH_POTION_HEAL_RATIO = 0.3;
const HEALTH_POTION_COOLDOWN_SECONDS = 20;


function getWorkerGatheringXpForTier(tier: number): number {
  return Math.max(1, Math.round(4 * (1.5 ** Math.max(0, tier - 3))));
}

function getHeroGatheringXpFromWorkerForTier(tier: number): number {
  return Math.max(1, Math.round(2 * (1.5 ** Math.max(0, tier - 3))));
}

function getRequiredGatheringMasteryForTier(tier: number): number {
  // Local QA escape hatch: enables production-pipeline testing without
  // changing progression balance or affecting deployed builds.
  if (
    import.meta.env.DEV
    && typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("productionTest") === "1"
  ) {
    return 0;
  }
  return Math.max(0, tier - 3) * 3;
}

const MASTERY_DEFINITIONS = [
  ...WEAPON_MASTERY_DEFINITIONS,
  ...GATHERING_MASTERY_DEFINITIONS,
  {
    id: "mastery_sword",
    category: "weapon",
    maxLevel: 100,
    experiencePerLevel: WEAPON_MASTERY_XP,
  },
  {
    id: "mastery_bow",
    category: "weapon",
    maxLevel: 100,
    experiencePerLevel: WEAPON_MASTERY_XP,
  },
  {
    id: "mastery_fire_staff",
    category: "weapon",
    maxLevel: 100,
    experiencePerLevel: WEAPON_MASTERY_XP,
  },
  {
    id: "mastery_gloves",
    category: "weapon",
    maxLevel: 100,
    experiencePerLevel: WEAPON_MASTERY_XP,
  },
  {
    id: "mastery_broadsword",
    category: "weapon_specialization",
    maxLevel: 100,
    experiencePerLevel: WEAPON_MASTERY_XP,
  },
  {
    id: "mastery_longbow",
    category: "weapon_specialization",
    maxLevel: 100,
    experiencePerLevel: WEAPON_MASTERY_XP,
  },
  {
    id: "mastery_badon",
    category: "weapon_specialization",
    maxLevel: 100,
    experiencePerLevel: WEAPON_MASTERY_XP,
  },
  {
    id: "mastery_t4_fire_staff",
    category: "weapon_specialization",
    maxLevel: 100,
    experiencePerLevel: WEAPON_MASTERY_XP,
  },
  {
    id: "mastery_spiked_gauntlets",
    category: "weapon_specialization",
    maxLevel: 100,
    experiencePerLevel: WEAPON_MASTERY_XP,
  },
  {
    id: "mastery_gathering_wood",
    category: "gathering",
    maxLevel: 100,
    experiencePerLevel: GATHERING_MASTERY_XP,
  },
  {
    id: "mastery_gathering_ore",
    category: "gathering",
    maxLevel: 100,
    experiencePerLevel: GATHERING_MASTERY_XP,
  },
  {
    id: "mastery_gathering_hide",
    category: "gathering",
    maxLevel: 100,
    experiencePerLevel: GATHERING_MASTERY_XP,
  },
  {
    id: "mastery_gathering_fiber",
    category: "gathering",
    maxLevel: 100,
    experiencePerLevel: GATHERING_MASTERY_XP,
  },
];

interface WeaponMasteryRoute {
  readonly familyId: ReturnType<typeof asMasteryId>;
  readonly weaponId: ReturnType<typeof asMasteryId>;
}

function resolveWeaponMastery(itemId: string): WeaponMasteryRoute | undefined {
  const catalogRoute = resolveCatalogWeaponMastery(itemId);
  if (catalogRoute !== undefined) return catalogRoute;
  switch (itemId) {
    case "item_weapon_sword_t3_broadsword":
    case "item_weapon_sword_t4_broadsword":
      return { familyId: SWORD_MASTERY_ID, weaponId: BROADSWORD_MASTERY_ID };
    case "item_weapon_bow_t3_longbow":
    case "item_weapon_bow_t4_longbow":
      return { familyId: BOW_MASTERY_ID, weaponId: LONGBOW_MASTERY_ID };
    case "item_weapon_bow_t4_badon":
      return { familyId: BOW_MASTERY_ID, weaponId: BADON_MASTERY_ID };
    case "item_weapon_staff_t3_fire":
    case "item_weapon_staff_t4_fire":
      return { familyId: FIRE_STAFF_MASTERY_ID, weaponId: T4_FIRE_STAFF_MASTERY_ID };
    case "item_weapon_gloves_t3_spiked_gauntlets":
    case "item_weapon_gloves_t4_spiked_gauntlets":
      return { familyId: GLOVES_MASTERY_ID, weaponId: SPIKED_GAUNTLETS_MASTERY_ID };
    default:
      return undefined;
  }
}

function getMasteryDisplayName(masteryId: string): string {
  const catalogName = getWeaponMasteryDisplayName(masteryId);
  if (catalogName !== undefined) return catalogName;
  const gatheringCatalogName = getGatheringMasteryDisplayName(masteryId);
  if (gatheringCatalogName !== undefined) return gatheringCatalogName;
  switch (masteryId) {
    case "mastery_sword":
      return "Épées";
    case "mastery_bow":
      return "Arcs";
    case "mastery_fire_staff":
      return "Bâtons de feu";
    case "mastery_gloves":
      return "Gants";
    case "mastery_broadsword":
      return "Épée large";
    case "mastery_longbow":
      return "Arc long";
    case "mastery_badon":
      return "Badon";
    case "mastery_t4_fire_staff":
      return "Bâton de feu T4";
    case "mastery_spiked_gauntlets":
      return "Gantelets à pointes";
    case "mastery_gathering_wood":
      return "Récolte du bois";
    case "mastery_gathering_ore":
      return "Extraction du minerai";
    case "mastery_gathering_hide":
      return "Dépeçage";
    case "mastery_gathering_fiber":
      return "Récolte des fibres";
    default:
      return masteryId;
  }
}

function buildMasteryViewModels(
  state: ReturnType<ProgressionOrchestrator["getFullProgressionState"]>,
): MasteryVM[] {
  return [...state.masteries.values()].map((mastery) => {
    const definition = MASTERY_DEFINITIONS.find((entry) => entry.id === mastery.masteryId);
    const requirements = definition?.experiencePerLevel ?? [];
    const fallbackRequirement = requirements[requirements.length - 1] ?? 0;

    return {
      id: mastery.masteryId,
      displayName: getMasteryDisplayName(mastery.masteryId),
      category: definition?.category ?? "unknown",
      isUnlocked: mastery.isUnlocked,
      level: mastery.level,
      currentXp: mastery.currentXp,
      xpToNextLevel: mastery.level >= (definition?.maxLevel ?? 0)
        ? 0
        : (requirements[mastery.level] ?? fallbackRequirement),
      totalLifetimeXp: mastery.totalLifetimeXp,
      maxLevel: definition?.maxLevel ?? 0,
    };
  });
}

const DESTINY_NODES = [
  {
    id: asDestinyNodeId("node_sword_1"),
    displayName: "Initié à l'épée",
    category: "weapon",
    prerequisites: [] as ReturnType<typeof asDestinyNodeId>[],
    requirements: [{ type: "mastery_level" as const, masteryId: SWORD_MASTERY_ID, level: 1 }],
    rewards: [{ type: "equipment_tier_unlock" as const, tier: 2 }],
  },
  {
    id: asDestinyNodeId("node_sword_2"),
    displayName: "Adepte de l'épée",
    category: "weapon",
    prerequisites: [asDestinyNodeId("node_sword_1")],
    requirements: [{ type: "mastery_level" as const, masteryId: SWORD_MASTERY_ID, level: 3 }],
    rewards: [{ type: "equipment_tier_unlock" as const, tier: 3 }],
  },
];

// -- Item category mapping for repair cost resolution -----------------------

function resolveRepairableInfo(itemId: string): { itemId: string; equipmentCategory: string; itemTier: number } | undefined {
  const info = ITEM_DEFINITIONS[itemId];
  const itemTier = getItemTier(itemId);
  if (info === undefined || itemTier === undefined) {
    return undefined;
  }
  if (info.slot === "weapon") {
    return { itemId, equipmentCategory: "weapon", itemTier };
  }
  if (info.slot === "cape" || info.slot === "off_hand") {
    return { itemId, equipmentCategory: "accessory", itemTier };
  }
  return { itemId, equipmentCategory: "armor", itemTier };
}

// -- Helper: create an entity with all combat components --------------------

function setupCombatEntity(
  world: World,
  statsManager: StatsManager,
  damageManager: DamageManager,
  deathManager: DeathManager,
  targetManager: TargetManager,
  autoAttackManager: AutoAttackManager,
  abilityManager: AbilityManager,
  baseStats: { maxHealth: number; physDamage: number; attackSpeed: number; armor: number; magicRes: number },
  position: { x: number; y: number },
): EntityId {
  const id = world.createEntity();
  const container = statsManager.attachStats(id);

  container.setBase(STAT_MAX_HEALTH, baseStats.maxHealth);
  container.setBase(STAT_PHYSICAL_DAMAGE, baseStats.physDamage);
  container.setBase(STAT_ATTACK_SPEED, baseStats.attackSpeed);
  container.setBase(STAT_ARMOR, baseStats.armor);
  container.setBase(STAT_MAGIC_RESISTANCE, baseStats.magicRes);
  container.setBase(STAT_MAGICAL_DAMAGE, 0);
  container.recalculate();

  damageManager.attachHealth(id);
  deathManager.attachDeath(id);
  targetManager.attachTargeting(id);
  autoAttackManager.attachAutoAttack(id);
  abilityManager.attachAbilities(id);

  world.addComponent(id, PositionComponent, position);

  return id;
}

/** Internal refs for cleanup — not exposed to consumers. */
interface CleanupRef {
  _tickFn?: () => void;
  _tickInterval?: number;
  _disposeServices?: () => void;
  _persistence?: RuntimePersistence;
}

// -- Helper: collect repair preview data ------------------------------------

function collectRepairPreviewData(
  equipmentManager: EquipmentManager,
  inventoryManager: InventoryManager,
  durabilityStore: DurabilityStore,
  repairCostResolver: RepairCostResolver,
  heroId: EntityId,
  stationModifier: number,
): { instanceId: string; itemId: string; currentDurability: number; maxDurability: number; repairCost: number }[] {
  const items: { instanceId: string; itemId: string; currentDurability: number; maxDurability: number; repairCost: number }[] = [];

  const addIfDamaged = (instanceId: string, itemId: string): void => {
    const durability = durabilityStore.get(instanceId as Parameters<typeof durabilityStore.get>[0]);
    if (durability === undefined || durability.current >= durability.max) {
      return;
    }
    const info = resolveRepairableInfo(itemId);
    if (info === undefined) {
      return;
    }
    const cost = repairCostResolver.resolveCost(
      info.equipmentCategory,
      info.itemTier,
      durability.current,
      durability.max,
      stationModifier,
    );
    items.push({
      instanceId,
      itemId,
      currentDurability: durability.current,
      maxDurability: durability.max,
      repairCost: cost.ok ? cost.value : 0,
    });
  };

  // Check equipped items
  for (const entry of equipmentManager.getEquipped(heroId).values()) {
    addIfDamaged(entry.instanceId, entry.itemId);
  }

  // Check inventory items
  for (const slot of inventoryManager.listSlots(heroId)) {
    if (slot.entry !== undefined) {
      addIfDamaged(slot.entry.instanceId, slot.entry.itemId);
    }
  }

  return items;
}

const WORKER_RECRUITMENT_COST = 250;
const WORKER_CAPACITY = 4;
const WOODCUTTER_DEFINITION_ID = WORKER_DEFINITION_IDS.woodcutter;
const MINER_DEFINITION_ID = WORKER_DEFINITION_IDS.miner;
const SKINNER_DEFINITION_ID = WORKER_DEFINITION_IDS.skinner;
const FIBER_HARVESTER_DEFINITION_ID = WORKER_DEFINITION_IDS.fiberHarvester;
const GATHER_WOOD_TASK_ID = WORKER_TASK_IDS.wood;
const GATHER_COPPER_TASK_ID = WORKER_TASK_IDS.ore;
const GATHER_HIDE_TASK_ID = WORKER_TASK_IDS.hide;
const GATHER_FIBER_TASK_ID = WORKER_TASK_IDS.fiber;

export function GameProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const services = useMemo<GameServices>(() => {
    const eventBus = new EventBus<UIEventMap>();
    const bridge = new GameBridge();

    // --- Build the ECS world --------------------------------------------------
    const runtimeServices = createRuntimeServices();
    const world = new World(runtimeServices);

    // --- Stat registry --------------------------------------------------------
    const statRegistry = createDefaultStatRegistry();
    const statsManager = new StatsManager(world, statRegistry);

    // --- Managers --------------------------------------------------------------
    const damageManager = new DamageManager(world, statsManager);
    const damageEventBus = new EventBus<DamageEventMap>();
    damageManager.setEventBus(damageEventBus);

    const deathManager = new DeathManager(world, damageManager);
    const targetValidator = new TargetValidator(world);
    const targetManager = new TargetManager(world, targetValidator);
    const autoAttackManager = new AutoAttackManager(world, targetManager, statsManager);
    const abilityManager = new AbilityManager(world, statsManager);
    const effectManager = new EffectManager();

    // --- Combat service & orchestrator ----------------------------------------
    const combatService = new CombatService(
      damageManager,
      deathManager,
      targetManager,
      autoAttackManager,
      statsManager,
    );

    const orchestrator = new CombatOrchestrator({
      combatService,
      effectManager,
      abilityManager,
    });
    orchestrator.initialize();

    // --- Equipment stat sync --------------------------------------------------
    let syncWeaponMasteryStats: ((entityId: EntityId) => void) | undefined;
    const equipmentStatSync = new EquipmentStatSync(
      statsManager,
      resolveEquipmentInfo,
      (entityId, changedStats) => {
        syncWeaponMasteryStats?.(entityId);
        if (
          changedStats.includes(STAT_MAX_HEALTH) &&
          world.hasComponent(entityId, HealthComponent)
        ) {
          damageManager.syncMaxHealth(entityId);
          const health = damageManager.getHealth(entityId);
          bridge.updatePlayerHealth(health.currentHealth, health.maxHealth);
        }
        if (
          changedStats.includes("stat_max_energy" as StatId) &&
          world.hasComponent(entityId, EnergyComponent)
        ) {
          abilityManager.syncMaxEnergy(entityId);
        }
        syncStatsToBridge(bridge, statsManager, entityId);
      },
    );

    // --- Inventory & Equipment managers ----------------------------------------
    const inventoryManager = new InventoryManager(world, resolveItemStackInfo);
    const equipmentManager = new EquipmentManager(world, inventoryManager, resolveEquipmentInfo, equipmentStatSync);

    // --- Currency & Economy setup (early — RepairService needs it) ---------------
    const currencyRegistry = new CurrencyRegistry();
    currencyRegistry.register({
      id: "currency_silver",
      enabled: true,
      minValue: 0,
      maxValue: null,
      acquisitionSources: ["Loot", "VendorSale", "Quest"],
      spendingSources: ["Vendor", "Building", "Craft", "Worker"],
    });

    const currencyService = new CurrencyService(currencyRegistry);
    const playerId = asPlayerId("player_1");
    const walletId = asWalletId("wallet_1");
    currencyService.createWallet(walletId, playerId);
    // Start with 1000 silver
    currencyService.credit(walletId, "currency_silver", 1000, "Loot");

    // --- Worker systems -------------------------------------------------------
    // Workers support gathering but remain deliberately slower than the active
    // Hero: one resource every six seconds versus two every two seconds.
    const workerRegistry = new WorkerRegistry();
    for (const definition of WORKER_DEFINITIONS) {
      workerRegistry.register(definition);
    }

    const workerManager = new WorkerManager(workerRegistry);
    const workerTaskRegistry = new WorkerTaskRegistry();
    for (const definition of WORKER_TASK_DEFINITIONS) {
      workerTaskRegistry.register(definition);
    }

    const workerAssignmentManager = new WorkerAssignmentManager(
      workerManager,
      workerTaskRegistry,
    );
    const workerExecutionEvents = new EventBus<WorkerExecutionEventMap>();
    const workerExecutor = new WorkerExecutor(
      workerManager,
      workerAssignmentManager,
      workerTaskRegistry,
      workerExecutionEvents,
    );
    const workerScheduler = new WorkerScheduler(workerExecutionEvents);
    const workerByProfession = new Map<WorkerProfessionVM, WorkerId>();
    const workerProductionTier = new Map<WorkerId, 3 | 4>();

    // --- Progression systems ---------------------------------------------------
    const experienceService = new ExperienceService();
    const fameService = new FameService(experienceService);
    const masteryService = new MasteryService(experienceService);
    const destinyBoardService = new DestinyBoardService(experienceService);
    const progressionOrchestrator = new ProgressionOrchestrator(
      experienceService,
      fameService,
      masteryService,
      destinyBoardService,
    );

    // Initialize progression with mastery definitions
    progressionOrchestrator.initialize({
      masteryDefinitions: MASTERY_DEFINITIONS,
      destinyNodes: DESTINY_NODES,
    });
    masteryService.discoverMastery(WOOD_GATHERING_MASTERY_ID);
    masteryService.discoverMastery(ORE_GATHERING_MASTERY_ID);
    masteryService.discoverMastery(HIDE_GATHERING_MASTERY_ID);
    masteryService.discoverMastery(FIBER_GATHERING_MASTERY_ID);

    /**
     * Rebuild the weapon-only damage granted by mastery IP.
     * +100 bonus IP = +20% of the weapon's own primary damage.
     * Hero base damage, attack speed and defensive stats are never scaled.
     */
    syncWeaponMasteryStats = (entityId: EntityId): void => {
      statsManager.removeModifier(entityId, MASTERY_PHYSICAL_DAMAGE_MODIFIER);
      statsManager.removeModifier(entityId, MASTERY_MAGICAL_DAMAGE_MODIFIER);

      const equippedWeapon = equipmentManager.getEquippedItem(entityId, "weapon");
      if (equippedWeapon === undefined) return;

      const weaponDefinition = ITEM_DEFINITIONS[equippedWeapon.itemId];
      if (weaponDefinition === undefined) return;

      const masteries = [...masteryService.getAllMasteries().values()].map((mastery) => ({
        id: mastery.masteryId as string,
        level: mastery.level,
      }));
      const bonusIp = getMasteryItemPowerBonus(equippedWeapon.itemId, masteries);
      if (bonusIp <= 0) return;

      const physicalDamage = weaponDefinition.stats?.stat_physical_damage ?? 0;
      const magicalDamage = weaponDefinition.stats?.stat_magical_damage ?? 0;
      if (physicalDamage > 0) {
        statsManager.addModifier(entityId, {
          id: MASTERY_PHYSICAL_DAMAGE_MODIFIER,
          statId: STAT_PHYSICAL_DAMAGE,
          type: "flat",
          value: physicalDamage * bonusIp / 500,
          priority: 10,
          source: "mastery:weapon_ip",
        });
      }
      if (magicalDamage > 0) {
        statsManager.addModifier(entityId, {
          id: MASTERY_MAGICAL_DAMAGE_MODIFIER,
          statId: STAT_MAGICAL_DAMAGE,
          type: "flat",
          value: magicalDamage * bonusIp / 500,
          priority: 10,
          source: "mastery:weapon_ip",
        });
      }
    };

    // --- Durability & Repair systems -------------------------------------------
    const durabilityStore = new DurabilityStore();
    const repairStationRegistry = new RepairStationRegistry();
    repairStationRegistry.register({
      stationId: "station_general",
      locationType: "city",
      repairModifier: 1.0,
      enabled: true,
    });

    const repairCostResolver = new RepairCostResolver();
    for (const def of REPAIR_COST_DEFINITIONS) {
      repairCostResolver.register(def);
    }

    const repairService = new RepairService(
      repairCostResolver,
      repairStationRegistry,
      currencyService,
      inventoryManager,
      equipmentManager,
      durabilityStore,
      resolveRepairableInfo,
    );

    // --- World systems ---------------------------------------------------------
    const biomeRegistry = new BiomeRegistry();
    for (const definition of BIOME_DEFINITIONS) {
      biomeRegistry.register(definition);
    }

    const biomeResolver = new BiomeResolver(biomeRegistry);
    const zoneManager = new ZoneManager();

    const FOREST_ZONE_DEF_ID = WORLD_ZONE_IDS.forest;
    const _SWAMP_ZONE_DEF_ID = WORLD_ZONE_IDS.swamp;
    const _HIGHLAND_ZONE_DEF_ID = WORLD_ZONE_IDS.highland;
    const _STEPPE_ZONE_DEF_ID = WORLD_ZONE_IDS.steppe;
    const _MOUNTAIN_ZONE_DEF_ID = WORLD_ZONE_IDS.mountain;
    void _SWAMP_ZONE_DEF_ID;
    void _HIGHLAND_ZONE_DEF_ID;
    void _STEPPE_ZONE_DEF_ID;
    void _MOUNTAIN_ZONE_DEF_ID;

    for (const definition of ZONE_DEFINITIONS) {
      zoneManager.registerDefinition(definition);
    }

    for (const [zoneId, biomeId] of BIOME_BY_ZONE) {
      biomeResolver.associate(zoneId, biomeId);
    }

    const progressionManager = new WorldProgressionManager();
    for (const definition of ZONE_UNLOCK_DEFINITIONS) {
      progressionManager.registerUnlockDefinition(definition);
    }

    const explorationManager = new ExplorationManager();
    const worldEventBus = new EventBus<WorldIntegrationEventMap>();
    const worldCoordinator = new WorldCoordinator({
      zoneManager,
      biomeRegistry,
      biomeResolver,
      progressionManager,
      explorationManager,
      eventBus: worldEventBus,
    });

    worldCoordinator.initialize();
    worldCoordinator.changeZone(FOREST_ZONE_DEF_ID, 0);

    const worldRuntime = new WorldRuntime({
      zoneManager,
      progressionManager,
      worldCoordinator,
    });

    // Zone definitions ordered for progression
    const ZONE_ORDER: readonly ZoneDefinitionId[] = WORLD_ZONE_ORDER;

    function getActiveZoneDef(): { defId: ZoneDefinitionId; tier: number; name: string } {
      return worldRuntime.getActiveZoneDef();
    }

    function updateWorldBridge(): void {
      const zone = worldRuntime.getActiveZoneDef();
      const biome = biomeResolver.resolve(zone.defId);
      const saveState = worldRuntime.getWorldLocationSaveState();
      const vm: WorldVM = {
        zoneIndex: worldRuntime.currentZoneIndex + 1,
        zoneCount: ZONE_ORDER.length,
        canGoPreviousZone: worldRuntime.currentZoneIndex > 0,
        canGoNextZone:
          worldRuntime.currentZoneIndex + 1 < ZONE_ORDER.length
          && progressionManager.isUnlocked(ZONE_ORDER[worldRuntime.currentZoneIndex + 1]!),
        pendingZoneIndex:
          worldRuntime.pendingZone === null ? null : worldRuntime.pendingZone + 1,
        zones: ZONE_ORDER.map((zoneDefId, index) => {
          const definition = zoneManager.registry.get(zoneDefId);
          const zoneBiome = biomeResolver.resolve(zoneDefId);
          const memory = saveState.zoneMemories[index]!;
          const isActive = index === worldRuntime.currentZoneIndex;

          return {
            zoneIndex: index + 1,
            zoneName: definition?.name ?? "Unknown",
            biomeName: zoneBiome?.name ?? "Unknown",
            isUnlocked: progressionManager.isUnlocked(zoneDefId),
            isActive,
            segmentIndex: memory.currentSegment + 1,
            unlockedSegmentCount: memory.highestUnlockedSegment + 1,
            completedSegments: [...memory.completedSegments].map(
              (segment) => segment + 1,
            ),
          };
        }),
        zoneName: zone.name,
        zoneDefId: zone.defId,
        biomeName: biome?.name ?? "Unknown",
        biomeTheme: biome?.theme ?? "Nature",
        environmentVisualManifestId: resolveEnvironmentPresentation(
          zone.defId,
        ),
        segmentIndex: worldRuntime.currentSegment + 1,
        segmentCount: SEGMENTS_PER_ZONE,
        encounterIndex: worldRuntime.currentEncounter + 1,
        encounterCount: ENCOUNTERS_PER_SEGMENT,
        unlockedSegmentCount: worldRuntime.highestUnlockedSegment + 1,
        completedSegments: [...worldRuntime.completedSegments].map(
          (segment) => segment + 1,
        ),
        pendingSegmentIndex:
          worldRuntime.pendingZone !== null
            ? (worldRuntime.pendingZoneSegment ?? 0) + 1
            : worldRuntime.pendingSegment === null
              ? null
              : worldRuntime.pendingSegment + 1,
        farmMode: worldRuntime.farmMode,
        encounterType:
          worldRuntime.currentEncounter === ENCOUNTERS_PER_SEGMENT - 1
            ? "boss"
            : "normal",
        zoneProgress: Math.floor(
          ((worldRuntime.currentSegment * ENCOUNTERS_PER_SEGMENT +
            worldRuntime.currentEncounter) /
            (SEGMENTS_PER_ZONE * ENCOUNTERS_PER_SEGMENT)) *
            100,
        ),
        isFirstVisit: !explorationManager.isDiscovered(zone.defId),
      };
      bridge.updateWorld(vm);
    }

    function spawnEnemyForCurrentSegment(): {
      id: EntityId;
      maxHealth: number;
      name: string;
      visualManifestId: string;
    } {
      const zone = getActiveZoneDef();
      const biome = biomeResolver.resolve(zone.defId);
      const isBoss =
        worldRuntime.currentEncounter === ENCOUNTERS_PER_SEGMENT - 1;
      const isBiomeBoss =
        isBoss && worldRuntime.currentSegment === SEGMENTS_PER_ZONE - 1;
      const profile = getEnemyCombatProfile(
        worldRuntime.currentZoneIndex,
        worldRuntime.currentSegment,
        worldRuntime.currentEncounter,
      );
      const enemyId = setupCombatEntity(
        world, statsManager, damageManager, deathManager, targetManager, autoAttackManager, abilityManager,
        {
          maxHealth: profile.hp,
          physDamage: profile.damage,
          attackSpeed: 0.8,
          armor: profile.armor,
          magicRes: profile.magicResistance,
        },
        { x: 100, y: 0 },
      );

      const families = biome?.enemyFamilies ?? ["Beast"];
      const family = families[worldRuntime.currentSegment % families.length] ?? "Beast";
      const prefix = isBiomeBoss
        ? "[BIOME BOSS] "
        : isBoss
          ? "[BOSS] "
          : "";
      const roamingCreatures = [
        {
          name: "Stonefang Wolf",
          visualManifestId: "monster_stonefang_wolf",
        },
        {
          name: "Razorwing Harpy",
          visualManifestId: "monster_razorwing_harpy",
        },
        {
          name: "Morgana Witch",
          visualManifestId: "monster_morgana_witch",
        },
      ] as const;
      const randomCreature =
        roamingCreatures[Math.floor(Math.random() * roamingCreatures.length)]
        ?? roamingCreatures[0];
      const creature = isBiomeBoss
        ? {
            name: "Ancient Rune Golem",
            visualManifestId: "boss_ancient_rune_golem",
          }
        : !isBoss
          ? randomCreature
          : {
              name: family,
              visualManifestId: "monster_undead_warrior",
            };
      const name = `${prefix}${creature.name} - ${zone.name}`;

      return {
        id: enemyId,
        maxHealth: profile.hp,
        name,
        visualManifestId: creature.visualManifestId,
      };
    }

    // --- Create hero & enemy --------------------------------------------------
    const heroId = setupCombatEntity(
      world, statsManager, damageManager, deathManager, targetManager, autoAttackManager, abilityManager,
      { maxHealth: 500, physDamage: 0, attackSpeed: 1.2, armor: 10, magicRes: 5 },
      { x: 0, y: 0 },
    );

    const firstEnemy = spawnEnemyForCurrentSegment();
    let activeEnemyId = firstEnemy.id;

    for (const definition of Object.values(CLIENT_ABILITIES)) {
      abilityManager.learnAbility(heroId, definition);
    }

    // --- Attach inventory & equipment to hero -----------------------------------
    inventoryManager.createInventory(heroId, 24);
    const bankId = world.createEntity();
    inventoryManager.createInventory(bankId, 64);
    equipmentManager.attachEquipment(heroId);
    const enchantmentService = new EnchantmentService({
      inventoryManager,
      currencyService,
      walletId,
      inventoryOwnerId: heroId,
      resolveItemInfo: resolveEnchantmentItemInfo,
      findEquippedEntry: (instanceId: ItemInstanceId) =>
        [...equipmentManager.getEquipped(heroId).values()]
          .find((entry) => entry.instanceId === instanceId),
      changeEquippedEnchantment: (
        instanceId: ItemInstanceId,
        enchantment,
      ) => equipmentManager.changeEquippedEnchantment(
        heroId,
        instanceId,
        enchantment,
      ),
    });

    // --- Gathering vertical slice ---------------------------------------------
    const resourceRegistry = new ResourceRegistry();
    const resourceRuntime = new ResourceRuntime();
    const resourceNodeRegistry = new ResourceNodeRegistry();
    const resourceNodeManager = new ResourceNodeManager();
    const gatheringManager = new GatheringManager(resourceRegistry);
    const oreGatheringManager = new GatheringManager(resourceRegistry);
    const hideGatheringManager = new GatheringManager(resourceRegistry);
    const fiberGatheringManager = new GatheringManager(resourceRegistry);
    const gatheringToolRegistry = new GatheringToolRegistry();

    const birchDefinitionId = asResourceDefinitionId("resource_birch_wood_t3");
    const birchResourceId = asResourceId("resource_birch_wood_runtime");
    const birchNodeDefinitionId = asResourceNodeDefinitionId("node_birch_tree_t3");

    resourceRegistry.register({
      id: birchDefinitionId,
      name: "Bois de bouleau",
      family: "Wood",
      tier: 3,
      maxCharges: 999,
      respawnDurationTicks: 240,
      baseYield: 1,
      tags: ["wood", "birch", "starter"],
    });
    resourceRuntime.add({
      id: birchResourceId,
      definitionId: birchDefinitionId,
      state: "available",
      currentCharges: 999,
      maxCharges: 999,
      tier: 3,
      family: "Wood",
    });
    resourceNodeRegistry.register({
      id: birchNodeDefinitionId,
      name: "Bouleau",
      resourceDefinitionId: birchDefinitionId,
      requiredToolTier: 3,
      tags: ["forest", "starter"],
    });
    const birchNode = resourceNodeManager.createNode(
      birchNodeDefinitionId,
      FOREST_ZONE_DEF_ID,
      birchResourceId,
    );
    const starterAxe = {
      id: asGatheringToolId("tool_axe_t3"),
      name: "Hache de compagnon",
      toolType: "axe" as const,
      tier: 3,
      speedModifier: 1,
      yieldModifier: 1,
      tags: ["starter"],
    };
    gatheringToolRegistry.register(starterAxe);
    const copperDefinitionId = asResourceDefinitionId("resource_copper_ore_t3");
    const copperResourceId = asResourceId("resource_copper_ore_runtime");
    const copperNodeDefinitionId = asResourceNodeDefinitionId("node_copper_vein_t3");
    resourceRegistry.register({
      id: copperDefinitionId,
      name: "Minerai de cuivre",
      family: "Ore",
      tier: 3,
      maxCharges: 999,
      respawnDurationTicks: 240,
      baseYield: 1,
      tags: ["ore", "copper", "starter"],
    });
    resourceRuntime.add({
      id: copperResourceId,
      definitionId: copperDefinitionId,
      state: "available",
      currentCharges: 999,
      maxCharges: 999,
      tier: 3,
      family: "Ore",
    });
    resourceNodeRegistry.register({
      id: copperNodeDefinitionId,
      name: "Veine de cuivre",
      resourceDefinitionId: copperDefinitionId,
      requiredToolTier: 3,
      tags: ["forest", "starter"],
    });
    const copperNode = resourceNodeManager.createNode(
      copperNodeDefinitionId,
      FOREST_ZONE_DEF_ID,
      copperResourceId,
    );
    const starterPickaxe = {
      id: asGatheringToolId("tool_pickaxe_t3"),
      name: "Pioche de compagnon",
      toolType: "pickaxe" as const,
      tier: 3,
      speedModifier: 1,
      yieldModifier: 1,
      tags: ["starter"],
    };
    gatheringToolRegistry.register(starterPickaxe);

    const pineDefinitionId = asResourceDefinitionId("resource_wood_t4");
    const pineResourceId = asResourceId("resource_pine_wood_runtime");
    const pineNodeDefinitionId = asResourceNodeDefinitionId("node_pine_tree_t4");
    resourceRegistry.register({
      id: pineDefinitionId,
      name: "Bois de pin",
      family: "Wood",
      tier: 4,
      maxCharges: 999,
      respawnDurationTicks: 360,
      baseYield: 1,
      tags: ["wood", "pine", "tier4"],
    });
    resourceRuntime.add({
      id: pineResourceId,
      definitionId: pineDefinitionId,
      state: "available",
      currentCharges: 999,
      maxCharges: 999,
      tier: 4,
      family: "Wood",
    });
    resourceNodeRegistry.register({
      id: pineNodeDefinitionId,
      name: "Pin ancien",
      resourceDefinitionId: pineDefinitionId,
      requiredToolTier: 4,
      tags: ["forest", "tier4"],
    });
    const pineNode = resourceNodeManager.createNode(
      pineNodeDefinitionId,
      FOREST_ZONE_DEF_ID,
      pineResourceId,
    );

    const ironDefinitionId = asResourceDefinitionId("resource_ore_t4");
    const ironResourceId = asResourceId("resource_iron_ore_runtime");
    const ironNodeDefinitionId = asResourceNodeDefinitionId("node_iron_vein_t4");
    resourceRegistry.register({
      id: ironDefinitionId,
      name: "Minerai de fer",
      family: "Ore",
      tier: 4,
      maxCharges: 999,
      respawnDurationTicks: 360,
      baseYield: 1,
      tags: ["ore", "iron", "tier4"],
    });
    resourceRuntime.add({
      id: ironResourceId,
      definitionId: ironDefinitionId,
      state: "available",
      currentCharges: 999,
      maxCharges: 999,
      tier: 4,
      family: "Ore",
    });
    resourceNodeRegistry.register({
      id: ironNodeDefinitionId,
      name: "Veine de fer",
      resourceDefinitionId: ironDefinitionId,
      requiredToolTier: 4,
      tags: ["mountain", "tier4"],
    });
    const ironNode = resourceNodeManager.createNode(
      ironNodeDefinitionId,
      FOREST_ZONE_DEF_ID,
      ironResourceId,
    );
    const tier4Axe = {
      id: asGatheringToolId("tool_axe_t4"),
      name: "Hache d'expert",
      toolType: "axe" as const,
      tier: 4,
      speedModifier: 0.85,
      yieldModifier: 1,
      tags: ["tier4"],
    };
    const tier4Pickaxe = {
      id: asGatheringToolId("tool_pickaxe_t4"),
      name: "Pioche d'expert",
      toolType: "pickaxe" as const,
      tier: 4,
      speedModifier: 0.85,
      yieldModifier: 1,
      tags: ["tier4"],
    };
    const starterSkinningKnife = {
      id: asGatheringToolId("tool_skinning_knife_t3"),
      name: "Couteau de dépeçage",
      toolType: "skinning_knife" as const,
      tier: 3,
      speedModifier: 1,
      yieldModifier: 1,
      tags: ["starter", "hide"],
    };
    const tier4SkinningKnife = {
      ...starterSkinningKnife,
      id: asGatheringToolId("tool_skinning_knife_t4"),
      name: "Couteau de dépeçage d'expert",
      tier: 4,
      speedModifier: 0.85,
      tags: ["tier4", "hide"],
    };
    const starterSickle = {
      id: asGatheringToolId("tool_sickle_t3"),
      name: "Faucille de compagnon",
      toolType: "sickle" as const,
      tier: 3,
      speedModifier: 1,
      yieldModifier: 1,
      tags: ["starter", "fiber"],
    };
    const tier4Sickle = {
      ...starterSickle,
      id: asGatheringToolId("tool_sickle_t4"),
      name: "Faucille d'expert",
      tier: 4,
      speedModifier: 0.85,
      tags: ["tier4", "fiber"],
    };
    gatheringToolRegistry.register(tier4Axe);
    gatheringToolRegistry.register(tier4Pickaxe);
    gatheringToolRegistry.register(starterSkinningKnife);
    gatheringToolRegistry.register(tier4SkinningKnife);
    gatheringToolRegistry.register(starterSickle);
    gatheringToolRegistry.register(tier4Sickle);

    const createProductionResource = (
      key: string,
      name: string,
      family: ResourceFamily,
      tier: 3 | 4,
    ) => {
      const definitionId = asResourceDefinitionId(`resource_${key}_t${String(tier)}`);
      const resourceId = asResourceId(`resource_${key}_t${String(tier)}_runtime`);
      const nodeDefinitionId = asResourceNodeDefinitionId(`node_${key}_t${String(tier)}`);
      resourceRegistry.register({
        id: definitionId,
        name,
        family,
        tier,
        maxCharges: 999,
        respawnDurationTicks: tier === 4 ? 360 : 240,
        baseYield: 1,
        tags: [key, family.toLowerCase(), `tier${String(tier)}`],
      });
      resourceRuntime.add({
        id: resourceId,
        definitionId,
        state: "available",
        currentCharges: 999,
        maxCharges: 999,
        tier,
        family,
      });
      resourceNodeRegistry.register({
        id: nodeDefinitionId,
        name,
        resourceDefinitionId: definitionId,
        requiredToolTier: tier,
        tags: [family.toLowerCase(), `tier${String(tier)}`],
      });
      return resourceNodeManager.createNode(
        nodeDefinitionId,
        FOREST_ZONE_DEF_ID,
        resourceId,
      );
    };
    const sturdyHideNode = createProductionResource("hide", "Peau robuste", "Hide", 3);
    const thickHideNode = createProductionResource("hide", "Peau épaisse", "Hide", 4);
    const linenFiberNode = createProductionResource("fiber", "Fibre de lin", "Fiber", 3);
    const fineFiberNode = createProductionResource("fiber", "Fibre fine", "Fiber", 4);

    // Production nodes model renewable reserves. Without this lifecycle hook,
    // their finite runtime charge pool eventually reaches zero during a long
    // session and subsequent gathering cycles can no longer start.
    resourceRuntime.events.subscribe("resourceDepleted", ({ resourceId }) => {
      resourceRuntime.restore(resourceId);
    });
    const gatheringCoordinator = new GatheringCoordinator(
      resourceRegistry,
      resourceRuntime,
      resourceNodeRegistry,
      resourceNodeManager,
      gatheringManager,
      gatheringToolRegistry,
    );
    const oreGatheringCoordinator = new GatheringCoordinator(
      resourceRegistry,
      resourceRuntime,
      resourceNodeRegistry,
      resourceNodeManager,
      oreGatheringManager,
      gatheringToolRegistry,
    );
    const hideGatheringCoordinator = new GatheringCoordinator(
      resourceRegistry,
      resourceRuntime,
      resourceNodeRegistry,
      resourceNodeManager,
      hideGatheringManager,
      gatheringToolRegistry,
    );
    const fiberGatheringCoordinator = new GatheringCoordinator(
      resourceRegistry,
      resourceRuntime,
      resourceNodeRegistry,
      resourceNodeManager,
      fiberGatheringManager,
      gatheringToolRegistry,
    );

    const gatheringRuntime = new GatheringRuntime({
      gatheringCoordinator,
      gatheringManager,
      oreGatheringCoordinator,
      oreGatheringManager,
      hideGatheringCoordinator,
      hideGatheringManager,
      fiberGatheringCoordinator,
      fiberGatheringManager,
      inventoryManager,
      masteryService,
      experienceService,
      progressionOrchestrator,
      heroId,
      nodesAndTools: {
        birchNodeId: birchNode.id,
        pineNodeId: pineNode.id,
        copperNodeId: copperNode.id,
        ironNodeId: ironNode.id,
        sturdyHideNodeId: sturdyHideNode.id,
        thickHideNodeId: thickHideNode.id,
        linenFiberNodeId: linenFiberNode.id,
        fineFiberNodeId: fineFiberNode.id,
        starterAxe,
        tier4Axe,
        starterPickaxe,
        tier4Pickaxe,
        starterSkinningKnife,
        tier4SkinningKnife,
        starterSickle,
        tier4Sickle,
      },
      getProductionTier: () => productionTier,
    });
    const refiningManager = new RefiningManager();
    const metalRefiningManager = new RefiningManager();
    const leatherRefiningManager = new RefiningManager();
    const clothRefiningManager = new RefiningManager();

    const refiningRuntime = new RefiningRuntime({
      refiningManager,
      metalRefiningManager,
      leatherRefiningManager,
      clothRefiningManager,
      inventoryManager,
      heroId,
      getProductionTier: () => productionTier,
    });

    const craftingRuntime = new CraftingRuntime({
      inventoryManager,
      heroId,
      durabilityStore,
      recipes: EQUIPMENT_CRAFT_RECIPES,
      getItemPower,
    });

    // The starter sword unlocks its mastery and becomes the active Fame target.
    const starterSwordPosition = 0;
    const starterSword = inventoryManager.addEntry(
      heroId,
      "item_weapon_sword_t3_broadsword",
      starterSwordPosition,
    );
    if (starterSword.ok) {
      durabilityStore.attach(starterSword.value.instanceId, 100);
      equipmentManager.equipFromInventory(heroId, starterSwordPosition);
      masteryService.discoverMastery(SWORD_MASTERY_ID);
      masteryService.discoverMastery(BROADSWORD_MASTERY_ID);
    }

    // Alternative starter weapons remain unequipped in the hero inventory.
    // This lets a new character immediately test every implemented weapon
    // profile without granting their masteries before first use.
    for (const starterWeaponId of [
      "item_weapon_bow_t3_longbow",
      "item_weapon_staff_t3_fire",
    ]) {
      const starterWeapon = inventoryManager.addEntry(
        heroId,
        starterWeaponId,
      );
      if (starterWeapon.ok) {
        durabilityStore.attach(starterWeapon.value.instanceId, 100);
      }
    }

    // --- Vendor setup ------------------------------------------------------------
    const vendorRegistry = new VendorRegistry();
    vendorRegistry.register({
      vendorId: "vendor_general",
      role: "buy_and_sell",
      enabled: true,
      offers: [
        ...GENERAL_VENDOR_FIXED_OFFERS,
        ...WEAPON_VENDOR_OFFERS,
      ],
    });

    const vendorService = new VendorService(
      vendorRegistry,
      currencyService,
      inventoryManager,
      equipmentManager,
      resolveItemStackInfo,
    );

    // --- Economy transaction pipeline --------------------------------------------
    const economyEvents = new EconomyEventEmitter();
    const transactionRegistry = new TransactionRegistry();
    const economyTransactionService = new EconomyTransactionService(
      currencyRegistry,
      currencyService,
      vendorService,
      repairService,
      transactionRegistry,
      economyEvents,
    );

    // --- Initialize bridge with starting values --------------------------------
    const heroHealth = damageManager.getHealth(heroId);
    const firstEnemyHealth = damageManager.getHealth(firstEnemy.id);
    bridge.updatePlayerHealth(heroHealth.currentHealth, heroHealth.maxHealth);
    bridge.updateEnemyHealth(firstEnemyHealth.currentHealth, firstEnemyHealth.maxHealth);
    bridge.setEnemyPresentation(
      firstEnemy.name,
      firstEnemy.visualManifestId,
    );
    updateWorldBridge();

    // --- Sync all panels to bridge ----------------------------------------------
    syncInventoryToBridge(bridge, inventoryManager, heroId);
    syncBankToBridge(bridge, inventoryManager, bankId);
    syncEquipmentToBridge(bridge, equipmentManager, heroId);
    syncStatsToBridge(bridge, statsManager, heroId);
    syncWalletToBridge(bridge, currencyService, walletId, 0);
    syncVendorToBridge(bridge, vendorRegistry, "vendor_general");

    const progressionState = progressionOrchestrator.getFullProgressionState();
    syncProgressionToBridge(
      bridge,
      progressionState.totalFame,
      progressionState.overflowPool,
      buildMasteryViewModels(progressionState),
    );
    syncRepairToBridge(bridge, collectRepairPreviewData(equipmentManager, inventoryManager, durabilityStore, repairCostResolver, heroId, 1.0));

    // --- Track income rate -------------------------------------------------------
    let lastSilver = 1000;
    let incomeRate = 0;

    // --- Helper: full bridge resync after any mutation ---------------------------
    const resyncAll = (): void => {
      syncWeaponMasteryStats?.(heroId);
      const pState = progressionOrchestrator.getFullProgressionState();
      syncAllToBridge(
        bridge, inventoryManager, equipmentManager, statsManager,
        currencyService, walletId, incomeRate, vendorRegistry, "vendor_general",
        heroId, pState.totalFame, pState.overflowPool,
        buildMasteryViewModels(pState),
      );
      syncBankToBridge(bridge, inventoryManager, bankId);
      syncRepairToBridge(bridge, collectRepairPreviewData(equipmentManager, inventoryManager, durabilityStore, repairCostResolver, heroId, 1.0));
    };

    // --- Subscribe to damage events -> bridge ----------------------------------
    damageEventBus.subscribe("HealthChanged", (evt) => {
      if (evt.entityId === heroId) {
        bridge.updatePlayerHealth(evt.newHealth, evt.maxHealth);
      } else {
        bridge.updateEnemyHealth(evt.newHealth, evt.maxHealth);
      }
    });

    damageEventBus.subscribe("DamageDealt", (evt) => {
      const target = evt.target === heroId ? "player" as const : "enemy" as const;
      bridge.addDamageNumber(evt.finalDamage, target);
    });

    combatService.events.subscribe("enemyKilled", () => {
      bridge.incrementEnemiesKilled();

      // --- Award silver on enemy kill ---
      const encounterRewards = getEncounterRewards(
        worldRuntime.currentZoneIndex,
        worldRuntime.currentSegment,
        worldRuntime.currentEncounter,
      );
      const lootAmount = encounterRewards.silver;
      currencyService.credit(walletId, "currency_silver", lootAmount, "Loot");
      const balRes = currencyService.getBalance(walletId, "currency_silver");
      const newBal = balRes.ok ? balRes.value : 0;
      const diff = newBal - lastSilver;
      incomeRate = diff;
      lastSilver = newBal;

      bridge.addTransaction({
        id: `loot_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`,
        type: "credit",
        description: `Loot: +${String(lootAmount)} Silver`,
        amount: lootAmount,
        timestamp: Date.now(),
      });
      bridge.addEconomyNotification({
        id: `notif_silver_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`,
        type: "success",
        message: `+${String(lootAmount)} Silver from loot`,
        timestamp: Date.now(),
      });

      // --- Award fame/XP on enemy kill ---
      const fameAmount = encounterRewards.fame;
      const equippedWeapon = equipmentManager.getEquippedItem(heroId, "weapon");
      const activeWeaponRoute = equippedWeapon === undefined
        ? undefined
        : resolveWeaponMastery(equippedWeapon.itemId);

      if (activeWeaponRoute !== undefined) {
        if (!masteryService.isMasteryUnlocked(activeWeaponRoute.familyId)) {
          progressionOrchestrator.onEquipmentAcquired(activeWeaponRoute.familyId);
        }
        if (!masteryService.isMasteryUnlocked(activeWeaponRoute.weaponId)) {
          progressionOrchestrator.onEquipmentAcquired(activeWeaponRoute.weaponId);
        }

        // Count Fame globally once on the weapon specialization.
        progressionOrchestrator.onFameEarned(activeWeaponRoute.weaponId, fameAmount, "combat");
        // Mirror the same amount into the parent family without duplicating Fame totals.
        experienceService.addExperience(activeWeaponRoute.familyId, fameAmount, "combat");
        // A level gained on either branch immediately updates the equipped
        // weapon's mastery-IP damage contribution.
        syncWeaponMasteryStats?.(heroId);
        syncStatsToBridge(bridge, statsManager, heroId);

        const masteryName = getMasteryDisplayName(activeWeaponRoute.weaponId);
        bridge.addEconomyNotification({
          id: `notif_fame_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`,
          type: "success",
          message: `+${String(fameAmount)} Fame · ${masteryName}`,
          timestamp: Date.now(),
        });
      }

      // --- Roll loot item drop ---
      const droppedItemId = rollGenericCombatLoot();
      if (droppedItemId !== undefined) {
        const addResult = inventoryManager.addQuantity(heroId, droppedItemId, 1);
        if (addResult.ok) {
          // A stack owns one runtime instance in the current item model.
          // New equipment stacks receive full durability; adding to an
          // existing identical stack keeps the durability already attached.
          const eqInfo = resolveEquipmentInfo(droppedItemId);
          if (eqInfo !== undefined) {
            const position = addResult.value.affectedPositions[0];
            if (position !== undefined) {
              const slot = inventoryManager.getSlot(heroId, position);
              if (slot.ok && slot.value.entry !== undefined) {
                const existingDurability = durabilityStore.get(slot.value.entry.instanceId);
                if (existingDurability === undefined) {
                  durabilityStore.attach(slot.value.entry.instanceId, 100);
                }
              }
            }
          }

          bridge.addEconomyNotification({
            id: `notif_loot_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`,
            type: "success",
            message: `Loot: ${droppedItemId.replace("item_", "").replace(/_/g, " ")}`,
            timestamp: Date.now(),
          });
        }
      }

      const enchantmentMaterialId = rollEnchantmentMaterial();
      if (enchantmentMaterialId !== undefined) {
        const materialResult = inventoryManager.addQuantity(
          heroId,
          enchantmentMaterialId,
          1,
        );
        if (materialResult.ok) {
          bridge.addEconomyNotification({
            id: `notif_enchantment_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`,
            type: "success",
            message: `Rare : ${ENCHANTMENT_MATERIAL_NAMES[enchantmentMaterialId] ?? enchantmentMaterialId}`,
            timestamp: Date.now(),
          });
        }
      }

      // --- Resync all panels ---
      resyncAll();
    });

    // --- Persistence setup -------------------------------------------------------
    const persistence = new RuntimePersistence({
      inventoryManager,
      world,
      heroId,
      bankId,
      equipmentManager,
      currencyService,
      experienceService,
      masteryService,
      fameService,
      destinyBoardService,
      durabilityStore,
    });

    // --- Save/Load functions ---------------------------------------------------
    let tickCounter = 0;
    let primaryAbilityAutoCast = true;
    let productionTier: 3 | 4 = 3;

    const getWoodRecipe = (tier: 3 | 4 = productionTier) =>
      tier === 4 ? PINE_PLANK_RECIPE : BIRCH_PLANK_RECIPE;
    const getMetalRecipe = (tier: 3 | 4 = productionTier) =>
      tier === 4 ? IRON_BAR_RECIPE : COPPER_BAR_RECIPE;
    const getLeatherRecipe = (tier: 3 | 4 = productionTier) =>
      tier === 4 ? THICK_LEATHER_RECIPE : STURDY_LEATHER_RECIPE;
    const getClothRecipe = (tier: 3 | 4 = productionTier) =>
      tier === 4 ? FINE_CLOTH_RECIPE : LINEN_CLOTH_RECIPE;

    const getEquippedWeaponId = (): string | undefined =>
      bridge.equipment.slots.find((slot) => slot.slot === "weapon")?.itemId ?? undefined;

    const syncProjectedSegmentRates = (): void => {
      const physicalDamage =
        statsManager.getStat(heroId, STAT_PHYSICAL_DAMAGE).computed;
      const magicalDamage =
        statsManager.getStat(heroId, STAT_MAGICAL_DAMAGE).computed;
      const attackSpeed = Math.max(
        0.001,
        statsManager.getStat(heroId, STAT_ATTACK_SPEED).computed,
      );
      const autoAttackIsMagical = magicalDamage > physicalDamage;
      const autoAttackPower = autoAttackIsMagical
        ? magicalDamage
        : physicalDamage;
      const abilityId = resolvePrimaryAbilityId(getEquippedWeaponId());
      const ability = abilityId === undefined
        ? undefined
        : CLIENT_ABILITIES[abilityId];
      const canEarnFame =
        resolveWeaponMastery(getEquippedWeaponId() ?? "") !== undefined;

      let projectedSeconds = 0;
      let projectedSilver = 0;
      let projectedFame = 0;

      for (
        let encounterIndex = 0;
        encounterIndex < ENCOUNTERS_PER_SEGMENT;
        encounterIndex += 1
      ) {
        const enemy = getEnemyCombatProfile(
          worldRuntime.currentZoneIndex,
          worldRuntime.currentSegment,
          encounterIndex,
        );
        const autoResistance = autoAttackIsMagical
          ? enemy.magicResistance
          : enemy.armor;
        const autoDamage = Math.max(
          1,
          autoAttackPower
            * (1 - Math.min(80, Math.max(0, autoResistance)) / 100),
        );
        let projectedDps = autoDamage * attackSpeed;

        if (primaryAbilityAutoCast && ability !== undefined) {
          const abilityPower = ability.damageType === "magical"
            ? magicalDamage
            : physicalDamage;
          const abilityResistance = ability.damageType === "magical"
            ? enemy.magicResistance
            : enemy.armor;
          const abilityDamage = Math.max(
            1,
            abilityPower
              * (1 + ability.bonusDamageRatio)
              * (1 - Math.min(80, Math.max(0, abilityResistance)) / 100),
          );
          projectedDps += abilityDamage / Math.max(0.5, ability.cooldown);
        }

        projectedSeconds += enemy.hp / Math.max(1, projectedDps);
        // Fixed transition/respawn time between two encounters.
        projectedSeconds += 1;

        const rewards = getEncounterRewards(
          worldRuntime.currentZoneIndex,
          worldRuntime.currentSegment,
          encounterIndex,
        );
        projectedSilver += rewards.silver;
        if (canEarnFame) projectedFame += rewards.fame;
      }

      const cyclesPerHour = 3600 / Math.max(1, projectedSeconds);
      bridge.updateSegmentRates(
        projectedSilver * cyclesPerHour,
        projectedFame * cyclesPerHour,
      );
    };

    const syncAbilities = (): void => {
      const abilityId = resolvePrimaryAbilityId(getEquippedWeaponId());
      const definition = abilityId === undefined ? undefined : CLIENT_ABILITIES[abilityId];
      const entry = abilityId === undefined
        ? undefined
        : abilityManager.getAbility(heroId, abilityId as AbilityId);
      const energy = abilityManager.getEnergy(heroId);

      bridge.updateAbilities({
        primary: definition === undefined || entry === undefined
          ? null
          : {
              id: definition.id,
              name: definition.name,
              description: definition.description,
              icon: definition.icon,
              shortcut: "Q",
              cooldown: definition.cooldown,
              cooldownRemaining: Math.max(0, entry.cooldownRemaining),
              energyCost: definition.resourceCost.energy ?? 0,
              isReady:
                entry.state === "ready"
                && energy.currentEnergy >= (definition.resourceCost.energy ?? 0)
                && bridge.combatState === "combat",
              autoCast: primaryAbilityAutoCast,
            },
        currentEnergy: energy.currentEnergy,
        maxEnergy: energy.maxEnergy,
      });
    };

    const finalizeActiveEnemyDeath = (): boolean => {
      if (damageManager.isAlive(activeEnemyId)) return false;

      const death = deathManager.checkDeath(activeEnemyId, heroId, tickCounter);
      if (death === null) return true;

      const session = combatService.getActiveSession();
      if (session !== undefined) {
        combatService.events.publish("enemyKilled", {
          sessionId: session.sessionId,
          entityId: activeEnemyId,
        });
      }
      return true;
    };

    const usePrimaryAbility = (): boolean => {
      const abilityId = resolvePrimaryAbilityId(getEquippedWeaponId());
      const definition = abilityId === undefined ? undefined : CLIENT_ABILITIES[abilityId];
      if (
        definition === undefined
        || bridge.combatState !== "combat"
        || !damageManager.isAlive(activeEnemyId)
      ) {
        return false;
      }

      const execution = abilityManager.executeIntent({
        entityId: heroId,
        abilityId: abilityId as AbilityId,
        primaryTarget: activeEnemyId,
        tick: tickCounter,
      });
      if (!execution.ok) {
        syncAbilities();
        return false;
      }

      // An ability is a complete offensive action. Restart the auto-attack
      // cycle so an ability and a normal attack cannot resolve during the
      // same simulation tick and leave a delayed visual on a dead target.
      autoAttackManager.stopAutoAttack(heroId);
      autoAttackManager.startAutoAttack(heroId);

      const sourceStat = definition.damageType === "magical"
        ? STAT_MAGICAL_DAMAGE
        : STAT_PHYSICAL_DAMAGE;
      const sourceDamage = statsManager.getStat(heroId, sourceStat).computed;
      const result = damageManager.processDamage({
        source: heroId,
        target: activeEnemyId,
        baseDamage: sourceDamage * definition.bonusDamageRatio,
        damageType: definition.damageType,
        source_type: "ability",
      });
      if (result?.targetDied === true) {
        finalizeActiveEnemyDeath();
      }
      syncAbilities();
      return result !== null;
    };

    const setPrimaryAbilityAutoCast = (enabled: boolean): void => {
      primaryAbilityAutoCast = enabled;
      syncAbilities();
    };

    syncAbilities();

    gatheringRuntime.subscribeGatherCompleted((evt) => {
      syncInventoryToBridge(bridge, inventoryManager, heroId);
      if (evt.family === "Wood") {
        syncGathering();
        syncRefining();
      } else if (evt.family === "Ore") {
        syncOreGathering();
        syncMetalRefining();
      } else if (evt.family === "Hide") {
        syncHideGathering();
        syncLeatherRefining();
      } else if (evt.family === "Fiber") {
        syncFiberGathering();
        syncClothRefining();
      }
      syncCrafting();
      syncMasteryProgression();
      bridge.addEconomyNotification({
        id: `notif_gather_${String(Date.now())}`,
        type: evt.added ? "success" : "error",
        message: evt.added
          ? `+${String(evt.quantityAdded)} ${evt.itemLabel}`
          : "Inventaire plein : récolte non stockée",
        timestamp: Date.now(),
      });
    });

    const syncGathering = (): void => {
      const recipe = getWoodRecipe();
      syncGatheringToBridge(
        (vm) => { bridge.updateGathering(vm); },
        gatheringCoordinator.getActiveSession(),
        tickCounter,
        getHeroGatheringMasteryLevel(WOOD_GATHERING_MASTERY_ID),
        getRequiredGatheringMasteryForTier(productionTier),
        getHeroGatheringDurationTicks(WOOD_GATHERING_MASTERY_ID),
        productionTier === 4 ? "Bois de pin" : "Bois de bouleau",
        "Wood",
        "resource_wood",
        productionTier,
        inventoryManager.getTotalQuantity(heroId, recipe.rawItemId),
        gatheringRuntime.getActiveMiniGameState("Wood").strikesUsed,
      );
    };

    const syncOreGathering = (): void => {
      const recipe = getMetalRecipe();
      syncGatheringToBridge(
        (vm) => { bridge.updateOreGathering(vm); },
        oreGatheringCoordinator.getActiveSession(),
        tickCounter,
        getHeroGatheringMasteryLevel(ORE_GATHERING_MASTERY_ID),
        getRequiredGatheringMasteryForTier(productionTier),
        getHeroGatheringDurationTicks(ORE_GATHERING_MASTERY_ID),
        productionTier === 4 ? "Minerai de fer" : "Minerai de cuivre",
        "Ore",
        "resource_ore",
        productionTier,
        inventoryManager.getTotalQuantity(heroId, recipe.rawItemId),
        gatheringRuntime.getActiveMiniGameState("Ore").strikesUsed,
      );
    };

    const syncHideGathering = (): void => {
      const recipe = getLeatherRecipe();
      syncGatheringToBridge(
        (vm) => { bridge.updateHideGathering(vm); },
        hideGatheringCoordinator.getActiveSession(),
        tickCounter,
        getHeroGatheringMasteryLevel(HIDE_GATHERING_MASTERY_ID),
        getRequiredGatheringMasteryForTier(productionTier),
        getHeroGatheringDurationTicks(HIDE_GATHERING_MASTERY_ID),
        productionTier === 4 ? "Peau épaisse" : "Peau robuste",
        "Hide",
        "resource_hide",
        productionTier,
        inventoryManager.getTotalQuantity(heroId, recipe.rawItemId),
        gatheringRuntime.getActiveMiniGameState("Hide").strikesUsed,
      );
    };

    const syncFiberGathering = (): void => {
      const recipe = getClothRecipe();
      syncGatheringToBridge(
        (vm) => { bridge.updateFiberGathering(vm); },
        fiberGatheringCoordinator.getActiveSession(),
        tickCounter,
        getHeroGatheringMasteryLevel(FIBER_GATHERING_MASTERY_ID),
        getRequiredGatheringMasteryForTier(productionTier),
        getHeroGatheringDurationTicks(FIBER_GATHERING_MASTERY_ID),
        productionTier === 4 ? "Fibre fine" : "Fibre de lin",
        "Fiber",
        "resource_fiber",
        productionTier,
        inventoryManager.getTotalQuantity(heroId, recipe.rawItemId),
        gatheringRuntime.getActiveMiniGameState("Fiber").strikesUsed,
      );
    };

    const getHeroGatheringMasteryLevel = (
      masteryId: ReturnType<typeof asMasteryId>,
    ): number =>
      masteryService.getMasteryState(masteryId)?.level ?? 0;

    const getHeroGatheringMasteryModifier = (
      masteryId: ReturnType<typeof asMasteryId>,
    ): number =>
      Math.max(
        0.5,
        1 - Math.min(100, getHeroGatheringMasteryLevel(masteryId)) * 0.005,
      );

    const getHeroGatheringDurationTicks = (
      masteryId: ReturnType<typeof asMasteryId>,
    ): number => {
      const baseTicks = productionTier === 4 ? 36 : 24;
      const toolModifier = productionTier === 4 ? 0.85 : 1;
      return Math.max(
        1,
        Math.ceil(baseTicks * toolModifier * getHeroGatheringMasteryModifier(masteryId)),
      );
    };

    const syncMasteryProgression = (): void => {
      const state = progressionOrchestrator.getFullProgressionState();
      syncProgressionToBridge(
        bridge,
        state.totalFame,
        state.overflowPool,
        buildMasteryViewModels(state),
      );
    };

    const toggleGathering = (): boolean => {
      const res = gatheringRuntime.toggleGathering(tickCounter);
      if (res.action === "stopped") {
        syncGathering();
        bridge.setCombatState("walking");
        return true;
      }
      if (res.action === "started") {
        prepareCombatResumeAfterGathering();
        bridge.setCombatState("idle");
        syncGathering();
        return true;
      }
      return false;
    };

    const returnToCombat = (): boolean => {
      if (gatheringRuntime.isHeroGathering()) {
        toggleGathering();
        toggleOreGathering();
        toggleHideGathering();
        toggleFiberGathering();
        return true;
      }
      return false;
    };

    const toggleOreGathering = (): boolean => {
      const res = gatheringRuntime.toggleOreGathering(tickCounter);
      if (res.action === "stopped") {
        syncOreGathering();
        bridge.setCombatState("walking");
        return true;
      }
      if (res.action === "started") {
        prepareCombatResumeAfterGathering();
        bridge.setCombatState("idle");
        syncOreGathering();
        return true;
      }
      return false;
    };

    const toggleHideGathering = (): boolean => {
      const res = gatheringRuntime.toggleHideGathering(tickCounter);
      if (res.action === "stopped") {
        syncHideGathering();
        bridge.setCombatState("walking");
        return true;
      }
      if (res.action === "started") {
        prepareCombatResumeAfterGathering();
        bridge.setCombatState("idle");
        syncHideGathering();
        return true;
      }
      return false;
    };

    const toggleFiberGathering = (): boolean => {
      const res = gatheringRuntime.toggleFiberGathering(tickCounter);
      if (res.action === "stopped") {
        syncFiberGathering();
        bridge.setCombatState("walking");
        return true;
      }
      if (res.action === "started") {
        prepareCombatResumeAfterGathering();
        bridge.setCombatState("idle");
        syncFiberGathering();
        return true;
      }
      return false;
    };

    const performGatheringStrike = (
      resourceFamily: string,
      quality: "miss" | "correct" | "perfect",
    ): boolean => {
      const res = gatheringRuntime.performGatheringStrike(
        resourceFamily as ResourceFamily,
        quality,
        tickCounter,
      );
      if (res.ok) {
        if (resourceFamily === "Wood") syncGathering();
        else if (resourceFamily === "Ore") syncOreGathering();
        else if (resourceFamily === "Hide") syncHideGathering();
        else syncFiberGathering();
        return true;
      }
      return false;
    };

    syncGathering();
    syncOreGathering();
    syncHideGathering();
    syncFiberGathering();


    refiningRuntime.subscribeRefineCompleted((evt) => {
      syncInventoryToBridge(bridge, inventoryManager, heroId);
      if (evt.family === "Wood") {
        syncGathering();
        syncRefining();
      } else if (evt.family === "Ore") {
        syncOreGathering();
        syncMetalRefining();
      } else if (evt.family === "Hide") {
        syncHideGathering();
        syncLeatherRefining();
      } else if (evt.family === "Fiber") {
        syncFiberGathering();
        syncClothRefining();
      }
      syncCrafting();
    });

    const syncRefining = (): void => {
      syncRefiningToBridge(
        (vm) => { bridge.updateRefining(vm); },
        refiningManager.getActiveSession(),
        tickCounter,
        getWoodRecipe(),
        refiningRuntime.getReservedInputs("Wood"),
        inventoryManager,
        heroId,
      );
    };

    const syncMetalRefining = (): void => {
      syncRefiningToBridge(
        (vm) => { bridge.updateMetalRefining(vm); },
        metalRefiningManager.getActiveSession(),
        tickCounter,
        getMetalRecipe(),
        refiningRuntime.getReservedInputs("Ore"),
        inventoryManager,
        heroId,
      );
    };

    const syncLeatherRefining = (): void => {
      syncRefiningToBridge(
        (vm) => { bridge.updateLeatherRefining(vm); },
        leatherRefiningManager.getActiveSession(),
        tickCounter,
        getLeatherRecipe(),
        refiningRuntime.getReservedInputs("Hide"),
        inventoryManager,
        heroId,
      );
    };

    const syncClothRefining = (): void => {
      syncRefiningToBridge(
        (vm) => { bridge.updateClothRefining(vm); },
        clothRefiningManager.getActiveSession(),
        tickCounter,
        getClothRecipe(),
        refiningRuntime.getReservedInputs("Fiber"),
        inventoryManager,
        heroId,
      );
    };

    const toggleRefining = (): boolean => {
      const res = refiningRuntime.toggleRefining(tickCounter);
      syncInventoryToBridge(bridge, inventoryManager, heroId);
      syncGathering();
      syncRefining();
      return res.action === "started" || res.action === "stopped";
    };

    const toggleMetalRefining = (): boolean => {
      const res = refiningRuntime.toggleMetalRefining(tickCounter);
      syncInventoryToBridge(bridge, inventoryManager, heroId);
      syncOreGathering();
      syncMetalRefining();
      return res.action === "started" || res.action === "stopped";
    };

    const toggleLeatherRefining = (): boolean => {
      const res = refiningRuntime.toggleLeatherRefining(tickCounter);
      syncInventoryToBridge(bridge, inventoryManager, heroId);
      syncHideGathering();
      syncLeatherRefining();
      return res.action === "started" || res.action === "stopped";
    };

    const toggleClothRefining = (): boolean => {
      const res = refiningRuntime.toggleClothRefining(tickCounter);
      syncInventoryToBridge(bridge, inventoryManager, heroId);
      syncFiberGathering();
      syncClothRefining();
      return res.action === "started" || res.action === "stopped";
    };

    const refineAllAvailable = (): boolean => {
      return refiningRuntime.refineAllAvailable(tickCounter).startedAtLeastOne;
    };

    syncRefining();
    syncMetalRefining();
    syncLeatherRefining();
    syncClothRefining();

    const syncCrafting = (): void => {
      syncCraftingToBridge(
        bridge,
        inventoryManager,
        heroId,
        productionTier,
        {
          woodItemId: getWoodRecipe().outputItemId,
          metalItemId: getMetalRecipe().outputItemId,
          leatherItemId: getLeatherRecipe().outputItemId,
          clothItemId: getClothRecipe().outputItemId,
        },
        getItemPower,
        EQUIPMENT_CRAFT_RECIPES,
      );
    };

    const craftEquipment = (outputItemId: string): boolean => {
      const res = craftingRuntime.craftEquipment(outputItemId);
      if (!res.ok) return false;

      syncInventoryToBridge(bridge, inventoryManager, heroId);
      syncRefining();
      syncMetalRefining();
      syncLeatherRefining();
      syncClothRefining();
      syncCrafting();
      bridge.addEconomyNotification({
        id: `notif_craft_${String(Date.now())}`,
        type: "success",
        message: `Fabriqué : ${res.recipeName} · ${String(res.itemPower)} IP`,
        timestamp: Date.now(),
      });
      return true;
    };

    const setProductionTier = (tier: 3 | 4): boolean => {
      productionTier = tier;
      syncGathering();
      syncOreGathering();
      syncHideGathering();
      syncFiberGathering();
      syncRefining();
      syncMetalRefining();
      syncLeatherRefining();
      syncClothRefining();
      syncCrafting();
      return true;
    };
    syncMetalRefining();
    syncCrafting();

    const workerTaskByProfession = {
      woodcutter: GATHER_WOOD_TASK_ID,
      miner: GATHER_COPPER_TASK_ID,
      skinner: GATHER_HIDE_TASK_ID,
      fiber_harvester: GATHER_FIBER_TASK_ID,
    } as const;
    const isSupportedWorkerProfession = (
      profession: string,
    ): profession is keyof typeof workerTaskByProfession =>
      Object.prototype.hasOwnProperty.call(workerTaskByProfession, profession);
    const workerDefinitionByProfession = {
      woodcutter: WOODCUTTER_DEFINITION_ID,
      miner: MINER_DEFINITION_ID,
      skinner: SKINNER_DEFINITION_ID,
      fiber_harvester: FIBER_HARVESTER_DEFINITION_ID,
    } as const;
    const workerRawItemId = (profession: WorkerProfessionVM, tier: 3 | 4): string => {
      switch (profession) {
        case "woodcutter": return tier === 4 ? PINE_PLANK_RECIPE.rawItemId : BIRCH_PLANK_RECIPE.rawItemId;
        case "miner": return tier === 4 ? IRON_BAR_RECIPE.rawItemId : COPPER_BAR_RECIPE.rawItemId;
        case "stonecutter": return "item_resource_stone_t3";
        case "skinner": return tier === 4 ? THICK_LEATHER_RECIPE.rawItemId : STURDY_LEATHER_RECIPE.rawItemId;
        case "fiber_harvester": return tier === 4 ? FINE_CLOTH_RECIPE.rawItemId : LINEN_CLOTH_RECIPE.rawItemId;
      }
    };
    const workerMasteryId = (profession: WorkerProfessionVM): MasteryId => {
      switch (profession) {
        case "woodcutter": return WOOD_GATHERING_MASTERY_ID;
        case "miner": return ORE_GATHERING_MASTERY_ID;
        case "stonecutter": return ORE_GATHERING_MASTERY_ID;
        case "skinner": return HIDE_GATHERING_MASTERY_ID;
        case "fiber_harvester": return FIBER_GATHERING_MASTERY_ID;
      }
    };
    const workerTaskForProfession = (
      profession: keyof typeof workerTaskByProfession,
    ): WorkerTaskDefinitionId => workerTaskByProfession[profession];
    const workerDefinitionForProfession = (
      profession: keyof typeof workerDefinitionByProfession,
    ): WorkerDefinitionId => workerDefinitionByProfession[profession];

    const getWorkerMasteryLevel = (masteryXp: number): number =>
      Math.min(100, Math.floor(Math.sqrt(Math.max(0, masteryXp) / 100)));

    const getWorkerMasteryThreshold = (level: number): number =>
      Math.max(0, level) ** 2 * 100;

    const getWorkerSpeedModifier = (masteryXp: number, tier: 3 | 4): number => {
      const level = getWorkerMasteryLevel(masteryXp);
      const tierModifier = tier === 4 ? 0.75 : 1;
      return tierModifier * (1 + level * 0.005);
    };

    const syncWorkers = (): void => {
      syncWorkersToBridge(
        bridge,
        workerManager.getAllWorkers(),
        isSupportedWorkerProfession,
        (wId) => workerScheduler.getSession(wId),
        (wId) => workerProductionTier.get(wId) ?? productionTier,
        (xp, tier) => {
          const masteryLevel = getWorkerMasteryLevel(xp);
          return {
            masteryLevel,
            currentThreshold: getWorkerMasteryThreshold(masteryLevel),
            nextThreshold: getWorkerMasteryThreshold(masteryLevel + 1),
            speedModifier: getWorkerSpeedModifier(xp, tier),
          };
        },
        WORKER_CAPACITY,
        WORKER_RECRUITMENT_COST,
      );
    };

    const startWorkerCycle = (
      workerId: WorkerId,
      assignedTier: 3 | 4 = productionTier,
    ): boolean => {
      const worker = workerManager.getWorker(workerId);
      if (
        worker === undefined
        || !isSupportedWorkerProfession(worker.profession)
        || getWorkerMasteryLevel(worker.mastery)
          < getRequiredGatheringMasteryForTier(assignedTier)
      ) {
        return false;
      }
      const result = workerExecutor.startExecution(
        workerId,
        workerTaskForProfession(worker.profession),
        getWorkerSpeedModifier(worker.mastery, assignedTier),
      );
      if (!result.ok) return false;
      workerProductionTier.set(workerId, assignedTier);
      workerScheduler.addSession(result.session);
      workerManager.updateState(workerId, "working");
      return true;
    };

    const recruitWorker = (profession: WorkerProfessionVM): boolean => {
      if (
        !isSupportedWorkerProfession(profession)
        || workerByProfession.has(profession)
        || workerManager.getAllWorkers().length >= WORKER_CAPACITY
      ) {
        return false;
      }

      const payment = currencyService.debit(
        walletId,
        "currency_silver",
        WORKER_RECRUITMENT_COST,
        "Worker",
      );
      if (!payment.ok) {
        bridge.addEconomyNotification({
          id: `notif_worker_cost_${String(Date.now())}`,
          type: "error",
          message: "Argent insuffisant pour recruter ce worker",
          timestamp: Date.now(),
        });
        return false;
      }

      const created = workerManager.createWorker(
        workerDefinitionForProfession(profession),
      );
      if (!created.ok) {
        currencyService.credit(
          walletId,
          "currency_silver",
          WORKER_RECRUITMENT_COST,
        );
        return false;
      }

      const taskId = workerTaskForProfession(profession);
      const assigned = workerAssignmentManager.assign(created.worker.id, taskId);
      if (!assigned.ok) {
        workerManager.removeWorker(created.worker.id);
        currencyService.credit(
          walletId,
          "currency_silver",
          WORKER_RECRUITMENT_COST,
        );
        return false;
      }

      workerByProfession.set(profession, created.worker.id);
      workerManager.updateState(created.worker.id, "assigned");
      syncWalletToBridge(
        bridge,
        currencyService,
        walletId,
        bridge.wallet.incomeRate,
      );
      syncWorkers();
      bridge.addEconomyNotification({
        id: `notif_worker_recruit_${String(Date.now())}`,
        type: "success",
        message: `${created.worker.displayName}, ${WORKER_PROFESSION_LABELS[profession]}, a rejoint l’île`,
        timestamp: Date.now(),
      });
      return true;
    };

    const toggleWorker = (profession: WorkerProfessionVM): boolean => {
      const workerId = workerByProfession.get(profession);
      if (workerId === undefined) return false;
      const session = workerScheduler.getSession(workerId);

      if (session?.state === "executing") {
        const assignedTier = workerProductionTier.get(workerId) ?? productionTier;
        if (assignedTier !== productionTier) {
          workerScheduler.removeSession(workerId);
          workerManager.updateState(workerId, "assigned");
          const restarted = startWorkerCycle(workerId, productionTier);
          syncWorkers();
          return restarted;
        }
        session.pause();
        workerManager.updateState(workerId, "assigned");
        syncWorkers();
        return true;
      }
      if (session?.state === "paused") {
        const assignedTier = workerProductionTier.get(workerId) ?? productionTier;
        if (assignedTier !== productionTier) {
          workerScheduler.removeSession(workerId);
          workerManager.updateState(workerId, "assigned");
          const restarted = startWorkerCycle(workerId, productionTier);
          syncWorkers();
          return restarted;
        }
        session.resume();
        workerManager.updateState(workerId, "working");
        syncWorkers();
        return true;
      }

      const started = startWorkerCycle(workerId);
      syncWorkers();
      return started;
    };

    interface WorkerClientSaveData {
      readonly profession: WorkerProfessionVM;
      readonly displayName: string;
      readonly mastery: number;
      readonly productionTier: 3 | 4;
      readonly state: "idle" | "working" | "paused";
      readonly elapsedTicks: number;
    }

    const workerSaveProvider = {
      providerId: "workers",
      save: (): readonly WorkerClientSaveData[] => workerManager.getAllWorkers()
        .filter((worker) => isSupportedWorkerProfession(worker.profession))
        .map((worker) => {
          const profession = worker.profession as WorkerProfessionVM;
          const session = workerScheduler.getSession(worker.id);
          return {
            profession,
            displayName: worker.displayName,
            mastery: worker.mastery,
            productionTier: workerProductionTier.get(worker.id) ?? productionTier,
            state: session?.state === "executing"
              ? "working"
              : session?.state === "paused"
                ? "paused"
                : "idle",
            elapsedTicks: session?.elapsedTicks ?? 0,
          };
        }),
      load: (data: unknown): void => {
        for (const worker of workerManager.getAllWorkers()) {
          workerScheduler.removeSession(worker.id);
          if (workerAssignmentManager.getAssignment(worker.id) !== undefined) {
            workerAssignmentManager.unassign(worker.id);
          }
          workerManager.removeWorker(worker.id);
        }
        workerByProfession.clear();
        workerProductionTier.clear();

        if (!Array.isArray(data)) {
          syncWorkers();
          return;
        }

        for (const raw of data as WorkerClientSaveData[]) {
          if (!isSupportedWorkerProfession(raw.profession)) continue;
          const created = workerManager.createWorker(
            workerDefinitionForProfession(raw.profession),
            raw.displayName,
          );
          if (!created.ok) continue;
          workerManager.addMastery(created.worker.id, Math.max(0, raw.mastery));
          const assigned = workerAssignmentManager.assign(
            created.worker.id,
            workerTaskForProfession(raw.profession),
          );
          if (!assigned.ok) continue;
          workerByProfession.set(raw.profession, created.worker.id);
          const savedTier = raw.productionTier === 4 ? 4 : 3;
          workerProductionTier.set(created.worker.id, savedTier);
          workerManager.updateState(created.worker.id, "assigned");

          if (raw.state !== "idle" && startWorkerCycle(created.worker.id, savedTier)) {
            const session = workerScheduler.getSession(created.worker.id);
            const elapsed = Math.min(
              Math.max(0, raw.elapsedTicks),
              Math.max(0, (session?.totalTicks ?? 1) - 1),
            );
            for (let index = 0; index < elapsed; index += 1) {
              session?.tick();
            }
            if (raw.state === "paused") {
              session?.pause();
              workerManager.updateState(created.worker.id, "assigned");
            }
          }
        }
        syncWorkers();
      },
    };
    persistence.registerProvider(workerSaveProvider);
    syncWorkers();

    const processCompletedWorkerCycles = (): void => {
      for (const session of workerScheduler.getAllSessions()) {
        if (!session.isComplete()) continue;
        const result = session.produceResult();
        const worker = workerManager.getWorker(session.workerId);
        workerScheduler.removeSession(session.workerId);
        if (!result.ok || worker === undefined) continue;

        const assignedTier = workerProductionTier.get(worker.id) ?? 3;
        if (!isSupportedWorkerProfession(worker.profession)) {
          workerManager.updateState(worker.id, "assigned");
          continue;
        }
        const profession = worker.profession;
        const itemId = workerRawItemId(profession, assignedTier);
        const added = inventoryManager.addQuantity(
          heroId,
          itemId,
          result.yield,
          { itemId, stackable: true, maxStack: 999 },
        );
        if (!added.ok) {
          // A full character inventory must not silently disable an assigned
          // worker forever. Keep the assignment alive and surface the issue.
          startWorkerCycle(worker.id, assignedTier);
          bridge.addEconomyNotification({
            id: `notif_worker_storage_${String(worker.id)}_${String(Date.now())}`,
            type: "error",
            message: `Stockage plein : production de ${getWorkerResourceLabel(profession, assignedTier)} non stockée`,
            timestamp: Date.now(),
          });
          continue;
        }

        workerManager.addMastery(
          worker.id,
          result.masteryGained * getWorkerGatheringXpForTier(assignedTier),
        );
        experienceService.addExperience(
          workerMasteryId(profession),
          result.masteryGained
            * getHeroGatheringXpFromWorkerForTier(assignedTier),
          "gathering",
        );
        syncMasteryProgression();
        startWorkerCycle(worker.id, assignedTier);
      }
      syncInventoryToBridge(bridge, inventoryManager, heroId);
      syncGathering();
      syncOreGathering();
      syncHideGathering();
      syncFiberGathering();
      syncRefining();
      syncMetalRefining();
      syncLeatherRefining();
      syncClothRefining();
      syncCrafting();
      syncWorkers();
    };

    const saveGame = (): void => {
      persistence.save(tickCounter);
      bridge.addEconomyNotification({
        id: `notif_save_${String(Date.now())}`,
        type: "success",
        message: "Game saved",
        timestamp: Date.now(),
      });
    };

    const loadGame = (): boolean => {
      if (!persistence.hasSave()) {
        return false;
      }
      persistence.load();

      // After load, re-read wallet balance
      const balResult = currencyService.getBalance(walletId, "currency_silver");
      lastSilver = balResult.ok ? balResult.value : 0;
      incomeRate = 0;

      // Re-sync health after load (stats may have changed)
      const hHealth = damageManager.getHealth(heroId);
      bridge.updatePlayerHealth(hHealth.currentHealth, hHealth.maxHealth);

      resyncAll();

      bridge.addEconomyNotification({
        id: `notif_load_${String(Date.now())}`,
        type: "success",
        message: "Game loaded",
        timestamp: Date.now(),
      });
      return true;
    };

    const hasSave = (): boolean => persistence.hasSave();

    // --- Start the encounter ---------------------------------------------------
    let encounterCounter = 0;
    let completedEncounterResult: "victory" | "defeat" | null = null;
    let awaitingResumeAfterDefeat = false;

    const restoreHeroHealth = (): void => {
      const health = damageManager.getHealth(heroId);
      damageManager.healDamage(
        heroId,
        health.maxHealth - health.currentHealth,
      );
    };

    const reviveHero = (): void => {
      const heroDeathData = world.tryGetComponent(heroId, DeathComponent);
      if (heroDeathData !== undefined) {
        heroDeathData.isDead = false;
        heroDeathData.processed = false;
      }

      restoreHeroHealth();
    };


    const interruptEncounterForTravel = (): void => {
      const session = combatService.getActiveSession();
      if (session !== undefined) {
        combatService.cancelEncounter();
        effectManager.removeAllEffects(heroId);
        for (const enemyId of session.participants.enemies) {
          effectManager.removeAllEffects(enemyId);
          if (world.hasEntity(enemyId)) {
            world.destroyEntity(enemyId);
          }
        }
      }

      completedEncounterResult = null;
      awaitingResumeAfterDefeat = false;
      reviveHero();
      bridge.setCombatState("walking");
    };

    const prepareCombatResumeAfterGathering = (): void => {
      const resumeSegment = worldRuntime.farmMode
        ? worldRuntime.currentSegment
        : worldRuntime.highestUnlockedSegment;

      interruptEncounterForTravel();
      worldRuntime.selectSegment(resumeSegment + 1);
      restoreHeroHealth();
      updateWorldBridge();
    };

    const selectSegment = (segmentNumber: number): boolean => {
      if (!worldRuntime.selectSegment(segmentNumber)) {
        return false;
      }

      interruptEncounterForTravel();
      restoreHeroHealth();
      updateWorldBridge();
      return true;
    };

    const setSegmentFarmMode = (enabled: boolean): void => {
      worldRuntime.setSegmentFarmMode(enabled);
      updateWorldBridge();
    };

    const selectZone = (zoneNumber: number, segmentNumber?: number): boolean => {
      if (!worldRuntime.selectZone(zoneNumber, segmentNumber)) {
        return false;
      }

      interruptEncounterForTravel();
      restoreHeroHealth();
      updateWorldBridge();
      return true;
    };

    const resumeExploration = (): boolean => {
      if (!awaitingResumeAfterDefeat) {
        return false;
      }

      awaitingResumeAfterDefeat = false;
      reviveHero();
      bridge.setCombatState("walking");
      return true;
    };

    const getWorldLocationSaveState = (): WorldLocationSaveState => {
      return worldRuntime.getWorldLocationSaveState();
    };

    const setWorldLocationSaveState = (
      savedLocation: WorldLocationSaveState | undefined,
    ): void => {
      interruptEncounterForTravel();
      worldRuntime.setWorldLocationSaveState(savedLocation);
      restoreHeroHealth();
      updateWorldBridge();
      bridge.setCombatState("walking");
    };

    const worldSaveProvider = new WorldSaveProvider(
      worldCoordinator,
      getWorldLocationSaveState,
      setWorldLocationSaveState,
    );
    persistence.registerProvider(worldSaveProvider);

    const encounterResult = combatService.startEncounter(
      {
        id: asEncounterId(`encounter_${String(encounterCounter)}`),
        enemies: [{ entityId: firstEnemy.id }],
      },
      heroId,
    );

    if (encounterResult.ok) {
      bridge.setCombatState("combat");
    }

    // --- Combat tick function (started in useEffect to survive StrictMode) ----
    const TICK_INTERVAL = 500;
    const DT = 0.5;
    const tickState = { accumulator: 0 };
    let healthPotionCooldownRemaining = 0;

    const syncConsumables = (): void => {
      bridge.updateConsumables({
        healthPotionCooldown: HEALTH_POTION_COOLDOWN_SECONDS,
        healthPotionCooldownRemaining,
        healthPotionHealPercent: HEALTH_POTION_HEAL_RATIO * 100,
      });
    };
    syncConsumables();

    const tickFn = (): void => {
      tickCounter += 1;
      if (healthPotionCooldownRemaining > 0) {
        healthPotionCooldownRemaining = Math.max(
          0,
          healthPotionCooldownRemaining - DT,
        );
        syncConsumables();
      }
      gatheringRuntime.tick(tickCounter);
      refiningRuntime.tick(tickCounter);
      workerScheduler.tickAll();
      processCompletedWorkerCycles();
      if (gatheringCoordinator.getActiveSession() !== undefined) {
        syncGathering();
      }
      if (refiningManager.getActiveSession() !== undefined) {
        syncRefining();
      }
      if (oreGatheringCoordinator.getActiveSession() !== undefined) {
        syncOreGathering();
      }
      if (metalRefiningManager.getActiveSession() !== undefined) {
        syncMetalRefining();
      }
      if (hideGatheringCoordinator.getActiveSession() !== undefined) syncHideGathering();
      if (fiberGatheringCoordinator.getActiveSession() !== undefined) syncFiberGathering();
      if (leatherRefiningManager.getActiveSession() !== undefined) syncLeatherRefining();
      if (clothRefiningManager.getActiveSession() !== undefined) syncClothRefining();

      const heroIsGathering = gatheringRuntime.isHeroGathering();
      if (heroIsGathering) {
        bridge.setCombatState("idle");
        return;
      }

      syncProjectedSegmentRates();

      tickState.accumulator += TICK_INTERVAL;
      bridge.updateZoneElapsed(tickState.accumulator / 1000);

      const session = combatService.getActiveSession();
      if (session === undefined) {
        let enteredNewSegment = false;

        if (awaitingResumeAfterDefeat) {
          return;
        }

        if (completedEncounterResult === "defeat") {
          completedEncounterResult = null;
          awaitingResumeAfterDefeat = true;
          worldRuntime.advanceDefeat();
          updateWorldBridge();
          bridge.setCombatState("defeat");
          return;
        }

        if (completedEncounterResult === "victory") {
          const res = worldRuntime.advanceVictory();
          enteredNewSegment = res.enteredNewSegment;
        }
        completedEncounterResult = null;

        const enteringBoss =
          worldRuntime.currentEncounter === ENCOUNTERS_PER_SEGMENT - 1;

        encounterCounter += 1;
        const enemy = spawnEnemyForCurrentSegment();
        activeEnemyId = enemy.id;

        const newEnemyHealth = damageManager.getHealth(enemy.id);
        bridge.updateEnemyHealth(newEnemyHealth.currentHealth, newEnemyHealth.maxHealth);
        bridge.setEnemyPresentation(enemy.name, enemy.visualManifestId);
        updateWorldBridge();

        if (enteredNewSegment || enteringBoss) {
          restoreHeroHealth();
        }

        const result = combatService.startEncounter(
          {
            id: asEncounterId(`encounter_${String(encounterCounter)}`),
            enemies: [{ entityId: enemy.id }],
          },
          heroId,
        );
        if (result.ok) {
          bridge.setCombatState("combat");
        }
        return;
      }

      // Any damage source that bypasses CombatService (abilities, effects,
      // future consumables) must still finalize death before an enemy can act.
      finalizeActiveEnemyDeath();

      if (session.state === "victory" || session.state === "defeat") {
        completedEncounterResult = session.state;
        bridge.setCombatState(session.state);
        combatService.endEncounter();
        return;
      }

      abilityManager.tickAbilities(heroId, DT);
      abilityManager.restoreEnergy(heroId, 1.5);
      if (primaryAbilityAutoCast) {
        usePrimaryAbility();
      }
      syncAbilities();

      const tickResult = orchestrator.tick(DT);
      if (tickResult.ok) {
        bridge.setCombatState(tickResult.value.state);

        const orchState = orchestrator.getState();
        const allEffects: Array<{
          id: string;
          name: string;
          type: "buff" | "debuff" | "stun" | "root" | "slow" | "silence";
          remainingDuration: number;
        }> = [];
        for (const [, effects] of orchState.activeEffects) {
          for (const eff of effects) {
            allEffects.push({
              id: eff.id,
              name: eff.definition.id,
              type: eff.effectType,
              remainingDuration: eff.remainingDuration,
            });
          }
        }
        bridge.setActiveEffects(allEffects);
      }
    };

    // Store tick function, persistence, and disposal for useEffect
    (bridge as unknown as CleanupRef)._tickFn = tickFn;
    (bridge as unknown as CleanupRef)._tickInterval = TICK_INTERVAL;
    (bridge as unknown as CleanupRef)._persistence = persistence;
    (bridge as unknown as CleanupRef)._disposeServices = () => {
      orchestrator.dispose();
      progressionOrchestrator.dispose();
      worldCoordinator.dispose();
      gatheringCoordinator.dispose();
      oreGatheringCoordinator.dispose();
      hideGatheringCoordinator.dispose();
      fiberGatheringCoordinator.dispose();
    };

    const useConsumable = (itemId: string): boolean => {
      let availableRestore = 0;
      if (itemId === "item_health_potion") {
        if (healthPotionCooldownRemaining > 0) {
          bridge.addEconomyNotification({
            id: `notif_consumable_cooldown_${String(Date.now())}`,
            type: "error",
            message: `Potion indisponible : ${String(Math.ceil(healthPotionCooldownRemaining))} s`,
            timestamp: Date.now(),
          });
          return false;
        }
        const health = damageManager.getHealth(heroId);
        availableRestore = Math.min(
          Math.ceil(health.maxHealth * HEALTH_POTION_HEAL_RATIO),
          health.maxHealth - health.currentHealth,
        );
      } else if (itemId === "item_energy_potion") {
        const energy = abilityManager.getEnergy(heroId);
        availableRestore = Math.min(50, energy.maxEnergy - energy.currentEnergy);
      } else {
        return false;
      }

      if (availableRestore <= 0) {
        bridge.addEconomyNotification({
          id: `notif_consumable_full_${String(Date.now())}`,
          type: "error",
          message: "Impossible à utiliser : ressource déjà pleine",
          timestamp: Date.now(),
        });
        return false;
      }

      const removed = inventoryManager.removeQuantity(heroId, itemId, 1);
      if (!removed.ok) {
        return false;
      }

      const restored = itemId === "item_health_potion"
        ? damageManager.healDamage(heroId, availableRestore)
        : abilityManager.restoreEnergy(heroId, 50);
      const message = itemId === "item_health_potion"
        ? `Potion de soin : +${String(restored)} PV`
        : `Potion d'énergie : +${String(restored)} énergie`;

      if (itemId === "item_health_potion") {
        healthPotionCooldownRemaining = HEALTH_POTION_COOLDOWN_SECONDS;
        syncConsumables();
        const health = damageManager.getHealth(heroId);
        bridge.updatePlayerHealth(health.currentHealth, health.maxHealth);
      }
      syncInventoryToBridge(bridge, inventoryManager, heroId);
      bridge.addEconomyNotification({
        id: `notif_consumable_${String(Date.now())}`,
        type: "success",
        message,
        timestamp: Date.now(),
      });
      return true;
    };

    const repairAll = (): boolean => {
      const txId = asEconomyTransactionId(
        `tx_repair_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`,
      );
      const result = economyTransactionService.execute({
        type: "bulk_equipment_repair",
        transactionId: txId,
        playerId,
        playerEntityId: heroId,
        walletId,
        stationId: "station_general",
      });

      if (!result.ok) {
        bridge.addEconomyNotification({
          id: `notif_${txId}`,
          type: "error",
          message: result.code === "repair_nothing_to_repair"
            ? "Aucun équipement à réparer"
            : `Réparation impossible : ${result.code.replace("repair_", "")}`,
          timestamp: Date.now(),
        });
        return false;
      }

      const totalCost = result.effects.type === "bulk_equipment_repair"
        ? result.effects.outcome.totalCost
        : 0;
      bridge.addTransaction({
        id: txId,
        type: "repair",
        description: "Réparation complète de l’équipement",
        amount: totalCost,
        timestamp: Date.now(),
      });
      bridge.addEconomyNotification({
        id: `notif_${txId}`,
        type: "success",
        message: `Équipement réparé · ${String(totalCost)} Silver`,
        timestamp: Date.now(),
      });
      resyncAll();
      return true;
    };

    return {
      eventBus, bridge, orchestrator, heroId, bankId, inventoryManager, equipmentManager,
      enchantmentService,
      statsManager, currencyService, economyTransactionService, vendorRegistry,
      walletId, playerId, worldCoordinator, useConsumable, usePrimaryAbility,
      setPrimaryAbilityAutoCast, resumeExploration,
      selectSegment, setSegmentFarmMode, selectZone, returnToCombat,
      toggleGathering, performGatheringStrike,
      toggleOreGathering, toggleHideGathering, toggleFiberGathering,
      toggleRefining, toggleMetalRefining, toggleLeatherRefining, toggleClothRefining,
      refineAllAvailable,
      setProductionTier, craftEquipment, recruitWorker, toggleWorker, repairAll,
      saveGame, loadGame, hasSave,
    };
  }, []);

  const initialLoadAttemptedRef = useRef(false);

  // Start tick loop and setup auto-load / auto-save persistence listeners
  useEffect(() => {
    const b = services.bridge as unknown as CleanupRef;
    const lifecycle = new RuntimeLifecycle();
    const persistence = b._persistence!;
    lifecycle.start(b._tickFn!, b._tickInterval);

    // Auto-load existing save once on startup after runtime services and providers are ready
    if (!initialLoadAttemptedRef.current) {
      initialLoadAttemptedRef.current = true;
      try {
        if (services.hasSave()) {
          const success = services.loadGame();
          if (!success) {
            persistence.setLoadFailed(true);
            console.error("[Persistence] Auto-load failed: save slot existed but load returned false");
          }
        }
      } catch (err) {
        persistence.setLoadFailed(true);
        console.error("[Persistence] Failed during initial save check or load:", err);
      }
    }

    const stopAutosave = persistence.startAutosave(() => services.saveGame());

    return () => {
      lifecycle.stop();
      stopAutosave();
      const dispose = b._disposeServices as (() => void) | undefined;
      if (dispose !== undefined) {
        dispose();
      }
    };
  }, [services]);

  return (
    <GameServiceContext.Provider value={services}>{children}</GameServiceContext.Provider>
  );
}

/**
 * Hook to access game services from any React component.
 */
export function useGameServices(): GameServices {
  const ctx = useContext(GameServiceContext);
  if (ctx === null) {
    throw new Error("useGameServices must be used within a GameProvider");
  }
  return ctx;
}

/**
 * Hook to subscribe to GameBridge state updates.
 */
export function useGameBridge(): GameBridgeState {
  const { bridge } = useGameServices();
  return useSyncExternalStore(bridge.subscribe, bridge.getSnapshot);
}
