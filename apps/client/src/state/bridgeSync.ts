import type { EntityId } from "@game/core";
import type { InventoryManager, EquipmentManager, StatsManager, StatId, EquipmentSlot, CurrencyService, WalletId, VendorRegistry, WorkerId, AbilityManager, AbilityId, DurabilityStore, RepairCostResolver, ItemInstanceId } from "@game/gameplay";
import { EQUIPMENT_SLOTS, getEnchantmentLevel, canCraftRecipe } from "@game/gameplay";
import type { GameBridge, InventoryVM, InventorySlotVM, EquipmentSlotVM, StatEntryVM, VendorOfferVM, WorldVM, MasteryVM, WorkerVM, WorkerProfessionVM, CraftingRecipeVM, GatheringVM, RefiningVM } from "../game/GameBridge";
import { resolveEquipmentPresentation } from "../data/equipmentPresentation";
import { CLIENT_ABILITIES, resolvePrimaryAbilityId } from "../data/weaponContentCatalog";
import { resolveRepairableInfo } from "../data/itemContentCatalog";
import { isProductionMaterial } from "../runtime/ProductionStorage.js";

const STAT_IDS: readonly StatId[] = [
  "stat_max_health" as StatId,
  "stat_max_energy" as StatId,
  "stat_physical_damage" as StatId,
  "stat_magical_damage" as StatId,
  "stat_armor" as StatId,
  "stat_magic_resistance" as StatId,
  "stat_attack_speed" as StatId,
  "stat_move_speed" as StatId,
];

export function syncInventoryToBridge(bridge: GameBridge, inventoryManager: InventoryManager, entityId: EntityId): void {
  const slots = inventoryManager.listSlots(entityId);
  const slotVMs: InventorySlotVM[] = slots.map((s) => ({
    position: s.position,
    itemId: s.entry?.itemId,
    instanceId: s.entry?.instanceId,
    quantity: s.entry?.quantity ?? 0,
    enchantment: s.entry === undefined ? 0 : getEnchantmentLevel(s.entry),
  }));
  const vm: InventoryVM = {
    slots: slotVMs,
    capacity: inventoryManager.getCapacity(entityId),
    occupied: inventoryManager.getOccupiedCount(entityId),
  };
  bridge.updateInventory(vm);
}

export function syncBankToBridge(
  bridge: GameBridge,
  inventoryManager: InventoryManager,
  entityId: EntityId,
): void {
  const slots: InventorySlotVM[] = inventoryManager.listSlots(entityId).map((slot) => ({
    position: slot.position,
    itemId: slot.entry?.itemId,
    instanceId: slot.entry?.instanceId,
    quantity: slot.entry?.quantity ?? 0,
    enchantment: getEnchantmentLevel(slot.entry),
  }));
  bridge.updateBank({
    slots,
    capacity: inventoryManager.getCapacity(entityId),
    occupied: slots.filter((slot) => slot.itemId !== undefined).length,
  });
}

export function syncEquipmentToBridge(bridge: GameBridge, equipmentManager: EquipmentManager, entityId: EntityId): void {
  const equipped = equipmentManager.getEquipped(entityId);
  const slotVMs: EquipmentSlotVM[] = EQUIPMENT_SLOTS.map((slot: EquipmentSlot) => {
    const entry = equipped.get(slot);
    const presentation = resolveEquipmentPresentation(entry?.itemId);
    return {
      slot,
      itemId: entry?.itemId,
      instanceId: entry?.instanceId,
      enchantment: getEnchantmentLevel(entry),
      visualManifestId: presentation?.actorManifestId,
      combatPresentationProfileId: presentation?.combatProfileId,
    };
  });
  bridge.updateEquipment({ slots: slotVMs });
}

export function syncStatsToBridge(bridge: GameBridge, statsManager: StatsManager, entityId: EntityId): void {
  const entries: StatEntryVM[] = STAT_IDS.map((id) => {
    const val = statsManager.getStat(entityId, id);
    return { id, base: val.base, computed: val.computed };
  });
  bridge.updateStats({ stats: entries });
}

export function syncWalletToBridge(
  bridge: GameBridge,
  currencyService: CurrencyService,
  walletId: WalletId,
  incomeRate: number,
): void {
  const result = currencyService.getBalance(walletId, "currency_silver");
  const silver = result.ok ? result.value : 0;
  bridge.updateWallet({ silver, incomeRate });
}

export function syncVendorToBridge(
  bridge: GameBridge,
  vendorRegistry: VendorRegistry,
  vendorId: string,
): void {
  const vendor = vendorRegistry.get(vendorId);
  if (vendor === undefined) {
    return;
  }
  const offers: VendorOfferVM[] = vendor.offers
    .filter((o) => o.enabled)
    .map((o) => ({
      itemId: o.itemId,
      buyPrice: o.buyPrice,
      sellPrice: o.sellPrice,
      maxPerTransaction: o.maxPerTransaction,
    }));
  bridge.updateVendor({
    vendorId: vendor.vendorId,
    role: vendor.role,
    offers,
  });
}

import type { ProgressionOrchestrator } from "@game/gameplay";
import { MASTERY_DEFINITIONS, getMasteryDisplayName } from "../data/progressionContentCatalog.js";

export function buildMasteryViewModels(
  state: ReturnType<ProgressionOrchestrator["getFullProgressionState"]>,
): MasteryVM[] {
  return [...state.masteries.values()].map((mastery) => {
    const definition = MASTERY_DEFINITIONS.find((entry) => entry.id === mastery.masteryId);
    const requirements = definition?.experiencePerLevel ?? [];
    const fallbackRequirement = requirements[requirements.length - 1] ?? 0;

    return {
      id: mastery.masteryId,
      displayName: getMasteryDisplayName(mastery.masteryId),
      category: definition?.category ?? "unknown",
      isUnlocked: mastery.isUnlocked,
      level: mastery.level,
      currentXp: mastery.currentXp,
      xpToNextLevel: mastery.level >= (definition?.maxLevel ?? 0)
        ? 0
        : (requirements[mastery.level] ?? fallbackRequirement),
      totalLifetimeXp: mastery.totalLifetimeXp,
      maxLevel: definition?.maxLevel ?? 0,
    };
  });
}

export function syncProgressionToBridge(
  bridge: GameBridge,
  totalFame: number,
  overflowPool: number,
  masteries: readonly MasteryVM[],
): void {
  bridge.updateProgression({ totalFame, overflowPool, masteries });
}

export function collectRepairPreviewData(
  equipmentManager: EquipmentManager,
  inventoryManager: InventoryManager,
  durabilityStore: DurabilityStore,
  repairCostResolver: RepairCostResolver,
  heroId: EntityId,
  stationModifier: number = 1.0,
): { instanceId: string; itemId: string; currentDurability: number; maxDurability: number; repairCost: number }[] {
  const items: { instanceId: string; itemId: string; currentDurability: number; maxDurability: number; repairCost: number }[] = [];

  const addIfDamaged = (instanceId: ItemInstanceId, itemId: string): void => {
    const durability = durabilityStore.get(instanceId);
    if (durability === undefined || durability.current >= durability.max) {
      return;
    }
    const info = resolveRepairableInfo(itemId);
    if (info === undefined) {
      return;
    }
    const cost = repairCostResolver.resolveCost(
      info.equipmentCategory,
      info.itemTier,
      durability.current,
      durability.max,
      stationModifier,
    );
    items.push({
      instanceId,
      itemId,
      currentDurability: durability.current,
      maxDurability: durability.max,
      repairCost: cost.ok ? cost.value : 0,
    });
  };

  for (const entry of equipmentManager.getEquipped(heroId).values()) {
    addIfDamaged(entry.instanceId, entry.itemId);
  }

  for (const slot of inventoryManager.listSlots(heroId)) {
    if (slot.entry !== undefined) {
      addIfDamaged(slot.entry.instanceId, slot.entry.itemId);
    }
  }

  return items;
}

export function syncRepairToBridge(
  bridge: GameBridge,
  repairItems: readonly { instanceId: string; itemId: string; currentDurability: number; maxDurability: number; repairCost: number }[],
): void {
  let totalCost = 0;
  const items = repairItems.map((item) => {
    totalCost += item.repairCost;
    return {
      instanceId: item.instanceId,
      itemId: item.itemId,
      currentDurability: item.currentDurability,
      maxDurability: item.maxDurability,
      repairCost: item.repairCost,
    };
  });
  bridge.updateRepair({ items, totalCost });
}

export function syncWorldToBridge(
  bridge: GameBridge,
  world: WorldVM,
): void {
  bridge.updateWorld(world);
}

export function syncAllToBridge(
  bridge: GameBridge,
  inventoryManager: InventoryManager,
  equipmentManager: EquipmentManager,
  statsManager: StatsManager,
  currencyService: CurrencyService,
  walletId: WalletId,
  incomeRate: number,
  vendorRegistry: VendorRegistry,
  vendorId: string,
  entityId: EntityId,
  totalFame: number,
  overflowPool: number,
  masteries: readonly MasteryVM[],
): void {
  syncInventoryToBridge(bridge, inventoryManager, entityId);
  syncEquipmentToBridge(bridge, equipmentManager, entityId);
  syncStatsToBridge(bridge, statsManager, entityId);
  syncWalletToBridge(bridge, currencyService, walletId, incomeRate);
  syncVendorToBridge(bridge, vendorRegistry, vendorId);
  syncProgressionToBridge(bridge, totalFame, overflowPool, masteries);
}

export const WORKER_PROFESSION_LABELS: Record<WorkerProfessionVM, string> = {
  woodcutter: "Bûcheron",
  miner: "Mineur",
  stonecutter: "Tailleur de pierre",
  skinner: "Dépeceur",
  fiber_harvester: "Herboriste",
};

export function getWorkerResourceLabel(profession: WorkerProfessionVM, tier: 3 | 4): string {
  switch (profession) {
    case "woodcutter": return tier === 4 ? "Bois de pin" : "Bois de bouleau";
    case "miner": return tier === 4 ? "Minerai de fer" : "Minerai de cuivre";
    case "stonecutter": return "Pierre";
    case "skinner": return tier === 4 ? "Peau épaisse" : "Peau robuste";
    case "fiber_harvester": return tier === 4 ? "Fibre fine" : "Fibre de lin";
  }
}

export function syncWorkersToBridge(
  bridge: GameBridge,
  workers: readonly {
    id: WorkerId;
    displayName: string;
    profession: WorkerProfessionVM;
    mastery: number;
  }[],
  isSupportedProfession: (profession: string) => boolean,
  getWorkerSession: (workerId: WorkerId) => { state: string; getProgress: () => number; totalTicks?: number } | undefined,
  getAssignedTier: (workerId: WorkerId) => 3 | 4,
  getWorkerMasteryDetails: (masteryXp: number, tier: 3 | 4) => {
    masteryLevel: number;
    currentThreshold: number;
    nextThreshold: number;
    speedModifier: number;
  },
  capacity: number,
  recruitmentCost: number,
): void {
  const workerVMs: WorkerVM[] = workers
    .filter((w) => isSupportedProfession(w.profession))
    .map((w) => {
      const session = getWorkerSession(w.id);
      const assignedTier = getAssignedTier(w.id);
      const { masteryLevel, currentThreshold, nextThreshold, speedModifier } =
        getWorkerMasteryDetails(w.mastery, assignedTier);

      return {
        id: w.id,
        displayName: w.displayName,
        profession: w.profession,
        professionName: WORKER_PROFESSION_LABELS[w.profession],
        productionTier: assignedTier,
        resourceName: getWorkerResourceLabel(w.profession, assignedTier),
        state: session?.state === "executing"
          ? "working"
          : session?.state === "paused"
            ? "paused"
            : "idle",
        mastery: masteryLevel,
        masteryXp: w.mastery - currentThreshold,
        masteryXpToNext: nextThreshold - currentThreshold,
        progress: Math.round((session?.getProgress() ?? 0) * 100),
        durationSeconds: (
          session?.totalTicks
          ?? Math.ceil(60 / speedModifier)
        ) * 0.5,
        yieldPerCycle: 1,
      };
    });

  bridge.updateWorkers({
    capacity,
    recruitmentCost,
    workers: workerVMs,
  });
}

export function syncCraftingToBridge(
  bridge: GameBridge,
  inventoryManager: InventoryManager,
  heroId: EntityId,
  productionStorageId: EntityId,
  productionTier: 3 | 4,
  resourceOutputItemIds: {
    woodItemId: string;
    metalItemId: string;
    leatherItemId: string;
    clothItemId: string;
  },
  getItemPowerFn: (itemId: string) => number | undefined,
  craftRecipes: readonly {
    family: CraftingRecipeVM["family"];
    name: string;
    outputItemId: string;
    tier: number;
    requirements: readonly { itemId: string; quantity: number }[];
  }[],
): void {
  const plankQuantity = inventoryManager.getTotalQuantity(productionStorageId, resourceOutputItemIds.woodItemId);
  const barQuantity = inventoryManager.getTotalQuantity(productionStorageId, resourceOutputItemIds.metalItemId);
  const leatherQuantity = inventoryManager.getTotalQuantity(productionStorageId, resourceOutputItemIds.leatherItemId);
  const clothQuantity = inventoryManager.getTotalQuantity(productionStorageId, resourceOutputItemIds.clothItemId);

  const recipes: CraftingRecipeVM[] = craftRecipes.map((recipe) => {
    const requirements = recipe.requirements.map((requirement) => ({
      itemId: requirement.itemId,
      quantity: requirement.quantity,
      available: inventoryManager.getTotalQuantity(
        isProductionMaterial(requirement.itemId) ? productionStorageId : heroId,
        requirement.itemId,
      ),
    }));
    const plankRequirement = requirements.find((entry) => entry.itemId.includes("planks"));
    const barRequirement = requirements.find((entry) => entry.itemId.includes("bar"));

    const canCraft = canCraftRecipe(inventoryManager, heroId, recipe.requirements, {
      itemId: recipe.outputItemId,
      quantity: 1,
    }, (itemId) => isProductionMaterial(itemId) ? productionStorageId : heroId);
    const missingRequirement = requirements.find(
      (requirement) => requirement.available < requirement.quantity,
    );
    const missingIsPredecessor = missingRequirement !== undefined
      && craftRecipes.some(
        (candidate) =>
          candidate.outputItemId === missingRequirement.itemId
          && candidate.tier === recipe.tier - 1,
      );

    return {
      family: recipe.family,
      recipeName: recipe.name,
      outputItemId: recipe.outputItemId,
      tier: recipe.tier,
      itemPower: getItemPowerFn(recipe.outputItemId) ?? 0,
      plankRequired: plankRequirement?.quantity ?? 0,
      barRequired: barRequirement?.quantity ?? 0,
      plankAvailable: plankRequirement?.available ?? 0,
      barAvailable: barRequirement?.available ?? 0,
      plankItemId: plankRequirement?.itemId ?? "",
      barItemId: barRequirement?.itemId ?? "",
      requirements,
      craftedQuantity: inventoryManager.getTotalQuantity(heroId, recipe.outputItemId),
      canCraft,
      ...(canCraft
        ? {}
        : {
            blockedReason: missingRequirement === undefined
              ? "inventory_full" as const
              : missingIsPredecessor
                ? "missing_predecessor" as const
                : "missing_materials" as const,
          }),
    };
  });

  bridge.updateCrafting({
    productionTier,
    plankQuantity,
    barQuantity,
    leatherQuantity,
    clothQuantity,
    recipes,
  });
}

export function syncGatheringToBridge(
  updateBridge: (vm: GatheringVM) => void,
  session: { id: string | number; getRequiredTicks: () => number; getElapsedTicks: (tick: number) => number } | undefined,
  currentTick: number,
  masteryLevel: number,
  requiredMasteryLevel: number,
  defaultDurationTicks: number,
  resourceName: string,
  resourceFamily: GatheringVM["resourceFamily"],
  visualManifestId: string,
  resourceTier: 3 | 4,
  storedQuantity: number,
  strikesUsed: number,
): void {
  const requiredTicks = session?.getRequiredTicks() ?? defaultDurationTicks;
  const elapsedTicks = session?.getElapsedTicks(currentTick) ?? 0;

  updateBridge({
    status: session === undefined ? "idle" : "gathering",
    resourceName,
    resourceFamily,
    visualManifestId,
    resourceTier,
    masteryLevel,
    requiredMasteryLevel,
    isMasteryUnlocked: masteryLevel >= requiredMasteryLevel,
    progress: session === undefined
      ? 0
      : Math.min(100, Math.round((elapsedTicks / requiredTicks) * 100)),
    durationSeconds: requiredTicks * 0.5,
    storedQuantity,
    activeMiniGame: session === undefined
      ? undefined
      : {
          cycleId: String(session.id),
          strikesUsed,
        },
  });
}

export function syncRefiningToBridge(
  updateBridge: (vm: RefiningVM) => void,
  session: { getRequiredTicks: () => number; getProgress: (tick: number) => number } | undefined,
  currentTick: number,
  recipe: {
    name: string;
    durationTicks: number;
    requirements: readonly { itemId: string; quantity: number }[];
    outputQuantity: number;
    rawItemId: string;
    outputItemId: string;
  },
  reservedInputs: readonly { itemId: string; quantity: number }[],
  inventoryManager: InventoryManager,
  productionStorageId: EntityId,
): void {
  const requiredTicks = session?.getRequiredTicks() ?? recipe.durationTicks;

  updateBridge({
    status: session === undefined ? "idle" : "refining",
    recipeName: recipe.name,
    progress: session === undefined
      ? 0
      : Math.min(100, Math.round(session.getProgress(currentTick) * 100)),
    durationSeconds: requiredTicks * 0.5,
    inputQuantity: recipe.requirements[0]?.quantity ?? 0,
    outputQuantity: recipe.outputQuantity,
    rawStoredQuantity: inventoryManager.getTotalQuantity(productionStorageId, recipe.rawItemId),
    refinedStoredQuantity: inventoryManager.getTotalQuantity(productionStorageId, recipe.outputItemId),
    reservedInputQuantity: session === undefined
      ? 0
      : reservedInputs.reduce((total, entry) => total + entry.quantity, 0),
    requirements: recipe.requirements.map((requirement) => ({
      itemId: requirement.itemId,
      quantity: requirement.quantity,
      available: inventoryManager.getTotalQuantity(productionStorageId, requirement.itemId),
      reserved: reservedInputs.find((entry) => entry.itemId === requirement.itemId)?.quantity ?? 0,
    })),
  });
}

export function syncAbilitiesToBridge(
  bridge: GameBridge,
  abilityManager: AbilityManager,
  heroId: EntityId,
  equippedWeaponId: string | undefined,
  isAutoCastEnabled: boolean,
): void {
  const abilityId = resolvePrimaryAbilityId(equippedWeaponId);
  const definition = abilityId === undefined ? undefined : CLIENT_ABILITIES[abilityId];
  const entry = abilityId === undefined
    ? undefined
    : abilityManager.getAbility(heroId, abilityId as AbilityId);
  const energy = abilityManager.getEnergy(heroId);

  bridge.updateAbilities({
    primary: definition === undefined || entry === undefined
      ? null
      : {
          id: definition.id,
          name: definition.name,
          description: definition.description,
          icon: definition.icon,
          shortcut: "Q",
          cooldown: definition.cooldown,
          cooldownRemaining: Math.max(0, entry.cooldownRemaining),
          energyCost: definition.resourceCost.energy ?? 0,
          isReady:
            entry.state === "ready"
            && energy.currentEnergy >= (definition.resourceCost.energy ?? 0)
            && bridge.combatState === "combat",
          autoCast: isAutoCastEnabled,
        },
    currentEnergy: energy.currentEnergy,
    maxEnergy: energy.maxEnergy,
  });
}
