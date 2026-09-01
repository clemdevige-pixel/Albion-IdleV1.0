import { useEffect, useMemo, useSyncExternalStore } from "react";
import { RESEARCH_UNLOCK_IDS } from "@game/data";
import type { ItemInstanceId } from "@game/gameplay";
import { RESEARCH_DEFINITIONS } from "../../data/researchContentCatalog";
import { dashboardLayoutSaveProvider } from "../../runtime/DashboardLayoutSaveProvider";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import type { UiModuleId } from "../navigation/moduleIds";
import { UI_MODULE_IDS } from "../navigation/moduleIds";

export type PlayerAttentionKind =
  | "enchant_ready"
  | "inventory_pressure"
  | "worker_idle"
  | "expedition_idle"
  | "feature_unlocked";
export type PlayerAttentionSeverity = "action" | "warning" | "critical";

export interface EnchantReadyAttentionItem {
  readonly instanceId: string;
  readonly itemId: string;
  readonly currentLevel: number;
  readonly nextLevel: number;
}

export interface FeatureUnlockAttentionItem {
  readonly unlockId: string;
  readonly moduleId: UiModuleId;
  readonly label: string;
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
  readonly pendingFeatureUnlocks: readonly FeatureUnlockAttentionItem[];
  readonly idleWorkerCount: number;
  readonly pausedWorkerCount: number;
  readonly nonProducingWorkerCount: number;
  readonly activeExpeditionCount: number;
  readonly expeditionIdle: boolean;
  readonly inventoryFreeSlots: number;
  readonly inventoryIsFull: boolean;
  readonly inventoryIsNearlyFull: boolean;
  readonly dismissEnchantReady: (instanceId: string) => void;
  readonly getModuleSignals: (moduleId: UiModuleId) => readonly PlayerAttentionSignal[];
}

const INVENTORY_NEAR_FULL_FREE_SLOTS = 2;

export const FEATURE_UNLOCK_VISITS = {
  expeditions: [
    RESEARCH_UNLOCK_IDS.silverExpeditionTier4,
    RESEARCH_UNLOCK_IDS.factionExpeditionTier4,
    RESEARCH_UNLOCK_IDS.secondExpeditionSlot,
  ],
  enchantment: [RESEARCH_UNLOCK_IDS.enchantmentService],
  resourceYieldTracking: [RESEARCH_UNLOCK_IDS.resourceYieldTracking],
  workerOrganization: [RESEARCH_UNLOCK_IDS.advancedWorkerOrganization],
  bank: [RESEARCH_UNLOCK_IDS.advancedBankManagement],
  instantRefining: [RESEARCH_UNLOCK_IDS.instantRefining],
  blackMarket: [RESEARCH_UNLOCK_IDS.blackMarket],
  dungeons: [RESEARCH_UNLOCK_IDS.dungeonSystem],
  tower: [RESEARCH_UNLOCK_IDS.towerSystem],
} as const;

const FEATURE_UNLOCK_ATTENTION: readonly FeatureUnlockAttentionItem[] = [
  { unlockId: RESEARCH_UNLOCK_IDS.silverExpeditionTier4, moduleId: UI_MODULE_IDS.island, label: "Expéditions débloquées" },
  { unlockId: RESEARCH_UNLOCK_IDS.factionExpeditionTier4, moduleId: UI_MODULE_IDS.island, label: "Expédition Faction débloquée" },
  { unlockId: RESEARCH_UNLOCK_IDS.secondExpeditionSlot, moduleId: UI_MODULE_IDS.island, label: "Second slot d’expédition débloqué" },
  { unlockId: RESEARCH_UNLOCK_IDS.enchantmentService, moduleId: UI_MODULE_IDS.merchant, label: "Enchantement débloqué" },
  { unlockId: RESEARCH_UNLOCK_IDS.resourceYieldTracking, moduleId: UI_MODULE_IDS.inventory, label: "Suivi de rendement débloqué" },
  { unlockId: RESEARCH_UNLOCK_IDS.advancedWorkerOrganization, moduleId: UI_MODULE_IDS.island, label: "Organisation avancée des ouvriers débloquée" },
  { unlockId: RESEARCH_UNLOCK_IDS.advancedBankManagement, moduleId: UI_MODULE_IDS.inventory, label: "Gestion avancée de la banque débloquée" },
  { unlockId: RESEARCH_UNLOCK_IDS.instantRefining, moduleId: UI_MODULE_IDS.island, label: "Raffinage instantané débloqué" },
  { unlockId: RESEARCH_UNLOCK_IDS.blackMarket, moduleId: UI_MODULE_IDS.merchant, label: "Marché Noir débloqué" },
  { unlockId: RESEARCH_UNLOCK_IDS.dungeonSystem, moduleId: UI_MODULE_IDS.world, label: "Donjons débloqués" },
  { unlockId: RESEARCH_UNLOCK_IDS.towerSystem, moduleId: UI_MODULE_IDS.world, label: "Tour sans fin débloquée" },
];

function getCompletedResearchUnlockIds(research: readonly { readonly id: string; readonly state: string }[]): Set<string> {
  const completedResearchIds = new Set(
    research.filter((entry) => entry.state === "completed").map((entry) => entry.id),
  );
  return new Set(
    RESEARCH_DEFINITIONS
      .filter((definition) => completedResearchIds.has(definition.id))
      .flatMap((definition) => definition.unlockIds),
  );
}

export function useFeatureUnlockVisit(unlockIds: readonly string[]): void {
  useGameBridge();
  const { getAcademyModel } = useGameServices();
  const completedUnlockIds = getCompletedResearchUnlockIds(getAcademyModel().research);
  const visitKey = unlockIds.filter((unlockId) => completedUnlockIds.has(unlockId)).join("|");

  useEffect(() => {
    if (visitKey.length > 0) {
      dashboardLayoutSaveProvider.acknowledgeFeatureUnlocks(visitKey.split("|"));
    }
  }, [visitKey]);
}

export function usePlayerAttention(): PlayerAttentionState {
  const bridge = useGameBridge();
  const { enchantmentService, getAcademyModel } = useGameServices();
  const ignoredEnchantInstanceIds = useSyncExternalStore(
    dashboardLayoutSaveProvider.subscribe,
    dashboardLayoutSaveProvider.getIgnoredEnchantInstanceIds,
    dashboardLayoutSaveProvider.getIgnoredEnchantInstanceIds,
  );
  const acknowledgedFeatureUnlockIds = useSyncExternalStore(
    dashboardLayoutSaveProvider.subscribe,
    dashboardLayoutSaveProvider.getAcknowledgedFeatureUnlockIds,
    dashboardLayoutSaveProvider.getAcknowledgedFeatureUnlockIds,
  );
  const academyModel = getAcademyModel();

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
    const activeExpeditionCount = academyModel.expeditions.filter((entry) => entry.active).length;
    const expeditionUnlocked = academyModel.expeditions.some((entry) => entry.active || entry.startState === "available");
    const expeditionIdle = expeditionUnlocked && activeExpeditionCount === 0;

    const completedUnlockIds = getCompletedResearchUnlockIds(academyModel.research);
    const pendingFeatureUnlocks = FEATURE_UNLOCK_ATTENTION.filter((entry) => (
      completedUnlockIds.has(entry.unlockId) && !acknowledgedFeatureUnlockIds.has(entry.unlockId)
    ));

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
    if (expeditionIdle) {
      signals.push({
        id: "expedition_idle",
        moduleId: UI_MODULE_IDS.island,
        severity: "warning",
        count: 1,
        label: "Aucune expédition en cours",
      });
    }

    for (const moduleId of Object.values(UI_MODULE_IDS)) {
      const moduleUnlocks = pendingFeatureUnlocks.filter((entry) => entry.moduleId === moduleId);
      if (moduleUnlocks.length === 0) continue;
      signals.push({
        id: "feature_unlocked",
        moduleId,
        severity: "action",
        count: moduleUnlocks.length,
        label: moduleUnlocks.map((entry) => entry.label).join(" · "),
      });
    }

    return {
      signals,
      enchantReadyItems,
      pendingFeatureUnlocks,
      idleWorkerCount,
      pausedWorkerCount,
      nonProducingWorkerCount,
      activeExpeditionCount,
      expeditionIdle,
      inventoryFreeSlots,
      inventoryIsFull,
      inventoryIsNearlyFull,
      dismissEnchantReady: dashboardLayoutSaveProvider.ignoreEnchantInstance,
      getModuleSignals: (moduleId: UiModuleId) => signals.filter((signal) => signal.moduleId === moduleId),
    };
  }, [academyModel, acknowledgedFeatureUnlockIds, bridge, enchantmentService, ignoredEnchantInstanceIds]);
}
