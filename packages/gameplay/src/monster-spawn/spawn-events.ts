import type { MonsterDefinitionId, MonsterInstanceId } from "../monsters/types.js";
import type { SpawnGroupId, SpawnPointId } from "./spawn-types.js";

// ---------------------------------------------------------------------------
// Event payloads
// ---------------------------------------------------------------------------

export interface MonsterSpawnedByPointEvent {
  readonly spawnPointId: SpawnPointId;
  readonly groupId: SpawnGroupId;
  readonly instanceId: MonsterInstanceId;
  readonly definitionId: MonsterDefinitionId;
}

export interface MonsterDespawnedByPointEvent {
  readonly spawnPointId: SpawnPointId;
  readonly groupId: SpawnGroupId;
  readonly instanceId: MonsterInstanceId;
}

export interface SpawnPointRegisteredEvent {
  readonly spawnPointId: SpawnPointId;
  readonly groupId: SpawnGroupId;
  readonly definitionId: MonsterDefinitionId;
}

export interface SpawnGroupRegisteredEvent {
  readonly groupId: SpawnGroupId;
  readonly name: string;
  readonly populationCap: number;
}

export interface RespawnTimerStartedEvent {
  readonly spawnPointId: SpawnPointId;
  readonly delayTicks: number;
}

export interface RespawnTimerExpiredEvent {
  readonly spawnPointId: SpawnPointId;
}

export interface SpawnDeniedEvent {
  readonly spawnPointId: SpawnPointId;
  readonly reason: string;
}

// ---------------------------------------------------------------------------
// Event map
// ---------------------------------------------------------------------------

export interface SpawnEventMap {
  spawnPointSpawned: MonsterSpawnedByPointEvent;
  spawnPointDespawned: MonsterDespawnedByPointEvent;
  spawnPointRegistered: SpawnPointRegisteredEvent;
  spawnGroupRegistered: SpawnGroupRegisteredEvent;
  respawnTimerStarted: RespawnTimerStartedEvent;
  respawnTimerExpired: RespawnTimerExpiredEvent;
  spawnDenied: SpawnDeniedEvent;
}
