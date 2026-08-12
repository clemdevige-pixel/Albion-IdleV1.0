import type { ProductionTier } from "../../data/productionFamilyCatalog";
import type { WorkerId } from "@game/gameplay";
import type {
  GameBridge,
  WorkerProfessionVM,
  WorkerVM,
} from "../../game/GameBridge";
import {
  WORKER_PROFESSION_LABELS,
  getWorkerResourceLabel,
} from "../../data/productionFamilyCatalog";

export {
  WORKER_PROFESSION_LABELS,
  getWorkerResourceLabel,
} from "../../data/productionFamilyCatalog";

export function syncWorkersToBridge(
  bridge: GameBridge,
  workers: readonly {
    id: WorkerId;
    displayName: string;
    profession: WorkerProfessionVM;
    mastery: number;
  }[],
  isSupportedProfession: (profession: string) => boolean,
  getWorkerSession: (
    workerId: WorkerId,
  ) => { state: string; getProgress: () => number; totalTicks?: number } | undefined,
  getAssignedTier: (workerId: WorkerId) => ProductionTier,
  getWorkerMasteryDetails: (masteryXp: number, tier: ProductionTier) => {
    masteryLevel: number;
    currentThreshold: number;
    nextThreshold: number;
    speedModifier: number;
  },
  capacity: number,
  recruitmentCost: number,
): void {
  const workerVMs: WorkerVM[] = workers
    .filter((worker) => isSupportedProfession(worker.profession))
    .map((worker) => {
      const session = getWorkerSession(worker.id);
      const assignedTier = getAssignedTier(worker.id);
      const mastery = getWorkerMasteryDetails(worker.mastery, assignedTier);
      return {
        id: worker.id,
        displayName: worker.displayName,
        profession: worker.profession,
        professionName: WORKER_PROFESSION_LABELS[worker.profession],
        productionTier: assignedTier,
        resourceName: getWorkerResourceLabel(worker.profession, assignedTier),
        state: session?.state === "executing"
          ? "working"
          : session?.state === "paused"
            ? "paused"
            : "idle",
        mastery: mastery.masteryLevel,
        masteryXp: worker.mastery - mastery.currentThreshold,
        masteryXpToNext: mastery.nextThreshold - mastery.currentThreshold,
        progress: Math.round((session?.getProgress() ?? 0) * 100),
        durationSeconds: (
          session?.totalTicks ?? Math.ceil(60 / mastery.speedModifier)
        ) * 0.5,
        yieldPerCycle: 1,
      };
    });
  bridge.updateWorkers({ capacity, recruitmentCost, workers: workerVMs });
}
