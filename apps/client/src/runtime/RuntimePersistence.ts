import {
  DestinyBoardSaveProvider,
  DurabilitySaveProvider,
  DurabilityStore,
  EquipmentManager,
  EquipmentSaveProvider,
  ExperienceSaveProvider,
  FameSaveProvider,
  InventoryManager,
  InventorySaveProvider,
  MasterySaveProvider,
  WalletSaveProvider,
  type CurrencyService,
  type DestinyBoardService,
  type ExperienceService,
  type FameService,
  type MasteryService,
} from "@game/gameplay";
import {
  LocalStorageSaveRepository,
  MigrationPipeline,
  SaveManager,
  VersionManager,
  type SaveProvider,
} from "@game/persistence";
import type { EntityId, World } from "@game/core";

export const DEFAULT_SAVE_SLOT_ID = "albion_idle_save_v1";

export interface RuntimePersistenceDependencies {
  readonly inventoryManager: InventoryManager;
  readonly world: World;
  readonly heroId: EntityId;
  readonly bankId: EntityId;
  readonly productionStorageId: EntityId;
  readonly equipmentManager: EquipmentManager;
  readonly currencyService: CurrencyService;
  readonly experienceService: ExperienceService;
  readonly masteryService: MasteryService;
  readonly fameService: FameService;
  readonly destinyBoardService: DestinyBoardService;
  readonly durabilityStore: DurabilityStore;
  readonly saveSlotId?: string;
}

export class RuntimePersistence {
  private readonly saveManager: SaveManager;
  private readonly saveSlotId: string;
  private loadFailed: boolean = false;
  private isAutosaving: boolean = false;
  private autoSaveIntervalId: number | undefined = undefined;
  private handleVisibilityChange: (() => void) | undefined = undefined;
  private handlePageHide: (() => void) | undefined = undefined;

  public constructor(deps: RuntimePersistenceDependencies) {
    this.saveSlotId = deps.saveSlotId ?? DEFAULT_SAVE_SLOT_ID;
    const saveRepository = new LocalStorageSaveRepository();
    const versionManager = new VersionManager(1);
    const migrationPipeline = new MigrationPipeline();

    this.saveManager = new SaveManager({
      repository: saveRepository,
      versionManager,
      migrationPipeline,
      buildVersion: "0.10.5",
      seed: 42,
    });

    const inventorySaveProvider = new InventorySaveProvider(
      deps.inventoryManager,
      deps.world,
      (index) => index === 0
        ? deps.heroId
        : index === 1
          ? deps.bankId
          : deps.productionStorageId,
    );
    const equipmentSaveProvider = new EquipmentSaveProvider(
      deps.equipmentManager,
      deps.world,
      () => deps.heroId,
    );
    const walletSaveProvider = new WalletSaveProvider(deps.currencyService);
    const experienceSaveProvider = new ExperienceSaveProvider(
      deps.experienceService,
      (masteryId) => deps.masteryService._getTable(masteryId),
    );
    const fameSaveProvider = new FameSaveProvider(deps.fameService);
    const masterySaveProvider = new MasterySaveProvider(deps.masteryService);
    const destinyBoardSaveProvider = new DestinyBoardSaveProvider(
      deps.destinyBoardService,
    );
    const durabilitySaveProvider = new DurabilitySaveProvider(
      deps.durabilityStore,
    );

    this.saveManager.registerProvider(inventorySaveProvider);
    this.saveManager.registerProvider(equipmentSaveProvider);
    this.saveManager.registerProvider(walletSaveProvider);
    this.saveManager.registerProvider(experienceSaveProvider);
    this.saveManager.registerProvider(fameSaveProvider);
    this.saveManager.registerProvider(masterySaveProvider);
    this.saveManager.registerProvider(destinyBoardSaveProvider);
    this.saveManager.registerProvider(durabilitySaveProvider);
  }

  public registerProvider(provider: SaveProvider): void {
    this.saveManager.registerProvider(provider);
  }

  public hasSave(): boolean {
    return this.saveManager.has(this.saveSlotId);
  }

  public save(tickCounter: number = 0): void {
    this.saveManager.save(this.saveSlotId, tickCounter);
  }

  public load(): void {
    this.saveManager.load(this.saveSlotId);
  }

  public isLoadFailed(): boolean {
    return this.loadFailed;
  }

  public setLoadFailed(failed: boolean): void {
    this.loadFailed = failed;
  }

  public startAutosave(onSave: () => void): () => void {
    if (this.loadFailed || this.isAutosaving) {
      return () => this.stopAutosave();
    }
    this.isAutosaving = true;

    this.autoSaveIntervalId = window.setInterval(() => {
      try {
        onSave();
      } catch (err) {
        console.error("[Persistence] Periodic auto-save failed:", err);
      }
    }, 30000);

    this.handleVisibilityChange = (): void => {
      if (document.visibilityState === "hidden") {
        try {
          onSave();
        } catch (err) {
          console.error("[Persistence] Visibility change auto-save failed:", err);
        }
      }
    };
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    this.handlePageHide = (): void => {
      try {
        onSave();
      } catch (err) {
        console.error("[Persistence] Page hide auto-save failed:", err);
      }
    };
    window.addEventListener("pagehide", this.handlePageHide);

    return () => this.stopAutosave();
  }

  public stopAutosave(): void {
    if (this.autoSaveIntervalId !== undefined) {
      window.clearInterval(this.autoSaveIntervalId);
      this.autoSaveIntervalId = undefined;
    }
    if (this.handleVisibilityChange !== undefined) {
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
      this.handleVisibilityChange = undefined;
    }
    if (this.handlePageHide !== undefined) {
      window.removeEventListener("pagehide", this.handlePageHide);
      this.handlePageHide = undefined;
    }
    this.isAutosaving = false;
  }
}
