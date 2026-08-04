import type { EntityId } from "@game/core";
import type { MonsterDefinitionId, MonsterInstanceId } from "../monsters/types.js";
import type { LootResult } from "../death/types.js";
import type { LootTransferOutcome } from "../death/loot-transfer.js";
import type { FameAwardValue } from "../fame/fame-service.js";
import type { FameCategory } from "../fame/types.js";
import type { MasteryId } from "../experience/types.js";

// ---------------------------------------------------------------------------
// Monster kill reward configuration
// ---------------------------------------------------------------------------

export interface MonsterKillRewardConfig {
  /** Fame amount awarded on kill. */
  readonly fameAmount: number;
  /** Mastery to receive the fame. */
  readonly targetMasteryId: MasteryId;
  /** Fame category (typically "combat"). */
  readonly category: FameCategory;
}

// ---------------------------------------------------------------------------
// Integration event payloads
// ---------------------------------------------------------------------------

export interface MonsterKillProcessedEvent {
  readonly monsterInstanceId: MonsterInstanceId;
  readonly monsterEntityId: EntityId;
  readonly killerEntityId: EntityId | null;
  readonly definitionId: MonsterDefinitionId;
}

export interface MonsterLootAwardedEvent {
  readonly monsterInstanceId: MonsterInstanceId;
  readonly monsterEntityId: EntityId;
  readonly receiverEntityId: EntityId;
  readonly loot: LootResult;
  readonly transfer: LootTransferOutcome;
}

export interface MonsterFameAwardedEvent {
  readonly monsterInstanceId: MonsterInstanceId;
  readonly monsterEntityId: EntityId;
  readonly fame: FameAwardValue;
}

export interface MonsterDespawnProcessedEvent {
  readonly monsterInstanceId: MonsterInstanceId;
  readonly monsterEntityId: EntityId;
}

export interface MonsterLifecycleCompleteEvent {
  readonly monsterInstanceId: MonsterInstanceId;
  readonly monsterEntityId: EntityId;
  readonly definitionId: MonsterDefinitionId;
}

// ---------------------------------------------------------------------------
// Event map
// ---------------------------------------------------------------------------

export interface MonsterIntegrationEventMap {
  monsterKillProcessed: MonsterKillProcessedEvent;
  monsterLootAwarded: MonsterLootAwardedEvent;
  monsterFameAwarded: MonsterFameAwardedEvent;
  monsterDespawnProcessed: MonsterDespawnProcessedEvent;
  monsterLifecycleComplete: MonsterLifecycleCompleteEvent;
}

// ---------------------------------------------------------------------------
// Result pattern
// ---------------------------------------------------------------------------

export type MonsterIntegrationFailureReason =
  | "monster_not_found"
  | "no_loot_table"
  | "no_reward_config"
  | "fame_award_failed"
  | "loot_generation_failed";

export type MonsterIntegrationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: MonsterIntegrationFailureReason };
