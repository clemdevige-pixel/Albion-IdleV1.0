import type { EntityId } from "@game/core";
import {
  getFactionRuneWorldEncounterMultiplier,
  rollFactionRuneWorldDrop,
  type FactionRuneWorldDrop,
} from "@game/data";
import type {
  AwakenedWeaponService,
  AwakenedWeaponTier,
  CurrencyService,
  DurabilityStore,
  EquipmentManager,
  ExperienceService,
  MasteryId,
  ProgressionOrchestrator,
  WalletId,
} from "@game/gameplay";
import {
  getCombatLootExpectations,
  rollCombatDrops,
  type CombatDrop,
  type CombatLootContext,
} from "../data/economyContentCatalog";
import { isAwakeningEligibleWeapon } from "../data/enchantmentItemPolicy.js";
import { resolveEquipmentInfo } from "../data/itemContentCatalog.js";
import { getItemTier } from "../data/itemPower.js";
import { resolveWeaponMastery } from "../data/weaponContentCatalog.js";
import type { PlayerInventoryManager } from "./PlayerInventoryManager.js";

export type WorldCombatDrop = CombatDrop | FactionRuneWorldDrop;

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
  readonly itemDrops: readonly WorldCombatDrop[];
}

export interface CombatRewardPolicy {
  /** World keeps item rolls enabled; activities such as Tower may opt out. */
  readonly itemDropsEnabled?: boolean;
}

export interface CombatRewardRuntimeDependencies {
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
  readonly equipmentManager: EquipmentManager;
  readonly inventoryManager: PlayerInventoryManager;
  readonly durabilityStore: DurabilityStore;
  readonly progressionOrchestrator: ProgressionOrchestrator;
  readonly experienceService: ExperienceService;
  readonly awakenedWeaponService: AwakenedWeaponService;
  readonly heroId: EntityId;
  readonly onRawFactionFame?: (factionId: string, rawFame: number) => number;
  /** Dungeon keys/fragments are a discovered content channel, not baseline world loot. */
  readonly isDungeonKeyLootUnlocked?: () => boolean;
  /** Faction Rune world drops are unlocked by Localisation des Sanctuaires. */
  readonly isFactionRuneLootUnlocked?: () => boolean;
  readonly random?: () => number;
}

export class CombatRewardRuntime {
  private readonly currencyService: CurrencyService;
  private readonly walletId: WalletId;
  private readonly equipmentManager: EquipmentManager;
  private readonly inventoryManager: PlayerInventoryManager;
  private readonly durabilityStore: DurabilityStore;
  private readonly progressionOrchestrator: ProgressionOrchestrator;
  private readonly experienceService: ExperienceService;
  private readonly awakenedWeaponService: AwakenedWeaponService;
  private readonly heroId: EntityId;
  private readonly onRawFactionFame: ((factionId: string, rawFame: number) => number) | undefined;
  private readonly isDungeonKeyLootUnlocked: () => boolean;
  private readonly isFactionRuneLootUnlocked: () => boolean;
  private readonly random: () => number;

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
    this.isDungeonKeyLootUnlocked = deps.isDungeonKeyLootUnlocked ?? (() => true);
    this.isFactionRuneLootUnlocked = deps.isFactionRuneLootUnlocked
      ?? this.isDungeonKeyLootUnlocked;
    this.random = deps.random ?? Math.random;
  }

  /** Reads the pre-reward faction yield bonus without awarding faction Fame. */
  public getFactionYieldBonusPercent(factionId: string): number {
    return this.onRawFactionFame?.(factionId, 0) ?? 0;
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
    factionRuneDropChance = 0,
    policy: CombatRewardPolicy = {},
  ): EnemyKilledRewardResult {
    const factionYieldBonusPercent = this.getFactionYieldBonusPercent(lootContext.faction);
    const finalSilverReward = applyPercentBonusRounded(silverReward, factionYieldBonusPercent);
    const factionAdjustedFame = applyPercentBonusRounded(fameReward, factionYieldBonusPercent);
    const newBalance = this.creditSilverReward(finalSilverReward);

    let fameEarned: EnemyKilledRewardResult["fameEarned"];
    let attunementEarned: EnemyKilledRewardResult["attunementEarned"];
    let finalCombatFame = 0;
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

      const fameBonusPercent = awakeningEligible
        ? this.awakenedWeaponService.getTraitValue(equippedWeapon.instanceId, "fame_bonus")
        : 0;
      const awakeningFameBonus = Math.floor(fameReward * fameBonusPercent / 100);
      finalCombatFame = factionAdjustedFame + awakeningFameBonus;

      this.progressionOrchestrator.onFameEarned(activeWeaponRoute.weaponId, finalCombatFame, "combat");
      this.experienceService.addExperience(activeWeaponRoute.familyId, finalCombatFame, "combat");

      fameEarned = {
        amount: finalCombatFame,
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
              finalCombatFame,
            );
            if (attunement.ok) attunementEarned = attunement.value;
          }
        }
      }
    }

    if (Number.isSafeInteger(finalCombatFame) && finalCombatFame > 0) {
      this.onRawFactionFame?.(lootContext.faction, finalCombatFame);
    }

    const itemDrops: WorldCombatDrop[] = [];
    if (policy.itemDropsEnabled !== false) {
      const dungeonKeyLootUnlocked = this.isDungeonKeyLootUnlocked();
      const rolledDrops = mergeCombatDrops([
        ...rollCombatDrops(lootContext, this.random),
        ...rollFactionYieldBonusDrops(
          lootContext,
          factionYieldBonusPercent,
          this.random,
        ),
      ]);
      for (const drop of rolledDrops) {
        if (
          !dungeonKeyLootUnlocked
          && (drop.kind === "key" || drop.kind === "key_fragment")
        ) continue;

        const creditedQuantity = this.creditPlayerDrop(drop.itemId, drop.quantity);
        if (creditedQuantity <= 0) continue;
        itemDrops.push({ ...drop, quantity: creditedQuantity });
      }

      if (this.isFactionRuneLootUnlocked()) {
        const encounterMultiplier = getFactionRuneWorldEncounterMultiplier(
          lootContext.isElite,
          lootContext.isBoss,
        );
        const runeDrop = rollFactionRuneWorldDrop(
          lootContext.faction,
          lootContext.enchantmentTier,
          factionRuneDropChance * encounterMultiplier,
          factionYieldBonusPercent,
          this.random,
        );
        if (runeDrop !== undefined) {
          const creditedQuantity = this.creditPlayerDrop(runeDrop.itemId, runeDrop.quantity);
          if (creditedQuantity === runeDrop.quantity) {
            itemDrops.push(runeDrop);
          }
        }
      }
    }

    return {
      silverEarned: finalSilverReward,
      newBalance,
      fameEarned,
      attunementEarned,
      itemDrops,
    };
  }

  private creditPlayerDrop(itemId: string, quantity: number): number {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) return 0;

    const equipment = resolveEquipmentInfo(itemId);
    if (equipment === undefined) {
      return this.inventoryManager.addAccessibleQuantity(this.heroId, itemId, quantity)
        ? quantity
        : 0;
    }

    let credited = 0;
    for (let index = 0; index < quantity; index += 1) {
      let stored = false;
      for (const ownerId of this.inventoryManager.getAccessibleStorageOwners(this.heroId)) {
        const added = this.inventoryManager.addQuantity(ownerId, itemId, 1);
        if (!added.ok || added.value.added !== 1 || added.value.remainder !== 0) continue;

        const position = added.value.affectedPositions[0];
        if (position !== undefined) {
          const slot = this.inventoryManager.getSlot(ownerId, position);
          const entry = slot.ok ? slot.value.entry : undefined;
          if (entry !== undefined && this.durabilityStore.get(entry.instanceId) === undefined) {
            this.durabilityStore.attach(entry.instanceId, 100);
          }
        }
        credited += 1;
        stored = true;
        break;
      }
      if (!stored) break;
    }
    return credited;
  }
}

export function applyPercentBonusRounded(baseValue: number, bonusPercent: number): number {
  if (!Number.isFinite(baseValue) || baseValue <= 0) return 0;
  const roundedBase = Math.round(baseValue);
  if (!Number.isFinite(bonusPercent) || bonusPercent <= 0) return roundedBase;
  return roundedBase + Math.round(baseValue * bonusPercent / 100);
}

/** Rolls only the extra expected quantity supplied by Faction Mastery. */
export function rollFactionYieldBonusDrops(
  lootContext: CombatLootContext,
  bonusPercent: number,
  random: () => number = Math.random,
): readonly CombatDrop[] {
  if (!Number.isFinite(bonusPercent) || bonusPercent <= 0) return [];
  return getCombatLootExpectations(lootContext).flatMap((expectation) => {
    const quantity = rollExpectedQuantity(
      expectation.expectedQuantity * bonusPercent / 100,
      random,
    );
    return quantity <= 0
      ? []
      : [{ itemId: expectation.itemId, kind: expectation.kind, quantity }];
  });
}

export function rollExpectedQuantity(expectedQuantity: number, random: () => number): number {
  const safeExpected = Math.max(0, expectedQuantity);
  const guaranteed = Math.floor(safeExpected);
  const fractional = safeExpected - guaranteed;
  return guaranteed + (fractional > 0 && random() < fractional ? 1 : 0);
}

function mergeCombatDrops(drops: readonly CombatDrop[]): readonly CombatDrop[] {
  const merged = new Map<string, CombatDrop>();
  for (const drop of drops) {
    const key = `${drop.kind}:${drop.itemId}`;
    const existing = merged.get(key);
    merged.set(key, existing === undefined
      ? drop
      : { ...existing, quantity: existing.quantity + drop.quantity });
  }
  return [...merged.values()];
}

function isAwakenedWeaponTier(value: number | undefined): value is AwakenedWeaponTier {
  return value === 4 || value === 5 || value === 6 || value === 7 || value === 8;
}
