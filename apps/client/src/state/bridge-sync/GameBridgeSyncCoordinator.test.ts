import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameBridge } from "../../game/GameBridge";
import {
  buildMasteryViewModels,
  collectRepairPreviewData,
  syncAllToBridge,
  syncBankToBridge,
  syncEquipmentToBridge,
  syncInventoryToBridge,
  syncProgressionToBridge,
  syncRepairToBridge,
  syncStatsToBridge,
  syncVendorToBridge,
  syncWalletToBridge,
} from "../bridgeSync";
import { GameBridgeSyncCoordinator } from "./GameBridgeSyncCoordinator";

vi.mock("../bridgeSync", () => ({
  buildMasteryViewModels: vi.fn(() => []),
  collectRepairPreviewData: vi.fn(() => []),
  syncAllToBridge: vi.fn(),
  syncBankToBridge: vi.fn(),
  syncEquipmentToBridge: vi.fn(),
  syncInventoryToBridge: vi.fn(),
  syncProgressionToBridge: vi.fn(),
  syncRepairToBridge: vi.fn(),
  syncStatsToBridge: vi.fn(),
  syncVendorToBridge: vi.fn(),
  syncWalletToBridge: vi.fn(),
}));

function createHarness() {
  const bridge = new GameBridge();
  const updateWorldBridge = vi.fn();
  const recalculateWeaponMasteryStats = vi.fn();
  const progressionState = {
    totalFame: 42,
    overflowPool: 3,
    masteries: [],
  };
  const progressionOrchestrator = {
    getFullProgressionState: vi.fn(() => progressionState),
  };
  const damageManager = {
    getHealth: vi.fn(() => ({ currentHealth: 375, maxHealth: 500 })),
  };

  const coordinator = new GameBridgeSyncCoordinator({
    bridge,
    inventoryManager: {} as never,
    equipmentManager: {} as never,
    statsManager: {} as never,
    damageManager: damageManager as never,
    currencyService: {} as never,
    progressionOrchestrator: progressionOrchestrator as never,
    durabilityStore: {} as never,
    repairCostResolver: {} as never,
    vendorRegistry: {} as never,
    heroId: 1 as never,
    bankId: 2 as never,
    walletId: "wallet" as never,
    vendorId: "vendor_general",
    getIncomeRate: () => 17,
    recalculateWeaponMasteryStats,
    updateWorldBridge,
  });

  return {
    bridge,
    coordinator,
    damageManager,
    progressionOrchestrator,
    recalculateWeaponMasteryStats,
    updateWorldBridge,
  };
}

describe("GameBridgeSyncCoordinator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("projects the complete initial UI state", () => {
    const harness = createHarness();

    harness.coordinator.syncInitialState();

    expect(harness.bridge.playerHealth).toBe(375);
    expect(harness.bridge.playerMaxHealth).toBe(500);
    expect(harness.updateWorldBridge).toHaveBeenCalledOnce();
    expect(syncInventoryToBridge).toHaveBeenCalledOnce();
    expect(syncBankToBridge).toHaveBeenCalledOnce();
    expect(syncEquipmentToBridge).toHaveBeenCalledOnce();
    expect(syncStatsToBridge).toHaveBeenCalledOnce();
    expect(syncWalletToBridge).toHaveBeenCalledOnce();
    expect(syncVendorToBridge).toHaveBeenCalledOnce();
    expect(syncProgressionToBridge).toHaveBeenCalledOnce();
    expect(syncRepairToBridge).toHaveBeenCalledOnce();
  });

  it("recalculates mastery stats before a full refresh", () => {
    const harness = createHarness();

    harness.coordinator.syncAll();

    expect(harness.recalculateWeaponMasteryStats).toHaveBeenCalledOnce();
    expect(buildMasteryViewModels).toHaveBeenCalledOnce();
    expect(syncAllToBridge).toHaveBeenCalledOnce();
    expect(syncBankToBridge).toHaveBeenCalledOnce();
    expect(collectRepairPreviewData).toHaveBeenCalledOnce();
    expect(syncRepairToBridge).toHaveBeenCalledOnce();
  });
});
