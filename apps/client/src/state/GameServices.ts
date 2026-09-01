import type { SupportedProductionFamily } from "../data/productionFamilyCatalog";
import type { ProductionTier } from "../data/productionFamilyCatalog";
import type { IslandBuildingId, IslandWorldRequirement } from "@game/data";
import type { EventBus, EntityId } from "@game/core";
import type {
  AwakenedTraitId,
  AwakenedWeaponService,
  CombatOrchestrator,
  CurrencyService,
  DungeonRunState,
  EconomyTransactionService,
  EnchantmentService,
  EquipmentManager,
  ExpeditionDurationMs,
  PlayerId,
  RelicProgressView,
  StartExpeditionResult,
  StatsManager,
  TowerProgressionSnapshot,
  VendorRegistry,
  WalletId,
  WorkerId,
  WorldCoordinator,
} from "@game/gameplay";
import type { GameBridge, WorkerProfessionVM } from "../game/GameBridge.js";
import type {
  AcademyPresentationModel,
  AcademyResearchActionResult,
} from "../runtime/bootstrap/createAcademyPresentationFoundation.js";
import type {
  BankExpansionModel,
  BankExpansionPurchaseResult,
} from "../runtime/bootstrap/createBankExpansionFoundation.js";
import type { ExpeditionRecapModel } from "../runtime/bootstrap/createExpeditionRecapFoundation.js";
import type { ResearchRecapModel } from "../runtime/bootstrap/createResearchRecapFoundation.js";
import type { FactionAchievementProgress } from "../runtime/bootstrap/createFactionAchievementFoundation.js";
import type { BestiaryKnowledgeModel } from "../runtime/bootstrap/createFactionBestiaryFoundation.js";
import type { PlayerInventoryManager } from "../runtime/PlayerInventoryManager.js";
import type { DungeonAccessState } from "./DungeonNavigationActions.js";
import type { TowerAccessState } from "./TowerNavigationActions.js";
import type { RefiningToggleTarget } from "./production/ProductionActions.js";

export type UIEventMap = Record<string, unknown>;

export interface DungeonNavigationVM {
  readonly activeRun: DungeonRunState | undefined;
  readonly pendingDefinitionId: string | null;
  readonly clearedTiers: readonly number[];
  readonly getAccess: (definitionId: string) => DungeonAccessState;
}

export interface TowerNavigationVM {
  readonly active: boolean;
  readonly intermission: boolean;
  readonly engaged: boolean;
  readonly pendingStart: boolean;
  readonly progression: TowerProgressionSnapshot;
  readonly unlockedCheckpointFloors: readonly number[];
  readonly access: TowerAccessState;
}

export interface GameServices {
  readonly eventBus: EventBus<UIEventMap>;
  readonly bridge: GameBridge;
  readonly orchestrator: CombatOrchestrator;
  readonly heroId: EntityId;
  readonly bankId: EntityId;
  readonly productionStorageId: EntityId;
  readonly inventoryManager: PlayerInventoryManager;
  readonly equipmentManager: EquipmentManager;
  readonly enchantmentService: EnchantmentService;
  readonly awakenedWeaponService: AwakenedWeaponService;
  readonly statsManager: StatsManager;
  readonly currencyService: CurrencyService;
  readonly economyTransactionService: EconomyTransactionService;
  readonly vendorRegistry: VendorRegistry;
  readonly walletId: WalletId;
  readonly playerId: PlayerId;
  readonly worldCoordinator: WorldCoordinator;
  readonly improveAwakenedTrait: (traitIndex: number) => boolean;
  readonly beginAwakenedTraitOffer: (targetIndex: number) => boolean;
  readonly resolveAwakenedTraitOffer: (traitId?: AwakenedTraitId) => boolean;
  readonly resetAwakenedWeapon: () => boolean;
  readonly needsStarterSelection: () => boolean;
  readonly selectStarterWeapon: (itemId: string) => boolean;
  readonly isWorldRequirementMet: (requirement: IslandWorldRequirement) => boolean;
  readonly getAcademyModel: () => AcademyPresentationModel;
  readonly startAcademyResearch: (researchId: string) => AcademyResearchActionResult;
  readonly startAcademyExpedition: (
    expeditionId: string,
    durationMs: ExpeditionDurationMs,
  ) => StartExpeditionResult;
  readonly getBankExpansionModel: () => BankExpansionModel;
  readonly purchaseNextBankTab: () => BankExpansionPurchaseResult;
  readonly subscribeResearchRecap: (listener: () => void) => () => void;
  readonly getResearchRecap: () => ResearchRecapModel | null;
  readonly dismissResearchRecap: () => void;
  readonly subscribeExpeditionRecap: (listener: () => void) => () => void;
  readonly getExpeditionRecap: () => ExpeditionRecapModel | null;
  readonly dismissExpeditionRecap: () => void;
  readonly getFactionAchievements: () => readonly FactionAchievementProgress[];
  readonly getBestiaryKnowledge: (
    monsterId: string,
    contextIds?: readonly string[],
  ) => BestiaryKnowledgeModel;
  readonly getRelicProgress: (relicId: string) => RelicProgressView | undefined;
  readonly isDungeonSystemUnlocked: () => boolean;
  readonly isTowerSystemUnlocked: () => boolean;
  readonly selectTowerCheckpoint: (floor: number) => boolean;
  readonly startTower: () => boolean;
  readonly abandonTower: () => boolean;
  readonly isTowerActive: () => boolean;
  readonly getTowerState: () => TowerNavigationVM;
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
  readonly toggleRefining: (target: RefiningToggleTarget) => boolean;
  readonly isInstantRefiningUnlocked: () => boolean;
  readonly setGatheringTier: (tier: ProductionTier) => boolean;
  readonly setRefiningTier: (family: SupportedProductionFamily, tier: ProductionTier) => boolean;
  readonly setCraftingTier: (tier: ProductionTier) => boolean;
  readonly craftEquipment: (outputItemId: string) => boolean;
  readonly recruitWorker: (profession: WorkerProfessionVM) => boolean;
  readonly toggleWorker: (workerId: WorkerId, tier: ProductionTier) => boolean;
  readonly constructIslandBuilding: (definitionId: IslandBuildingId, plotId: string) => boolean;
  readonly moveIslandBuilding: (buildingInstanceId: string, targetPlotId: string) => boolean;
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
