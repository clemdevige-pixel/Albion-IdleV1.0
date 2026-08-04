import type { EntityId } from "@game/core";
import type { CurrencyService } from "../currency/currency-service.js";
import type { WalletId } from "../currency/types.js";
import type { InventoryManager } from "../inventory/inventory-manager.js";
import {
  getEnchantmentLevel,
  type EnchantmentLevel,
  type ItemInstanceId,
} from "../inventory/types.js";
import {
  getNextEnchantmentRecipe,
  scaleEnchantmentRecipe,
  type EnchantmentCostCategory,
  type EnchantmentMaterialCost,
  type EnchantmentRecipe,
} from "./enchantment-recipes.js";

export interface EnchantmentItemInfo {
  readonly enchantable: boolean;
  readonly maximumLevel: EnchantmentLevel;
  readonly itemTier: number;
  readonly costCategory: EnchantmentCostCategory;
  readonly craftMaterials: readonly EnchantmentMaterialCost[];
}

export type EnchantmentItemInfoResolver =
  (itemId: string) => EnchantmentItemInfo | undefined;

export type EnchantmentFailureReason =
  | "item_not_found"
  | "item_not_enchantable"
  | "maximum_level_reached"
  | "level_reserved"
  | "inventory_full"
  | "insufficient_silver"
  | "insufficient_materials"
  | "transaction_already_processed";

export type EnchantmentResult =
  | {
      readonly ok: true;
      readonly instanceId: ItemInstanceId;
      readonly fromLevel: EnchantmentLevel;
      readonly toLevel: EnchantmentLevel;
    }
  | {
      readonly ok: false;
      readonly reason: EnchantmentFailureReason;
    };

export interface EnchantmentPreview {
  readonly instanceId: ItemInstanceId;
  readonly itemId: string;
  readonly currentLevel: EnchantmentLevel;
  readonly nextLevel: EnchantmentLevel | undefined;
  readonly enabled: boolean;
  readonly silverCost: number;
  readonly materials: readonly (EnchantmentMaterialCost & {
    readonly owned: number;
    readonly missing: number;
  })[];
  readonly canAfford: boolean;
  readonly failureReason?: EnchantmentFailureReason;
}

export interface EnchantmentServiceOptions {
  readonly inventoryManager: InventoryManager;
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
  readonly inventoryOwnerId: EntityId;
  readonly resolveItemInfo: EnchantmentItemInfoResolver;
  readonly findEquippedEntry: (instanceId: ItemInstanceId) => {
    readonly itemId: string;
    readonly instanceId: ItemInstanceId;
    readonly quantity: number;
    readonly enchantment?: EnchantmentLevel;
  } | undefined;
  readonly changeEquippedEnchantment:
    (instanceId: ItemInstanceId, level: EnchantmentLevel) => boolean;
}

/**
 * Deterministic V1 enchantment transaction.
 *
 * All requirements are validated before mutation. Currency and materials are
 * then consumed synchronously and the exact item instance receives its next
 * sequential enchantment level.
 */
export class EnchantmentService {
  readonly #inventory: InventoryManager;
  readonly #currency: CurrencyService;
  readonly #walletId: WalletId;
  readonly #ownerId: EntityId;
  readonly #resolveItemInfo: EnchantmentItemInfoResolver;
  readonly #findEquippedEntry: EnchantmentServiceOptions["findEquippedEntry"];
  readonly #changeEquippedEnchantment:
    EnchantmentServiceOptions["changeEquippedEnchantment"];
  readonly #processedTransactions = new Set<string>();

  constructor(options: EnchantmentServiceOptions) {
    this.#inventory = options.inventoryManager;
    this.#currency = options.currencyService;
    this.#walletId = options.walletId;
    this.#ownerId = options.inventoryOwnerId;
    this.#resolveItemInfo = options.resolveItemInfo;
    this.#findEquippedEntry = options.findEquippedEntry;
    this.#changeEquippedEnchantment = options.changeEquippedEnchantment;
  }

  preview(instanceId: ItemInstanceId): EnchantmentPreview | undefined {
    const slot = this.#inventory.findEntryByInstanceId(this.#ownerId, instanceId);
    const entry = slot?.entry ?? this.#findEquippedEntry(instanceId);
    if (entry === undefined) return undefined;

    const level = getEnchantmentLevel(entry);
    const info = this.#resolveItemInfo(entry.itemId);
    const baseRecipe = getNextEnchantmentRecipe(level);
    const recipe = info === undefined || baseRecipe === undefined
      ? baseRecipe
      : scaleEnchantmentRecipe(
          baseRecipe,
          info.itemTier,
          info.costCategory,
          info.craftMaterials,
        );
    const failureReason = this.#validateStatic(info, level, recipe);
    const silver = this.#currency.getBalance(this.#walletId, "currency_silver");
    const silverBalance = silver.ok ? silver.value : 0;
    const materials = (recipe?.materials ?? []).map((material) => {
      const owned = this.#inventory.getTotalQuantity(this.#ownerId, material.itemId);
      return {
        ...material,
        owned,
        missing: Math.max(0, material.quantity - owned),
      };
    });
    const silverCost = recipe?.silverCost ?? 0;

    const preview: EnchantmentPreview = {
      instanceId,
      itemId: entry.itemId,
      currentLevel: level,
      nextLevel: recipe?.toLevel,
      enabled: recipe?.enabled ?? false,
      silverCost,
      materials,
      canAfford:
        failureReason === undefined
        && silverBalance >= silverCost
        && materials.every((material) => material.missing === 0),
    };
    return failureReason === undefined
      ? preview
      : { ...preview, failureReason };
  }

  enchant(instanceId: ItemInstanceId, transactionId: string): EnchantmentResult {
    if (this.#processedTransactions.has(transactionId)) {
      return { ok: false, reason: "transaction_already_processed" };
    }

    const slot = this.#inventory.findEntryByInstanceId(this.#ownerId, instanceId);
    const equippedEntry = this.#findEquippedEntry(instanceId);
    const entry = slot?.entry ?? equippedEntry;
    if (entry === undefined) return { ok: false, reason: "item_not_found" };
    const level = getEnchantmentLevel(entry);
    const info = this.#resolveItemInfo(entry.itemId);
    const baseRecipe = getNextEnchantmentRecipe(level);
    const recipe = info === undefined || baseRecipe === undefined
      ? baseRecipe
      : scaleEnchantmentRecipe(
          baseRecipe,
          info.itemTier,
          info.costCategory,
          info.craftMaterials,
        );
    const staticFailure = this.#validateStatic(info, level, recipe);
    if (staticFailure !== undefined) return { ok: false, reason: staticFailure };
    if (recipe === undefined) return { ok: false, reason: "maximum_level_reached" };

    if (
      slot?.entry !== undefined
      && slot.entry.quantity > 1
      && this.#inventory.findFreeSlots(this.#ownerId).length === 0
    ) {
      return { ok: false, reason: "inventory_full" };
    }
    const silverCheck = this.#currency.canSpend(
      this.#walletId,
      "currency_silver",
      recipe.silverCost,
    );
    if (!silverCheck.ok) return { ok: false, reason: "insufficient_silver" };
    for (const material of recipe.materials) {
      if (this.#inventory.getTotalQuantity(this.#ownerId, material.itemId) < material.quantity) {
        return { ok: false, reason: "insufficient_materials" };
      }
    }

    // No async boundary exists below this point. Every operation was
    // prevalidated, so the synchronous commit cannot partially fail.
    for (const material of recipe.materials) {
      this.#inventory.removeQuantity(this.#ownerId, material.itemId, material.quantity);
    }
    this.#currency.debit(
      this.#walletId,
      "currency_silver",
      recipe.silverCost,
    );
    let changedInstanceId = instanceId;
    if (slot?.entry !== undefined) {
      const changed = this.#inventory.changeOneEnchantmentAt(
        this.#ownerId,
        slot.position,
        recipe.toLevel,
      );
      if (!changed.ok || changed.value.entry === undefined) {
        throw new Error("Prevalidated enchantment commit failed");
      }
      changedInstanceId = changed.value.entry.instanceId;
    } else if (!this.#changeEquippedEnchantment(instanceId, recipe.toLevel)) {
      throw new Error("Prevalidated equipped enchantment commit failed");
    }
    this.#processedTransactions.add(transactionId);
    return {
      ok: true,
      instanceId: changedInstanceId,
      fromLevel: level,
      toLevel: recipe.toLevel,
    };
  }

  #validateStatic(
    info: EnchantmentItemInfo | undefined,
    level: EnchantmentLevel,
    recipe: EnchantmentRecipe | undefined,
  ): EnchantmentFailureReason | undefined {
    if (info === undefined || !info.enchantable) return "item_not_enchantable";
    if (level >= info.maximumLevel || recipe === undefined) return "maximum_level_reached";
    if (!recipe.enabled) return "level_reserved";
    return undefined;
  }
}
