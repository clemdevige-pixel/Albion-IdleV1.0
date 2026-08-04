import type { GatheringCycleResult } from "./gathering-integration-types.js";

export interface GatheringIntegrationEventMap {
  readonly gatheringCycleCompleted: GatheringCycleResult;
}
