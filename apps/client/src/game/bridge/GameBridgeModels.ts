import type { ProductionTier } from "../../data/productionFamilyCatalog";
import {
  getInitialIslandWorkerHouseLevelDefinition,
  type IslandBuildingId,
  type WorldBandId,
} from "@game/data";
import type { CombatState, EquipmentSlot, VendorRole, WorkerId, WorkerProfession } from "@game/gameplay";

export interface DamageNumberEvent {
  readonly id: number;
  readonly amount: number;
  readonly target: "player" | "enemy";
  readonly timestamp: number;
}

export interface ActiveEffectDisplay {
  readonly id: string;
  readonly name: string;
  readonly type: "buff" | "debuff" | "stun" | "root" | "slow" | "silence";
  readonly remainingDuration: number;
}

export type CombatAbilityDetailVM =
  | {
      readonly kind: "damage";
      readonly amount: number;
      readonly damageType: "physical" | "magical" | "true";
      readonly hits: number;
      readonly amountPerHit: number;
      readonly conditionalAmounts: readonly (
        | { readonly kind: "health_below"; readonly thresholdRatio: number; readonly amount: number }
        | { readonly kind: "effect_active"; readonly effectId: string; readonly amount: number }
      )[];
    }
  | {
      readonly kind: "bonus_damage";
      readonly amount: number;
      readonly damageType: "physical" | "magical" | "true";
    }
  | {
      readonly kind: "heal_from_damage";
      readonly ratio: number;
      readonly maxHealthRatio?: number;
    }
  | {
      readonly kind: "status";
      readonly target: "enemy" | "self";
      readonly effectType: "buff" | "debuff" | "stun" | "silence";
      readonly duration: number;
      readonly statId?: "stat_armor" | "stat_magic_resistance" | "stat_auto_attack_damage_taken_bonus" | "stat_attack_speed" | "stat_damage_taken_bonus";
      readonly statDelta?: number;
      readonly modifierType?: "flat" | "percent" | "multiplier";
    }
  | {
      readonly kind: "dot";
      readonly amountPerTick: number;
      readonly totalAmount: number;
      readonly interval: number;
      readonly ticks: number;
      readonly damageType: "physical" | "magical" | "true";
    }
  | {
      readonly kind: "auto_attack_bonus_window";
      readonly amountPerAttack: number;
      readonly duration: number;
      readonly damageType: "physical" | "magical" | "true";
    };

export interface CombatAbilityVM {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly shortcut: "Q" | "W" | "E";
  readonly cooldown: number;
  readonly cooldownRemaining: number;
  readonly isReady: boolean;
  readonly autoCast: boolean;
  readonly details: readonly CombatAbilityDetailVM[];
}

export interface CombatAbilitiesVM {
  readonly primary: CombatAbilityVM | null;
  readonly secondary: CombatAbilityVM | null;
  readonly ultimate: CombatAbilityVM | null;
}

export interface ConsumablesVM {
  readonly healthPotionCooldown: number;
  readonly healthPotionCooldownRemaining: number;
  readonly healthPotionHealPercent: number;
}

export interface InventorySlotVM {
  readonly position: number;
  readonly itemId: string | undefined;
  readonly instanceId: string | undefined;
  readonly quantity: number;
  readonly enchantment: 0 | 1 | 2 | 3 | 4;
}

export interface InventoryVM {
  readonly slots: readonly InventorySlotVM[];
  readonly capacity: number;
  readonly occupied: number;
}

export interface WeaponCombatPresentationVM {
  readonly kind: "projectile";
  readonly projectileId: string;
  readonly releaseDelayMs: number;
}

export interface EquipmentSlotVM {
  readonly slot: EquipmentSlot;
  readonly itemId: string | undefined;
  readonly instanceId: string | undefined;
  readonly enchantment: 0 | 1 | 2 | 3 | 4;
  readonly visualManifestId: string | undefined;
  readonly combatPresentationProfileId: string | undefined;
  readonly combatPresentation: WeaponCombatPresentationVM | undefined;
}

export interface EquipmentVM {
  readonly slots: readonly EquipmentSlotVM[];
}

export interface StatEntryVM {
  readonly id: string;
  readonly base: number;
  readonly computed: number;
}

export interface StatsVM {
  readonly stats: readonly StatEntryVM[];
}

export interface MasteryVM {
  readonly id: string;
  readonly displayName: string;
  readonly category: string;
  readonly isUnlocked: boolean;
  readonly level: number;
  readonly currentXp: number;
  readonly xpToNextLevel: number;
  readonly totalLifetimeXp: number;
  readonly maxLevel: number;
}

export interface ProgressionVM {
  readonly totalFame: number;
  readonly overflowPool: number;
  readonly masteries: readonly MasteryVM[];
}

export interface WalletVM {
  readonly silver: number;
  readonly incomeRate: number;
}

export interface VendorOfferVM {
  readonly itemId: string;
  readonly buyPrice: number | null;
  readonly sellPrice: number | null;
  readonly maxPerTransaction: number | null;
}

export interface VendorVM {
  readonly vendorId: string;
  readonly role: VendorRole;
  readonly offers: readonly VendorOfferVM[];
}

export interface RepairItemVM {
  readonly instanceId: string;
  readonly itemId: string;
  readonly currentDurability: number;
  readonly maxDurability: number;
  readonly repairCost: number;
}

export interface RepairVM {
  readonly items: readonly RepairItemVM[];
  readonly totalCost: number;
}

export type TransactionEntryType = "purchase" | "sale" | "repair" | "credit" | "debit";

export interface TransactionEntryVM {
  readonly id: string;
  readonly type: TransactionEntryType;
  readonly description: string;
  readonly amount: number;
  readonly timestamp: number;
}

export type EconomyNotificationType = "success" | "error";

export interface EconomyNotificationVM {
  readonly id: string;
  readonly type: EconomyNotificationType;
  readonly message: string;
  readonly timestamp: number;
}

export interface ZoneProgressVM {
  readonly zoneDefId: string;
  readonly zoneIndex: number;
  readonly worldBandId: WorldBandId;
  readonly zoneIndexWithinBand: number;
  readonly tier: number;
  readonly zoneName: string;
  readonly biomeName: string;
  readonly isUnlocked: boolean;
  readonly isActive: boolean;
  readonly segmentIndex: number;
  readonly unlockedSegmentCount: number;
  readonly completedSegments: readonly number[];
}

export interface WorldVM {
  readonly zoneIndex: number;
  readonly worldBandId: WorldBandId;
  readonly zoneIndexWithinBand: number;
  readonly zoneCount: number;
  readonly canGoPreviousZone: boolean;
  readonly canGoNextZone: boolean;
  readonly pendingZoneIndex: number | null;
  readonly zones: readonly ZoneProgressVM[];
  readonly zoneName: string;
  readonly zoneDefId: string;
  readonly biomeName: string;
  readonly biomeTheme: string;
  readonly environmentVisualManifestId: string;
  readonly segmentIndex: number;
  readonly segmentCount: number;
  readonly encounterIndex: number;
  readonly encounterCount: number;
  readonly unlockedSegmentCount: number;
  readonly completedSegments: readonly number[];
  readonly pendingSegmentIndex: number | null;
  readonly farmMode: boolean;
  readonly encounterType: "normal" | "elite" | "boss" | "resource";
  readonly zoneProgress: number;
  readonly isFirstVisit: boolean;
}

export interface GatheringVM {
  readonly status: "idle" | "gathering";
  readonly resourceName: string;
  readonly resourceFamily: string;
  readonly resourceTier: number;
  readonly visualManifestId: string;
  readonly masteryLevel: number;
  readonly requiredMasteryLevel: number;
  readonly isMasteryUnlocked: boolean;
  readonly progress: number;
  readonly durationSeconds: number;
  readonly storedQuantity: number;
  readonly activeCycle?: {
    readonly resourceName: string;
    readonly resourceTier: number;
    readonly progress: number;
    readonly durationSeconds: number;
    readonly cycleId: string;
    readonly strikesUsed: number;
  } | undefined;
  readonly activeMiniGame?: {
    readonly cycleId: string;
    readonly strikesUsed: number;
    readonly activity: number;
    readonly averageActivity: number;
    readonly yieldMultiplier: 1 | 1.5 | 2 | 3;
    readonly speedBonusRatio: 0 | 0.1 | 0.2 | 0.3;
    readonly nextActivityThreshold: number | null;
    readonly activityProgressToNext: number;
  } | undefined;
}

export interface RefiningRequirementVM {
  readonly itemId: string;
  readonly quantity: number;
  readonly available: number;
  readonly reserved: number;
}

export interface RefiningVM {
  readonly status: "idle" | "refining";
  readonly recipeName: string;
  readonly progress: number;
  readonly durationSeconds: number;
  readonly inputQuantity: number;
  readonly outputQuantity: number;
  readonly rawStoredQuantity: number;
  readonly refinedStoredQuantity: number;
  readonly reservedInputQuantity: number;
  readonly requirements: readonly RefiningRequirementVM[];
}

export interface CraftingRequirementVM {
  readonly itemId: string;
  readonly quantity: number;
  readonly available: number;
}

export interface CraftingRecipeVM {
  readonly family: string;
  readonly recipeName: string;
  readonly outputItemId: string;
  readonly tier: number;
  readonly itemPower: number;
  readonly plankRequired: number;
  readonly barRequired: number;
  readonly plankAvailable: number;
  readonly barAvailable: number;
  readonly plankItemId: string;
  readonly barItemId: string;
  readonly requirements: readonly CraftingRequirementVM[];
  readonly craftedQuantity: number;
  readonly canCraft: boolean;
  readonly blockedReason?: "missing_materials" | "missing_predecessor" | "inventory_full";
}

export interface CraftingVM {
  readonly productionTier: ProductionTier;
  readonly plankQuantity: number;
  readonly barQuantity: number;
  readonly leatherQuantity: number;
  readonly clothQuantity: number;
  readonly recipes: readonly CraftingRecipeVM[];
}

export type WorkerProfessionVM = WorkerProfession;

export interface WorkerVM {
  readonly id: WorkerId;
  readonly displayName: string;
  readonly profession: WorkerProfessionVM;
  readonly professionName: string;
  readonly productionTier: ProductionTier;
  readonly resourceName: string;
  readonly state: "idle" | "working" | "paused";
  readonly mastery: number;
  readonly masteryXp: number;
  readonly masteryXpToNext: number;
  readonly progress: number;
  readonly durationSeconds: number;
  readonly yieldPerCycle: number;
}

export interface WorkersVM {
  readonly capacity: number;
  readonly professionCapacity: number;
  readonly recruitmentCost: number;
  readonly workers: readonly WorkerVM[];
}

export interface IslandPlotVM { readonly id: string; readonly buildingInstanceId: string | null; }
export interface IslandBuildingVM { readonly instanceId: string; readonly definitionId: IslandBuildingId; readonly plotId: string; readonly level: number; }
export interface IslandVM { readonly plots: readonly IslandPlotVM[]; readonly buildings: readonly IslandBuildingVM[]; }

export interface GameBridgeState {
  readonly playerHealth: number;
  readonly playerMaxHealth: number;
  readonly enemyHealth: number;
  readonly enemyMaxHealth: number;
  readonly combatState: CombatState;
  readonly enemyName: string;
  readonly enemyVisualManifestId: string;
  readonly enemiesKilled: number;
  readonly zoneElapsed: number;
  readonly segmentSilverPerHour: number;
  readonly segmentFamePerHour: number;
  readonly damageNumbers: readonly DamageNumberEvent[];
  readonly activeEffects: readonly ActiveEffectDisplay[];
  readonly abilities: CombatAbilitiesVM;
  readonly consumables: ConsumablesVM;
  readonly inventory: InventoryVM;
  readonly bank: InventoryVM;
  readonly equipment: EquipmentVM;
  readonly stats: StatsVM;
  readonly progression: ProgressionVM;
  readonly wallet: WalletVM;
  readonly vendor: VendorVM;
  readonly repair: RepairVM;
  readonly transactionHistory: readonly TransactionEntryVM[];
  readonly economyNotifications: readonly EconomyNotificationVM[];
  readonly world: WorldVM;
  readonly queuedGatheringFamily: string | null;
  readonly gathering: GatheringVM;
  readonly oreGathering: GatheringVM;
  readonly hideGathering: GatheringVM;
  readonly fiberGathering: GatheringVM;
  readonly refining: RefiningVM;
  readonly metalRefining: RefiningVM;
  readonly leatherRefining: RefiningVM;
  readonly clothRefining: RefiningVM;
  readonly crafting: CraftingVM;
  readonly workers: WorkersVM;
  readonly island: IslandVM;
}

export const TECHNICAL_ENEMY_RENDER_FALLBACK_MANIFEST_ID = "monster_undead_warrior";

const EMPTY_INVENTORY: InventoryVM = { slots: [], capacity: 0, occupied: 0 };
const EMPTY_GATHERING: GatheringVM = {
  status: "idle",
  resourceName: "Bois de bouleau",
  resourceFamily: "Wood",
  resourceTier: 1,
  visualManifestId: "resource_wood",
  masteryLevel: 0,
  requiredMasteryLevel: 0,
  isMasteryUnlocked: true,
  progress: 0,
  durationSeconds: 2,
  storedQuantity: 0,
};
const EMPTY_REFINING: RefiningVM = {
  status: "idle",
  recipeName: "Planches de bouleau",
  progress: 0,
  durationSeconds: 3,
  inputQuantity: 4,
  outputQuantity: 1,
  rawStoredQuantity: 0,
  refinedStoredQuantity: 0,
  reservedInputQuantity: 0,
  requirements: [],
};
const INITIAL_WORKER_HOUSE = getInitialIslandWorkerHouseLevelDefinition();

export function createInitialGameBridgeState(): GameBridgeState {
  return {
    playerHealth: 100,
    playerMaxHealth: 100,
    enemyHealth: 0,
    enemyMaxHealth: 0,
    combatState: "idle",
    enemyName: "",
    enemyVisualManifestId: TECHNICAL_ENEMY_RENDER_FALLBACK_MANIFEST_ID,
    enemiesKilled: 0,
    zoneElapsed: 0,
    segmentSilverPerHour: 0,
    segmentFamePerHour: 0,
    damageNumbers: [],
    activeEffects: [],
    abilities: { primary: null, secondary: null, ultimate: null },
    consumables: { healthPotionCooldown: 20, healthPotionCooldownRemaining: 0, healthPotionHealPercent: 30 },
    inventory: EMPTY_INVENTORY,
    bank: EMPTY_INVENTORY,
    equipment: { slots: [] },
    stats: { stats: [] },
    progression: { totalFame: 0, overflowPool: 0, masteries: [] },
    wallet: { silver: 0, incomeRate: 0 },
    vendor: { vendorId: "", role: "buy_and_sell", offers: [] },
    repair: { items: [], totalCost: 0 },
    transactionHistory: [],
    economyNotifications: [],
    world: {
      zoneIndex: 1,
      worldBandId: "blue",
      zoneIndexWithinBand: 0,
      zoneCount: 1,
      canGoPreviousZone: false,
      canGoNextZone: false,
      pendingZoneIndex: null,
      zones: [],
      zoneName: "",
      zoneDefId: "",
      biomeName: "",
      biomeTheme: "",
      environmentVisualManifestId: "birch_forest",
      segmentIndex: 0,
      segmentCount: 10,
      encounterIndex: 0,
      encounterCount: 5,
      unlockedSegmentCount: 1,
      completedSegments: [],
      pendingSegmentIndex: null,
      farmMode: false,
      encounterType: "normal",
      zoneProgress: 0,
      isFirstVisit: false,
    },
    queuedGatheringFamily: null,
    gathering: EMPTY_GATHERING,
    oreGathering: { ...EMPTY_GATHERING, resourceName: "Minerai de cuivre", resourceFamily: "Ore", resourceTier: 3, visualManifestId: "resource_ore" },
    hideGathering: { ...EMPTY_GATHERING, resourceName: "Peau robuste", resourceFamily: "Hide", resourceTier: 3, visualManifestId: "resource_hide" },
    fiberGathering: { ...EMPTY_GATHERING, resourceName: "Fibre de lin", resourceFamily: "Fiber", resourceTier: 3, visualManifestId: "resource_fiber" },
    refining: EMPTY_REFINING,
    metalRefining: { ...EMPTY_REFINING, recipeName: "Lingots de cuivre" },
    leatherRefining: { ...EMPTY_REFINING, recipeName: "Cuir robuste" },
    clothRefining: { ...EMPTY_REFINING, recipeName: "Tissu de lin" },
    crafting: { productionTier: 3, plankQuantity: 0, barQuantity: 0, leatherQuantity: 0, clothQuantity: 0, recipes: [] },
    workers: {
      capacity: INITIAL_WORKER_HOUSE.workerCapacity,
      professionCapacity: 1,
      recruitmentCost: INITIAL_WORKER_HOUSE.recruitmentCost,
      workers: [],
    },
    island: { plots: [], buildings: [] },
  };
}
