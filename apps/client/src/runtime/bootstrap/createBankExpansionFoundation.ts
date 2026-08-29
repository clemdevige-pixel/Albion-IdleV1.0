import type { EntityId } from "@game/core";
import {
  BANK_MAX_TABS,
  getBankExtensionPurchase,
} from "@game/data";
import type { CurrencyService, WalletId } from "@game/gameplay";
import type { PlayerInventoryManager } from "../PlayerInventoryManager.js";

export interface BankExpansionModel {
  readonly serviceUnlocked: boolean;
  readonly tabCapacity: number;
  readonly unlockedTabCount: number;
  readonly maxTabCount: number;
  readonly nextPurchase: {
    readonly tabNumber: number;
    readonly silverCost: number;
  } | null;
}

export type BankExpansionPurchaseResult =
  | { readonly ok: true; readonly tabNumber: number; readonly silverCost: number }
  | {
      readonly ok: false;
      readonly reason: "research_locked" | "max_tabs" | "insufficient_silver" | "capacity_update_failed";
    };

interface BankExpansionFoundationDependencies {
  readonly inventoryManager: PlayerInventoryManager;
  readonly bankId: EntityId;
  readonly bankTabCapacity: number;
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
  readonly isResearchUnlocked: () => boolean;
}

/**
 * Application/domain bridge for progressive Bank capacity.
 *
 * The physical Bank remains one Inventory. Each unlocked tab owns one contiguous
 * range of `bankTabCapacity` slots, so legacy saves remain tab I without any
 * inventory migration and the existing InventorySaveProvider remains authoritative.
 */
export function createBankExpansionFoundation({
  inventoryManager,
  bankId,
  bankTabCapacity,
  currencyService,
  walletId,
  isResearchUnlocked,
}: BankExpansionFoundationDependencies) {
  if (!Number.isInteger(bankTabCapacity) || bankTabCapacity <= 0) {
    throw new Error("Bank tab capacity must be a positive integer");
  }

  const getUnlockedTabCount = (): number => {
    const capacity = inventoryManager.getBaseCapacity(bankId);
    const tabCount = Math.floor(capacity / bankTabCapacity);
    return Math.max(1, Math.min(BANK_MAX_TABS, tabCount));
  };

  const reconcileResearchUnlock = (): boolean => {
    if (!isResearchUnlocked() || getUnlockedTabCount() >= 2) return false;
    const expanded = inventoryManager.setStorageBaseCapacity(bankId, bankTabCapacity * 2);
    if (!expanded) {
      throw new Error("Unable to apply Bank II research unlock");
    }
    return true;
  };

  const getModel = (): BankExpansionModel => {
    const serviceUnlocked = isResearchUnlocked();
    const unlockedTabCount = getUnlockedTabCount();
    const purchase = serviceUnlocked
      ? getBankExtensionPurchase(unlockedTabCount + 1)
      : undefined;
    return {
      serviceUnlocked,
      tabCapacity: bankTabCapacity,
      unlockedTabCount,
      maxTabCount: BANK_MAX_TABS,
      nextPurchase: purchase === undefined
        ? null
        : { tabNumber: purchase.tabNumber, silverCost: purchase.silverCost },
    };
  };

  const purchaseNextTab = (): BankExpansionPurchaseResult => {
    if (!isResearchUnlocked()) return { ok: false, reason: "research_locked" };
    reconcileResearchUnlock();

    const currentTabCount = getUnlockedTabCount();
    const purchase = getBankExtensionPurchase(currentTabCount + 1);
    if (purchase === undefined) return { ok: false, reason: "max_tabs" };

    const balance = currencyService.getBalance(walletId, "currency_silver");
    if (!balance.ok || balance.value < purchase.silverCost) {
      return { ok: false, reason: "insufficient_silver" };
    }

    const debit = currencyService.debit(walletId, "currency_silver", purchase.silverCost);
    if (!debit.ok) return { ok: false, reason: "insufficient_silver" };

    const expanded = inventoryManager.setStorageBaseCapacity(
      bankId,
      bankTabCapacity * purchase.tabNumber,
    );
    if (!expanded) {
      const refund = currencyService.credit(walletId, "currency_silver", purchase.silverCost);
      if (!refund.ok) throw new Error("Bank extension Silver rollback failed");
      return { ok: false, reason: "capacity_update_failed" };
    }

    return {
      ok: true,
      tabNumber: purchase.tabNumber,
      silverCost: purchase.silverCost,
    };
  };

  return {
    getModel,
    reconcileResearchUnlock,
    purchaseNextTab,
  };
}

export type BankExpansionFoundation = ReturnType<typeof createBankExpansionFoundation>;
