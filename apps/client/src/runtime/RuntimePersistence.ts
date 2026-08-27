import clientPackage from "../../package.json";
import type {
  AwakenedWeaponService,
  DurabilityStore,
  EquipmentManager,
  InventoryManager,
} from "@game/gameplay";
import {
  AwakeningSaveProvider,
  DestinyBoardSaveProvider,
  DurabilitySaveProvider,
  EquipmentSaveProvider,
  ExperienceSaveProvider,
  FameSaveProvider,
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
  SaveManager,
  VersionManager,
  type SaveRepository,
  type SaveProvider,
} from "@game/persistence";
import type { EntityId, World } from "@game/core";
import {
  backupCurrentSave,
  loadSaveWithBackup,
  type SaveLoadSource,
} from "./saveBackup";
import {
  CURRENT_RUNTIME_SAVE_VERSION,
  createRuntimeMigrationPipeline,
} from "./saveMigrations";
import { LEGACY_SAVE_SLOT_ID, getSaveBackupSlotId } from "./saveSlots";
import {
  TRUSTED_OFFLINE_RESOLVED_THROUGH_KEY,
  resolveTrustedOfflineElapsedMs,
  resolveTrustedOfflineResolvedThrough,
  resolveTrustedOfflineWindow,
} from "./trustedOfflineElapsed.js";
import { dashboardLayoutSaveProvider } from "./DashboardLayoutSaveProvider";
import { dailyMerchantRotation } from "./DailyMerchantRotation.js";
import type { SaveFormat } from "@game/persistence";

export const DEFAULT_SAVE_SLOT_ID = LEGACY_SAVE_SLOT_ID;

export interface RuntimePersistenceDependencies {
  readonly inventoryManager: InventoryManager;
  readonly world: World;
  readonly heroId: EntityId;
  readonly bankId: EntityId;
  readonly productionStorageId: EntityId;
  readonly equipmentManager: EquipmentManager;
  readonly currencyService: CurrencyService;
  readonly awakenedWeaponService: AwakenedWeaponService;
  readonly experienceService: ExperienceService;
  readonly masteryService: MasteryService;
  readonly fameService: FameService;
  readonly destinyBoardService: DestinyBoardService;
  readonly durabilityStore: DurabilityStore;
  readonly saveSlotId?: string;
  readonly onLocalSave?: (save: SaveFormat) => void;
}

export class RuntimePersistence {
  private readonly saveManager: SaveManager;
  private readonly saveRepository: SaveRepository;
  private readonly inventoryManager: InventoryManager;
  private readonly equipmentManager: EquipmentManager;
  private readonly saveSlotId: string;
  private readonly backupSlotId: string;
  private readonly backgroundProviders: SaveProvider[] = [];
  private lastLoadSource: SaveLoadSource | undefined = undefined;
  private trustedOfflineResolvedThrough: number | undefined = undefined;
  private loadFailed: boolean = false;
  private isAutosaving: boolean = false;
  private autoSaveIntervalId: number | undefined = undefined;
  private handleVisibilityChange: (() => void) | undefined = undefined;
  private handlePageHide: (() => void) | undefined = undefined;
  private readonly onLocalSave: ((save: SaveFormat) => void) | undefined;

  public constructor(deps: RuntimePersistenceDependencies) {
    this.inventoryManager = deps.inventoryManager;
    this.equipmentManager = deps.equipmentManager;
    this.saveSlotId = deps.saveSlotId ?? DEFAULT_SAVE_SLOT_ID;
    this.backupSlotId = getSaveBackupSlotId(this.saveSlotId);
    this.onLocalSave = deps.onLocalSave;
    this.saveRepository = new LocalStorageSaveRepository();
    const versionManager = new VersionManager(CURRENT_RUNTIME_SAVE_VERSION);
    const migrationPipeline = createRuntimeMigrationPipeline();

    this.saveManager = new SaveManager({
      repository: this.saveRepository,
      versionManager,
      migrationPipeline,
      buildVersion: clientPackage.version,
      seed: 42,
    });

    dashboardLayoutSaveProvider.reset();
    dailyMerchantRotation.reset();

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
    const awakeningSaveProvider = new AwakeningSaveProvider(deps.awakenedWeaponService);
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
    this.saveManager.registerProvider(awakeningSaveProvider);
    this.saveManager.registerProvider(experienceSaveProvider);
    this.saveManager.registerProvider(fameSaveProvider);
    this.saveManager.registerProvider(masterySaveProvider);
    this.saveManager.registerProvider(destinyBoardSaveProvider);
    this.saveManager.registerProvider(durabilitySaveProvider);
    this.saveManager.registerProvider(dashboardLayoutSaveProvider);
    this.saveManager.registerProvider(dailyMerchantRotation);
  }

  public registerProvider(provider: SaveProvider): void {
    this.saveManager.registerProvider(provider);
    if (provider.resolveBackground !== undefined) {
      this.backgroundProviders.push(provider);
    }
  }

  public hasSave(): boolean {
    return this.saveManager.has(this.saveSlotId)
      || this.saveManager.has(this.backupSlotId);
  }

  public save(tickCounter: number = 0): void {
    this.assertGlobalItemIdentityIntegrity();
    backupCurrentSave(
      this.saveRepository,
      this.saveSlotId,
      this.backupSlotId,
    );
    const extra = this.trustedOfflineResolvedThrough === undefined
      ? undefined
      : {
          [TRUSTED_OFFLINE_RESOLVED_THROUGH_KEY]: this.trustedOfflineResolvedThrough,
        };
    this.saveManager.save(this.saveSlotId, tickCounter, extra);
    this.onLocalSave?.(this.saveRepository.get(this.saveSlotId));
  }

  /** Resolves elapsed time through passive/background-capable providers only. */
  public resolveBackgroundElapsed(elapsedMs: number): void {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
      throw new Error("Background elapsed time must be a finite non-negative number");
    }
    if (elapsedMs === 0) return;

    for (const provider of this.backgroundProviders) {
      provider.resolveBackground?.(elapsedMs);
    }
  }

  public load(): void {
    this.lastLoadSource = loadSaveWithBackup(
      this.saveRepository,
      this.saveSlotId,
      this.backupSlotId,
      (slotId) => { this.loadAndValidateSlot(slotId); },
    );

    const loadedSave = this.getLastLoadedSave();
    if (loadedSave === undefined) return;

    const existingResolvedThrough = resolveTrustedOfflineResolvedThrough(loadedSave);
    if (existingResolvedThrough !== undefined) {
      this.trustedOfflineResolvedThrough = Math.max(
        this.trustedOfflineResolvedThrough ?? 0,
        existingResolvedThrough,
      );
    }

    const window = resolveTrustedOfflineWindow(loadedSave);
    if (window === undefined || window.elapsedMs <= 0) return;

    this.resolveBackgroundElapsed(window.elapsedMs);

    this.trustedOfflineResolvedThrough = Math.max(
      this.trustedOfflineResolvedThrough ?? 0,
      window.serverNow,
    );

    // Persist both the resolved gameplay state and the trusted server cursor.
    // Cloud reconciliation may attach the same server window again on reload;
    // the cursor makes only the previously unseen suffix eligible next time.
    this.save();
  }

  public getTrustedOfflineElapsedMs(): number {
    const save = this.getLastLoadedSave();
    return save === undefined ? 0 : resolveTrustedOfflineElapsedMs(save);
  }

  private getLastLoadedSave(): SaveFormat | undefined {
    if (this.lastLoadSource === undefined) return undefined;
    const slotId = this.lastLoadSource === "primary"
      ? this.saveSlotId
      : this.backupSlotId;
    if (!this.saveRepository.has(slotId)) return undefined;
    return this.saveRepository.get(slotId);
  }

  /** Creates a validated portable backup of the latest primary save. */
  public exportSave(): string {
    const sourceSlotId = this.saveManager.has(this.saveSlotId)
      ? this.saveSlotId
      : this.backupSlotId;
    return this.saveManager.exportSave(sourceSlotId);
  }

  /**
   * Validates an imported save before touching the primary slot, then loads it.
   * If a provider rejects it, the previous primary snapshot is restored.
   */
  public importSave(raw: string): void {
    const importSlotId = `${this.saveSlotId}_import`;
    this.saveManager.importSave(importSlotId, raw);

    backupCurrentSave(
      this.saveRepository,
      this.saveSlotId,
      this.backupSlotId,
    );
    this.saveRepository.save(
      this.saveSlotId,
      this.saveRepository.get(importSlotId),
    );
    this.saveManager.delete(importSlotId);

    try {
      this.loadAndValidateSlot(this.saveSlotId);
      this.lastLoadSource = "primary";
    } catch (error) {
      if (this.saveRepository.has(this.backupSlotId)) {
        this.loadAndValidateSlot(this.backupSlotId);
        this.saveRepository.save(
          this.saveSlotId,
          this.saveRepository.get(this.backupSlotId),
        );
        this.lastLoadSource = "backup";
      }
      throw error;
    }
  }

  public getLastLoadSource(): SaveLoadSource | undefined {
    return this.lastLoadSource;
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

  private loadAndValidateSlot(slotId: string): void {
    this.saveManager.load(slotId);
    this.assertGlobalItemIdentityIntegrity();
  }

  private assertGlobalItemIdentityIntegrity(): void {
    const owners = new Map<string, string>();
    const claim = (instanceId: string, holder: string): void => {
      const existing = owners.get(instanceId);
      if (existing !== undefined) {
        throw new Error(
          `Duplicate item instance id across physical holders: ${instanceId} (${existing} / ${holder})`,
        );
      }
      owners.set(instanceId, holder);
    };

    for (const inventoryId of this.inventoryManager.listInventories()) {
      for (const slot of this.inventoryManager.listSlots(inventoryId)) {
        if (slot.entry !== undefined) {
          claim(slot.entry.instanceId, `inventory:${String(inventoryId)}`);
        }
      }
      const activeBag = this.inventoryManager.getActiveBag(inventoryId);
      if (activeBag !== undefined) {
        claim(activeBag.instanceId, `bag:${String(inventoryId)}`);
      }
    }

    for (const entityId of this.equipmentManager.listEquippedEntities()) {
      for (const [slot, entry] of this.equipmentManager.getEquipped(entityId)) {
        claim(entry.instanceId, `equipment:${String(entityId)}:${slot}`);
      }
    }
  }
}
