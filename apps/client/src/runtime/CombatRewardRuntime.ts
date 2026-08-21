import type { EntityId } from "@game/core";
import type {
  AwakenedWeaponService,
  AwakenedWeaponTier,
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
import { isAwakeningEligibleWeapon } from "../data/enchantmentItemPolicy.js";
import { resolveEquipmentInfo } from "../data/itemContentCatalog";
import { getItemTier } from "../data/itemPower.js";
import { resolveWeaponMastery } from "../data/weaponContentCatalog.js";

export interface EnemyKilledRewardResult {
  readonly silverEarned: number;
  readonly newBalance: number;
  readonly fameEarned?: {
    readonly amount: number;
    readonly weaponId: MasteryId;
    readonly familyId: MasteryId;
  } | undefined;
  readonly attunementEarned?: {
    readonly requested: number;
    readonly stored: number;
    readonly discardedAtCap: number;
    readonly balance: number;
    readonly cap: number;
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
  readonly awakenedWeaponService: AwakenedWeaponService;
  readonly heroId: EntityId;
  readonly onRawFactionFame?: (factionId: string, rawFame: number) => void;
}

export class CombatRewardRuntime {
  private readonly currencyService: CurrencyService;
  private readonly walletId: WalletId;
  private readonly equipmentManager: EquipmentManager;
  private readonly inventoryManager: InventoryManager;
  private readonly durabilityStore: DurabilityStore;
  private readonly progressionOrchestrator: ProgressionOrchestrator;
  private readonly experienceService: ExperienceService;
  private readonly awakenedWeaponService: AwakenedWeaponService;
  private readonly heroId: EntityId;
  private readonly onRawFactionFame: ((factionId: string, rawFame: number) => void) | undefined;

  constructor(deps: CombatRewardRuntimeDependencies) {
    this.currencyService = deps.currencyService;
    this.walletId = deps.walletId;
    this.equipmentManager = deps.equipmentManager;
    this.inventoryManager = deps.inventoryManager;
    this.durabilityStore = deps.durabilityStore;
    this.progressionOrchestrator = deps.progressionOrchestrator;
    this.experienceService = deps.experienceService;
    this.awakenedWeaponService = deps.awakenedWeaponService;
    this.heroId = deps.heroId;
    this.onRawFactionFame = deps.onRawFactionFame;
  }

  /** Credits deterministic reward Silver through the existing wallet owner. */
  public creditSilverReward(silverReward: number): number {
    if (!Number.isSafeInteger(silverReward) || silverReward <= 0) {
      const current = this.currencyService.getBalance(this.walletId, "currency_silver");
      return current.ok ? current.value : 0;
    }
    this.currencyService.credit(this.walletId, "currency_silver", silverReward, "Loot");
    const balance = this.currencyService.getBalance(this.walletId, "currency_silver");
    return balance.ok ? balance.value : 0;
  }

  public processEnemyKilledReward(
    silverReward: number,
    fameReward: number,
    lootContext: CombatLootContext,
  ): EnemyKilledRewardResult {
    const newBalance = this.creditSilverReward(silverReward);

    // Faction Mastery consumes raw/base faction Fame only. This happens before
    // weapon/Awakening Fame bonuses so its own Fame yield can never feed back
    // into Faction Mastery XP generation.
    if (Number.isInteger(fameReward) && fameReward > 0) {
      this.onRawFactionFame?.(lootContext.faction, fameReward);
    }

    let fameEarned: EnemyKilledRewardResult["fameEarned"];
    let attunementEarned: EnemyKilledRewardResult["attunementEarned"];
    const equippedWeapon = this.equipmentManager.getEquippedItem(this.heroId, "weapon");
    const activeWeaponRoute = equippedWeapon === undefined
      ? undefined
      : resolveWeaponMastery(equippedWeapon.itemId);
    const awakeningEligible = equippedWeapon !== undefined
      && equippedWeapon.enchantment === 4
      && isAwakeningEligibleWeapon(equippedWeapon.itemId);

    if (activeWeaponRoute !== undefined) {
      this.progressionOrchestrator.onEquipmentAcquired(activeWeaponRoute.familyId);
      this.progressionOrchestrator.onEquipmentAcquired(activeWeaponRoute.weaponId);

      // Fame Bonus improves progression Fame only. Attunement deliberately uses
      // the raw eligible PvE Fame below so the trait cannot accelerate itself.
      const fameBonusPercent = awakeningEligible
        ? this.awakenedWeaponService.getTraitValue(equippedWeapon.instanceId, "fame_bonus")
        : 0;
      const progressionFame = fameReward + Math.floor(fameReward * fameBonusPercent / 100);

      this.progressionOrchestrator.onFameEarned(activeWeaponRoute.weaponId, progressionFame, "combat");
      this.experienceService.addExperience(activeWeaponRoute.familyId, progressionFame, "combat");

      fameEarned = {
        amount: progressionFame,
        weaponId: activeWeaponRoute.weaponId,
        familyId: activeWeaponRoute.familyId,
      };

      if (awakeningEligible) {
        const itemTier = getItemTier(equippedWeapon.itemId);
        if (isAwakenedWeaponTier(itemTier)) {
          if (!this.awakenedWeaponService.has(equippedWeapon.instanceId)) {
            this.awakenedWeaponService.registerFresh(equippedWeapon.instanceId, itemTier);
          }
          if (lootContext.enchantmentTier >= itemTier) {
            const attunement = this.awakenedWeaponService.addAttunement(
              equippedWeapon.instanceId,
              fameReward,
            );
            if (attunement.ok) attunementEarned = attunement.value;
          }
        }
      }
    }

    const itemDrops: CombatDrop[] = [];
    for (const drop of rollCombatDrops(lootContext)) {
      const addResult = this.inventoryManager.addQuantity(this.heroId, drop.itemId, drop.quantity);
      if (!addResult.ok || addResult.value.added <= 0) continue;

      const acceptedDrop: CombatDrop = { ...drop, quantity: addResult.value.added };
      const eqInfo = resolveEquipmentInfo(drop.itemId);
      if (eqInfo !== undefined) {
        const position = addResult.value.affectedPositions[0];
        if (position !== undefined) {
          const slot = this.inventoryManager.getSlot(this.heroId, position);
          if (slot.ok && slot.value.entry !== undefined) {
            const existingDurability = this.durabilityStore.get(slot.value.entry.instanceId);
            if (existingDurability === undefined) this.durabilityStore.attach(slot.value.entry.instanceId, 100);
          }
        }
      }
      itemDrops.push(acceptedDrop);
    }

    return { silverEarned: silverReward, newBalance, fameEarned, attunementEarned, itemDrops };
  }
}

function isAwakenedWeaponTier(value: number | undefined): value is AwakenedWeaponTier {
  return value === 4 || value === 5 || value === 6 || value === 7 || value === 8;
}
