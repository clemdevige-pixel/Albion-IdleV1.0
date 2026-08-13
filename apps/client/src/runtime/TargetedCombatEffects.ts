import type { EntityId } from "@game/core";
import type { EffectManager, StatusEffectType, World } from "@game/gameplay";

export interface TargetedCombatEffectDisplay {
  readonly id: string;
  readonly definitionId: string;
  readonly effectType: StatusEffectType;
  readonly remainingDuration: number;
  readonly target: "player" | "enemy";
}

export function collectTargetedCombatEffects(
  world: World,
  effectManager: EffectManager,
  heroId: EntityId,
  enemyId: EntityId,
): readonly TargetedCombatEffectDisplay[] {
  const displays: TargetedCombatEffectDisplay[] = [];
  const targets = [
    { entityId: heroId, target: "player" as const },
    { entityId: enemyId, target: "enemy" as const },
  ];

  for (const { entityId, target } of targets) {
    if (!world.hasEntity(entityId)) continue;
    for (const effect of effectManager.getActiveEffects(entityId)) {
      displays.push({
        id: String(effect.id),
        definitionId: effect.definition.id,
        effectType: effect.effectType,
        remainingDuration: effect.remainingDuration,
        target,
      });
    }
  }

  return displays;
}
