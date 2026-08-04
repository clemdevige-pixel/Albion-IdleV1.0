import type { EntityId } from "@game/core";
import type { MonsterInstanceId } from "../monsters/types.js";
import type { MonsterAIAction, MonsterAIBehaviorState } from "./monster-ai-types.js";

// ---------------------------------------------------------------------------
// Event payloads
// ---------------------------------------------------------------------------

export interface MonsterAIStateChangedEvent {
  readonly monsterInstanceId: MonsterInstanceId;
  readonly monsterEntityId: EntityId;
  readonly previousState: MonsterAIBehaviorState;
  readonly newState: MonsterAIBehaviorState;
}

export interface MonsterAIActionSelectedEvent {
  readonly monsterInstanceId: MonsterInstanceId;
  readonly monsterEntityId: EntityId;
  readonly action: MonsterAIAction;
}

export interface MonsterAITargetAcquiredEvent {
  readonly monsterInstanceId: MonsterInstanceId;
  readonly monsterEntityId: EntityId;
  readonly targetEntityId: EntityId;
}

export interface MonsterAITargetLostEvent {
  readonly monsterInstanceId: MonsterInstanceId;
  readonly monsterEntityId: EntityId;
}

// ---------------------------------------------------------------------------
// Event map
// ---------------------------------------------------------------------------

export interface MonsterAIEventMap {
  monsterAIStateChanged: MonsterAIStateChangedEvent;
  monsterAIActionSelected: MonsterAIActionSelectedEvent;
  monsterAITargetAcquired: MonsterAITargetAcquiredEvent;
  monsterAITargetLost: MonsterAITargetLostEvent;
}
