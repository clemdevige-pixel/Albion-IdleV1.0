import { describe, expect, it } from "vitest";
import { World, createRuntimeServices, type EntityId } from "@game/core";
import { CurrencyRegistry } from "../../currency/currency-registry.js";
import { CurrencyService } from "../../currency/currency-service.js";
import { WalletSaveProvider } from "../../currency/wallet-save-provider.js";
import { asPlayerId, asWalletId } from "../../currency/types.js";
import { EquipmentManager } from "../../equipment/equipment-manager.js";
import type { EquipmentInfoLike } from "../../equipment/types.js";
import { InventoryManager } from "../../inventory/inventory-manager.js";
import type { ItemInstanceId, ItemStackInfoLike, StackInfoResolver } from "../../inventory/types.js";
import { DurabilityStore } from "../../repair/durability-store.js";
import { DurabilitySaveProvider } from "../../repair/durability-save-provider.js";
import { RepairCostResolver } from "../../repair/repair-cost-resolver.js";
import { RepairStationRegistry } from "../../repair/repair-station-registry.js";
import { RepairService } from "../../repair/repair-service.js";
import type {
  RepairCostDefinitionLike,
  RepairStationDefinitionLike,
  RepairableInfoLike,
} from "../../repair/types.js";
import { VendorRegistry } from "../../vendor/vendor-registry.js";
import { VendorService } from "../../vendor/vendor-service.js";
import type { VendorDefinitionLike } from "../../vendor/types.js";
import { EconomyEventEmitter, type EconomyEventName } from "../economy-events.js";
import { EconomyTransactionService } from "../economy-transaction-service.js";
import { TransactionRegistry } from "../transaction-registry.js";
import { TransactionJournalSaveProvider } from "../transaction-journal-save-provider.js";
import {
  asEconomyTransactionId,
  type EconomyTransactionRequest,
  type EconomyTransactionResult,
} from "../types.js";

const SILVER = "currency_silver";
const POTION = "item_potion_healing_minor";
const SWORD = "item_weapon_sword_t4_broadsword";

const WALLET = asWalletId("wallet_1");
const PLAYER = asPlayerId("player_1");
const SILVER_CAP = 2147483647;

const stackTable: Record<string, ItemStackInfoLike> = {
  [POTION]: { itemId: POTION, stackable: true, maxStack: 10 },
  [SWORD]: { itemId: SWORD, stackable: false, maxStack: 1 },
};
const stackResolver: StackInfoResolver = (itemId) => stackTable[itemId];

const equipmentTable: Record<string, EquipmentInfoLike> = {
  [SWORD]: { itemId: SWORD, slot: "weapon", handling: "one_handed", stats: { attack: 10 } },
};

const repairTable: Record<string, RepairableInfoLike> = {
  [SWORD]: { itemId: SWORD, equipmentCategory: "weapon", itemTier: 4 },
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
  emitter: EconomyEventEmitter;
  economy: EconomyTransactionService;
  walletProvider: WalletSaveProvider;
  durabilityProvider: DurabilitySaveProvider;
  journalProvider: TransactionJournalSaveProvider;
  player: EntityId;
  events: { name: EconomyEventName; transactionId: string }[];
}

function makeHarness(options?: { silver?: number; createWallet?: boolean; capacity?: number }): Harness {
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
  if (options?.createWallet !== false) {
    currency.createWallet(WALLET, PLAYER);
    const silver = options?.silver ?? 10_000;
    if (silver > 0) {
      currency.credit(WALLET, SILVER, silver);
    }
  }

  const world = new World(createRuntimeServices());
  const inventory = new InventoryManager(world, stackResolver);
  const player = world.createEntity();
  inventory.createInventory(player, options?.capacity ?? 10);
  const equipment = new EquipmentManager(world, inventory, (itemId) => equipmentTable[itemId]);
  equipment.attachEquipment(player);

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
  const emitter = new EconomyEventEmitter();
  const events: Harness["events"] = [];
  const names: readonly EconomyEventName[] = [
    "transaction_completed",
    "transaction_rejected",
    "currency_credited",
    "currency_debited",
    "vendor_transaction_completed",
    "repair_transaction_completed",
  ];
  for (const name of names) {
    emitter.on(name, (payload) => {
      events.push({ name, transactionId: payload.record.transactionId });
    });
  }
  const economy = new EconomyTransactionService(
    currencyRegistry,
    currency,
    vendorService,
    repairService,
    journal,
    emitter,
  );
  return {
    world,
    currency,
    inventory,
    equipment,
    durability,
    journal,
    emitter,
    economy,
    walletProvider: new WalletSaveProvider(currency),
    durabilityProvider: new DurabilitySaveProvider(durability),
    journalProvider: new TransactionJournalSaveProvider(journal),
    player,
    events,
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

function creditRequest(id: string, amount: number, source = "Loot"): EconomyTransactionRequest {
  return {
    type: "currency_credit",
    transactionId: tx(id),
    playerId: PLAYER,
    walletId: WALLET,
    currencyId: SILVER,
    amount,
    source,
  };
}

function debitRequest(id: string, amount: number, source = "Vendor"): EconomyTransactionRequest {
  return {
    type: "currency_debit",
    transactionId: tx(id),
    playerId: PLAYER,
    walletId: WALLET,
    currencyId: SILVER,
    amount,
    source,
  };
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

function sellRequest(h: Harness, id: string, quantity: number): EconomyTransactionRequest {
  return {
    type: "vendor_sale",
    transactionId: tx(id),
    playerId: PLAYER,
    playerEntityId: h.player,
    walletId: WALLET,
    vendorId: merchant.vendorId,
    itemId: POTION,
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

function expectFail(result: EconomyTransactionResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.code).toBe(code);
}

describe("EconomyTransactionService — currency operations", () => {
  it("applies a simple credit and journals it", () => {
    const h = makeHarness({ silver: 0 });
    const result = h.economy.execute(creditRequest("tx_credit", 500));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(silverOf(h)).toBe(500);
    expect(result.record).toMatchObject({
      sequence: 1,
      transactionId: "tx_credit",
      playerId: PLAYER,
      type: "currency_credit",
      status: "completed",
      sourceSystem: "currency",
      flow: "faucet",
      currencyId: SILVER,
      amount: 500,
      errorCode: null,
    });
    expect(result.effects).toEqual({
      type: "currency_credit",
      currencyId: SILVER,
      amount: 500,
      newBalance: 500,
    });
  });

  it("applies a simple debit as a sink", () => {
    const h = makeHarness({ silver: 1000 });
    const result = h.economy.execute(debitRequest("tx_debit", 300));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(silverOf(h)).toBe(700);
    expect(result.record.flow).toBe("sink");
  });

  it("rejects an unauthorized acquisition source before any mutation", () => {
    const h = makeHarness({ silver: 0 });
    const result = h.economy.execute(creditRequest("tx_bad_source", 500, "Hacker"));
    expectFail(result, "currency_source_not_allowed");
    expect(silverOf(h)).toBe(0);
  });

  it("rejects an unauthorized spending source before any mutation", () => {
    const h = makeHarness({ silver: 1000 });
    const result = h.economy.execute(debitRequest("tx_bad_sink", 100, "Loot"));
    expectFail(result, "currency_source_not_allowed");
    expect(silverOf(h)).toBe(1000);
  });

  it("rejects a malformed request before touching any service", () => {
    const h = makeHarness({ silver: 1000 });
    const result = h.economy.execute(creditRequest("", 500));
    expectFail(result, "invalid_request");
    expect(silverOf(h)).toBe(1000);
  });

  it("rejects an insufficient-balance debit with no mutation", () => {
    const h = makeHarness({ silver: 100 });
    const result = h.economy.execute(debitRequest("tx_poor", 500));
    expectFail(result, "currency_insufficient_balance");
    expect(silverOf(h)).toBe(100);
  });
});

describe("EconomyTransactionService — vendor operations", () => {
  it("executes an atomic vendor purchase", () => {
    const h = makeHarness({ silver: 1000 });
    const result = h.economy.execute(buyRequest(h, "tx_buy", 3));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(silverOf(h)).toBe(1000 - 135);
    expect(h.inventory.getTotalQuantity(h.player, POTION)).toBe(3);
    expect(result.record.flow).toBe("sink");
    expect(result.record.amount).toBe(135);
    expect(result.record.affectedEntities).toContain(merchant.vendorId);
  });

  it("executes an atomic vendor sale", () => {
    const h = makeHarness({ silver: 0 });
    const added = h.inventory.addQuantity(h.player, POTION, 5, stackTable[POTION]);
    expect(added.ok).toBe(true);
    const result = h.economy.execute(sellRequest(h, "tx_sell", 5));
    expect(result.ok).toBe(true);
    expect(silverOf(h)).toBe(45);
    expect(h.inventory.getTotalQuantity(h.player, POTION)).toBe(0);
  });

  it("does not debit silver when the items cannot fit", () => {
    const h = makeHarness({ silver: 10_000, capacity: 1 });
    const result = h.economy.execute(buyRequest(h, "tx_full", 20));
    expectFail(result, "vendor_insufficient_capacity");
    expect(silverOf(h)).toBe(10_000);
    expect(h.inventory.getTotalQuantity(h.player, POTION)).toBe(0);
  });

  it("does not remove items when the sale credit fails at the wallet cap", () => {
    const h = makeHarness({ silver: SILVER_CAP - 5 });
    const added = h.inventory.addQuantity(h.player, POTION, 2, stackTable[POTION]);
    expect(added.ok).toBe(true);
    const result = h.economy.execute(sellRequest(h, "tx_cap", 2));
    expectFail(result, "vendor_transaction_failed");
    expect(silverOf(h)).toBe(SILVER_CAP - 5);
    expect(h.inventory.getTotalQuantity(h.player, POTION)).toBe(2);
  });
});

describe("EconomyTransactionService — repair operations", () => {
  it("executes an atomic single repair", () => {
    const h = makeHarness({ silver: 1000 });
    const sword = addDamagedSword(h);
    const result = h.economy.execute(repairRequest(h, "tx_repair", sword));
    expect(result.ok).toBe(true);
    expect(silverOf(h)).toBe(950);
    expect(h.durability.get(sword)).toMatchObject({ current: 100, max: 100 });
  });

  it("executes an atomic bulk repair", () => {
    const h = makeHarness({ silver: 1000 });
    const swordA = addDamagedSword(h, "sword_a", 50);
    const swordB = addDamagedSword(h, "sword_b", 80);
    const result = h.economy.execute({
      type: "bulk_equipment_repair",
      transactionId: tx("tx_bulk"),
      playerId: PLAYER,
      playerEntityId: h.player,
      walletId: WALLET,
      stationId: forge.stationId,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(silverOf(h)).toBe(1000 - 70);
    expect(h.durability.get(swordA)).toMatchObject({ current: 100 });
    expect(h.durability.get(swordB)).toMatchObject({ current: 100 });
    expect(result.record.affectedEntities).toEqual([
      WALLET,
      forge.stationId,
      "sword_a",
      "sword_b",
    ]);
  });

  it("does not debit silver when the repair fails", () => {
    const h = makeHarness({ silver: 10 });
    const sword = addDamagedSword(h);
    const result = h.economy.execute(repairRequest(h, "tx_repair_poor", sword));
    expectFail(result, "repair_insufficient_silver");
    expect(silverOf(h)).toBe(10);
    expect(h.durability.get(sword)).toMatchObject({ current: 50 });
  });
});

describe("EconomyTransactionService — idempotence", () => {
  it("prevents a duplicate transaction id from mutating state twice", () => {
    const h = makeHarness({ silver: 0 });
    const first = h.economy.execute(creditRequest("tx_once", 500));
    const second = h.economy.execute(creditRequest("tx_once", 500));
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(silverOf(h)).toBe(500);
    expect(h.journal.getRecords()).toHaveLength(1);
  });

  it("returns the previously recorded stable result on replay", () => {
    const h = makeHarness({ silver: 0 });
    const first = h.economy.execute(creditRequest("tx_stable", 500));
    h.economy.execute(creditRequest("tx_other", 250));
    const replay = h.economy.execute(creditRequest("tx_stable", 500));
    expect(first.ok && replay.ok).toBe(true);
    if (!first.ok || !replay.ok) return;
    expect(replay.replayed).toBe(true);
    expect(first.replayed).toBe(false);
    expect(replay.record).toBe(first.record);
    expect(replay.effects).toEqual(first.effects);
  });

  it("replay never reaches the repair service and emits no event", () => {
    const h = makeHarness({ silver: 1000 });
    const sword = addDamagedSword(h);
    const first = h.economy.execute(repairRequest(h, "tx_repair_dup", sword));
    expect(first.ok).toBe(true);
    h.events.length = 0;
    const replay = h.economy.execute(repairRequest(h, "tx_repair_dup", sword));
    expect(replay.ok).toBe(true);
    expect(silverOf(h)).toBe(950);
    expect(h.events).toHaveLength(0);
  });

  it("allows retrying a failed transaction id", () => {
    const h = makeHarness({ silver: 0 });
    const failed = h.economy.execute(debitRequest("tx_retry", 100));
    expectFail(failed, "currency_insufficient_balance");
    h.currency.credit(WALLET, SILVER, 500, "Loot");
    const retried = h.economy.execute(debitRequest("tx_retry", 100));
    expect(retried.ok).toBe(true);
    expect(silverOf(h)).toBe(400);
  });
});

describe("EconomyTransactionService — journal", () => {
  it("records failures with their error code", () => {
    const h = makeHarness({ silver: 0 });
    h.economy.execute(debitRequest("tx_fail", 100));
    const records = h.journal.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      transactionId: "tx_fail",
      status: "failed",
      errorCode: "currency_insufficient_balance",
      effects: null,
    });
  });

  it("assigns monotonic sequence numbers with no wall-clock", () => {
    const h = makeHarness({ silver: 1000 });
    h.economy.execute(creditRequest("tx_a", 10));
    h.economy.execute(debitRequest("tx_b", 5));
    h.economy.execute(debitRequest("tx_c", 999_999));
    const sequences = h.journal.getRecords().map((record) => record.sequence);
    expect(sequences).toEqual([1, 2, 3]);
  });

  it("produces the same journal for the same operations (determinism)", () => {
    const run = (): unknown => {
      const h = makeHarness({ silver: 1000 });
      addDamagedSword(h);
      h.economy.execute(creditRequest("tx_1", 100));
      h.economy.execute(buyRequest(h, "tx_2", 2));
      h.economy.execute(repairRequest(h, "tx_3", asInstance("sword_1")));
      h.economy.execute(debitRequest("tx_4", 999_999));
      return h.journal.getRecords().map((record) => ({ ...record }));
    };
    expect(run()).toEqual(run());
  });
});

describe("EconomyTransactionService — events", () => {
  it("publishes success events only after the definitive outcome", () => {
    const h = makeHarness({ silver: 1000 });
    h.economy.execute(creditRequest("tx_evt", 100));
    expect(h.events).toEqual([
      { name: "transaction_completed", transactionId: "tx_evt" },
      { name: "currency_credited", transactionId: "tx_evt" },
    ]);
  });

  it("publishes no success event on failure", () => {
    const h = makeHarness({ silver: 0 });
    h.economy.execute(debitRequest("tx_evt_fail", 100));
    expect(h.events).toEqual([{ name: "transaction_rejected", transactionId: "tx_evt_fail" }]);
  });

  it("publishes domain events for vendor and repair transactions", () => {
    const h = makeHarness({ silver: 1000 });
    const sword = addDamagedSword(h);
    h.economy.execute(buyRequest(h, "tx_v", 1));
    h.economy.execute(repairRequest(h, "tx_r", sword));
    expect(h.events.map((event) => event.name)).toEqual([
      "transaction_completed",
      "vendor_transaction_completed",
      "transaction_completed",
      "repair_transaction_completed",
    ]);
  });
});

describe("TransactionJournalSaveProvider", () => {
  it("round-trips the journal and keeps completed ids blocked after load", () => {
    const h1 = makeHarness({ silver: 1000 });
    h1.economy.execute(creditRequest("tx_saved", 100));
    h1.economy.execute(debitRequest("tx_failed", 999_999));
    const payload = h1.journalProvider.save();

    const h2 = makeHarness({ silver: 1100 });
    h2.journalProvider.load(payload);
    expect(h2.journal.getRecords().map((record) => ({ ...record }))).toEqual(
      h1.journal.getRecords().map((record) => ({ ...record })),
    );
    const replay = h2.economy.execute(creditRequest("tx_saved", 100));
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.replayed).toBe(true);
    expect(silverOf(h2)).toBe(1100);
  });

  it("rejects corrupt or partial journal entries on load", () => {
    const h = makeHarness();
    expect(() => h.journalProvider.load({ records: "nope", nextSequence: 1 })).toThrow(
      /Invalid transaction journal/,
    );
    const good = makeHarness({ silver: 100 });
    good.economy.execute(creditRequest("tx_ok", 10));
    const payload = good.journalProvider.save() as {
      records: { effects: unknown }[];
      nextSequence: number;
    };
    const record = payload.records[0];
    if (record === undefined) throw new Error("missing record");
    record.effects = null;
    expect(() => makeHarness().journalProvider.load(payload)).toThrow(
      /completed record without effects/,
    );
  });

  it("restores from pre-transaction snapshots with no partial state", () => {
    const h1 = makeHarness({ silver: 1000 });
    addDamagedSword(h1);
    const preWallet = h1.walletProvider.save();
    const preDurability = h1.durabilityProvider.save();
    const preJournal = h1.journalProvider.save();

    const applied = h1.economy.execute(repairRequest(h1, "tx_interrupted", asInstance("sword_1")));
    expect(applied.ok).toBe(true);
    expect(silverOf(h1)).toBe(950);

    // Interruption before persistence: reload the whole pre-transaction
    // snapshot set — wallet, durability and journal move together, so the
    // restored state contains either all of the transaction or none of it.
    const h2 = makeHarness({ createWallet: false });
    const inserted = h2.inventory.insertEntry(h2.player, {
      instanceId: asInstance("sword_1"),
      itemId: SWORD,
      quantity: 1,
    });
    expect(inserted.ok).toBe(true);
    h2.walletProvider.load(preWallet);
    h2.durabilityProvider.load(preDurability);
    h2.journalProvider.load(preJournal);

    expect(silverOf(h2)).toBe(1000);
    expect(h2.durability.get(asInstance("sword_1"))).toMatchObject({ current: 50, max: 100 });
    expect(h2.journal.getRecords()).toHaveLength(0);

    const rerun = h2.economy.execute(repairRequest(h2, "tx_interrupted", asInstance("sword_1")));
    expect(rerun.ok).toBe(true);
    if (!rerun.ok) return;
    expect(rerun.replayed).toBe(false);
    expect(silverOf(h2)).toBe(950);
    expect(h2.durability.get(asInstance("sword_1"))).toMatchObject({ current: 100 });
  });
});
