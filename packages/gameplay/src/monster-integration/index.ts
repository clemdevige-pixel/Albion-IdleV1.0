export type {
  MonsterKillRewardConfig,
  MonsterKillProcessedEvent,
  MonsterLootAwardedEvent,
  MonsterFameAwardedEvent,
  MonsterDespawnProcessedEvent,
  MonsterLifecycleCompleteEvent,
  MonsterIntegrationEventMap,
  MonsterIntegrationFailureReason,
  MonsterIntegrationResult,
} from "./types.js";

export { MonsterIntegrationCoordinator } from "./monster-integration-coordinator.js";
export type { MonsterIntegrationDeps } from "./monster-integration-coordinator.js";
