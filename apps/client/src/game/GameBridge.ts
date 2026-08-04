import type { CombatState, EquipmentSlot, VendorRole } from "@game/gameplay";

// ---------------------------------------------------------------------------
// Damage number event
// ---------------------------------------------------------------------------

export interface DamageNumberEvent {
  readonly id: number;
  readonly amount: number;
  readonly target: "player" | "enemy";
  readonly timestamp: number;
}

// ---------------------------------------------------------------------------
// Active effect display data
// ---------------------------------------------------------------------------

export interface ActiveEffectDisplay {
  readonly id: string;
  readonly name: string;
  readonly type: "buff" | "debuff" | "stun" | "root" | "slow" | "silence";
  readonly remainingDuration: number;
}

export interface CombatAbilityVM {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly shortcut: "Q";
  readonly cooldown: number;
  readonly cooldownRemaining: number;
  readonly energyCost: number;
  readonly isReady: boolean;
  readonly autoCast: boolean;
}

export interface CombatAbilitiesVM {
  readonly primary: CombatAbilityVM | null;
  readonly currentEnergy: number;
  readonly maxEnergy: number;
}

export interface ConsumablesVM {
  readonly healthPotionCooldown: number;
  readonly healthPotionCooldownRemaining: number;
  readonly healthPotionHealPercent: number;
}

// ---------------------------------------------------------------------------
// Inventory view model
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Equipment view model
// ---------------------------------------------------------------------------

export interface EquipmentSlotVM {
  readonly slot: EquipmentSlot;
  readonly itemId: string | undefined;
  readonly instanceId: string | undefined;
  readonly enchantment: 0 | 1 | 2 | 3 | 4;
  readonly visualManifestId: string | undefined;
  readonly combatPresentationProfileId: string | undefined;
}

export interface EquipmentVM {
  readonly slots: readonly EquipmentSlotVM[];
}

// ---------------------------------------------------------------------------
// Stats view model
// ---------------------------------------------------------------------------

export interface StatEntryVM {
  readonly id: string;
  readonly base: number;
  readonly computed: number;
}

export interface StatsVM {
  readonly stats: readonly StatEntryVM[];
}

// ---------------------------------------------------------------------------
// Progression view model
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Wallet view model
// ---------------------------------------------------------------------------

export interface WalletVM {
  readonly silver: number;
  readonly incomeRate: number;
}

// ---------------------------------------------------------------------------
// Vendor view model
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Repair view model
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Transaction history view model
// ---------------------------------------------------------------------------

export type TransactionEntryType =
  | "purchase"
  | "sale"
  | "repair"
  | "credit"
  | "debit";

export interface TransactionEntryVM {
  readonly id: string;
  readonly type: TransactionEntryType;
  readonly description: string;
  readonly amount: number;
  readonly timestamp: number;
}

// ---------------------------------------------------------------------------
// Economy notification view model
// ---------------------------------------------------------------------------

export type EconomyNotificationType = "success" | "error";

export interface EconomyNotificationVM {
  readonly id: string;
  readonly type: EconomyNotificationType;
  readonly message: string;
  readonly timestamp: number;
}

// ---------------------------------------------------------------------------
// World view model
// ---------------------------------------------------------------------------

export interface ZoneProgressVM {
  readonly zoneIndex: number;
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
  readonly encounterType: "normal" | "boss" | "resource";
  readonly zoneProgress: number; // 0-100
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
  readonly activeMiniGame?: {
    readonly cycleId: string;
    readonly strikesUsed: number;
  } | undefined;
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

export interface RefiningRequirementVM {
  readonly itemId: string;
  readonly quantity: number;
  readonly available: number;
  readonly reserved: number;
}

export interface CraftingRecipeVM {
  readonly family: "offhand" | "bow" | "sword" | "fire_staff" | "armor";
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
}

export interface CraftingRequirementVM {
  readonly itemId: string;
  readonly quantity: number;
  readonly available: number;
}

export interface CraftingVM {
  readonly productionTier: 3 | 4;
  readonly plankQuantity: number;
  readonly barQuantity: number;
  readonly leatherQuantity: number;
  readonly clothQuantity: number;
  readonly recipes: readonly CraftingRecipeVM[];
}

export type WorkerProfessionVM = "woodcutter" | "miner" | "skinner" | "fiber_harvester";

export interface WorkerVM {
  readonly id: string;
  readonly displayName: string;
  readonly profession: WorkerProfessionVM;
  readonly professionName: string;
  readonly productionTier: 3 | 4;
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
  readonly recruitmentCost: number;
  readonly workers: readonly WorkerVM[];
}

// ---------------------------------------------------------------------------
// Bridge state snapshot
// ---------------------------------------------------------------------------

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
}

// ---------------------------------------------------------------------------
// Listener type
// ---------------------------------------------------------------------------

type BridgeListener = () => void;

// ---------------------------------------------------------------------------
// GameBridge — shared mutable state for React ↔ Phaser communication
// ---------------------------------------------------------------------------

const EMPTY_INVENTORY: InventoryVM = { slots: [], capacity: 0, occupied: 0 };
const EMPTY_EQUIPMENT: EquipmentVM = { slots: [] };
const EMPTY_STATS: StatsVM = { stats: [] };
const EMPTY_PROGRESSION: ProgressionVM = {
  totalFame: 0,
  overflowPool: 0,
  masteries: [],
};
const EMPTY_WALLET: WalletVM = { silver: 0, incomeRate: 0 };
const EMPTY_VENDOR_ROLE: VendorRole = "buy_and_sell";
const EMPTY_VENDOR: VendorVM = { vendorId: "", role: EMPTY_VENDOR_ROLE, offers: [] };
const EMPTY_REPAIR: RepairVM = { items: [], totalCost: 0 };
const EMPTY_WORLD: WorldVM = {
  zoneIndex: 1,
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
};
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
const EMPTY_ORE_GATHERING: GatheringVM = {
  status: "idle",
  resourceName: "Minerai de cuivre",
  resourceFamily: "Ore",
  resourceTier: 3,
  visualManifestId: "resource_ore",
  masteryLevel: 0,
  requiredMasteryLevel: 0,
  isMasteryUnlocked: true,
  progress: 0,
  durationSeconds: 2,
  storedQuantity: 0,
};
const EMPTY_METAL_REFINING: RefiningVM = {
  status: "idle",
  recipeName: "Lingots de cuivre",
  progress: 0,
  durationSeconds: 3,
  inputQuantity: 4,
  outputQuantity: 1,
  rawStoredQuantity: 0,
  refinedStoredQuantity: 0,
  reservedInputQuantity: 0,
  requirements: [],
};
const EMPTY_CRAFTING: CraftingVM = {
  productionTier: 3,
  plankQuantity: 0,
  barQuantity: 0,
  leatherQuantity: 0,
  clothQuantity: 0,
  recipes: [],
};
const EMPTY_WORKERS: WorkersVM = {
  capacity: 4,
  recruitmentCost: 250,
  workers: [],
};
const EMPTY_ABILITIES: CombatAbilitiesVM = {
  primary: null,
  currentEnergy: 0,
  maxEnergy: 0,
};
const EMPTY_CONSUMABLES: ConsumablesVM = {
  healthPotionCooldown: 20,
  healthPotionCooldownRemaining: 0,
  healthPotionHealPercent: 30,
};

export class GameBridge {
  // ---- Mutable state -------------------------------------------------------

  playerHealth = 100;
  playerMaxHealth = 100;
  enemyHealth = 100;
  enemyMaxHealth = 100;
  combatState: CombatState = "idle";
  enemyName = "Forest Wolf";
  enemyVisualManifestId = "monster_undead_warrior";
  enemiesKilled = 0;
  zoneElapsed = 0;
  segmentSilverPerHour = 0;
  segmentFamePerHour = 0;
  damageNumbers: DamageNumberEvent[] = [];
  #nextDamageNumberId = 1;
  activeEffects: ActiveEffectDisplay[] = [];
  abilities: CombatAbilitiesVM = EMPTY_ABILITIES;
  consumables: ConsumablesVM = EMPTY_CONSUMABLES;
  inventory: InventoryVM = EMPTY_INVENTORY;
  bank: InventoryVM = EMPTY_INVENTORY;
  equipment: EquipmentVM = EMPTY_EQUIPMENT;
  stats: StatsVM = EMPTY_STATS;
  progression: ProgressionVM = EMPTY_PROGRESSION;
  wallet: WalletVM = EMPTY_WALLET;
  vendor: VendorVM = EMPTY_VENDOR;
  repair: RepairVM = EMPTY_REPAIR;
  transactionHistory: TransactionEntryVM[] = [];
  economyNotifications: EconomyNotificationVM[] = [];
  world: WorldVM = EMPTY_WORLD;
  gathering: GatheringVM = EMPTY_GATHERING;
  oreGathering: GatheringVM = EMPTY_ORE_GATHERING;
  hideGathering: GatheringVM = { ...EMPTY_GATHERING, resourceName: "Peau robuste", resourceFamily: "Hide", resourceTier: 3, visualManifestId: "resource_hide" };
  fiberGathering: GatheringVM = { ...EMPTY_GATHERING, resourceName: "Fibre de lin", resourceFamily: "Fiber", resourceTier: 3, visualManifestId: "resource_fiber" };
  refining: RefiningVM = EMPTY_REFINING;
  metalRefining: RefiningVM = EMPTY_METAL_REFINING;
  leatherRefining: RefiningVM = { ...EMPTY_REFINING, recipeName: "Cuir robuste" };
  clothRefining: RefiningVM = { ...EMPTY_REFINING, recipeName: "Tissu de lin" };
  crafting: CraftingVM = EMPTY_CRAFTING;
  workers: WorkersVM = EMPTY_WORKERS;

  // ---- Cached snapshot (must return same ref until state changes) ----------

  #cachedSnapshot: GameBridgeState | null = null;
  #notifyScheduled = false;

  // ---- Observer pattern ----------------------------------------------------

  readonly #listeners = new Set<BridgeListener>();

  readonly subscribe = (listener: BridgeListener): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  #notify(): void {
    this.#cachedSnapshot = null;
    if (!this.#notifyScheduled) {
      this.#notifyScheduled = true;
      queueMicrotask(() => {
        this.#notifyScheduled = false;
        for (const listener of this.#listeners) {
          listener();
        }
      });
    }
  }

  // ---- Mutation helpers (called by GameContext) ----------------------------

  updatePlayerHealth(current: number, max: number): void {
    this.playerHealth = current;
    this.playerMaxHealth = max;
    this.#notify();
  }

  updateEnemyHealth(current: number, max: number): void {
    this.enemyHealth = current;
    this.enemyMaxHealth = max;
    this.#notify();
  }

  setCombatState(state: CombatState): void {
    this.combatState = state;
    this.#notify();
  }

  addDamageNumber(amount: number, target: "player" | "enemy"): void {
    this.damageNumbers.push({
      id: this.#nextDamageNumberId,
      amount,
      target,
      timestamp: Date.now(),
    });
    this.#nextDamageNumberId += 1;
    // Keep at most 20 entries
    if (this.damageNumbers.length > 20) {
      this.damageNumbers.splice(0, this.damageNumbers.length - 20);
    }
    this.#notify();
  }

  setEnemyPresentation(name: string, visualManifestId: string): void {
    this.enemyName = name;
    this.enemyVisualManifestId = visualManifestId;
    this.#notify();
  }

  incrementEnemiesKilled(): void {
    this.enemiesKilled += 1;
    this.#notify();
  }

  updateZoneElapsed(elapsed: number): void {
    this.zoneElapsed = elapsed;
    this.#notify();
  }

  updateSegmentRates(silverPerHour: number, famePerHour: number): void {
    this.segmentSilverPerHour = silverPerHour;
    this.segmentFamePerHour = famePerHour;
    this.#notify();
  }

  setActiveEffects(effects: readonly ActiveEffectDisplay[]): void {
    this.activeEffects = [...effects];
    this.#notify();
  }

  updateAbilities(vm: CombatAbilitiesVM): void {
    this.abilities = vm;
    this.#notify();
  }

  updateInventory(vm: InventoryVM): void {
    this.inventory = vm;
    this.#notify();
  }

  updateBank(vm: InventoryVM): void {
    this.bank = vm;
    this.#notify();
  }

  updateEquipment(vm: EquipmentVM): void {
    this.equipment = vm;
    this.#notify();
  }

  updateStats(vm: StatsVM): void {
    this.stats = vm;
    this.#notify();
  }

  updateProgression(vm: ProgressionVM): void {
    this.progression = vm;
    this.#notify();
  }

  updateWallet(vm: WalletVM): void {
    this.wallet = vm;
    this.#notify();
  }

  updateVendor(vm: VendorVM): void {
    this.vendor = vm;
    this.#notify();
  }

  updateRepair(vm: RepairVM): void {
    this.repair = vm;
    this.#notify();
  }

  addTransaction(entry: TransactionEntryVM): void {
    this.transactionHistory = [entry, ...this.transactionHistory].slice(0, 50);
    this.#notify();
  }

  addEconomyNotification(notification: EconomyNotificationVM): void {
    this.economyNotifications = [notification, ...this.economyNotifications].slice(0, 10);
    this.#notify();
  }

  dismissEconomyNotification(id: string): void {
    this.economyNotifications = this.economyNotifications.filter((n) => n.id !== id);
    this.#notify();
  }

  updateWorld(vm: WorldVM): void {
    this.world = vm;
    this.#notify();
  }

  updateGathering(vm: GatheringVM): void {
    this.gathering = vm;
    this.#notify();
  }

  updateRefining(vm: RefiningVM): void {
    this.refining = vm;
    this.#notify();
  }

  updateOreGathering(vm: GatheringVM): void {
    this.oreGathering = vm;
    this.#notify();
  }

  updateHideGathering(vm: GatheringVM): void {
    this.hideGathering = vm;
    this.#notify();
  }

  updateFiberGathering(vm: GatheringVM): void {
    this.fiberGathering = vm;
    this.#notify();
  }

  updateMetalRefining(vm: RefiningVM): void {
    this.metalRefining = vm;
    this.#notify();
  }

  updateLeatherRefining(vm: RefiningVM): void {
    this.leatherRefining = vm;
    this.#notify();
  }

  updateClothRefining(vm: RefiningVM): void {
    this.clothRefining = vm;
    this.#notify();
  }

  updateCrafting(vm: CraftingVM): void {
    this.crafting = vm;
    this.#notify();
  }

  updateWorkers(vm: WorkersVM): void {
    this.workers = vm;
    this.#notify();
  }

  updateConsumables(vm: ConsumablesVM): void {
    this.consumables = vm;
    this.#notify();
  }

  // ---- Snapshot (for React useSyncExternalStore) ---------------------------

  readonly getSnapshot = (): GameBridgeState => {
    if (this.#cachedSnapshot !== null) {
      return this.#cachedSnapshot;
    }
    this.#cachedSnapshot = {
      playerHealth: this.playerHealth,
      playerMaxHealth: this.playerMaxHealth,
      enemyHealth: this.enemyHealth,
      enemyMaxHealth: this.enemyMaxHealth,
      combatState: this.combatState,
      enemyName: this.enemyName,
      enemyVisualManifestId: this.enemyVisualManifestId,
      enemiesKilled: this.enemiesKilled,
      zoneElapsed: this.zoneElapsed,
      segmentSilverPerHour: this.segmentSilverPerHour,
      segmentFamePerHour: this.segmentFamePerHour,
      damageNumbers: [...this.damageNumbers],
      activeEffects: [...this.activeEffects],
      abilities: this.abilities,
      consumables: this.consumables,
      inventory: this.inventory,
      bank: this.bank,
      equipment: this.equipment,
      stats: this.stats,
      progression: this.progression,
      wallet: this.wallet,
      vendor: this.vendor,
      repair: this.repair,
      transactionHistory: [...this.transactionHistory],
      economyNotifications: [...this.economyNotifications],
      world: this.world,
      gathering: this.gathering,
      oreGathering: this.oreGathering,
      hideGathering: this.hideGathering,
      fiberGathering: this.fiberGathering,
      refining: this.refining,
      metalRefining: this.metalRefining,
      leatherRefining: this.leatherRefining,
      clothRefining: this.clothRefining,
      crafting: this.crafting,
      workers: this.workers,
    };
    return this.#cachedSnapshot;
  };
}
