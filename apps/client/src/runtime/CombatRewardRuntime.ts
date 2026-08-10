import type { EntityId } from "@game/core";
import type {
  CurrencyService,
  DurabilityStore,
  EquipmentManager,
  ExperienceService,
  InventoryManager,
  MasteryId,
  ProgressionOrchestrator,
  WalletId,
} from "@game/gameplay";
import {
  rollEnchantmentMaterial,
  rollLootTable,
} from "../data/economyContentCatalog";
import { resolveEquipmentInfo } from "../data/itemContentCatalog";
import { resolveWeaponMastery } from "../data/weaponContentCatalog";

export interface EnemyKilledRewardResult {
  readonly silverEarned: number;
  readonly newBalance: number;
  readonly fameEarned?: {
    readonly amount: number;
    readonly weaponId: MasteryId;
    readonly familyId: MasteryId;
  } | undefined;
  readonly equipmentDropped?: {
    readonly itemId: string;
  } | undefined;
  readonly enchantmentMaterialDropped?: {
    readonly itemId: string;
  } | undefined;
}

export interface CombatRewardRuntimeDependencies {
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
  readonly equipmentManager: EquipmentManager;
  readonly inventoryManager: InventoryManager;
  readonly durabilityStore: DurabilityStore;
  readonly progressionOrchestrator: ProgressionOrchestrator;
  readonly experienceService: ExperienceService;
  readonly heroId: EntityId;
}

export class CombatRewardRuntime {
  private readonly currencyService: CurrencyService;
  private readonly walletId: WalletId;
  private readonly equipmentManager: EquipmentManager;
  private readonly inventoryManager: InventoryManager;
  private readonly durabilityStore: DurabilityStore;
  private readonly progressionOrchestrator: ProgressionOrchestrator;
  private readonly experienceService: ExperienceService;
  private readonly heroId: EntityId;

  constructor(deps: CombatRewardRuntimeDependencies) {
    this.currencyService = deps.currencyService;
    this.walletId = deps.walletId;
    this.equipmentManager = deps.equipmentManager;
    this.inventoryManager = deps.inventoryManager;
    this.durabilityStore = deps.durabilityStore;
    this.progressionOrchestrator = deps.progressionOrchestrator;
    this.experienceService = deps.experienceService;
    this.heroId = deps.heroId;
  }

  public processEnemyKilledReward(
    silverReward: number,
    fameReward: number,
    lootTableId: string = "loot_monster_generic",
  ): EnemyKilledRewardResult {
    this.currencyService.credit(this.walletId, "currency_silver", silverReward, "Loot");
    const balRes = this.currencyService.getBalance(this.walletId, "currency_silver");
    const newBalance = balRes.ok ? balRes.value : 0;

    let fameEarned: EnemyKilledRewardResult["fameEarned"];
    const equippedWeapon = this.equipmentManager.getEquippedItem(this.heroId, "weapon");
    const activeWeaponRoute = equippedWeapon === undefined
      ? undefined
      : resolveWeaponMastery(equippedWeapon.itemId);

    if (activeWeaponRoute !== undefined) {
      this.progressionOrchestrator.onEquipmentAcquired(activeWeaponRoute.familyId);
      this.progressionOrchestrator.onEquipmentAcquired(activeWeaponRoute.weaponId);

      this.progressionOrchestrator.onFameEarned(activeWeaponRoute.weaponId, fameReward, "combat");
      this.experienceService.addExperience(activeWeaponRoute.familyId, fameReward, "combat");

      fameEarned = {
        amount: fameReward,
        weaponId: activeWeaponRoute.weaponId,
        familyId: activeWeaponRoute.familyId,
      };
    }

    let equipmentDropped: EnemyKilledRewardResult["equipmentDropped"];
    const droppedItemId = rollLootTable(lootTableId);
    if (droppedItemId !== undefined) {
      const addResult = this.inventoryManager.addQuantity(this.heroId, droppedItemId, 1);
      if (addResult.ok) {
        const eqInfo = resolveEquipmentInfo(droppedItemId);
        if (eqInfo !== undefined) {
          const position = addResult.value.affectedPositions[0];
          if (position !== undefined) {
            const slot = this.inventoryManager.getSlot(this.heroId, position);
            if (slot.ok && slot.value.entry !== undefined) {
              const existingDurability = this.durabilityStore.get(slot.value.entry.instanceId);
              if (existingDurability === undefined) {
                this.durabilityStore.attach(slot.value.entry.instanceId, 100);
              }
            }
          }
        }
        equipmentDropped = {
          itemId: droppedItemId,
        };
      }
    }

    let enchantmentMaterialDropped: EnemyKilledRewardResult["enchantmentMaterialDropped"];
    const enchantmentMaterialId = rollEnchantmentMaterial();
    if (enchantmentMaterialId !== undefined) {
      const materialResult = this.inventoryManager.addQuantity(
        this.heroId,
        enchantmentMaterialId,
        1,
      );
      if (materialResult.ok) {
        enchantmentMaterialDropped = {
          itemId: enchantmentMaterialId,
        };
      }
    }

    return {
      silverEarned: silverReward,
      newBalance,
      fameEarned,
      equipmentDropped,
      enchantmentMaterialDropped,
    };
  }
}
