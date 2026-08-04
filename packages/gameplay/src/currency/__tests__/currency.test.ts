import { describe, expect, it } from "vitest";
import { CurrencyRegistry } from "../currency-registry.js";
import { CurrencyService } from "../currency-service.js";
import { WalletSaveProvider } from "../wallet-save-provider.js";
import {
  asPlayerId,
  asWalletId,
  effectiveMaxValue,
  type CurrencyDefinitionLike,
} from "../types.js";
import { InventoryManager } from "../../inventory/inventory-manager.js";
import { World, createRuntimeServices } from "@game/core";

const SILVER = "currency_silver";
const GOLD = "currency_gold";

const silverDefinition: CurrencyDefinitionLike = {
  id: SILVER,
  enabled: true,
  minValue: 0,
  maxValue: 2147483647,
  acquisitionSources: ["Loot", "VendorSale"],
  spendingSources: ["Vendor", "Building", "Worker"],
};

const goldDefinition: CurrencyDefinitionLike = {
  id: GOLD,
  enabled: false,
  minValue: 0,
  maxValue: null,
};

function makeService(): { registry: CurrencyRegistry; service: CurrencyService } {
  const registry = new CurrencyRegistry();
  registry.register(silverDefinition);
  registry.register(goldDefinition);
  return { registry, service: new CurrencyService(registry) };
}

const WALLET = asWalletId("wallet_1");
const PLAYER = asPlayerId("player_1");

describe("CurrencyRegistry", () => {
  it("loads and validates currency_silver", () => {
    const registry = new CurrencyRegistry();
    const result = registry.register(silverDefinition);
    expect(result.ok).toBe(true);
    expect(registry.has(SILVER)).toBe(true);
    const definition = registry.get(SILVER);
    expect(definition?.enabled).toBe(true);
    expect(definition?.minValue).toBe(0);
    expect(definition?.maxValue).toBe(2147483647);
  });

  it("freezes registered definitions", () => {
    const registry = new CurrencyRegistry();
    const result = registry.register(silverDefinition);
    if (!result.ok) throw new Error("register failed");
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.acquisitionSources)).toBe(true);
  });

  it("rejects duplicate registration", () => {
    const registry = new CurrencyRegistry();
    registry.register(silverDefinition);
    const result = registry.register(silverDefinition);
    expect(result).toEqual({ ok: false, reason: "duplicate_currency" });
    expect(registry.getAll()).toHaveLength(1);
  });

  it("rejects invalid definitions", () => {
    const registry = new CurrencyRegistry();
    expect(registry.register({ ...silverDefinition, minValue: 5 }).ok).toBe(false);
    expect(registry.register({ ...silverDefinition, maxValue: -1 }).ok).toBe(false);
    expect(registry.register({ ...silverDefinition, id: "" }).ok).toBe(false);
  });

  it("caps null maxValue at the engine-safe integer", () => {
    expect(effectiveMaxValue(goldDefinition)).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe("CurrencyService wallets", () => {
  it("creates a wallet with zero starting balance", () => {
    const { service } = makeService();
    expect(service.createWallet(WALLET, PLAYER).ok).toBe(true);
    expect(service.getBalance(WALLET, SILVER)).toEqual({ ok: true, value: 0 });
    expect(service.getWalletForPlayer(PLAYER)).toBe(WALLET);
  });

  it("rejects a second wallet for the same player", () => {
    const { service } = makeService();
    service.createWallet(WALLET, PLAYER);
    const result = service.createWallet(asWalletId("wallet_2"), PLAYER);
    expect(result).toEqual({ ok: false, reason: "player_already_has_wallet" });
  });

  it("reports unknown wallet explicitly", () => {
    const { service } = makeService();
    expect(service.getBalance(asWalletId("nope"), SILVER)).toEqual({
      ok: false,
      reason: "wallet_not_found",
    });
  });

  it("reports unknown currency explicitly", () => {
    const { service } = makeService();
    service.createWallet(WALLET, PLAYER);
    expect(service.getBalance(WALLET, "currency_unknown")).toEqual({
      ok: false,
      reason: "unknown_currency",
    });
  });
});

describe("CurrencyService credit/debit", () => {
  it("credits a valid amount", () => {
    const { service } = makeService();
    service.createWallet(WALLET, PLAYER);
    expect(service.credit(WALLET, SILVER, 250, "Loot")).toEqual({ ok: true, value: 250 });
    expect(service.getBalance(WALLET, SILVER)).toEqual({ ok: true, value: 250 });
  });

  it("debits a valid amount", () => {
    const { service } = makeService();
    service.createWallet(WALLET, PLAYER);
    service.credit(WALLET, SILVER, 250);
    expect(service.canSpend(WALLET, SILVER, 100)).toEqual({ ok: true, value: 150 });
    expect(service.debit(WALLET, SILVER, 100, "Vendor")).toEqual({ ok: true, value: 150 });
    expect(service.getBalance(WALLET, SILVER)).toEqual({ ok: true, value: 150 });
  });

  it("rejects zero, negative, and non-integer amounts", () => {
    const { service } = makeService();
    service.createWallet(WALLET, PLAYER);
    for (const amount of [0, -5, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(service.credit(WALLET, SILVER, amount)).toEqual({
        ok: false,
        reason: "invalid_amount",
      });
      expect(service.debit(WALLET, SILVER, amount)).toEqual({
        ok: false,
        reason: "invalid_amount",
      });
    }
    expect(service.getBalance(WALLET, SILVER)).toEqual({ ok: true, value: 0 });
  });

  it("rejects a debit greater than the balance", () => {
    const { service } = makeService();
    service.createWallet(WALLET, PLAYER);
    service.credit(WALLET, SILVER, 50);
    expect(service.canSpend(WALLET, SILVER, 51)).toEqual({
      ok: false,
      reason: "insufficient_balance",
    });
    expect(service.debit(WALLET, SILVER, 51)).toEqual({
      ok: false,
      reason: "insufficient_balance",
    });
    expect(service.getBalance(WALLET, SILVER)).toEqual({ ok: true, value: 50 });
  });

  it("rejects unknown currencies", () => {
    const { service } = makeService();
    service.createWallet(WALLET, PLAYER);
    expect(service.credit(WALLET, "currency_unknown", 10)).toEqual({
      ok: false,
      reason: "unknown_currency",
    });
  });

  it("rejects disabled currencies", () => {
    const { service } = makeService();
    service.createWallet(WALLET, PLAYER);
    expect(service.credit(WALLET, GOLD, 10)).toEqual({
      ok: false,
      reason: "currency_disabled",
    });
    expect(service.debit(WALLET, GOLD, 10)).toEqual({
      ok: false,
      reason: "currency_disabled",
    });
  });

  it("rejects sources not allowed by the definition", () => {
    const { service } = makeService();
    service.createWallet(WALLET, PLAYER);
    expect(service.credit(WALLET, SILVER, 10, "Cheat")).toEqual({
      ok: false,
      reason: "source_not_allowed",
    });
    service.credit(WALLET, SILVER, 100, "Loot");
    expect(service.debit(WALLET, SILVER, 10, "Cheat")).toEqual({
      ok: false,
      reason: "source_not_allowed",
    });
    expect(service.getBalance(WALLET, SILVER)).toEqual({ ok: true, value: 100 });
  });

  it("allows omitted source regardless of restrictions", () => {
    const { service } = makeService();
    service.createWallet(WALLET, PLAYER);
    expect(service.credit(WALLET, SILVER, 10).ok).toBe(true);
  });

  it("rejects credits exceeding the max cap", () => {
    const { service } = makeService();
    service.createWallet(WALLET, PLAYER);
    service.credit(WALLET, SILVER, 2147483647);
    expect(service.credit(WALLET, SILVER, 1)).toEqual({
      ok: false,
      reason: "max_cap_exceeded",
    });
    expect(service.getBalance(WALLET, SILVER)).toEqual({ ok: true, value: 2147483647 });
  });

  it("leaves state unchanged after any invalid operation", () => {
    const { service } = makeService();
    service.createWallet(WALLET, PLAYER);
    service.credit(WALLET, SILVER, 500);
    service.credit(WALLET, SILVER, -1);
    service.debit(WALLET, SILVER, 9999);
    service.credit(WALLET, SILVER, 10, "Cheat");
    service.credit(WALLET, GOLD, 10);
    service.credit(WALLET, "currency_unknown", 10);
    expect(service.getBalance(WALLET, SILVER)).toEqual({ ok: true, value: 500 });
    expect(service.getBalance(WALLET, GOLD)).toEqual({ ok: true, value: 0 });
  });

  it("is deterministic: identical operation sequences produce identical balances", () => {
    const run = (): number => {
      const { service } = makeService();
      service.createWallet(WALLET, PLAYER);
      service.credit(WALLET, SILVER, 300, "Loot");
      service.debit(WALLET, SILVER, 120, "Vendor");
      service.credit(WALLET, SILVER, 45, "VendorSale");
      const balance = service.getBalance(WALLET, SILVER);
      return balance.ok ? balance.value : -1;
    };
    expect(run()).toBe(225);
    expect(run()).toBe(run());
  });
});

describe("inventory independence", () => {
  it("wallet operations never touch inventory state", () => {
    const world = new World(createRuntimeServices());
    const manager = new InventoryManager(world, () => undefined);
    const entity = world.createEntity();
    manager.createInventory(entity, 10);
    const before = JSON.stringify(manager.listSlots(entity));

    const { service } = makeService();
    service.createWallet(WALLET, PLAYER);
    service.credit(WALLET, SILVER, 1000);
    service.debit(WALLET, SILVER, 400);

    expect(JSON.stringify(manager.listSlots(entity))).toBe(before);
    expect(service.getBalance(WALLET, SILVER)).toEqual({ ok: true, value: 600 });
  });
});

describe("WalletSaveProvider", () => {
  it("round-trips wallet state into a fresh world with identical balances", () => {
    const { service } = makeService();
    service.createWallet(WALLET, PLAYER);
    service.credit(WALLET, SILVER, 12345);
    const provider = new WalletSaveProvider(service);
    const payload = provider.save();

    const { service: fresh } = makeService();
    new WalletSaveProvider(fresh).load(payload);
    expect(fresh.getBalance(WALLET, SILVER)).toEqual({ ok: true, value: 12345 });
    expect(fresh.getWalletForPlayer(PLAYER)).toBe(WALLET);
  });

  it("produces deterministic save payloads", () => {
    const { service } = makeService();
    service.createWallet(WALLET, PLAYER);
    service.credit(WALLET, SILVER, 777);
    const provider = new WalletSaveProvider(service);
    expect(JSON.stringify(provider.save())).toBe(JSON.stringify(provider.save()));
  });

  it("rejects save data referencing unknown currencies", () => {
    const { service } = makeService();
    const provider = new WalletSaveProvider(service);
    expect(() =>
      provider.load({
        wallets: [
          {
            walletId: "wallet_1",
            playerId: "player_1",
            balances: [{ currencyId: "currency_fake", balance: 10 }],
          },
        ],
      }),
    ).toThrow(/unknown_currency/);
    expect(service.hasWallet(WALLET)).toBe(false);
  });

  it("rejects negative, fractional, and over-cap balances", () => {
    const { service } = makeService();
    const provider = new WalletSaveProvider(service);
    const payloadFor = (balance: number): unknown => ({
      wallets: [
        {
          walletId: "wallet_1",
          playerId: "player_1",
          balances: [{ currencyId: SILVER, balance }],
        },
      ],
    });
    expect(() => provider.load(payloadFor(-1))).toThrow(/invalid_amount/);
    expect(() => provider.load(payloadFor(1.5))).toThrow(/invalid_amount/);
    expect(() => provider.load(payloadFor(2147483648))).toThrow(/max_cap_exceeded/);
    expect(service.hasWallet(WALLET)).toBe(false);
  });

  it("rejects duplicate currency entries in a wallet", () => {
    const { service } = makeService();
    const provider = new WalletSaveProvider(service);
    expect(() =>
      provider.load({
        wallets: [
          {
            walletId: "wallet_1",
            playerId: "player_1",
            balances: [
              { currencyId: SILVER, balance: 10 },
              { currencyId: SILVER, balance: 20 },
            ],
          },
        ],
      }),
    ).toThrow(/duplicate currency/);
  });

  it("restores disabled-currency balances without loss", () => {
    const { service } = makeService();
    const provider = new WalletSaveProvider(service);
    provider.load({
      wallets: [
        {
          walletId: "wallet_1",
          playerId: "player_1",
          balances: [{ currencyId: GOLD, balance: 42 }],
        },
      ],
    });
    expect(service.getBalance(WALLET, GOLD)).toEqual({ ok: true, value: 42 });
  });
});
