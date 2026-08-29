import { BLACK_MARKET_BASE_RATE, RESEARCH_UNLOCK_IDS, type BlackMarketRouteId } from "@game/data";
import type { EntityId } from "@game/core";
import {
  BlackMarketService,
  resolveEquipmentEconomicValue,
  getEnchantmentLevel,
  type AwakenedWeaponService,
  type BlackMarketCargoUnit,
  type BlackMarketSnapshot,
  type CurrencyService,
  type EnchantmentLevel,
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

interface ResearchUnlockReader {
  hasUnlock(unlockId: string): boolean;
}

export interface BlackMarketRuntimeFoundation {
  readonly isUnlocked: () => boolean;
  readonly getSnapshot: (nowMs?: number) => BlackMarketSnapshot;
  readonly getCandidates: () => readonly BlackMarketCandidate[];
  readonly startConvoy: (
    selection: readonly BlackMarketSelection[],
    routeId: BlackMarketRouteId,
    nowMs?: number,
  ) => boolean;
  readonly dismissResult: () => void;
  readonly saveProvider: BlackMarketService;
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

export function createBlackMarketRuntimeFoundation(input: {
  readonly researchService: ResearchUnlockReader;
  readonly inventoryManager: PlayerInventoryManager;
  readonly heroId: EntityId;
  readonly bankId: EntityId;
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
  readonly awakenedWeaponService: AwakenedWeaponService;
  readonly getUnlockedTiers: () => readonly number[];
  readonly onMutation: () => void;
}): BlackMarketRuntimeFoundation {
  const ownerFor = (source: BlackMarketStorageSource): EntityId => (
    source === "inventory" ? input.heroId : input.bankId
  );

  const service = new BlackMarketService({
    commitCargo: (units) => {
      const grouped = new Map<string, { source: BlackMarketStorageSource; itemId: string; enchantment: EnchantmentLevel; quantity: number }>();
      for (const unit of units) {
        const source = unit.instanceId.startsWith("bank|") ? "bank" : "inventory";
        const key = `${source}|${unit.itemId}|${String(unit.enchantment)}`;
        const current = grouped.get(key);
        grouped.set(key, {
          source,
          itemId: unit.itemId,
          enchantment: unit.enchantment,
          quantity: (current?.quantity ?? 0) + 1,
        });
      }
      const removed: Array<{ source: BlackMarketStorageSource; itemId: string; enchantment: EnchantmentLevel; quantity: number }> = [];
      for (const entry of grouped.values()) {
        const result = input.inventoryManager.removeQuantity(
          ownerFor(entry.source),
          entry.itemId,
          entry.quantity,
          entry.enchantment,
        );
        if (!result.ok) {
          for (const rollback of removed.reverse()) {
            input.inventoryManager.addQuantity(
              ownerFor(rollback.source),
              rollback.itemId,
              rollback.quantity,
              undefined,
              rollback.enchantment,
            );
          }
          return false;
        }
        removed.push(entry);
      }
      return true;
    },
    creditSilver: (amount) => input.currencyService.credit(input.walletId, "silver", amount).ok,
  });

  const isUnlocked = () => input.researchService.hasUnlock(RESEARCH_UNLOCK_IDS.blackMarket);

  const getCandidates = (): readonly BlackMarketCandidate[] => {
    const result = new Map<string, BlackMarketCandidate>();
    for (const source of ["inventory", "bank"] as const) {
      const ownerId = ownerFor(source);
      for (const slot of input.inventoryManager.listSlots(ownerId)) {
        const entry = slot.entry;
        if (entry === undefined || resolveEquipmentInfo(entry.itemId) === undefined) continue;
        if (input.awakenedWeaponService.has(entry.instanceId)) continue;
        const enchantment = getEnchantmentLevel(entry);
        const economicValue = economicValueFor(entry.itemId, enchantment);
        if (economicValue === undefined) continue;
        const key = `${source}|${entry.itemId}|${String(enchantment)}`;
        const previous = result.get(key);
        result.set(key, {
          source,
          itemId: entry.itemId,
          enchantment,
          availableQuantity: (previous?.availableQuantity ?? 0) + entry.quantity,
          economicValue,
          normalBmValue: Math.round(economicValue * BLACK_MARKET_BASE_RATE),
        });
      }
    }
    return [...result.values()];
  };

  const startConvoy = (
    selection: readonly BlackMarketSelection[],
    routeId: BlackMarketRouteId,
    nowMs: number = Date.now(),
  ): boolean => {
    if (!isUnlocked()) return false;
    const candidates = getCandidates();
    const units: BlackMarketCargoUnit[] = [];
    for (const selected of selection) {
      if (!Number.isInteger(selected.quantity) || selected.quantity <= 0) return false;
      const candidate = candidates.find((entry) => (
        entry.source === selected.source
        && entry.itemId === selected.itemId
        && entry.enchantment === selected.enchantment
      ));
      if (candidate === undefined || selected.quantity > candidate.availableQuantity) return false;
      const tier = getItemTier(selected.itemId);
      if (!isBlackMarketTier(tier)) return false;
      const weaponFamily = resolveWeaponFamilyId(selected.itemId);
      const armorSlot = armorSlotFor(selected.itemId);
      for (let index = 0; index < selected.quantity; index += 1) {
        units.push({
          instanceId: `${selected.source}|${selected.itemId}|${String(selected.enchantment)}|${String(index)}|${String(nowMs)}`,
          itemId: selected.itemId,
          enchantment: selected.enchantment,
          tier,
          economicValue: candidate.economicValue,
          ...(weaponFamily === undefined ? {} : { weaponFamily }),
          ...(armorSlot === undefined ? {} : { armorSlot }),
        });
      }
    }
    const started = service.startConvoy(units, routeId, nowMs, input.getUnlockedTiers());
    if (started) input.onMutation();
    return started;
  };

  return {
    isUnlocked,
    getSnapshot: (nowMs = Date.now()) => service.getSnapshot(nowMs, input.getUnlockedTiers()),
    getCandidates,
    startConvoy,
    dismissResult: () => {
      service.dismissResult();
      input.onMutation();
    },
    saveProvider: service,
  };
}
