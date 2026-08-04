import type { EntityId } from "@game/core";
import type { MonsterDefinitionId, MonsterInstanceId, MonsterState } from "./types.js";

// ---------------------------------------------------------------------------
// Event payloads
// ---------------------------------------------------------------------------

export interface MonsterSpawnedEvent {
  readonly instanceId: MonsterInstanceId;
  readonly definitionId: MonsterDefinitionId;
  readonly entityId: EntityId;
  readonly name: string;
  readonly tier: number;
}

export interface MonsterStateChangedEvent {
  readonly instanceId: MonsterInstanceId;
  readonly entityId: EntityId;
  readonly previousState: MonsterState;
  readonly newState: MonsterState;
}

export interface MonsterDiedEvent {
  readonly instanceId: MonsterInstanceId;
  readonly entityId: EntityId;
}

export interface MonsterDespawnedEvent {
  readonly instanceId: MonsterInstanceId;
  readonly entityId: EntityId;
}

// ---------------------------------------------------------------------------
// Event map (for EventBus<MonsterEventMap>)
// ---------------------------------------------------------------------------

export interface MonsterEventMap {
  monsterSpawned: MonsterSpawnedEvent;
  monsterStateChanged: MonsterStateChangedEvent;
  monsterDied: MonsterDiedEvent;
  monsterDespawned: MonsterDespawnedEvent;
}
