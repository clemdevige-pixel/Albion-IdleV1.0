import { describe, expect, it } from "vitest";
import { World, createRuntimeServices, type EntityId } from "@game/core";
import {
  InMemorySaveRepository,
  MigrationPipeline,
  SaveManager,
  VersionManager,
} from "@game/persistence";
import { CurrencyRegistry } from "../currency/currency-registry.js";
import { CurrencyService } from "../currency/currency-service.js";
import { WalletSaveProvider } from "../currency/wallet-save-provider.js";
import { asPlayerId, asWalletId } from "../currency/types.js";
import { EquipmentManager } from "../equipment/equipment-manager.js";
import { EquipmentSaveProvider } from "../equipment/equipment-save-provider.js";
import type { EquipmentInfoLike } from "../equipment/types.js";
import { InventoryManager } from "../inventory/inventory-manager.js";
import { InventorySaveProvider } from "../inventory/inventory-save-provider.js";
import type { ItemInstanceId, ItemStackInfoLike, StackInfoResolver } from "../inventory/types.js";
import { DurabilityStore } from "../repair/durability-store.js";
import { DurabilitySaveProvider } from "../repair/durability-save-provider.js";
import { RepairCostResolver } from "../repair/repair-cost-resolver.js";
import { RepairStationRegistry } from "../repair/repair-station-registry.js";
import { RepairService } from "../repair/repair-service.js";
import type {
  RepairCostDefinitionLike,
  RepairStationDefinitionLike,
  RepairableInfoLike,
} from "../repair/types.js";
import { VendorRegistry } from "../vendor/vendor-registry.js";
import { VendorService } from "../vendor/vendor-service.js";
import type { VendorDefinitionLike } from "../vendor/types.js";
import { EconomyEventEmitter } from "../economy/economy-events.js";
import { EconomyTransactionService } from "../economy/economy-transaction-service.js";
import { TransactionRegistry } from "../economy/transaction-registry.js";
import { TransactionJournalSaveProvider } from "../economy/transaction-journal-save-provider.js";
import {
  asEconomyTransactionId,
  type EconomyTransactionRequest,
  type EconomyTransactionResult,
} from "../economy/types.js";

const SILVER = "currency_silver";
const POTION = "item_potion_healing_minor";
const SWORD = "item_weapon_sword_t4_broadsword";
const SHIELD = "item_offhand_shield_t4_tower";

const WALLET = asWalletId("wallet_1");
const PLAYER = asPlayerId("player_1");
const SILVER_CAP = 2147483647;

const stackTable: Record<string, ItemStackInfoLike> = {
  [POTION]: { itemId: POTION, stackable: true, maxStack: 10 },
  [SWORD]: { itemId: SWORD, stackable: false, maxStack: 1 },
  [SHIELD]: { itemId: SHIELD, stackable: false, maxStack: 1 },
};
const stackResolver: StackInfoResolver = (itemId) => stackTable[itemId];

const equipmentTable: Record<string, EquipmentInfoLike> = {
  [SWORD]: { itemId: SWORD, slot: "weapon", handling: "one_handed", stats: { attack: 10 } },
  [SHIELD]: { itemId: SHIELD, slot: "off_hand", handling: "one_handed", stats: { armor: 5 } },
};

const repairTable: Record<string, RepairableInfoLike> = {
  [SWORD]: { itemId: SWORD, equipmentCategory: "weapon", itemTier: 4 },
  [SHIELD]: { itemId: SHIELD, equipmentCategory: "weapon", itemTier: 4 },
};

const costDef: RepairCostDefinitionLike = {
  equipmentCategory: "weapon",
  itemTier: 4,
  baseRepairCost: 100,
  costMultiplier: 1,
  enabled: true,
};

const forge: RepairStationDefinitionLike = {
  stationId: "station_forge_city",
  locationType: "city",
  repairModifier: 1,
  enabled: true,
};

const merchant: VendorDefinitionLike = {
  vendorId: "vendor_general_merchant",
  role: "buy_and_sell",
  enabled: true,
  offers: [{ itemId: POTION, buyPrice: 45, sellPrice: 9, maxPerTransaction: null, enabled: true }],
};

const asInstance = (id: string): ItemInstanceId => id as ItemInstanceId;
const tx = asEconomyTransactionId;

interface Harness {
  world: World;
  currency: CurrencyService;
  inventory: InventoryManager;
  equipment: EquipmentManager;
  durability: DurabilityStore;
  journal: TransactionRegistry;
  economy: EconomyTransactionService;
  walletProvider: WalletSaveProvider;
  inventoryProvider: InventorySaveProvider;
  equipmentProvider: EquipmentSaveProvider;
  durabilityProvider: DurabilitySaveProvider;
  journalProvider: TransactionJournalSaveProvider;
  player: EntityId;
}

interface HarnessOptions {
  silver?: number;
  capacity?: number;
  /** Fresh world prepared to receive a save: bare player entity, no wallet, no components. */
  fresh?: boolean;
}

function makeHarness(options?: HarnessOptions): Harness {
  const currencyRegistry = new CurrencyRegistry();
  currencyRegistry.register({
    id: SILVER,
    enabled: true,
    minValue: 0,
    maxValue: SILVER_CAP,
    acquisitionSources: ["Loot", "VendorSale"],
    spendingSources: ["Vendor", "Building", "Worker"],
  });
  const currency = new CurrencyService(currencyRegistry);

  const world = new World(createRuntimeServices());
  const inventory = new InventoryManager(world, stackResolver);
  const player = world.createEntity();
  const equipment = new EquipmentManager(world, inventory, (itemId) => equipmentTable[itemId]);

  if (options?.fresh !== true) {
    currency.createWallet(WALLET, PLAYER);
    const silver = options?.silver ?? 1000;
    if (silver > 0) {
      currency.credit(WALLET, SILVER, silver);
    }
    inventory.createInventory(player, options?.capacity ?? 10);
    equipment.attachEquipment(player);
  }

  const vendorRegistry = new VendorRegistry();
  const registered = vendorRegistry.register(merchant);
  if (!registered.ok) throw new Error("vendor registration failed");
  const vendorService = new VendorService(
    vendorRegistry,
    currency,
    inventory,
    equipment,
    stackResolver,
  );

  const costs = new RepairCostResolver();
  const costRegistered = costs.register(costDef);
  if (!costRegistered.ok) throw new Error("cost registration failed");
  const stations = new RepairStationRegistry();
  const stationRegistered = stations.register(forge);
  if (!stationRegistered.ok) throw new Error("station registration failed");
  const durability = new DurabilityStore();
  const repairService = new RepairService(
    costs,
    stations,
    currency,
    inventory,
    equipment,
    durability,
    (itemId) => repairTable[itemId],
  );

  const journal = new TransactionRegistry();
  const economy = new EconomyTransactionService(
    currencyRegistry,
    currency,
    vendorService,
    repairService,
    journal,
    new EconomyEventEmitter(),
  );

  // Fresh worlds restore every saved player component onto the pre-created
  // player entity, keeping inventory and equipment on the same entity.
  const resolveEntity = options?.fresh === true ? (): EntityId => player : undefined;
  return {
    world,
    currency,
    inventory,
    equipment,
    durability,
    journal,
    economy,
    walletProvider: new WalletSaveProvider(currency),
    inventoryProvider: new InventorySaveProvider(inventory, world, resolveEntity),
    equipmentProvider: new EquipmentSaveProvider(equipment, world, resolveEntity),
    durabilityProvider: new DurabilitySaveProvider(durability),
    journalProvider: new TransactionJournalSaveProvider(journal),
    player,
  };
}

function makeSaveManager(h: Harness, repository: InMemorySaveRepository): SaveManager {
  const manager = new SaveManager({
    repository,
    versionManager: new VersionManager(1),
    migrationPipeline: new MigrationPipeline(),
    buildVersion: "test",
    seed: 1,
  });
  manager.registerProvider(h.walletProvider);
  manager.registerProvider(h.inventoryProvider);
  manager.registerProvider(h.equipmentProvider);
  manager.registerProvider(h.durabilityProvider);
  manager.registerProvider(h.journalProvider);
  return manager;
}

function saveAndReload(h: Harness): Harness {
  const repository = new InMemorySaveRepository();
  makeSaveManager(h, repository).save("slot", 0);
  const fresh = makeHarness({ fresh: true });
  makeSaveManager(fresh, repository).load("slot");
  return fresh;
}

function snapshot(h: Harness): unknown {
  return {
    wallet: h.walletProvider.save(),
    inventory: h.inventoryProvider.save(),
    equipment: h.equipmentProvider.save(),
    durability: h.durabilityProvider.save(),
    journal: h.journalProvider.save(),
  };
}

function silverOf(h: Harness): number {
  const balance = h.currency.getBalance(WALLET, SILVER);
  return balance.ok ? balance.value : -1;
}

function addDamagedSword(h: Harness, instanceId = "sword_1", current = 50): ItemInstanceId {
  const id = asInstance(instanceId);
  const inserted = h.inventory.insertEntry(h.player, { instanceId: id, itemId: SWORD, quantity: 1 });
  if (!inserted.ok) throw new Error("insert failed");
  const attached = h.durability.attach(id, 100, current);
  if (!attached.ok) throw new Error("attach failed");
  return id;
}

function equipDamagedSword(h: Harness, instanceId = "sword_1", current = 50): ItemInstanceId {
  const id = asInstance(instanceId);
  const inserted = h.inventory.insertEntry(h.player, { instanceId: id, itemId: SWORD, quantity: 1 });
  if (!inserted.ok) throw new Error("insert failed");
  const attached = h.durability.attach(id, 100, current);
  if (!attached.ok) throw new Error("attach failed");
  const equipped = h.equipment.equipFromInventory(h.player, inserted.value.position);
  if (!equipped.ok) throw new Error("equip failed");
  return id;
}

function buyRequest(h: Harness, id: string, quantity: number): EconomyTransactionRequest {
  return {
    type: "vendor_purchase",
    transactionId: tx(id),
    playerId: PLAYER,
    playerEntityId: h.player,
    walletId: WALLET,
    vendorId: merchant.vendorId,
    itemId: POTION,
    quantity,
  };
}

function sellRequest(
  h: Harness,
  id: string,
  quantity: number,
  itemId: string = POTION,
): EconomyTransactionRequest {
  return {
    type: "vendor_sale",
    transactionId: tx(id),
    playerId: PLAYER,
    playerEntityId: h.player,
    walletId: WALLET,
    vendorId: merchant.vendorId,
    itemId,
    quantity,
  };
}

function repairRequest(h: Harness, id: string, instanceId: ItemInstanceId): EconomyTransactionRequest {
  return {
    type: "equipment_repair",
    transactionId: tx(id),
    playerId: PLAYER,
    playerEntityId: h.player,
    walletId: WALLET,
    stationId: forge.stationId,
    instanceId,
  };
}

function bulkRepairRequest(h: Harness, id: string): EconomyTransactionRequest {
  return {
    type: "bulk_equipment_repair",
    transactionId: tx(id),
    playerId: PLAYER,
    playerEntityId: h.player,
    walletId: WALLET,
    stationId: forge.stationId,
  };
}

function expectFail(result: EconomyTransactionResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.code).toBe(code);
}

describe("Bloc 7 — vendor purchase end to end", () => {
  it("buys, persists every provider, and restores an identical state in a fresh world", () => {
    const h1 = makeHarness({ silver: 1000 });
    const result = h1.economy.execute(buyRequest(h1, "tx_buy", 3));
    expect(result.ok).toBe(true);
    expect(silverOf(h1)).toBe(865);
    expect(h1.inventory.getTotalQuantity(h1.player, POTION)).toBe(3);

    const h2 = saveAndReload(h1);
    expect(silverOf(h2)).toBe(865);
    expect(h2.inventory.getTotalQuantity(h2.player, POTION)).toBe(3);
    expect(h2.journal.getRecords()).toHaveLength(1);
    expect(snapshot(h2)).toEqual(snapshot(h1));
  });

  it("sells, credits silver, removes items, and persists", () => {
    const h1 = makeHarness({ silver: 0 });
    const added = h1.inventory.addQuantity(h1.player, POTION, 5, stackTable[POTION]);
    expect(added.ok).toBe(true);
    const result = h1.economy.execute(sellRequest(h1, "tx_sell", 5));
    expect(result.ok).toBe(true);
    expect(silverOf(h1)).toBe(45);
    expect(h1.inventory.getTotalQuantity(h1.player, POTION)).toBe(0);

    const h2 = saveAndReload(h1);
    expect(silverOf(h2)).toBe(45);
    expect(h2.inventory.getTotalQuantity(h2.player, POTION)).toBe(0);
    expect(snapshot(h2)).toEqual(snapshot(h1));
  });
});

describe("Bloc 7 — repair end to end", () => {
  it("repairs a damaged equipped item and restores it equipped after reload", () => {
    const h1 = makeHarness({ silver: 1000 });
    const sword = equipDamagedSword(h1, "sword_1", 50);
    expect(h1.equipment.getEquippedItem(h1.player, "weapon")?.instanceId).toBe(sword);

    const result = h1.economy.execute(repairRequest(h1, "tx_repair", sword));
    expect(result.ok).toBe(true);
    expect(silverOf(h1)).toBe(950);
    expect(h1.durability.get(sword)).toMatchObject({ current: 100, max: 100 });

    const h2 = saveAndReload(h1);
    expect(silverOf(h2)).toBe(950);
    expect(h2.equipment.getEquippedItem(h2.player, "weapon")?.instanceId).toBe(sword);
    expect(h2.durability.get(sword)).toMatchObject({ current: 100, max: 100 });
    expect(snapshot(h2)).toEqual(snapshot(h1));
  });

  it("bulk repairs equipped and inventory items together and persists", () => {
    const h1 = makeHarness({ silver: 1000 });
    const equippedSword = equipDamagedSword(h1, "sword_worn", 50);
    const bagSword = addDamagedSword(h1, "sword_bag", 80);

    const result = h1.economy.execute(bulkRepairRequest(h1, "tx_bulk"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(silverOf(h1)).toBe(930);
    expect(result.record.affectedEntities).toEqual([
      WALLET,
      forge.stationId,
      "sword_worn",
      "sword_bag",
    ]);

    const h2 = saveAndReload(h1);
    expect(silverOf(h2)).toBe(930);
    expect(h2.durability.get(equippedSword)).toMatchObject({ current: 100 });
    expect(h2.durability.get(bagSword)).toMatchObject({ current: 100 });
    expect(h2.equipment.getEquippedItem(h2.player, "weapon")?.instanceId).toBe(equippedSword);
    expect(snapshot(h2)).toEqual(snapshot(h1));
  });
});

describe("Bloc 7 — clean rejections leave state untouched", () => {
  it("rejects a purchase with an insufficient wallet and changes nothing", () => {
    const h = makeHarness({ silver: 40 });
    const walletBefore = h.walletProvider.save();
    const inventoryBefore = h.inventoryProvider.save();
    const result = h.economy.execute(buyRequest(h, "tx_poor", 1));
    expectFail(result, "vendor_insufficient_silver");
    expect(silverOf(h)).toBe(40);
    expect(h.inventory.getTotalQuantity(h.player, POTION)).toBe(0);
    expect(h.walletProvider.save()).toEqual(walletBefore);
    expect(h.inventoryProvider.save()).toEqual(inventoryBefore);
    expect(h.journal.getRecords()[0]).toMatchObject({ status: "failed" });
  });

  it("rejects a purchase that cannot fit and does not debit silver", () => {
    const h = makeHarness({ silver: 10_000, capacity: 1 });
    const result = h.economy.execute(buyRequest(h, "tx_full", 20));
    expectFail(result, "vendor_insufficient_capacity");
    expect(silverOf(h)).toBe(10_000);
    expect(h.inventory.getTotalQuantity(h.player, POTION)).toBe(0);
  });

  it("rejects the sale of an item the vendor does not trade", () => {
    const h = makeHarness({ silver: 0 });
    addDamagedSword(h, "sword_1", 50);
    const result = h.economy.execute(sellRequest(h, "tx_bad_item", 1, SWORD));
    expectFail(result, "vendor_offer_not_found");
    expect(silverOf(h)).toBe(0);
    expect(h.inventory.getTotalQuantity(h.player, SWORD)).toBe(1);
  });

  it("rejects the repair of an intact item", () => {
    const h = makeHarness({ silver: 1000 });
    const sword = addDamagedSword(h, "sword_1", 100);
    const result = h.economy.execute(repairRequest(h, "tx_intact", sword));
    expectFail(result, "repair_item_intact");
    expect(silverOf(h)).toBe(1000);
  });

  it("rejects a repair with insufficient silver and keeps durability unchanged", () => {
    const h = makeHarness({ silver: 10 });
    const sword = equipDamagedSword(h, "sword_1", 50);
    const result = h.economy.execute(repairRequest(h, "tx_repair_poor", sword));
    expectFail(result, "repair_insufficient_silver");
    expect(silverOf(h)).toBe(10);
    expect(h.durability.get(sword)).toMatchObject({ current: 50, max: 100 });
  });
});

describe("Bloc 7 — full loop with save/load and idempotence", () => {
  it("buy → sell → repair, reloads everything, and no transaction is replayable", () => {
    const h1 = makeHarness({ silver: 1000 });
    const sword = equipDamagedSword(h1, "sword_1", 50);

    expect(h1.economy.execute(buyRequest(h1, "tx_seq_buy", 3)).ok).toBe(true);
    expect(h1.economy.execute(sellRequest(h1, "tx_seq_sell", 1)).ok).toBe(true);
    expect(h1.economy.execute(repairRequest(h1, "tx_seq_repair", sword)).ok).toBe(true);
    // 1000 - 135 + 9 - 50
    expect(silverOf(h1)).toBe(824);
    expect(h1.inventory.getTotalQuantity(h1.player, POTION)).toBe(2);

    const h2 = saveAndReload(h1);
    expect(silverOf(h2)).toBe(824);
    expect(h2.inventory.getTotalQuantity(h2.player, POTION)).toBe(2);
    expect(h2.equipment.getEquippedItem(h2.player, "weapon")?.instanceId).toBe(sword);
    expect(h2.durability.get(sword)).toMatchObject({ current: 100, max: 100 });
    expect(h2.journal.getRecords()).toHaveLength(3);
    expect(snapshot(h2)).toEqual(snapshot(h1));

    const replays = [
      h2.economy.execute(buyRequest(h2, "tx_seq_buy", 3)),
      h2.economy.execute(sellRequest(h2, "tx_seq_sell", 1)),
      h2.economy.execute(repairRequest(h2, "tx_seq_repair", sword)),
    ];
    for (const replay of replays) {
      expect(replay.ok).toBe(true);
      if (replay.ok) {
        expect(replay.replayed).toBe(true);
      }
    }
    // No silver created or lost, no item duplicated, no new journal entry.
    expect(silverOf(h2)).toBe(824);
    expect(h2.inventory.getTotalQuantity(h2.player, POTION)).toBe(2);
    expect(h2.journal.getRecords()).toHaveLength(3);
    expect(snapshot(h2)).toEqual(snapshot(h1));
  });

  it("a duplicate transaction id across the save/load boundary has no double effect", () => {
    const h1 = makeHarness({ silver: 1000 });
    const first = h1.economy.execute(buyRequest(h1, "tx_dup", 2));
    expect(first.ok).toBe(true);
    expect(silverOf(h1)).toBe(910);

    const h2 = saveAndReload(h1);
    const replay = h2.economy.execute(buyRequest(h2, "tx_dup", 2));
    expect(replay.ok).toBe(true);
    if (!replay.ok || !first.ok) return;
    expect(replay.replayed).toBe(true);
    expect(replay.effects).toEqual(first.effects);
    expect(silverOf(h2)).toBe(910);
    expect(h2.inventory.getTotalQuantity(h2.player, POTION)).toBe(2);
    expect(h2.journal.getRecords()).toHaveLength(1);
  });

  it("a malformed request is rejected without journaling and never poisons the save", () => {
    const h1 = makeHarness({ silver: 1000 });
    expect(h1.economy.execute(buyRequest(h1, "tx_ok", 1)).ok).toBe(true);
    const malformed = h1.economy.execute(buyRequest(h1, "", 1));
    expectFail(malformed, "invalid_request");
    if (!malformed.ok) {
      expect(malformed.record).toBeNull();
    }
    // The journal only contains the valid transaction, so save/load round-trips.
    expect(h1.journal.getRecords()).toHaveLength(1);
    const h2 = saveAndReload(h1);
    expect(silverOf(h2)).toBe(955);
    expect(h2.journal.getRecords()).toHaveLength(1);
    expect(snapshot(h2)).toEqual(snapshot(h1));
  });

  it("the same scenario run twice from scratch yields identical states and journals", () => {
    const run = (): unknown => {
      const h = makeHarness({ silver: 1000 });
      const sword = equipDamagedSword(h, "sword_1", 50);
      h.economy.execute(buyRequest(h, "tx_1", 3));
      h.economy.execute(sellRequest(h, "tx_2", 1));
      h.economy.execute(repairRequest(h, "tx_3", sword));
      h.economy.execute(buyRequest(h, "tx_4", 999));
      return snapshot(h);
    };
    expect(run()).toEqual(run());
  });
});
