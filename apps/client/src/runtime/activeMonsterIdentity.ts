import type { EntityId } from "@game/core";

interface ActiveMonsterIdentity {
  readonly entityId: EntityId;
  readonly monsterDefinitionId: string;
}

let activeMonsterIdentity: ActiveMonsterIdentity | undefined;

export function setActiveMonsterIdentity(
  entityId: EntityId,
  monsterDefinitionId: string,
): void {
  activeMonsterIdentity = { entityId, monsterDefinitionId };
}

export function getMonsterDefinitionIdForEntity(
  entityId: EntityId,
): string | undefined {
  return activeMonsterIdentity?.entityId === entityId
    ? activeMonsterIdentity.monsterDefinitionId
    : undefined;
}

export function clearActiveMonsterIdentity(entityId: EntityId): void {
  if (activeMonsterIdentity?.entityId === entityId) {
    activeMonsterIdentity = undefined;
  }
}
