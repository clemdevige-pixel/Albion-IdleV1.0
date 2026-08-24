import type { EntityId, World } from "@game/core";
import { getInitialIslandStorageLevelDefinition } from "@game/data";
import {
  DeathComponent,
  EnchantmentService,
  EquipmentManager,
  EquipmentStatSync,
  HealthComponent,
  InventoryManager,
  type AwakenedWeaponService,
  type CurrencyService,
  type DamageManager,
  type DurabilityStore,
  type EnchantmentServiceOptions,
  type ItemInstanceId,
  type MasteryService,
  type StatId,
  type StatsManager,
  type WalletId,
} from "@game/gameplay";
import { resolveEquipmentInfo, resolveItemStackInfo } from "../../data/itemContentCatalog.js";
import { resolveAuthoredEnchantmentItemInfo } from "../../data/enchantmentItemPolicy.js";
import { getStarterLoadoutItemIds, getStarterWeaponOptions } from "../../data/starterLoadoutCatalog.js";
import { resolveWeaponMastery } from "../../data/weaponContentCatalog.js";
import { PlayerInventoryManager } from "../PlayerInventoryManager.js";
import { isProductionMaterial } from "../ProductionStorage.js";
import {
  isDevSandboxMode,
  seedDevSandboxEconomy,
} from "../devSandbox.js";
import { recalculateWeaponProgressionStats } from "../weaponMasteryStatSync.js";

const STAT_MAX_HEALTH = "stat_max_health" as StatId;
const INITIAL_ISLAND_STORAGE = getInitialIslandStorageLevelDefinition();

interface CharacterEquipmentFoundationDependencies {
  readonly world: World;
  readonly statsManager: StatsManager;
  readonly damageManager: DamageManager;
  readonly masteryService: MasteryService;
  readonly getAwakenedWeaponService?: () => AwakenedWeaponService | undefined;
  readonly canMutateEquipment?: (entityId: EntityId) => boolean;
  readonly onPlayerHealthChanged: (currentHealth: number, maxHealth: number) => void;
  readonly onStatsChanged: (entityId: EntityId) => void;
}

export function createCharacterEquipmentFoundation({
  world,
  statsManager,
  damageManager,
  masteryService,
  getAwakenedWeaponService,
  canMutateEquipment,
  onPlayerHealthChanged,
  onStatsChanged,
}: CharacterEquipmentFoundationDependencies) {
  const inventoryManager = new PlayerInventoryManager(world, resolveItemStackInfo);
  const syncWeaponProgressionStats = (entityId: EntityId): void => {
    recalculateWeaponProgressionStats(
      statsManager,
      equipmentManager,
      masteryService,
      entityId,
      getAwakenedWeaponService?.(),
    );
  };
  const equipmentStatSync = new EquipmentStatSync(
    statsManager,
    resolveEquipmentInfo,
    (entityId, changedStats) => {
      syncWeaponProgressionStats(entityId);
      if (changedStats.includes(STAT_MAX_HEALTH) && world.hasComponent(entityId, HealthComponent)) {
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
    syncWeaponProgressionStats,
    syncWeaponMasteryStats: syncWeaponProgressionStats,
  };
}

interface CharacterStorageFoundationDependencies {
  readonly world: World;
  readonly heroId: EntityId;
  readonly inventoryManager: PlayerInventoryManager;
  readonly equipmentManager: EquipmentManager;
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
  readonly canEnchantNow?: () => boolean;
  readonly onEnchantmentCommitted?: EnchantmentServiceOptions["onEnchantmentCommitted"];
}

export function createCharacterStorageFoundation({
  world,
  heroId,
  inventoryManager,
  equipmentManager,
  currencyService,
  walletId,
  canEnchantNow,
  onEnchantmentCommitted,
}: CharacterStorageFoundationDependencies) {
  const devSandbox = isDevSandboxMode();
  inventoryManager.createInventory(heroId, devSandbox ? 96 : 24);
  const bankId = world.createEntity();
  inventoryManager.createInventory(bankId, devSandbox ? 512 : 64);
  inventoryManager.setAccessibleStorageOwners(heroId, [heroId, bankId]);
  const productionStorageId = world.createEntity();
  inventoryManager.createInventory(
    productionStorageId,
    devSandbox ? 512 : INITIAL_ISLAND_STORAGE.capacity,
  );
  equipmentManager.attachEquipment(heroId);

  seedDevSandboxEconomy({
    inventoryManager,
    heroId,
    bankId,
    productionStorageId,
    currencyService,
    walletId,
  });

  const canEnchant = canEnchantNow === undefined
    ? undefined
    : () => canEnchantNow() || world.tryGetComponent(heroId, DeathComponent)?.isDead === true;
  const enchantmentService = new EnchantmentService({
    inventoryManager,
    currencyService,
    walletId,
    inventoryOwnerId: heroId,
    inventoryOwnerIds: [heroId, bankId],
    resolveMaterialOwnerId: (itemId) => isProductionMaterial(itemId) ? productionStorageId : heroId,
    resolveItemInfo: resolveAuthoredEnchantmentItemInfo,
    ...(canEnchant === undefined ? {} : { canEnchantNow: canEnchant }),
    ...(onEnchantmentCommitted === undefined ? {} : { onEnchantmentCommitted }),
    findEquippedEntry: (instanceId: ItemInstanceId) => (
      [...equipmentManager.getEquipped(heroId).values()]
        .find((entry) => entry.instanceId === instanceId)
    ),
    changeEquippedEnchantment: (instanceId: ItemInstanceId, enchantment) => (
      equipmentManager.changeEquippedEnchantment(heroId, instanceId, enchantment)
    ),
  });
  return { bankId, productionStorageId, enchantmentService };
}

interface StarterLoadoutDependencies {
  readonly heroId: EntityId;
  readonly inventoryManager: InventoryManager;
  readonly equipmentManager: EquipmentManager;
  readonly durabilityStore: DurabilityStore;
  readonly masteryService: MasteryService;
  readonly weaponItemId?: string;
}

export function initializeStarterLoadout({
  heroId,
  inventoryManager,
  equipmentManager,
  durabilityStore,
  masteryService,
  weaponItemId = "item_weapon_sword_t3_broadsword",
}: StarterLoadoutDependencies): boolean {
  const starterOption = getStarterWeaponOptions().find((option) => option.itemId === weaponItemId);
  const loadoutItemIds = getStarterLoadoutItemIds(weaponItemId);
  const masteryRoute = resolveWeaponMastery(weaponItemId);
  if (starterOption === undefined || loadoutItemIds === undefined || masteryRoute === undefined) return false;

  for (const itemId of loadoutItemIds) {
    const position = inventoryManager.findFreeSlots(heroId)[0];
    if (position === undefined) return false;
    const added = inventoryManager.addEntry(heroId, itemId, position);
    if (!added.ok) return false;
    durabilityStore.attach(added.value.instanceId, 100);
    const equipped = equipmentManager.equipFromInventory(heroId, position);
    if (!equipped.ok) return false;
  }
  masteryService.discoverMastery(masteryRoute.familyId);
  masteryService.discoverMastery(masteryRoute.weaponId);
  return true;
}

export type CharacterEquipmentFoundation = ReturnType<typeof createCharacterEquipmentFoundation>;
export type CharacterStorageFoundation = ReturnType<typeof createCharacterStorageFoundation>;
