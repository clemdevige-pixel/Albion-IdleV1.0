import type { EntityId } from "@game/core";
import { TOWER_TRIAL_BLOCKS } from "@game/data";
import type {
  CurrencyService,
  EnchantmentLevel,
  EquipmentLoadout,
  EquipmentLoadoutSlot,
  EquipmentManager,
  EquipmentSlot,
  InventoryManager,
  WalletId,
} from "@game/gameplay";
import {
  ITEM_DEFINITIONS,
  resolveEnchantmentItemInfo,
  resolveEquipmentInfo,
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
import {
  FACTION_CAPE_CONTENT,
  FACTION_CAPE_CRAFT_RECIPES,
} from "../data/factionCapeContentCatalog.js";
import {
  FACTION_ARTIFACT_ADVANTAGE,
  FACTION_ARTIFACT_WEAPON_CONTENT,
  type ArtifactFaction,
} from "../data/factionArtifactWeaponContent.js";
import {
  getDungeonKeyFragmentItemId,
  getDungeonKeyItemId,
} from "../data/dungeonKeyContentCatalog.js";

export const DEV_SANDBOX_SAVE_SLOT_ID = "albion_idle_dev_sandbox_v6";
const DEV_SANDBOX_SILVER = 10_000_000;
const DEV_SANDBOX_RESOURCE_STACK = 500;
const DEV_TOWER_LOADOUT_PREFIX = "dev_tower_block_";
const DEV_TOWER_WEAPON_ENCHANTMENT: EnchantmentLevel = 4;
const DEV_TOWER_ARMOR_ENCHANTMENT: EnchantmentLevel = 3;

const ARTIFACT_WEAPON_ITEM_IDS = new Set(
  FACTION_ARTIFACT_WEAPON_CONTENT.flatMap((specialization) =>
    specialization.items.map((item) => item.itemId),
  ),
);

export const DEV_SANDBOX_ARTIFACT_WEAPON_T4_ITEM_IDS = FACTION_ARTIFACT_WEAPON_CONTENT.map(
  (specialization) => {
    const tier4 = specialization.items.find((item) => item.tier === 4);
    if (tier4 === undefined) {
      throw new Error(
        `Dev sandbox artifact specialization ${specialization.specializationMasteryId} has no T4 item`,
      );
    }
    return tier4.itemId;
  },
);

export function isDevSandboxMode(): boolean {
  const viteEnv = (import.meta as ImportMeta & { readonly env?: { readonly DEV?: boolean } }).env;
  return viteEnv?.DEV === true
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
  enchantment: EnchantmentLevel,
): boolean {
  return inventoryManager
    .findEntriesByItemId(ownerId, itemId)
    .some((slot) => slot.entry?.enchantment === enchantment);
}

function ensureEquipmentVariant(
  inventoryManager: InventoryManager,
  ownerId: EntityId,
  itemId: string,
  enchantment: EnchantmentLevel,
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
    for (const item of specialization.items) {
      ensureEquipmentVariant(inventoryManager, bankId, item.itemId, 0);
      ensureEquipmentVariant(inventoryManager, bankId, item.itemId, DEV_TOWER_WEAPON_ENCHANTMENT);
    }
  }
}

function resolveGenericArmorItemId(slot: EquipmentSlot, tier: ProductionTier): string {
  const itemId = Object.keys(ITEM_DEFINITIONS).find((candidate) => {
    if (ARTIFACT_WEAPON_ITEM_IDS.has(candidate)) return false;
    if (getItemTier(candidate) !== tier) return false;
    return resolveEquipmentInfo(candidate)?.slot === slot;
  });
  if (itemId === undefined) {
    throw new Error(`Dev sandbox has no T${String(tier)} ${slot} item for Tower loadout`);
  }
  return itemId;
}

function resolveCounterWeaponItemId(targetFactionId: string, tier: ProductionTier): string {
  const counterFaction = (Object.entries(FACTION_ARTIFACT_ADVANTAGE) as readonly [ArtifactFaction, ArtifactFaction][])
    .find(([, targetFaction]) => targetFaction.toLowerCase() === targetFactionId)?.[0];
  if (counterFaction === undefined) {
    throw new Error(`Dev sandbox has no artifact counter faction for ${targetFactionId}`);
  }

  const specialization = FACTION_ARTIFACT_WEAPON_CONTENT.find(
    (entry) => entry.artifactFaction === counterFaction,
  );
  const item = specialization?.items.find((entry) => entry.tier === tier);
  if (item === undefined) {
    throw new Error(
      `Dev sandbox has no T${String(tier)} ${counterFaction} artifact weapon for Tower loadout`,
    );
  }
  return item.itemId;
}

function resolveFactionCapeItemId(targetFactionId: string, tier: ProductionTier): string {
  const cape = FACTION_CAPE_CONTENT.find(
    (entry) => entry.factionId === targetFactionId && entry.tier === tier,
  );
  if (cape === undefined) {
    throw new Error(`Dev sandbox has no T${String(tier)} ${targetFactionId} cape for Tower loadout`);
  }
  return cape.itemId;
}

function resolveBankLoadoutSlot(
  inventoryManager: InventoryManager,
  bankId: EntityId,
  itemId: string,
  enchantment: EnchantmentLevel,
): EquipmentLoadoutSlot {
  const inventorySlot = inventoryManager
    .findEntriesByItemId(bankId, itemId)
    .find((entry) => entry.entry?.enchantment === enchantment);
  const entry = inventorySlot?.entry;
  const equipment = resolveEquipmentInfo(itemId);
  if (entry === undefined || equipment === undefined) {
    throw new Error(
      `Dev sandbox Tower loadout item missing from bank: ${itemId}.${String(enchantment)}`,
    );
  }
  return {
    slot: equipment.slot,
    instanceId: entry.instanceId,
    itemId,
    enchantment,
  };
}

function seedTowerTestLoadouts(
  inventoryManager: InventoryManager,
  equipmentManager: EquipmentManager,
  heroId: EntityId,
  bankId: EntityId,
): void {
  const existing = equipmentManager
    .getLoadouts(heroId)
    .filter((loadout) => !loadout.id.startsWith(DEV_TOWER_LOADOUT_PREFIX));

  const towerLoadouts: EquipmentLoadout[] = TOWER_TRIAL_BLOCKS.map((block) => {
    const tier = block.tier as ProductionTier;
    const armorItemIds = [
      resolveGenericArmorItemId("head", tier),
      resolveGenericArmorItemId("chest", tier),
      resolveGenericArmorItemId("boots", tier),
      resolveFactionCapeItemId(block.factionId, tier),
    ];
    const weaponItemId = resolveCounterWeaponItemId(block.factionId, tier);

    for (const itemId of armorItemIds) {
      ensureEquipmentVariant(
        inventoryManager,
        bankId,
        itemId,
        DEV_TOWER_ARMOR_ENCHANTMENT,
      );
    }
    ensureEquipmentVariant(
      inventoryManager,
      bankId,
      weaponItemId,
      DEV_TOWER_WEAPON_ENCHANTMENT,
    );

    return {
      id: `${DEV_TOWER_LOADOUT_PREFIX}${String(block.blockIndex + 1)}`,
      name: `Tour B${String(block.blockIndex + 1)} · T${String(block.tier)} ${block.factionId} · .4/.3`,
      slots: [
        ...armorItemIds.map((itemId) => resolveBankLoadoutSlot(
          inventoryManager,
          bankId,
          itemId,
          DEV_TOWER_ARMOR_ENCHANTMENT,
        )),
        resolveBankLoadoutSlot(
          inventoryManager,
          bankId,
          weaponItemId,
          DEV_TOWER_WEAPON_ENCHANTMENT,
        ),
      ],
    };
  });

  equipmentManager._restoreLoadouts(heroId, [...existing, ...towerLoadouts]);
}

export function seedDevSandboxEconomy(dependencies: {
  readonly inventoryManager: InventoryManager;
  readonly equipmentManager: EquipmentManager;
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
  seedTowerTestLoadouts(
    dependencies.inventoryManager,
    dependencies.equipmentManager,
    dependencies.heroId,
    dependencies.bankId,
  );
}
