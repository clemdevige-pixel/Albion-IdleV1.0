import { BLACK_MARKET_BASE_RATE, type BlackMarketRouteId } from "@game/data";
import type { EntityId } from "@game/core";
import {
  BlackMarketService,
  resolveEquipmentEconomicValue,
  getEnchantmentLevel,
  type AwakenedWeaponService,
  type BlackMarketCargoQuote,
  type BlackMarketCargoUnit,
  type BlackMarketSnapshot,
  type CurrencyService,
  type EnchantmentLevel,
  type InventoryEntry,
  type WalletId,
} from "@game/gameplay";
import { ARTIFACT_WEAPON_CRAFT_RECIPES } from "../data/artifactWeaponCraftRecipes.js";
import { FACTION_CAPE_CRAFT_RECIPES } from "../data/factionCapeContentCatalog.js";
import { getItemTier } from "../data/itemPower.js";
import { resolveEnchantmentItemInfo, resolveEquipmentInfo } from "../data/itemContentCatalog.js";
import { EQUIPMENT_CRAFT_RECIPES } from "../data/refiningRecipes.js";
import { resolveWeaponFamilyId } from "../data/weaponContentCatalog.js";
import type { PlayerInventoryManager } from "./PlayerInventoryManager.js";

export type BlackMarketStorageSource = "inventory" | "bank";

export interface BlackMarketCandidate {
  readonly source: BlackMarketStorageSource;
  readonly itemId: string;
  readonly enchantment: EnchantmentLevel;
  readonly availableQuantity: number;
  readonly economicValue: number;
  readonly normalBmValue: number;
}

export interface BlackMarketSelection {
  readonly source: BlackMarketStorageSource;
  readonly itemId: string;
  readonly enchantment: EnchantmentLevel;
  readonly quantity: number;
}

export interface BlackMarketRuntimeBindings {
  readonly inventoryManager: PlayerInventoryManager;
  readonly heroId: EntityId;
  readonly bankId: EntityId;
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
  readonly awakenedWeaponService: AwakenedWeaponService;
  readonly isUnlocked: () => boolean;
  readonly getUnlockedTiers: () => readonly number[];
  readonly onMutation: () => void;
}

const ALL_BLACK_MARKET_RECIPES = [
  ...ARTIFACT_WEAPON_CRAFT_RECIPES,
  ...FACTION_CAPE_CRAFT_RECIPES,
  ...EQUIPMENT_CRAFT_RECIPES,
] as const;

function isBlackMarketTier(value: number | undefined): value is 4 | 5 | 6 | 7 | 8 {
  return value === 4 || value === 5 || value === 6 || value === 7 || value === 8;
}

function recipeFor(itemId: string) {
  return ALL_BLACK_MARKET_RECIPES.find((recipe) => recipe.outputItemId === itemId);
}

function economicValueFor(itemId: string, enchantment: EnchantmentLevel): number | undefined {
  const itemTier = getItemTier(itemId);
  const enchantmentInfo = resolveEnchantmentItemInfo(itemId);
  const recipe = recipeFor(itemId);
  if (!isBlackMarketTier(itemTier) || enchantmentInfo === undefined || recipe === undefined) return undefined;
  return resolveEquipmentEconomicValue({
    recipe,
    itemTier,
    enchantment,
    enchantmentCategory: enchantmentInfo.costCategory,
  });
}

function armorSlotFor(itemId: string): string | undefined {
  const slot = resolveEquipmentInfo(itemId)?.slot;
  if (slot === "head") return "head";
  if (slot === "chest") return "torso";
  if (slot === "boots") return "boots";
  return undefined;
}

class BlackMarketRuntimeAdapter {
  private bindings: BlackMarketRuntimeBindings | undefined;
  private lastObservedResultId: string | null = null;
  readonly saveProvider: BlackMarketService;

  constructor() {
    this.saveProvider = new BlackMarketService({
      commitCargo: (units) => this.commitCargo(units),
      creditSilver: (amount) => {
        const bindings = this.bindings;
        return bindings !== undefined
          && bindings.currencyService.credit(
            bindings.walletId,
            "currency_silver",
            amount,
            "VendorSale",
          ).ok;
      },
    });
  }

  bind(bindings: BlackMarketRuntimeBindings): void {
    this.bindings = bindings;
  }

  reset(): void {
    this.bindings = undefined;
    this.lastObservedResultId = null;
    this.saveProvider.load(null);
  }

  isUnlocked(): boolean {
    return this.bindings?.isUnlocked() ?? false;
  }

  getSnapshot(nowMs: number = Date.now()): BlackMarketSnapshot {
    const bindings = this.requireBindings();
    const snapshot = this.saveProvider.getSnapshot(nowMs, bindings.getUnlockedTiers());
    const resultId = snapshot.lastResult?.id ?? null;
    if (resultId !== null && resultId !== this.lastObservedResultId) {
      this.lastObservedResultId = resultId;
      bindings.onMutation();
    }
    return snapshot;
  }

  getCandidates(): readonly BlackMarketCandidate[] {
    const bindings = this.requireBindings();
    const result = new Map<string, BlackMarketCandidate>();
    for (const source of ["inventory", "bank"] as const) {
      const ownerId = this.ownerFor(source);
      for (const slot of bindings.inventoryManager.listSlots(ownerId)) {
        const entry = slot.entry;
        if (entry === undefined || resolveEquipmentInfo(entry.itemId) === undefined) continue;
        if (bindings.awakenedWeaponService.has(entry.instanceId)) continue;
        // Equipment is identity-bearing cargo. Refuse malformed stacked equipment
        // rather than losing the physical instance contract during BM selection.
        if (entry.quantity !== 1) continue;
        const enchantment = getEnchantmentLevel(entry);
        const economicValue = economicValueFor(entry.itemId, enchantment);
        if (economicValue === undefined) continue;
        const key = `${source}|${entry.itemId}|${String(enchantment)}`;
        const previous = result.get(key);
        result.set(key, {
          source,
          itemId: entry.itemId,
          enchantment,
          availableQuantity: (previous?.availableQuantity ?? 0) + 1,
          economicValue,
          normalBmValue: Math.round(economicValue * BLACK_MARKET_BASE_RATE),
        });
      }
    }
    return [...result.values()];
  }

  quoteSelection(
    selection: readonly BlackMarketSelection[],
    nowMs: number = Date.now(),
  ): BlackMarketCargoQuote | undefined {
    const bindings = this.requireBindings();
    const units = this.buildUnits(selection);
    if (units === undefined) return undefined;
    return this.saveProvider.quoteCargo(units, nowMs, bindings.getUnlockedTiers());
  }

  startConvoy(
    selection: readonly BlackMarketSelection[],
    routeId: BlackMarketRouteId,
    nowMs: number = Date.now(),
  ): boolean {
    const bindings = this.requireBindings();
    if (!bindings.isUnlocked()) return false;
    const units = this.buildUnits(selection);
    if (units === undefined) return false;
    const started = this.saveProvider.startConvoy(
      units,
      routeId,
      nowMs,
      bindings.getUnlockedTiers(),
    );
    if (started) bindings.onMutation();
    return started;
  }

  dismissResult(): void {
    this.saveProvider.dismissResult();
    this.lastObservedResultId = null;
    this.bindings?.onMutation();
  }

  private requireBindings(): BlackMarketRuntimeBindings {
    if (this.bindings === undefined) {
      throw new Error("Black Market runtime is not bound to the active game session");
    }
    return this.bindings;
  }

  private ownerFor(source: BlackMarketStorageSource): EntityId {
    const bindings = this.requireBindings();
    return source === "inventory" ? bindings.heroId : bindings.bankId;
  }

  private buildUnits(
    selection: readonly BlackMarketSelection[],
  ): readonly BlackMarketCargoUnit[] | undefined {
    const bindings = this.requireBindings();
    const units: BlackMarketCargoUnit[] = [];
    const claimedInstanceIds = new Set<string>();

    for (const selected of selection) {
      if (!Number.isInteger(selected.quantity) || selected.quantity <= 0) return undefined;
      const ownerId = this.ownerFor(selected.source);
      const tier = getItemTier(selected.itemId);
      if (!isBlackMarketTier(tier)) return undefined;
      const economicValue = economicValueFor(selected.itemId, selected.enchantment);
      if (economicValue === undefined) return undefined;
      const weaponFamily = resolveWeaponFamilyId(selected.itemId);
      const armorSlot = armorSlotFor(selected.itemId);

      const matchingEntries = bindings.inventoryManager.listSlots(ownerId)
        .flatMap((slot) => slot.entry === undefined ? [] : [slot.entry])
        .filter((entry) => (
          entry.itemId === selected.itemId
          && getEnchantmentLevel(entry) === selected.enchantment
          && entry.quantity === 1
          && !bindings.awakenedWeaponService.has(entry.instanceId)
          && !claimedInstanceIds.has(entry.instanceId)
        ));
      if (matchingEntries.length < selected.quantity) return undefined;

      for (const entry of matchingEntries.slice(0, selected.quantity)) {
        claimedInstanceIds.add(entry.instanceId);
        units.push({
          instanceId: entry.instanceId,
          itemId: selected.itemId,
          enchantment: selected.enchantment,
          tier,
          economicValue,
          ...(weaponFamily === undefined ? {} : { weaponFamily }),
          ...(armorSlot === undefined ? {} : { armorSlot }),
        });
      }
    }
    return units;
  }

  private commitCargo(units: readonly BlackMarketCargoUnit[]): boolean {
    const bindings = this.bindings;
    if (bindings === undefined) return false;

    const planned: Array<{
      ownerId: EntityId;
      position: number;
      entry: InventoryEntry;
    }> = [];
    const seenInstanceIds = new Set<string>();

    // Preflight the complete transaction before mutating either Inventory or Bank.
    // The exact physical instance selected by the BM must still exist, must still
    // match the quoted item/enchantment, and must not have become Awakened.
    for (const unit of units) {
      if (seenInstanceIds.has(unit.instanceId)) return false;
      seenInstanceIds.add(unit.instanceId);

      let located:
        | { ownerId: EntityId; position: number; entry: InventoryEntry }
        | undefined;
      for (const ownerId of [bindings.heroId, bindings.bankId]) {
        const slot = bindings.inventoryManager.listSlots(ownerId).find(
          (candidate) => candidate.entry?.instanceId === unit.instanceId,
        );
        if (slot?.entry === undefined) continue;
        located = { ownerId, position: slot.position, entry: slot.entry };
        break;
      }
      if (located === undefined) return false;
      if (
        located.entry.quantity !== 1
        || located.entry.itemId !== unit.itemId
        || getEnchantmentLevel(located.entry) !== unit.enchantment
        || bindings.awakenedWeaponService.has(located.entry.instanceId)
      ) return false;
      planned.push(located);
    }

    const removed: typeof planned = [];
    for (const entry of planned) {
      const result = bindings.inventoryManager.removeEntryByInstanceId(
        entry.ownerId,
        entry.entry.instanceId,
      );
      if (!result.ok) {
        for (const rollback of [...removed].reverse()) {
          const restored = bindings.inventoryManager.insertEntry(
            rollback.ownerId,
            rollback.entry,
            rollback.position,
          );
          if (!restored.ok) {
            throw new Error("Black Market cargo rollback failed to restore exact item identity");
          }
        }
        return false;
      }
      removed.push(entry);
    }
    return true;
  }
}

export const blackMarketRuntime = new BlackMarketRuntimeAdapter();