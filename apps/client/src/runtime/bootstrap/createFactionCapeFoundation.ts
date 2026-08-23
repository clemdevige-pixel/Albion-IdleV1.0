import type { EntityId } from "@game/core";
import type {
  DamageManager,
  DungeonRuntime,
  EquipmentManager,
  PostMitigationDamageResolver,
} from "@game/gameplay";
import { resolveFactionCapeDungeonDamageReductionPercent } from "../../data/factionCapeContentCatalog.js";
import { resolveArtifactDungeonDamageBonusPercent } from "../../data/weaponContentCatalog.js";

export interface FactionCapeFoundationDependencies {
  readonly damageManager: DamageManager;
  readonly dungeonRuntime: DungeonRuntime;
  readonly equipmentManager: EquipmentManager;
  readonly heroId: EntityId;
}

/**
 * Single faction-dungeon damage resolver. It composes all authored faction
 * modifiers that operate after mitigation so no feature can overwrite another
 * DamageManager resolver.
 */
export function createFactionCapeFoundation(
  dependencies: FactionCapeFoundationDependencies,
) {
  const resolvePostMitigationDamage: PostMitigationDamageResolver = (
    request,
    mitigatedDamage,
  ) => {
    const run = dependencies.dungeonRuntime.activeRun;
    if (run?.status !== "active") return mitigatedDamage;
    const dungeon = dependencies.dungeonRuntime.getDefinition(run.definitionId);
    if (dungeon === undefined) return mitigatedDamage;

    let resolvedDamage = mitigatedDamage;

    if (request.source === dependencies.heroId) {
      const equippedWeapon = dependencies.equipmentManager.getEquippedItem(
        dependencies.heroId,
        "weapon",
      );
      if (equippedWeapon !== undefined) {
        const bonusPercent = resolveArtifactDungeonDamageBonusPercent(
          equippedWeapon.itemId,
          dungeon.faction,
        );
        if (bonusPercent > 0) resolvedDamage *= 1 + bonusPercent / 100;
      }
    }

    if (request.target === dependencies.heroId) {
      const equippedCape = dependencies.equipmentManager.getEquippedItem(
        dependencies.heroId,
        "cape",
      );
      if (equippedCape !== undefined) {
        const reductionPercent = resolveFactionCapeDungeonDamageReductionPercent(
          equippedCape.itemId,
          { factionId: dungeon.faction, tier: dungeon.tier },
        );
        if (reductionPercent > 0) resolvedDamage *= 1 - reductionPercent / 100;
      }
    }

    return resolvedDamage;
  };

  dependencies.damageManager.setPostMitigationDamageResolver(resolvePostMitigationDamage);

  const dispose = (): void => {
    dependencies.damageManager.setPostMitigationDamageResolver(undefined);
  };

  return { resolvePostMitigationDamage, dispose };
}

export type FactionCapeFoundation = ReturnType<typeof createFactionCapeFoundation>;
