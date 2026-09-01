import { useMemo, useSyncExternalStore } from "react";
import type { ItemInstanceId } from "@game/gameplay";
import { dashboardLayoutSaveProvider } from "../../runtime/DashboardLayoutSaveProvider";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import type { UiModuleId } from "../navigation/moduleIds";
import { UI_MODULE_IDS } from "../navigation/moduleIds";

export type PlayerAttentionKind = "enchant_ready" | "inventory_pressure" | "worker_idle";
export type PlayerAttentionSeverity = "action" | "warning" | "critical";

export interface EnchantReadyAttentionItem {
  readonly instanceId: string;
  readonly itemId: string;
  readonly currentLevel: number;
  readonly nextLevel: number;
}

export interface PlayerAttentionSignal {
  readonly id: PlayerAttentionKind;
  readonly moduleId: UiModuleId;
  readonly severity: PlayerAttentionSeverity;
  readonly count: number;
  readonly label: string;
}

export interface PlayerAttentionState {
  readonly signals: readonly PlayerAttentionSignal[];
  readonly enchantReadyItems: readonly EnchantReadyAttentionItem[];
  readonly idleWorkerCount: number;
  readonly pausedWorkerCount: number;
  readonly nonProducingWorkerCount: number;
  readonly inventoryFreeSlots: number;
  readonly inventoryIsFull: boolean;
  readonly inventoryIsNearlyFull: boolean;
  readonly dismissEnchantReady: (instanceId: string) => void;
  readonly getModuleSignals: (moduleId: UiModuleId) => readonly PlayerAttentionSignal[];
}

const INVENTORY_NEAR_FULL_FREE_SLOTS = 2;

export function usePlayerAttention(): PlayerAttentionState {
  const bridge = useGameBridge();
  const { enchantmentService } = useGameServices();
  const ignoredEnchantInstanceIds = useSyncExternalStore(
    dashboardLayoutSaveProvider.subscribe,
    dashboardLayoutSaveProvider.getIgnoredEnchantInstanceIds,
    dashboardLayoutSaveProvider.getIgnoredEnchantInstanceIds,
  );

  return useMemo(() => {
    const instances = [
      ...bridge.equipment.slots,
      ...bridge.inventory.slots,
      ...bridge.bank.slots,
    ];
    const seen = new Set<string>();
    const enchantReadyItems: EnchantReadyAttentionItem[] = [];

    for (const slot of instances) {
      if (slot.itemId === undefined || slot.instanceId === undefined || seen.has(slot.instanceId)) continue;
      seen.add(slot.instanceId);
      if (ignoredEnchantInstanceIds.has(slot.instanceId)) continue;
      const preview = enchantmentService.preview(slot.instanceId as ItemInstanceId);
      if (preview?.nextLevel === undefined) continue;
      const economicallyReady = preview.materials.every((material) => material.missing === 0)
        && bridge.wallet.silver >= preview.silverCost;
      const onlyBlockedByCombat = preview.failureReason === undefined || preview.failureReason === "combat_active";
      if (!economicallyReady || !onlyBlockedByCombat) continue;
      enchantReadyItems.push({
        instanceId: slot.instanceId,
        itemId: slot.itemId,
        currentLevel: preview.currentLevel,
        nextLevel: preview.nextLevel,
      });
    }

    const inventoryFreeSlots = Math.max(0, bridge.inventory.capacity - bridge.inventory.occupied);
    const inventoryIsFull = bridge.inventory.capacity > 0 && inventoryFreeSlots === 0;
    const inventoryIsNearlyFull = bridge.inventory.capacity > 0
      && !inventoryIsFull
      && inventoryFreeSlots <= INVENTORY_NEAR_FULL_FREE_SLOTS;
    const idleWorkerCount = bridge.workers.workers.filter((worker) => worker.state === "idle").length;
    const pausedWorkerCount = bridge.workers.workers.filter((worker) => worker.state === "paused").length;
    const nonProducingWorkerCount = idleWorkerCount + pausedWorkerCount;

    const signals: PlayerAttentionSignal[] = [];
    if (enchantReadyItems.length > 0) {
      signals.push({
        id: "enchant_ready",
        moduleId: UI_MODULE_IDS.merchant,
        severity: "action",
        count: enchantReadyItems.length,
        label: enchantReadyItems.length === 1 ? "1 enchantement prêt" : `${String(enchantReadyItems.length)} enchantements prêts`,
      });
    }
    if (inventoryIsFull || inventoryIsNearlyFull) {
      signals.push({
        id: "inventory_pressure",
        moduleId: UI_MODULE_IDS.inventory,
        severity: inventoryIsFull ? "critical" : "warning",
        count: 1,
        label: inventoryIsFull ? "Inventaire plein" : `Inventaire presque plein · ${String(inventoryFreeSlots)} places restantes`,
      });
    }
    if (nonProducingWorkerCount > 0) {
      let label: string;
      if (pausedWorkerCount > 0 && idleWorkerCount === 0) {
        label = pausedWorkerCount === 1 ? "1 travailleur en pause" : `${String(pausedWorkerCount)} travailleurs en pause`;
      } else if (idleWorkerCount > 0 && pausedWorkerCount === 0) {
        label = idleWorkerCount === 1 ? "1 travailleur inactif" : `${String(idleWorkerCount)} travailleurs inactifs`;
      } else {
        label = `${String(nonProducingWorkerCount)} travailleurs sans production`;
      }
      signals.push({
        id: "worker_idle",
        moduleId: UI_MODULE_IDS.island,
        severity: "warning",
        count: nonProducingWorkerCount,
        label,
      });
    }

    return {
      signals,
      enchantReadyItems,
      idleWorkerCount,
      pausedWorkerCount,
      nonProducingWorkerCount,
      inventoryFreeSlots,
      inventoryIsFull,
      inventoryIsNearlyFull,
      dismissEnchantReady: dashboardLayoutSaveProvider.ignoreEnchantInstance,
      getModuleSignals: (moduleId: UiModuleId) => signals.filter((signal) => signal.moduleId === moduleId),
    };
  }, [bridge, enchantmentService, ignoredEnchantInstanceIds]);
}
