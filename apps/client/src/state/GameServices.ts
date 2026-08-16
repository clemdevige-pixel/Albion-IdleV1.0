import type { SupportedProductionFamily } from "../data/productionFamilyCatalog";
import type { ProductionTier } from "../data/productionFamilyCatalog";
import type { IslandBuildingId, IslandWorldRequirement } from "@game/data";
import type { EventBus, EntityId } from "@game/core";
import type {
  CombatOrchestrator,
  CurrencyService,
  DungeonDefinition,
  DungeonRunState,
  EconomyTransactionService,
  EnchantmentService,
  EquipmentManager,
  InventoryManager,
  PlayerId,
  StatsManager,
  VendorRegistry,
  WalletId,
  WorldCoordinator,
} from "@game/gameplay";
import type { GameBridge, WorkerProfessionVM } from "../game/GameBridge.js";

export type UIEventMap = Record<string, unknown>;

export interface DungeonNavigationVM {
  readonly definitions: readonly DungeonDefinition[];
  readonly activeRun: DungeonRunState | undefined;
  readonly pendingDefinitionId: string | null;
}

export interface GameServices {
  readonly eventBus: EventBus<UIEventMap>;
  readonly bridge: GameBridge;
  readonly orchestrator: CombatOrchestrator;
  readonly heroId: EntityId;
  readonly bankId: EntityId;
  readonly productionStorageId: EntityId;
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
  readonly needsStarterSelection: () => boolean;
  readonly selectStarterWeapon: (itemId: string) => boolean;
  readonly isWorldRequirementMet: (requirement: IslandWorldRequirement) => boolean;
  readonly useConsumable: (itemId: string) => boolean;
  readonly useWeaponAbility?: (slotIndex: number) => boolean;
  /** @deprecated Compatibility alias for slot 0 (Q). */
  readonly usePrimaryAbility: () => boolean;
  readonly setPrimaryAbilityAutoCast: (enabled: boolean) => void;
  readonly resumeExploration: () => boolean;
  readonly selectSegment: (segmentNumber: number) => boolean;
  readonly setSegmentFarmMode: (enabled: boolean) => void;
  readonly selectZone: (zoneNumber: number, segmentNumber?: number) => boolean;
  readonly startDungeon: (definitionId: string) => boolean;
  readonly abandonDungeon: () => boolean;
  readonly isDungeonActive: () => boolean;
  readonly getDungeonState: () => DungeonNavigationVM;
  readonly returnToCombat: () => boolean;
  readonly toggleGathering: (family: SupportedProductionFamily) => boolean;
  readonly performGatheringStrike: (
    resourceFamily: string,
    quality: "miss" | "correct" | "perfect",
  ) => boolean;
  readonly toggleRefining: (family: SupportedProductionFamily) => boolean;
  readonly setGatheringTier: (tier: ProductionTier) => boolean;
  readonly setRefiningTier: (family: SupportedProductionFamily, tier: ProductionTier) => boolean;
  readonly setCraftingTier: (tier: ProductionTier) => boolean;
  readonly craftEquipment: (outputItemId: string) => boolean;
  readonly recruitWorker: (profession: WorkerProfessionVM) => boolean;
  readonly toggleWorker: (profession: WorkerProfessionVM, tier: ProductionTier) => boolean;
  readonly constructIslandBuilding: (definitionId: IslandBuildingId, plotId: string) => boolean;
  readonly upgradeIslandBuilding: (definitionId: IslandBuildingId) => boolean;
  readonly getIslandLevel: () => number;
  readonly upgradeIslandLevel: () => boolean;
  readonly repairAll: () => boolean;
  readonly saveGame: () => void;
  readonly loadGame: () => boolean;
  readonly hasSave: () => boolean;
  readonly exportSave: () => string;
  readonly importSave: (raw: string) => boolean;
}
