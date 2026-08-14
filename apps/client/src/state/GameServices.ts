import type { SupportedProductionFamily } from "../data/productionFamilyCatalog";
import type { ProductionTier } from "../data/productionFamilyCatalog";
import type { IslandBuildingId } from "@game/data";
import type { EventBus, EntityId } from "@game/core";
import type {
  CombatOrchestrator,
  CurrencyService,
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

/** Events owned by the client application layer. */
export type UIEventMap = Record<string, unknown>;

/**
 * Public application contract exposed to React consumers.
 *
 * The implementation remains assembled by GameProvider. Keeping this contract
 * separate prevents UI modules from depending on the composition root itself.
 */
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
  readonly useConsumable: (itemId: string) => boolean;
  readonly useWeaponAbility?: (slotIndex: number) => boolean;
  /** @deprecated Compatibility alias for slot 0 (Q). */
  readonly usePrimaryAbility: () => boolean;
  readonly setPrimaryAbilityAutoCast: (enabled: boolean) => void;
  readonly resumeExploration: () => boolean;
  readonly selectSegment: (segmentNumber: number) => boolean;
  readonly setSegmentFarmMode: (enabled: boolean) => void;
  readonly selectZone: (zoneNumber: number, segmentNumber?: number) => boolean;
  readonly returnToCombat: () => boolean;
  readonly toggleGathering: (family: SupportedProductionFamily) => boolean;
  readonly performGatheringStrike: (
    resourceFamily: string,
    quality: "miss" | "correct" | "perfect",
  ) => boolean;
  readonly toggleRefining: (family: SupportedProductionFamily) => boolean;
  readonly refineAllAvailable: () => boolean;
  readonly setProductionTier: (tier: ProductionTier) => boolean;
  readonly craftEquipment: (outputItemId: string) => boolean;
  readonly recruitWorker: (profession: WorkerProfessionVM) => boolean;
  readonly toggleWorker: (profession: WorkerProfessionVM) => boolean;
  readonly constructIslandBuilding: (definitionId: IslandBuildingId, plotId: string) => boolean;
  readonly repairAll: () => boolean;
  readonly saveGame: () => void;
  readonly loadGame: () => boolean;
  readonly hasSave: () => boolean;
  readonly exportSave: () => string;
  readonly importSave: (raw: string) => boolean;
}
