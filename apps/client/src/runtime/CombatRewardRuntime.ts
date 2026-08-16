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
  rollCombatDrops,
  type CombatDrop,
  type CombatLootContext,
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
  readonly itemDrops: readonly CombatDrop[];
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
    lootContext: CombatLootContext,
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

    const itemDrops: CombatDrop[] = [];
    for (const drop of rollCombatDrops(lootContext)) {
      const addResult = this.inventoryManager.addQuantity(this.heroId, drop.itemId, drop.quantity);
      if (!addResult.ok || addResult.value.added <= 0) continue;

      const acceptedDrop: CombatDrop = {
        ...drop,
        quantity: addResult.value.added,
      };

      const eqInfo = resolveEquipmentInfo(drop.itemId);
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

      itemDrops.push(acceptedDrop);
    }

    return {
      silverEarned: silverReward,
      newBalance,
      fameEarned,
      itemDrops,
    };
  }
}
