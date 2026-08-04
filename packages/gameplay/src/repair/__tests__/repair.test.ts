import { describe, expect, it } from "vitest";
import { World, createRuntimeServices, type EntityId } from "@game/core";
import { CurrencyRegistry } from "../../currency/currency-registry.js";
import { CurrencyService } from "../../currency/currency-service.js";
import { asPlayerId, asWalletId } from "../../currency/types.js";
import { EquipmentManager } from "../../equipment/equipment-manager.js";
import type { EquipmentInfoLike } from "../../equipment/types.js";
import { InventoryManager } from "../../inventory/inventory-manager.js";
import type { ItemInstanceId } from "../../inventory/types.js";
import { DurabilityStore, removeDestroyedFromInventory } from "../durability-store.js";
import { DurabilitySaveProvider } from "../durability-save-provider.js";
import { RepairCostResolver } from "../repair-cost-resolver.js";
import { RepairStationRegistry } from "../repair-station-registry.js";
import { RepairService } from "../repair-service.js";
import type {
  RepairCostDefinitionLike,
  RepairStationDefinitionLike,
  RepairableInfoLike,
} from "../types.js";

const SILVER = "currency_silver";
const SWORD = "item_weapon_sword_t4_broadsword";
const HELMET = "item_armor_helmet_t4_plate";
const POTION = "item_potion_healing_minor";

const WALLET = asWalletId("wallet_1");
const PLAYER = asPlayerId("player_1");

const equipmentTable: Record<string, EquipmentInfoLike> = {
  [SWORD]: { itemId: SWORD, slot: "weapon", handling: "one_handed", stats: { attack: 10 } },
  [HELMET]: { itemId: HELMET, slot: "head", handling: "none", stats: { armor: 5 } },
};

const repairTable: Record<string, RepairableInfoLike> = {
  [SWORD]: { itemId: SWORD, equipmentCategory: "weapon", itemTier: 4 },
  [HELMET]: { itemId: HELMET, equipmentCategory: "armor", itemTier: 4 },
};

const costDefs: readonly RepairCostDefinitionLike[] = [
  { equipmentCategory: "weapon", itemTier: 4, baseRepairCost: 100, costMultiplier: 1, enabled: true },
  { equipmentCategory: "weapon", itemTier: 5, baseRepairCost: 100, costMultiplier: 2, enabled: true },
  { equipmentCategory: "armor", itemTier: 4, baseRepairCost: 60, costMultiplier: 1, enabled: true },
];

const forge: RepairStationDefinitionLike = {
  stationId: "station_forge_city",
  locationType: "city",
  repairModifier: 1,
  enabled: true,
};

const asInstance = (id: string): ItemInstanceId => id as ItemInstanceId;

interface Harness {
  world: World;
  currency: CurrencyService;
  inventory: InventoryManager;
  equipment: EquipmentManager;
  durability: DurabilityStore;
  costs: RepairCostResolver;
  stations: RepairStationRegistry;
  service: RepairService;
  player: EntityId;
}

function makeHarness(options?: {
  silver?: number;
  stations?: readonly RepairStationDefinitionLike[];
  inCombat?: boolean;
  locked?: readonly string[];
}): Harness {
  const currencyRegistry = new CurrencyRegistry();
  currencyRegistry.register({
    id: SILVER,
    enabled: true,
    minValue: 0,
    maxValue: 2147483647,
    acquisitionSources: ["Loot", "VendorSale"],
    spendingSources: ["Vendor", "Building", "Worker"],
  });
  const currency = new CurrencyService(currencyRegistry);
  currency.createWallet(WALLET, PLAYER);
  currency.credit(WALLET, SILVER, options?.silver ?? 10_000);

  const world = new World(createRuntimeServices());
  const inventory = new InventoryManager(world, () => undefined);
  const player = world.createEntity();
  inventory.createInventory(player, 10);
  const equipment = new EquipmentManager(world, inventory, (itemId) => equipmentTable[itemId]);
  equipment.attachEquipment(player);

  const costs = new RepairCostResolver();
  for (const def of costDefs) {
    const result = costs.register(def);
    if (!result.ok) throw new Error(`cost registration failed: ${result.reason}`);
  }
  const stations = new RepairStationRegistry();
  for (const station of options?.stations ?? [forge]) {
    const result = stations.register(station);
    if (!result.ok) throw new Error(`station registration failed: ${result.reason}`);
  }
  const durability = new DurabilityStore();
  const service = new RepairService(
    costs,
    stations,
    currency,
    inventory,
    equipment,
    durability,
    (itemId) => repairTable[itemId],
    () => options?.inCombat ?? false,
    (_entityId, itemId) => (options?.locked ?? []).includes(itemId),
  );
  return { world, currency, inventory, equipment, durability, costs, stations, service, player };
}

function addItem(
  h: Harness,
  itemId: string,
  instanceId: string,
  durability?: { current: number; max: number },
): ItemInstanceId {
  const id = asInstance(instanceId);
  const inserted = h.inventory.insertEntry(h.player, { instanceId: id, itemId, quantity: 1 });
  if (!inserted.ok) throw new Error("insert failed");
  if (durability !== undefined) {
    const attached = h.durability.attach(id, durability.max, durability.current);
    if (!attached.ok) throw new Error("attach failed");
  }
  return id;
}

function silverOf(h: Harness): number {
  const balance = h.currency.getBalance(WALLET, SILVER);
  return balance.ok ? balance.value : -1;
}

function repairRequest(h: Harness, instanceId: ItemInstanceId, txId = "tx_1") {
  return {
    transactionId: txId,
    playerEntityId: h.player,
    walletId: WALLET,
    stationId: forge.stationId,
    instanceId,
  };
}

describe("RepairCostResolver", () => {
  it("loads a valid cost definition and freezes it", () => {
    const costs = new RepairCostResolver();
    const result = costs.register(costDefs[0] as RepairCostDefinitionLike);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(costs.getDefinition("weapon", 4)).toBe(result.value);
  });

  it("rejects invalid cost definitions", () => {
    const costs = new RepairCostResolver();
    const base = costDefs[0] as RepairCostDefinitionLike;
    expect(costs.register({ ...base, equipmentCategory: "" }).ok).toBe(false);
    expect(costs.register({ ...base, itemTier: 0 }).ok).toBe(false);
    expect(costs.register({ ...base, baseRepairCost: -1 }).ok).toBe(false);
    expect(costs.register({ ...base, costMultiplier: 0 }).ok).toBe(false);
    costs.register(base);
    const duplicate = costs.register(base);
    expect(duplicate).toEqual({ ok: false, reason: "duplicate_cost_definition" });
  });

  it("computes a deterministic cost from missing durability", () => {
    const h = makeHarness();
    // ceil(100 * 1 * 1 * 50/100) = 50
    expect(h.costs.resolveCost("weapon", 4, 50, 100, 1)).toEqual({ ok: true, value: 50 });
    expect(h.costs.resolveCost("weapon", 4, 50, 100, 1)).toEqual({ ok: true, value: 50 });
  });

  it("costs more when more durability is missing", () => {
    const h = makeHarness();
    const light = h.costs.resolveCost("weapon", 4, 90, 100, 1);
    const heavy = h.costs.resolveCost("weapon", 4, 10, 100, 1);
    expect(light).toEqual({ ok: true, value: 10 });
    expect(heavy).toEqual({ ok: true, value: 90 });
  });

  it("applies tier through the cost table", () => {
    const h = makeHarness();
    const t4 = h.costs.resolveCost("weapon", 4, 50, 100, 1);
    const t5 = h.costs.resolveCost("weapon", 5, 50, 100, 1);
    expect(t4).toEqual({ ok: true, value: 50 });
    expect(t5).toEqual({ ok: true, value: 100 });
  });

  it("applies category through the cost table", () => {
    const h = makeHarness();
    const weapon = h.costs.resolveCost("weapon", 4, 50, 100, 1);
    const armor = h.costs.resolveCost("armor", 4, 50, 100, 1);
    expect(weapon).toEqual({ ok: true, value: 50 });
    expect(armor).toEqual({ ok: true, value: 30 });
  });

  it("applies the station repairModifier", () => {
    const h = makeHarness();
    const cheap = h.costs.resolveCost("weapon", 4, 50, 100, 0.5);
    expect(cheap).toEqual({ ok: true, value: 25 });
  });

  it("returns zero for intact durability and fails on unknown table entries", () => {
    const h = makeHarness();
    expect(h.costs.resolveCost("weapon", 4, 100, 100, 1)).toEqual({ ok: true, value: 0 });
    expect(h.costs.resolveCost("weapon", 9, 50, 100, 1)).toEqual({
      ok: false,
      reason: "cost_not_defined",
    });
  });
});

describe("RepairStationRegistry", () => {
  it("loads a valid station and freezes it", () => {
    const registry = new RepairStationRegistry();
    const result = registry.register(forge);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(registry.get(forge.stationId)).toBe(result.value);
  });

  it("rejects invalid stations", () => {
    const registry = new RepairStationRegistry();
    expect(registry.register({ ...forge, stationId: "" }).ok).toBe(false);
    expect(
      registry.register({ ...forge, locationType: "dungeon" as RepairStationDefinitionLike["locationType"] }),
    ).toEqual({ ok: false, reason: "invalid_location_type" });
    expect(registry.register({ ...forge, repairModifier: 0 }).ok).toBe(false);
    registry.register(forge);
    expect(registry.register(forge)).toEqual({ ok: false, reason: "duplicate_station" });
  });
});

describe("RepairService.previewRepair", () => {
  it("previews the cost without mutating any state", () => {
    const h = makeHarness();
    const sword = addItem(h, SWORD, "inst_sword", { current: 40, max: 100 });
    const before = silverOf(h);
    const preview = h.service.previewRepair(repairRequest(h, sword));
    expect(preview).toEqual({
      ok: true,
      value: {
        instanceId: sword,
        itemId: SWORD,
        currentDurability: 40,
        maxDurability: 100,
        cost: 60,
      },
    });
    expect(silverOf(h)).toBe(before);
    expect(h.durability.get(sword)).toEqual({ current: 40, max: 100 });
  });
});

describe("RepairService.repair", () => {
  it("repairs a damaged inventory item, fully restoring durability", () => {
    const h = makeHarness();
    const sword = addItem(h, SWORD, "inst_sword", { current: 38, max: 100 });
    const result = h.service.repair(repairRequest(h, sword));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.previousDurability).toBe(38);
    expect(result.value.newDurability).toBe(100);
    expect(h.durability.get(sword)).toEqual({ current: 100, max: 100 });
  });

  it("repairs a damaged equipped item", () => {
    const h = makeHarness();
    addItem(h, SWORD, "inst_sword", { current: 50, max: 100 });
    const equipped = h.equipment.equipFromInventory(h.player, 0);
    expect(equipped.ok).toBe(true);
    const result = h.service.repair(repairRequest(h, asInstance("inst_sword")));
    expect(result.ok).toBe(true);
    expect(h.durability.get(asInstance("inst_sword"))).toEqual({ current: 100, max: 100 });
    expect(h.equipment.getEquippedItem(h.player, "weapon")?.instanceId).toBe("inst_sword");
  });

  it("debits exactly the resolved cost", () => {
    const h = makeHarness({ silver: 1_000 });
    const sword = addItem(h, SWORD, "inst_sword", { current: 40, max: 100 });
    const result = h.service.repair(repairRequest(h, sword));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.silverCost).toBe(60);
    expect(silverOf(h)).toBe(940);
    expect(result.value.newBalance).toBe(940);
  });

  it("preserves item identity (instanceId, itemId, slot, quantity)", () => {
    const h = makeHarness();
    const sword = addItem(h, SWORD, "inst_sword", { current: 10, max: 100 });
    const before = h.inventory.findEntryByInstanceId(h.player, sword);
    const result = h.service.repair(repairRequest(h, sword));
    expect(result.ok).toBe(true);
    const after = h.inventory.findEntryByInstanceId(h.player, sword);
    expect(after?.position).toBe(before?.position);
    expect(after?.entry).toEqual(before?.entry);
    expect(h.durability.get(sword)?.max).toBe(100);
  });

  it("rejects an intact item", () => {
    const h = makeHarness();
    const sword = addItem(h, SWORD, "inst_sword", { current: 100, max: 100 });
    expect(h.service.repair(repairRequest(h, sword))).toEqual({
      ok: false,
      reason: "item_intact",
    });
  });

  it("rejects a destroyed item", () => {
    const h = makeHarness();
    const sword = addItem(h, SWORD, "inst_sword", { current: 5, max: 100 });
    const damaged = h.durability.applyDamage(sword, 5);
    expect(damaged).toEqual({ ok: true, value: { current: 0, destroyed: true } });
    expect(removeDestroyedFromInventory(h.inventory, h.player, sword)?.instanceId).toBe(sword);
    expect(h.service.repair(repairRequest(h, sword))).toEqual({
      ok: false,
      reason: "item_destroyed",
    });
  });

  it("rejects a non-repairable item", () => {
    const h = makeHarness();
    const potion = addItem(h, POTION, "inst_potion");
    expect(h.service.repair(repairRequest(h, potion))).toEqual({
      ok: false,
      reason: "not_repairable",
    });
  });

  it("rejects a missing item", () => {
    const h = makeHarness();
    expect(h.service.repair(repairRequest(h, asInstance("inst_ghost")))).toEqual({
      ok: false,
      reason: "item_not_found",
    });
  });

  it("rejects unknown or disabled stations", () => {
    const h = makeHarness({ stations: [forge, { ...forge, stationId: "station_off", enabled: false }] });
    const sword = addItem(h, SWORD, "inst_sword", { current: 40, max: 100 });
    const missing = { ...repairRequest(h, sword), stationId: "station_ghost" };
    expect(h.service.repair(missing)).toEqual({ ok: false, reason: "station_not_found" });
    const disabled = { ...repairRequest(h, sword), stationId: "station_off" };
    expect(h.service.repair(disabled)).toEqual({ ok: false, reason: "station_disabled" });
  });

  it("rejects repairs while in combat", () => {
    const h = makeHarness({ inCombat: true });
    const sword = addItem(h, SWORD, "inst_sword", { current: 40, max: 100 });
    expect(h.service.repair(repairRequest(h, sword))).toEqual({ ok: false, reason: "in_combat" });
  });

  it("rejects locked items", () => {
    const h = makeHarness({ locked: [SWORD] });
    const sword = addItem(h, SWORD, "inst_sword", { current: 40, max: 100 });
    expect(h.service.repair(repairRequest(h, sword))).toEqual({
      ok: false,
      reason: "item_locked",
    });
  });

  it("rejects insufficient silver and changes nothing", () => {
    const h = makeHarness({ silver: 10 });
    const sword = addItem(h, SWORD, "inst_sword", { current: 40, max: 100 });
    expect(h.service.repair(repairRequest(h, sword))).toEqual({
      ok: false,
      reason: "insufficient_silver",
    });
    expect(silverOf(h)).toBe(10);
    expect(h.durability.get(sword)).toEqual({ current: 40, max: 100 });
  });

  it("changes nothing after any validation failure", () => {
    const h = makeHarness({ locked: [SWORD] });
    const sword = addItem(h, SWORD, "inst_sword", { current: 40, max: 100 });
    const before = silverOf(h);
    h.service.repair(repairRequest(h, sword));
    expect(silverOf(h)).toBe(before);
    expect(h.durability.get(sword)).toEqual({ current: 40, max: 100 });
    expect(h.inventory.findEntryByInstanceId(h.player, sword)).toBeDefined();
  });

  it("applies duplicate transactionIds only once", () => {
    const h = makeHarness({ silver: 1_000 });
    const sword = addItem(h, SWORD, "inst_sword", { current: 40, max: 100 });
    const first = h.service.repair(repairRequest(h, sword, "tx_repeat"));
    expect(first.ok).toBe(true);
    h.durability.applyDamage(sword, 30);
    const second = h.service.repair(repairRequest(h, sword, "tx_repeat"));
    expect(second).toEqual({ ok: false, reason: "duplicate_transaction" });
    expect(silverOf(h)).toBe(940);
    expect(h.durability.get(sword)).toEqual({ current: 70, max: 100 });
  });
});

describe("RepairService.bulkRepair", () => {
  function bulkRequest(h: Harness, txId = "tx_bulk") {
    return {
      transactionId: txId,
      playerEntityId: h.player,
      walletId: WALLET,
      stationId: forge.stationId,
    };
  }

  it("repairs equipped then inventory items in deterministic order", () => {
    const h = makeHarness({ silver: 1_000 });
    addItem(h, SWORD, "inst_worn_sword", { current: 50, max: 100 });
    h.equipment.equipFromInventory(h.player, 0);
    addItem(h, HELMET, "inst_bag_helmet", { current: 30, max: 100 });
    const result = h.service.bulkRepair(bulkRequest(h));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.repaired.map((r) => r.instanceId)).toEqual([
      "inst_worn_sword",
      "inst_bag_helmet",
    ]);
    // ceil(100*50/100)=50 + ceil(60*70/100)=42
    expect(result.value.totalCost).toBe(92);
    expect(silverOf(h)).toBe(908);
    expect(h.durability.get(asInstance("inst_worn_sword"))).toEqual({ current: 100, max: 100 });
    expect(h.durability.get(asInstance("inst_bag_helmet"))).toEqual({ current: 100, max: 100 });
  });

  it("skips intact and non-repairable items", () => {
    const h = makeHarness();
    addItem(h, POTION, "inst_potion");
    addItem(h, SWORD, "inst_intact", { current: 100, max: 100 });
    addItem(h, HELMET, "inst_helmet", { current: 60, max: 100 });
    const result = h.service.bulkRepair(bulkRequest(h));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.repaired.map((r) => r.instanceId)).toEqual(["inst_helmet"]);
  });

  it("rejects atomically when a damaged item is invalid (locked)", () => {
    const h = makeHarness({ locked: [HELMET] });
    const sword = addItem(h, SWORD, "inst_sword", { current: 50, max: 100 });
    const helmet = addItem(h, HELMET, "inst_helmet", { current: 60, max: 100 });
    const before = silverOf(h);
    expect(h.service.bulkRepair(bulkRequest(h))).toEqual({
      ok: false,
      reason: "item_locked",
    });
    expect(silverOf(h)).toBe(before);
    expect(h.durability.get(sword)).toEqual({ current: 50, max: 100 });
    expect(h.durability.get(helmet)).toEqual({ current: 60, max: 100 });
  });

  it("rejects atomically when total silver is insufficient", () => {
    const h = makeHarness({ silver: 60 });
    const sword = addItem(h, SWORD, "inst_sword", { current: 50, max: 100 });
    const helmet = addItem(h, HELMET, "inst_helmet", { current: 60, max: 100 });
    expect(h.service.bulkRepair(bulkRequest(h))).toEqual({
      ok: false,
      reason: "insufficient_silver",
    });
    expect(silverOf(h)).toBe(60);
    expect(h.durability.get(sword)).toEqual({ current: 50, max: 100 });
    expect(h.durability.get(helmet)).toEqual({ current: 60, max: 100 });
  });

  it("fails when nothing is damaged", () => {
    const h = makeHarness();
    addItem(h, SWORD, "inst_sword", { current: 100, max: 100 });
    expect(h.service.bulkRepair(bulkRequest(h))).toEqual({
      ok: false,
      reason: "nothing_to_repair",
    });
  });

  it("applies duplicate bulk transactionIds only once", () => {
    const h = makeHarness({ silver: 1_000 });
    const sword = addItem(h, SWORD, "inst_sword", { current: 50, max: 100 });
    expect(h.service.bulkRepair(bulkRequest(h, "tx_bulk_repeat")).ok).toBe(true);
    h.durability.applyDamage(sword, 20);
    expect(h.service.bulkRepair(bulkRequest(h, "tx_bulk_repeat"))).toEqual({
      ok: false,
      reason: "duplicate_transaction",
    });
    expect(silverOf(h)).toBe(950);
  });

  it("never loses or duplicates items", () => {
    const h = makeHarness({ silver: 1_000 });
    addItem(h, SWORD, "inst_sword", { current: 50, max: 100 });
    h.equipment.equipFromInventory(h.player, 0);
    addItem(h, HELMET, "inst_helmet", { current: 30, max: 100 });
    h.service.bulkRepair(bulkRequest(h));
    const inventoryEntries = h.inventory
      .listSlots(h.player)
      .filter((slot) => slot.entry !== undefined);
    expect(inventoryEntries).toHaveLength(1);
    expect(h.equipment.getEquipped(h.player).size).toBe(1);
    expect(h.inventory.findEntryByInstanceId(h.player, asInstance("inst_helmet"))).toBeDefined();
    expect(h.equipment.getEquippedItem(h.player, "weapon")?.instanceId).toBe("inst_sword");
  });
});

describe("DurabilitySaveProvider", () => {
  it("round-trips durability exactly", () => {
    const store = new DurabilityStore();
    store.attach(asInstance("inst_a"), 100, 40);
    store.attach(asInstance("inst_b"), 250);
    const provider = new DurabilitySaveProvider(store);
    const payload = provider.save();

    const restoredStore = new DurabilityStore();
    new DurabilitySaveProvider(restoredStore).load(payload);
    expect(restoredStore.get(asInstance("inst_a"))).toEqual({ current: 40, max: 100 });
    expect(restoredStore.get(asInstance("inst_b"))).toEqual({ current: 250, max: 250 });
  });

  it("never saves destroyed instances", () => {
    const store = new DurabilityStore();
    store.attach(asInstance("inst_a"), 100, 40);
    store.attach(asInstance("inst_dead"), 100, 10);
    store.applyDamage(asInstance("inst_dead"), 10);
    const payload = new DurabilitySaveProvider(store).save() as {
      durabilities: { instanceId: string }[];
    };
    expect(payload.durabilities.map((d) => d.instanceId)).toEqual(["inst_a"]);
  });

  it("rejects invalid durability values on load", () => {
    const provider = new DurabilitySaveProvider(new DurabilityStore());
    expect(() =>
      provider.load({ durabilities: [{ instanceId: "inst_a", current: 120, max: 100 }] }),
    ).toThrow();
    expect(() =>
      provider.load({ durabilities: [{ instanceId: "inst_b", current: -5, max: 100 }] }),
    ).toThrow();
    expect(() =>
      provider.load({ durabilities: [{ instanceId: "inst_c", current: 0, max: 100 }] }),
    ).toThrow();
  });
});

describe("DurabilityStore", () => {
  it("enforces current <= max and immutable max", () => {
    const store = new DurabilityStore();
    expect(store.attach(asInstance("inst_bad"), 100, 120).ok).toBe(false);
    const attached = store.attach(asInstance("inst_a"), 100, 60);
    expect(attached).toEqual({ ok: true, value: { current: 60, max: 100 } });
    store.restoreToMax(asInstance("inst_a"));
    expect(store.get(asInstance("inst_a"))).toEqual({ current: 100, max: 100 });
  });

  it("destroys at zero and refuses further operations", () => {
    const store = new DurabilityStore();
    store.attach(asInstance("inst_a"), 100, 10);
    const damaged = store.applyDamage(asInstance("inst_a"), 50);
    expect(damaged).toEqual({ ok: true, value: { current: 0, destroyed: true } });
    expect(store.isDestroyed(asInstance("inst_a"))).toBe(true);
    expect(store.restoreToMax(asInstance("inst_a"))).toEqual({
      ok: false,
      reason: "item_destroyed",
    });
    expect(store.attach(asInstance("inst_a"), 100).ok).toBe(false);
  });
});
