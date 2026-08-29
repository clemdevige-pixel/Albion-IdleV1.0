import { describe, expect, it } from "vitest";
import type { EntityId } from "@game/core";
import type { CurrencyService, WalletId } from "@game/gameplay";
import { createBankExpansionFoundation } from "./createBankExpansionFoundation.js";

const BANK_ID = 7 as EntityId;
const WALLET_ID = "wallet_bank_test" as WalletId;

function createFixture({ unlocked = false, silver = 2_000_000 } = {}) {
  let researchUnlocked = unlocked;
  let balance = silver;
  let capacity = 64;
  const capacityWrites: number[] = [];

  const inventoryManager = {
    getBaseCapacity: () => capacity,
    setStorageBaseCapacity: (_ownerId: EntityId, nextCapacity: number) => {
      capacity = nextCapacity;
      capacityWrites.push(nextCapacity);
      return true;
    },
  };

  const currencyService: Pick<CurrencyService, "getBalance" | "debit" | "credit"> = {
    getBalance: () => ({ ok: true, value: balance }),
    debit: (_walletId, _currencyId, amount) => {
      if (balance < amount) return { ok: false, reason: "insufficient_balance" };
      balance -= amount;
      return { ok: true, value: balance };
    },
    credit: (_walletId, _currencyId, amount) => {
      balance += amount;
      return { ok: true, value: balance };
    },
  };

  const foundation = createBankExpansionFoundation({
    inventoryManager,
    bankId: BANK_ID,
    bankTabCapacity: 64,
    currencyService,
    walletId: WALLET_ID,
    isResearchUnlocked: () => researchUnlocked,
  });

  return {
    foundation,
    capacityWrites,
    getCapacity: () => capacity,
    getBalance: () => balance,
    unlockResearch: () => { researchUnlocked = true; },
  };
}

describe("bank expansion foundation", () => {
  it("keeps legacy bank capacity untouched before the T6 research", () => {
    const fixture = createFixture();

    expect(fixture.foundation.getModel()).toMatchObject({
      serviceUnlocked: false,
      tabCapacity: 64,
      unlockedTabCount: 1,
      maxTabCount: 5,
      nextPurchase: null,
    });
    expect(fixture.foundation.reconcileResearchUnlock()).toBe(false);
    expect(fixture.getCapacity()).toBe(64);
  });

  it("unlocks Bank II for free when the research completes", () => {
    const fixture = createFixture();
    fixture.unlockResearch();

    expect(fixture.foundation.reconcileResearchUnlock()).toBe(true);
    expect(fixture.getCapacity()).toBe(128);
    expect(fixture.capacityWrites).toEqual([128]);
    expect(fixture.foundation.getModel().nextPurchase).toEqual({ tabNumber: 3, silverCost: 100_000 });
  });

  it("purchases Banks III to V sequentially with the authored Silver curve", () => {
    const fixture = createFixture({ unlocked: true, silver: 2_000_000 });
    fixture.foundation.reconcileResearchUnlock();

    expect(fixture.foundation.purchaseNextTab()).toEqual({ ok: true, tabNumber: 3, silverCost: 100_000 });
    expect(fixture.getCapacity()).toBe(192);
    expect(fixture.foundation.purchaseNextTab()).toEqual({ ok: true, tabNumber: 4, silverCost: 300_000 });
    expect(fixture.getCapacity()).toBe(256);
    expect(fixture.foundation.purchaseNextTab()).toEqual({ ok: true, tabNumber: 5, silverCost: 750_000 });
    expect(fixture.getCapacity()).toBe(320);
    expect(fixture.getBalance()).toBe(850_000);
    expect(fixture.foundation.purchaseNextTab()).toEqual({ ok: false, reason: "max_tabs" });
  });

  it("does not expand or debit when Silver is insufficient", () => {
    const fixture = createFixture({ unlocked: true, silver: 99_999 });
    fixture.foundation.reconcileResearchUnlock();

    expect(fixture.foundation.purchaseNextTab()).toEqual({ ok: false, reason: "insufficient_silver" });
    expect(fixture.getCapacity()).toBe(128);
    expect(fixture.getBalance()).toBe(99_999);
  });
});
