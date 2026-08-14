import type { EntityId, World } from "@game/core";
import { getInitialIslandStorageLevelDefinition } from "@game/data";
import {
  EnchantmentService,
  EquipmentManager,
  EquipmentStatSync,
  HealthComponent,
  InventoryManager,
  type CurrencyService,
  type DamageManager,
  type DurabilityStore,
  type ItemInstanceId,
  type MasteryService,
  type StatId,
  type StatsManager,
  type WalletId,
} from "@game/gameplay";
import {
  resolveEquipmentInfo,
  resolveEnchantmentItemInfo,
  resolveItemStackInfo,
} from "../../data/itemContentCatalog.js";
import { resolveWeaponMastery } from "../../data/weaponContentCatalog.js";
import { isProductionMaterial } from "../ProductionStorage.js";
import { recalculateWeaponMasteryStats } from "../weaponMasteryStatSync.js";

const STAT_MAX_HEALTH = "stat_max_health" as StatId;
const INITIAL_ISLAND_STORAGE = getInitialIslandStorageLevelDefinition();

interface CharacterEquipmentFoundationDependencies {
  readonly world: World;
  readonly statsManager: StatsManager;
  readonly damageManager: DamageManager;
  readonly masteryService: MasteryService;
  readonly canMutateEquipment?: (entityId: EntityId) => boolean;
  readonly onPlayerHealthChanged: (currentHealth: number, maxHealth: number) => void;
  readonly onStatsChanged: (entityId: EntityId) => void;
}

/**
 * Creates the authoritative inventory/equipment managers and their stat bridge.
 * UI callbacks and mutation policy are injected so this assembly remains
 * independent from React and from combat implementation details.
 */
export function createCharacterEquipmentFoundation({
  world,
  statsManager,
  damageManager,
  masteryService,
  canMutateEquipment,
  onPlayerHealthChanged,
  onStatsChanged,
}: CharacterEquipmentFoundationDependencies) {
  const inventoryManager = new InventoryManager(world, resolveItemStackInfo);
  const syncWeaponMasteryStats = (entityId: EntityId): void => {
    recalculateWeaponMasteryStats(
      statsManager,
      equipmentManager,
      masteryService,
      entityId,
    );
  };

  const equipmentStatSync = new EquipmentStatSync(
    statsManager,
    resolveEquipmentInfo,
    (entityId, changedStats) => {
      syncWeaponMasteryStats(entityId);
      if (
        changedStats.includes(STAT_MAX_HEALTH) &&
        world.hasComponent(entityId, HealthComponent)
      ) {
        damageManager.syncMaxHealth(entityId);
        const health = damageManager.getHealth(entityId);
        onPlayerHealthChanged(health.currentHealth, health.maxHealth);
      }
      onStatsChanged(entityId);
    },
  );

  const equipmentManager = new EquipmentManager(
    world,
    inventoryManager,
    resolveEquipmentInfo,
    equipmentStatSync,
    canMutateEquipment,
  );

  return {
    inventoryManager,
    equipmentManager,
    equipmentStatSync,
    syncWeaponMasteryStats,
  };
}

interface CharacterStorageFoundationDependencies {
  readonly world: World;
  readonly heroId: EntityId;
  readonly inventoryManager: InventoryManager;
  readonly equipmentManager: EquipmentManager;
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
}

/** Creates player inventory, bank, production storage and enchantment routing. */
export function createCharacterStorageFoundation({
  world,
  heroId,
  inventoryManager,
  equipmentManager,
  currencyService,
  walletId,
}: CharacterStorageFoundationDependencies) {
  inventoryManager.createInventory(heroId, 24);
  const bankId = world.createEntity();
  inventoryManager.createInventory(bankId, 64);
  const productionStorageId = world.createEntity();
  inventoryManager.createInventory(productionStorageId, INITIAL_ISLAND_STORAGE.capacity);
  equipmentManager.attachEquipment(heroId);

  const enchantmentService = new EnchantmentService({
    inventoryManager,
    currencyService,
    walletId,
    inventoryOwnerId: heroId,
    resolveMaterialOwnerId: (itemId) =>
      isProductionMaterial(itemId) ? productionStorageId : heroId,
    resolveItemInfo: resolveEnchantmentItemInfo,
    findEquippedEntry: (instanceId: ItemInstanceId) =>
      [...equipmentManager.getEquipped(heroId).values()]
        .find((entry) => entry.instanceId === instanceId),
    changeEquippedEnchantment: (instanceId: ItemInstanceId, enchantment) =>
      equipmentManager.changeEquippedEnchantment(heroId, instanceId, enchantment),
  });

  return { bankId, productionStorageId, enchantmentService };
}

interface StarterLoadoutDependencies {
  readonly heroId: EntityId;
  readonly inventoryManager: InventoryManager;
  readonly equipmentManager: EquipmentManager;
  readonly durabilityStore: DurabilityStore;
  readonly masteryService: MasteryService;
}

/** Seeds the validated starter weapons without granting unused masteries. */
export function initializeStarterLoadout({
  heroId,
  inventoryManager,
  equipmentManager,
  durabilityStore,
  masteryService,
}: StarterLoadoutDependencies): void {
  const starterSwordItemId = "item_weapon_sword_t3_broadsword";
  const starterSwordMasteryRoute = resolveWeaponMastery(starterSwordItemId);
  if (starterSwordMasteryRoute === undefined) {
    throw new Error("Starter Broadsword mastery route is missing from weapon content catalog");
  }

  const starterSwordPosition = 0;
  const starterSword = inventoryManager.addEntry(
    heroId,
    starterSwordItemId,
    starterSwordPosition,
  );
  if (starterSword.ok) {
    durabilityStore.attach(starterSword.value.instanceId, 100);
    equipmentManager.equipFromInventory(heroId, starterSwordPosition);
    masteryService.discoverMastery(starterSwordMasteryRoute.familyId);
    masteryService.discoverMastery(starterSwordMasteryRoute.weaponId);
  }

  for (const starterWeaponId of [
    "item_weapon_bow_t3_longbow",
    "item_weapon_staff_t3_infernal",
  ]) {
    const starterWeapon = inventoryManager.addEntry(heroId, starterWeaponId);
    if (starterWeapon.ok) {
      durabilityStore.attach(starterWeapon.value.instanceId, 100);
    }
  }
}

export type CharacterEquipmentFoundation = ReturnType<
  typeof createCharacterEquipmentFoundation
>;
export type CharacterStorageFoundation = ReturnType<
  typeof createCharacterStorageFoundation
>;
