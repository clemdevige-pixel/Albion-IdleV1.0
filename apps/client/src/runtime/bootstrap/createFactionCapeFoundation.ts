import type { EntityId } from "@game/core";
import type {
  DamageManager,
  DungeonRuntime,
  EquipmentManager,
  PostMitigationDamageResolver,
} from "@game/gameplay";
import { resolveFactionCapeDungeonDamageReductionPercent } from "../../data/factionCapeContentCatalog.js";

export interface FactionCapeFoundationDependencies {
  readonly damageManager: DamageManager;
  readonly dungeonRuntime: DungeonRuntime;
  readonly equipmentManager: EquipmentManager;
  readonly heroId: EntityId;
}

export function createFactionCapeFoundation(
  dependencies: FactionCapeFoundationDependencies,
) {
  const resolvePostMitigationDamage: PostMitigationDamageResolver = (
    request,
    mitigatedDamage,
  ) => {
    if (request.target !== dependencies.heroId) return mitigatedDamage;

    const run = dependencies.dungeonRuntime.activeRun;
    if (run?.status !== "active") return mitigatedDamage;

    const dungeon = dependencies.dungeonRuntime.getDefinition(run.definitionId);
    if (dungeon === undefined) return mitigatedDamage;

    const equippedCape = dependencies.equipmentManager.getEquippedItem(
      dependencies.heroId,
      "cape",
    );
    if (equippedCape === undefined) return mitigatedDamage;

    const reductionPercent = resolveFactionCapeDungeonDamageReductionPercent(
      equippedCape.itemId,
      { factionId: dungeon.faction, tier: dungeon.tier },
    );
    if (reductionPercent <= 0) return mitigatedDamage;

    return mitigatedDamage * (1 - reductionPercent / 100);
  };

  dependencies.damageManager.setPostMitigationDamageResolver(resolvePostMitigationDamage);

  const dispose = (): void => {
    dependencies.damageManager.setPostMitigationDamageResolver(undefined);
  };

  return { resolvePostMitigationDamage, dispose };
}

export type FactionCapeFoundation = ReturnType<typeof createFactionCapeFoundation>;
