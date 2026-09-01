import { useMemo } from "react";
import type { ItemInstanceId } from "@game/gameplay";
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
  readonly inventoryFreeSlots: number;
  readonly inventoryIsFull: boolean;
  readonly inventoryIsNearlyFull: boolean;
  readonly getModuleSignals: (moduleId: UiModuleId) => readonly PlayerAttentionSignal[];
}

const INVENTORY_NEAR_FULL_FREE_SLOTS = 2;

export function usePlayerAttention(): PlayerAttentionState {
  const bridge = useGameBridge();
  const { enchantmentService } = useGameServices();

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
    if (idleWorkerCount > 0) {
      signals.push({
        id: "worker_idle",
        moduleId: UI_MODULE_IDS.island,
        severity: "action",
        count: idleWorkerCount,
        label: idleWorkerCount === 1 ? "1 travailleur inactif" : `${String(idleWorkerCount)} travailleurs inactifs`,
      });
    }

    return {
      signals,
      enchantReadyItems,
      idleWorkerCount,
      inventoryFreeSlots,
      inventoryIsFull,
      inventoryIsNearlyFull,
      getModuleSignals: (moduleId: UiModuleId) => signals.filter((signal) => signal.moduleId === moduleId),
    };
  }, [bridge, enchantmentService]);
}
