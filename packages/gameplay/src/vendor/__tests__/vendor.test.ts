import { describe, expect, it } from "vitest";
import { World, createRuntimeServices, type EntityId } from "@game/core";
import { CurrencyRegistry } from "../../currency/currency-registry.js";
import { CurrencyService } from "../../currency/currency-service.js";
import { WalletSaveProvider } from "../../currency/wallet-save-provider.js";
import { asPlayerId, asWalletId } from "../../currency/types.js";
import { InventoryManager } from "../../inventory/inventory-manager.js";
import { InventorySaveProvider } from "../../inventory/inventory-save-provider.js";
import type { ItemStackInfoLike, StackInfoResolver } from "../../inventory/types.js";
import { VendorRegistry } from "../vendor-registry.js";
import { VendorService } from "../vendor-service.js";
import {
  listOffers,
  getOffer,
  vendorSellsItem,
  vendorAcceptsItem,
  unitBuyPrice,
  unitSellPrice,
  totalPrice,
} from "../vendor-catalogue.js";
import type { VendorDefinitionLike, VendorRole } from "../types.js";

const SILVER = "currency_silver";
const POTION = "item_potion_healing_minor";
const STEW = "item_food_stew_beef";
const SWORD = "item_weapon_sword_t4_broadsword";
const ORE = "item_resource_ore_t4";

const stackTable: Record<string, ItemStackInfoLike> = {
  [POTION]: { itemId: POTION, stackable: true, maxStack: 10 },
  [STEW]: { itemId: STEW, stackable: true, maxStack: 20 },
  [SWORD]: { itemId: SWORD, stackable: false, maxStack: 1 },
  [ORE]: { itemId: ORE, stackable: true, maxStack: 999 },
};
const stackResolver: StackInfoResolver = (itemId) => stackTable[itemId];

const merchant: VendorDefinitionLike = {
  vendorId: "vendor_general_merchant",
  role: "buy_and_sell",
  enabled: true,
  offers: [
    { itemId: POTION, buyPrice: 45, sellPrice: 9, maxPerTransaction: null, enabled: true },
    { itemId: STEW, buyPrice: 70, sellPrice: 14, maxPerTransaction: 5, enabled: true },
    { itemId: SWORD, buyPrice: null, sellPrice: 100, maxPerTransaction: null, enabled: true },
  ],
};

const WALLET = asWalletId("wallet_1");
const PLAYER = asPlayerId("player_1");

interface Harness {
  world: World;
  registry: VendorRegistry;
  currency: CurrencyService;
  inventory: InventoryManager;
  service: VendorService;
  player: EntityId;
}

function makeHarness(options?: {
  vendors?: readonly VendorDefinitionLike[];
  capacity?: number;
  equipped?: readonly string[];
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

  const world = new World(createRuntimeServices());
  const inventory = new InventoryManager(world, stackResolver);
  const player = world.createEntity();
  inventory.createInventory(player, options?.capacity ?? 10);

  const registry = new VendorRegistry();
  for (const vendor of options?.vendors ?? [merchant]) {
    const result = registry.register(vendor);
    if (!result.ok) throw new Error(`vendor registration failed: ${result.reason}`);
  }

  const equipped = new Map<string, { itemId: string }>();
  for (const itemId of options?.equipped ?? []) {
    equipped.set(`slot_${itemId}`, { itemId });
  }
  const service = new VendorService(
    registry,
    currency,
    inventory,
    { getEquipped: () => equipped },
    stackResolver,
    (_entityId, itemId) => (options?.locked ?? []).includes(itemId),
  );
  return { world, registry, currency, inventory, service, player };
}

function buyRequest(h: Harness, itemId: string, quantity: number, vendorId = merchant.vendorId) {
  return { playerEntityId: h.player, walletId: WALLET, vendorId, itemId, quantity };
}

function silverOf(h: Harness): number {
  const balance = h.currency.getBalance(WALLET, SILVER);
  return balance.ok ? balance.value : -1;
}

describe("VendorRegistry", () => {
  it("loads a valid vendor and freezes it", () => {
    const registry = new VendorRegistry();
    const result = registry.register(merchant);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(registry.has(merchant.vendorId)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.offers)).toBe(true);
    expect(Object.isFrozen(result.value.offers[0])).toBe(true);
  });

  it("rejects an invalid role", () => {
    const registry = new VendorRegistry();
    const result = registry.register({ ...merchant, role: "haggle" as VendorRole });
    expect(result).toEqual({ ok: false, reason: "invalid_role" });
    expect(registry.has(merchant.vendorId)).toBe(false);
  });

  it("rejects duplicate vendors and empty ids", () => {
    const registry = new VendorRegistry();
    registry.register(merchant);
    expect(registry.register(merchant)).toEqual({ ok: false, reason: "duplicate_vendor" });
    expect(registry.register({ ...merchant, vendorId: "" }).ok).toBe(false);
  });

  it("rejects arbitrage configurations at load", () => {
    const registry = new VendorRegistry();
    for (const sellPrice of [45, 46]) {
      const result = registry.register({
        vendorId: "vendor_arbitrage",
        role: "buy_and_sell",
        enabled: true,
        offers: [{ itemId: POTION, buyPrice: 45, sellPrice, maxPerTransaction: null, enabled: true }],
      });
      expect(result).toEqual({ ok: false, reason: "arbitrage_configuration" });
    }
    expect(registry.getAll()).toHaveLength(0);
  });

  it("rejects invalid prices, duplicate offers, and offers on service_only vendors", () => {
    const registry = new VendorRegistry();
    const offer = { itemId: POTION, buyPrice: 45, sellPrice: 9, maxPerTransaction: null, enabled: true };
    expect(
      registry.register({ ...merchant, offers: [{ ...offer, buyPrice: 0 }] }).ok,
    ).toBe(false);
    expect(
      registry.register({ ...merchant, offers: [{ ...offer, sellPrice: 1.5 }] }).ok,
    ).toBe(false);
    expect(
      registry.register({ ...merchant, offers: [{ ...offer, buyPrice: null, sellPrice: null }] }).ok,
    ).toBe(false);
    expect(registry.register({ ...merchant, offers: [offer, offer] }).ok).toBe(false);
    expect(
      registry.register({ ...merchant, vendorId: "vendor_service", role: "service_only" }),
    ).toEqual({ ok: false, reason: "invalid_definition" });
  });
});

describe("VendorCatalogue", () => {
  it("loads the catalogue and lists enabled offers", () => {
    const disabledOffer = { itemId: ORE, buyPrice: 5, sellPrice: null, maxPerTransaction: null, enabled: false };
    const vendor: VendorDefinitionLike = { ...merchant, offers: [...merchant.offers, disabledOffer] };
    expect(listOffers(vendor).map((o) => o.itemId)).toEqual([POTION, STEW, SWORD]);
    expect(getOffer(vendor, POTION)?.buyPrice).toBe(45);
    expect(getOffer(vendor, "item_unknown")).toBeUndefined();
  });

  it("reports what the vendor sells and accepts", () => {
    expect(vendorSellsItem(merchant, POTION)).toBe(true);
    expect(vendorSellsItem(merchant, SWORD)).toBe(false);
    expect(vendorAcceptsItem(merchant, SWORD)).toBe(true);
    expect(vendorAcceptsItem(merchant, ORE)).toBe(false);
    const sellOnly: VendorDefinitionLike = { ...merchant, role: "sell_only" };
    expect(vendorAcceptsItem(sellOnly, SWORD)).toBe(false);
    expect(vendorSellsItem({ ...merchant, enabled: false }, POTION)).toBe(false);
  });

  it("calculates buy cost and sell proceeds with integer math", () => {
    expect(unitBuyPrice(merchant, POTION)).toEqual({ ok: true, value: 45 });
    expect(unitSellPrice(merchant, POTION)).toEqual({ ok: true, value: 9 });
    expect(unitBuyPrice(merchant, SWORD)).toEqual({ ok: false, reason: "price_not_defined" });
    expect(totalPrice(45, 3)).toEqual({ ok: true, value: 135 });
    expect(totalPrice(9, 7)).toEqual({ ok: true, value: 63 });
  });

  it("detects overflow and invalid quantities in total price", () => {
    expect(totalPrice(Number.MAX_SAFE_INTEGER, 2)).toEqual({ ok: false, reason: "price_overflow" });
    expect(totalPrice(45, 0)).toEqual({ ok: false, reason: "invalid_quantity" });
    expect(totalPrice(45, -2)).toEqual({ ok: false, reason: "invalid_quantity" });
    expect(totalPrice(45, 1.5)).toEqual({ ok: false, reason: "invalid_quantity" });
  });

  it("is deterministic: identical inputs always produce identical results", () => {
    const runA = JSON.stringify([listOffers(merchant), unitBuyPrice(merchant, POTION), totalPrice(45, 12)]);
    const runB = JSON.stringify([listOffers(merchant), unitBuyPrice(merchant, POTION), totalPrice(45, 12)]);
    expect(runA).toBe(runB);
  });
});

describe("VendorService buy", () => {
  it("completes an authorized purchase: silver debited, items added", () => {
    const h = makeHarness();
    h.currency.credit(WALLET, SILVER, 1000, "Loot");
    const result = h.service.buyFromVendor(buyRequest(h, POTION, 3));
    expect(result).toEqual({
      ok: true,
      value: { itemId: POTION, quantity: 3, totalPrice: 135, newBalance: 865 },
    });
    expect(silverOf(h)).toBe(865);
    expect(h.inventory.getTotalQuantity(h.player, POTION)).toBe(3);
  });

  it("rejects an item not in the catalogue", () => {
    const h = makeHarness();
    h.currency.credit(WALLET, SILVER, 1000, "Loot");
    expect(h.service.buyFromVendor(buyRequest(h, "item_unknown", 1))).toEqual({
      ok: false,
      reason: "offer_not_found",
    });
  });

  it("rejects zero, negative, and fractional quantities", () => {
    const h = makeHarness();
    h.currency.credit(WALLET, SILVER, 1000, "Loot");
    for (const quantity of [0, -1, 1.5]) {
      expect(h.service.buyFromVendor(buyRequest(h, POTION, quantity))).toEqual({
        ok: false,
        reason: "invalid_quantity",
      });
    }
    expect(silverOf(h)).toBe(1000);
  });

  it("rejects insufficient silver without changes", () => {
    const h = makeHarness();
    h.currency.credit(WALLET, SILVER, 100, "Loot");
    expect(h.service.buyFromVendor(buyRequest(h, POTION, 3))).toEqual({
      ok: false,
      reason: "insufficient_silver",
    });
    expect(silverOf(h)).toBe(100);
    expect(h.inventory.getTotalQuantity(h.player, POTION)).toBe(0);
  });

  it("rejects insufficient inventory capacity without consuming silver", () => {
    const h = makeHarness({ capacity: 1 });
    h.currency.credit(WALLET, SILVER, 10000, "Loot");
    expect(h.service.buyFromVendor(buyRequest(h, POTION, 11))).toEqual({
      ok: false,
      reason: "insufficient_capacity",
    });
    expect(silverOf(h)).toBe(10000);
    expect(h.inventory.getTotalQuantity(h.player, POTION)).toBe(0);
  });

  it("rejects quantities above the per-transaction limit", () => {
    const h = makeHarness();
    h.currency.credit(WALLET, SILVER, 10000, "Loot");
    expect(h.service.buyFromVendor(buyRequest(h, STEW, 6))).toEqual({
      ok: false,
      reason: "quantity_limit_exceeded",
    });
  });

  it("rejects unknown, disabled vendors and disabled offers", () => {
    const disabledVendor: VendorDefinitionLike = {
      ...merchant,
      vendorId: "vendor_closed",
      enabled: false,
    };
    const disabledOfferVendor: VendorDefinitionLike = {
      vendorId: "vendor_partial",
      role: "buy_and_sell",
      enabled: true,
      offers: [{ itemId: POTION, buyPrice: 45, sellPrice: 9, maxPerTransaction: null, enabled: false }],
    };
    const h = makeHarness({ vendors: [merchant, disabledVendor, disabledOfferVendor] });
    h.currency.credit(WALLET, SILVER, 1000, "Loot");
    expect(h.service.buyFromVendor(buyRequest(h, POTION, 1, "vendor_missing"))).toEqual({
      ok: false,
      reason: "vendor_not_found",
    });
    expect(h.service.buyFromVendor(buyRequest(h, POTION, 1, "vendor_closed"))).toEqual({
      ok: false,
      reason: "vendor_disabled",
    });
    expect(h.service.buyFromVendor(buyRequest(h, POTION, 1, "vendor_partial"))).toEqual({
      ok: false,
      reason: "offer_disabled",
    });
  });

  it("rejects buying an item the vendor only accepts", () => {
    const h = makeHarness();
    h.currency.credit(WALLET, SILVER, 1000, "Loot");
    expect(h.service.buyFromVendor(buyRequest(h, SWORD, 1))).toEqual({
      ok: false,
      reason: "price_not_defined",
    });
  });

  it("rejects buying from a buy_only vendor", () => {
    const collector: VendorDefinitionLike = {
      vendorId: "vendor_collector",
      role: "buy_only",
      enabled: true,
      offers: [{ itemId: SWORD, buyPrice: null, sellPrice: 100, maxPerTransaction: null, enabled: true }],
    };
    const h = makeHarness({ vendors: [collector] });
    h.currency.credit(WALLET, SILVER, 1000, "Loot");
    expect(h.service.buyFromVendor(buyRequest(h, SWORD, 1, "vendor_collector"))).toEqual({
      ok: false,
      reason: "operation_not_supported",
    });
  });
});

describe("VendorService sell", () => {
  it("completes an authorized sale: items removed, silver credited", () => {
    const h = makeHarness();
    h.inventory.addQuantity(h.player, SWORD, 1);
    h.inventory.addQuantity(h.player, POTION, 5);
    const result = h.service.sellToVendor(buyRequest(h, SWORD, 1));
    expect(result).toEqual({
      ok: true,
      value: { itemId: SWORD, quantity: 1, totalProceeds: 100, newBalance: 100 },
    });
    const potions = h.service.sellToVendor(buyRequest(h, POTION, 3));
    expect(potions).toEqual({
      ok: true,
      value: { itemId: POTION, quantity: 3, totalProceeds: 27, newBalance: 127 },
    });
    expect(h.inventory.getTotalQuantity(h.player, SWORD)).toBe(0);
    expect(h.inventory.getTotalQuantity(h.player, POTION)).toBe(2);
    expect(silverOf(h)).toBe(127);
  });

  it("rejects selling an equipped item", () => {
    const h = makeHarness({ equipped: [SWORD] });
    expect(h.service.sellToVendor(buyRequest(h, SWORD, 1))).toEqual({
      ok: false,
      reason: "item_equipped",
    });
    expect(silverOf(h)).toBe(0);
  });

  it("rejects selling a locked or reserved item", () => {
    const h = makeHarness({ locked: [POTION] });
    h.inventory.addQuantity(h.player, POTION, 5);
    expect(h.service.sellToVendor(buyRequest(h, POTION, 2))).toEqual({
      ok: false,
      reason: "item_locked",
    });
    expect(h.inventory.getTotalQuantity(h.player, POTION)).toBe(5);
    expect(silverOf(h)).toBe(0);
  });

  it("rejects selling more than the available quantity", () => {
    const h = makeHarness();
    h.inventory.addQuantity(h.player, POTION, 2);
    expect(h.service.sellToVendor(buyRequest(h, POTION, 3))).toEqual({
      ok: false,
      reason: "insufficient_item_quantity",
    });
    expect(h.inventory.getTotalQuantity(h.player, POTION)).toBe(2);
    expect(silverOf(h)).toBe(0);
  });

  it("rejects an unaccepted item category", () => {
    const h = makeHarness();
    h.inventory.addQuantity(h.player, ORE, 50);
    expect(h.service.sellToVendor(buyRequest(h, ORE, 10))).toEqual({
      ok: false,
      reason: "offer_not_found",
    });
    expect(h.inventory.getTotalQuantity(h.player, ORE)).toBe(50);
  });

  it("rejects selling to a sell_only vendor", () => {
    const sellOnly: VendorDefinitionLike = { ...merchant, vendorId: "vendor_shop", role: "sell_only" };
    const h = makeHarness({ vendors: [sellOnly] });
    h.inventory.addQuantity(h.player, POTION, 5);
    expect(h.service.sellToVendor(buyRequest(h, POTION, 1, "vendor_shop"))).toEqual({
      ok: false,
      reason: "operation_not_supported",
    });
  });

  it("removes only the selected quantity when selling a partial stack", () => {
    const h = makeHarness();
    h.inventory.addQuantity(h.player, STEW, 20);
    const result = h.service.sellToVendor(buyRequest(h, STEW, 4));
    expect(result.ok).toBe(true);
    expect(h.inventory.getTotalQuantity(h.player, STEW)).toBe(16);
    expect(silverOf(h)).toBe(56);
  });
});

describe("atomicity and determinism", () => {
  it("leaves all state unchanged after every failure kind", () => {
    const h = makeHarness({ equipped: [SWORD], locked: [STEW] });
    h.currency.credit(WALLET, SILVER, 200, "Loot");
    h.inventory.addQuantity(h.player, POTION, 4);
    h.inventory.addQuantity(h.player, STEW, 4);
    const silverBefore = silverOf(h);
    const slotsBefore = JSON.stringify(h.inventory.listSlots(h.player));

    h.service.buyFromVendor(buyRequest(h, POTION, 0));
    h.service.buyFromVendor(buyRequest(h, POTION, 100));
    h.service.buyFromVendor(buyRequest(h, "item_unknown", 1));
    h.service.buyFromVendor(buyRequest(h, POTION, 1, "vendor_missing"));
    h.service.sellToVendor(buyRequest(h, SWORD, 1));
    h.service.sellToVendor(buyRequest(h, STEW, 1));
    h.service.sellToVendor(buyRequest(h, POTION, 99));
    h.service.sellToVendor(buyRequest(h, ORE, 1));

    expect(silverOf(h)).toBe(silverBefore);
    expect(JSON.stringify(h.inventory.listSlots(h.player))).toBe(slotsBefore);
  });

  it("produces identical outcomes for identical transaction sequences", () => {
    const run = (): string => {
      const h = makeHarness();
      h.currency.credit(WALLET, SILVER, 500, "Loot");
      h.service.buyFromVendor(buyRequest(h, POTION, 4));
      h.service.sellToVendor(buyRequest(h, POTION, 2));
      h.service.buyFromVendor(buyRequest(h, STEW, 2));
      return JSON.stringify([silverOf(h), h.inventory.listSlots(h.player)]);
    };
    expect(run()).toBe(run());
  });
});

describe("save integration", () => {
  it("round-trips wallet and inventory state after vendor transactions", () => {
    const h = makeHarness();
    h.currency.credit(WALLET, SILVER, 1000, "Loot");
    h.inventory.addQuantity(h.player, SWORD, 1);
    expect(h.service.buyFromVendor(buyRequest(h, POTION, 4)).ok).toBe(true);
    expect(h.service.sellToVendor(buyRequest(h, SWORD, 1)).ok).toBe(true);
    expect(silverOf(h)).toBe(920);

    const walletPayload = new WalletSaveProvider(h.currency).save();
    const inventoryPayload = new InventorySaveProvider(h.inventory, h.world).save();

    const currencyRegistry = new CurrencyRegistry();
    currencyRegistry.register({
      id: SILVER,
      enabled: true,
      minValue: 0,
      maxValue: 2147483647,
      acquisitionSources: ["Loot", "VendorSale"],
      spendingSources: ["Vendor", "Building", "Worker"],
    });
    const freshCurrency = new CurrencyService(currencyRegistry);
    new WalletSaveProvider(freshCurrency).load(walletPayload);
    const freshWorld = new World(createRuntimeServices());
    const freshInventory = new InventoryManager(freshWorld, stackResolver);
    new InventorySaveProvider(freshInventory, freshWorld).load(inventoryPayload);

    expect(freshCurrency.getBalance(WALLET, SILVER)).toEqual({ ok: true, value: 920 });
    const restored = freshInventory.listInventories()[0];
    expect(restored).toBeDefined();
    if (restored === undefined) return;
    expect(freshInventory.getTotalQuantity(restored, POTION)).toBe(4);
    expect(freshInventory.getTotalQuantity(restored, SWORD)).toBe(0);
  });
});
