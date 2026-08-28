import type { EntityId } from "@game/core";
import type { CurrencyService, InventoryManager, WalletId } from "@game/gameplay";
import {
  ITEM_DEFINITIONS,
  resolveEnchantmentItemInfo,
  resolveItemStackInfo,
} from "../data/itemContentCatalog.js";
import { getItemTier } from "../data/itemPower.js";
import {
  PRODUCTION_FAMILIES,
  getProductionFamilyId,
  type ProductionTier,
} from "../data/productionFamilyCatalog.js";
import {
  EQUIPMENT_CRAFT_RECIPES,
  getProductionRefiningRecipe,
} from "../data/refiningRecipes.js";
import { FACTION_CAPE_CRAFT_RECIPES } from "../data/factionCapeContentCatalog.js";
import { FACTION_ARTIFACT_WEAPON_CONTENT } from "../data/factionArtifactWeaponContent.js";
import {
  getDungeonKeyFragmentItemId,
  getDungeonKeyItemId,
} from "../data/dungeonKeyContentCatalog.js";

export const DEV_SANDBOX_SAVE_SLOT_ID = "albion_idle_dev_sandbox_v1";
const DEV_SANDBOX_SILVER = 10_000_000;
const DEV_SANDBOX_RESOURCE_STACK = 500;

const ARTIFACT_WEAPON_ITEM_IDS = new Set(
  FACTION_ARTIFACT_WEAPON_CONTENT.flatMap((specialization) =>
    specialization.items.map((item) => item.itemId),
  ),
);

export function isDevSandboxMode(): boolean {
  return import.meta.env.DEV
    && typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("devTest") === "1";
}

function ensureQuantity(
  inventoryManager: InventoryManager,
  ownerId: EntityId,
  itemId: string,
  targetQuantity: number,
): void {
  const current = inventoryManager.getTotalQuantity(ownerId, itemId);
  if (current >= targetQuantity) return;
  const stackInfo = resolveItemStackInfo(itemId)
    ?? { itemId, stackable: true, maxStack: 999 };
  const result = inventoryManager.addQuantity(
    ownerId,
    itemId,
    targetQuantity - current,
    stackInfo,
  );
  if (!result.ok || result.value.remainder !== 0) {
    throw new Error(`Dev sandbox failed to seed ${itemId}`);
  }
}

function hasEquipmentVariant(
  inventoryManager: InventoryManager,
  ownerId: EntityId,
  itemId: string,
  enchantment: 0 | 3,
): boolean {
  return inventoryManager
    .findEntriesByItemId(ownerId, itemId)
    .some((slot) => slot.entry?.enchantment === enchantment);
}

function ensureEquipmentVariant(
  inventoryManager: InventoryManager,
  ownerId: EntityId,
  itemId: string,
  enchantment: 0 | 3,
): void {
  if (hasEquipmentVariant(inventoryManager, ownerId, itemId, enchantment)) return;
  const stackInfo = resolveItemStackInfo(itemId);
  if (stackInfo === undefined) return;
  const result = inventoryManager.addQuantity(
    ownerId,
    itemId,
    1,
    stackInfo,
    enchantment,
  );
  if (!result.ok || result.value.remainder !== 0) {
    throw new Error(`Dev sandbox failed to seed equipment ${itemId}.${String(enchantment)}`);
  }
}

function seedAuthoredCraftingMaterials(
  inventoryManager: InventoryManager,
  productionStorageId: EntityId,
): void {
  for (const recipe of [...EQUIPMENT_CRAFT_RECIPES, ...FACTION_CAPE_CRAFT_RECIPES]) {
    for (const requirement of recipe.requirements) {
      if (
        !requirement.itemId.startsWith("item_resource_")
        && !requirement.itemId.startsWith("item_refined_")
      ) continue;
      ensureQuantity(
        inventoryManager,
        productionStorageId,
        requirement.itemId,
        DEV_SANDBOX_RESOURCE_STACK,
      );
    }
  }
}

function seedArtifactTestWeapons(
  inventoryManager: InventoryManager,
  bankId: EntityId,
): void {
  for (const specialization of FACTION_ARTIFACT_WEAPON_CONTENT) {
    const tier4 = specialization.items.find((item) => item.tier === 4);
    if (tier4 === undefined) {
      throw new Error(
        `Dev sandbox artifact specialization ${specialization.specializationMasteryId} has no T4 item`,
      );
    }
    ensureEquipmentVariant(inventoryManager, bankId, tier4.itemId, 0);
  }
}

export function seedDevSandboxEconomy(dependencies: {
  readonly inventoryManager: InventoryManager;
  readonly heroId: EntityId;
  readonly bankId: EntityId;
  readonly productionStorageId: EntityId;
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
}): void {
  if (!isDevSandboxMode()) return;

  const balance = dependencies.currencyService.getBalance(
    dependencies.walletId,
    "currency_silver",
  );
  if (!balance.ok) throw new Error("Dev sandbox could not read Silver balance");
  if (balance.value < DEV_SANDBOX_SILVER) {
    const credit = dependencies.currencyService.credit(
      dependencies.walletId,
      "currency_silver",
      DEV_SANDBOX_SILVER - balance.value,
      "Loot",
    );
    if (!credit.ok) throw new Error("Dev sandbox could not seed Silver");
  }

  for (const family of PRODUCTION_FAMILIES) {
    const familyId = getProductionFamilyId(family);
    for (const tier of [3, 4, 5, 6, 7, 8] as const satisfies readonly ProductionTier[]) {
      const recipe = getProductionRefiningRecipe(familyId, tier);
      ensureQuantity(
        dependencies.inventoryManager,
        dependencies.productionStorageId,
        recipe.rawItemId,
        DEV_SANDBOX_RESOURCE_STACK,
      );
      ensureQuantity(
        dependencies.inventoryManager,
        dependencies.productionStorageId,
        recipe.outputItemId,
        DEV_SANDBOX_RESOURCE_STACK,
      );
    }
  }
  seedAuthoredCraftingMaterials(
    dependencies.inventoryManager,
    dependencies.productionStorageId,
  );

  ensureQuantity(dependencies.inventoryManager, dependencies.heroId, "item_health_potion", 99);
  for (const tier of [4, 5, 6, 7, 8] as const) {
    ensureQuantity(
      dependencies.inventoryManager,
      dependencies.heroId,
      getDungeonKeyItemId(tier),
      20,
    );
    ensureQuantity(
      dependencies.inventoryManager,
      dependencies.heroId,
      getDungeonKeyFragmentItemId(tier),
      500,
    );
  }

  for (const itemId of Object.keys(ITEM_DEFINITIONS)) {
    if (ARTIFACT_WEAPON_ITEM_IDS.has(itemId)) continue;
    const tier = getItemTier(itemId);
    if (tier === undefined || tier < 3 || tier > 8) continue;
    ensureEquipmentVariant(dependencies.inventoryManager, dependencies.bankId, itemId, 0);
    if (tier >= 4 && resolveEnchantmentItemInfo(itemId)?.enchantable === true) {
      ensureEquipmentVariant(dependencies.inventoryManager, dependencies.bankId, itemId, 3);
    }
  }

  seedArtifactTestWeapons(dependencies.inventoryManager, dependencies.bankId);
}
