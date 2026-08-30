import type { EntityId } from "@game/core";
import type {
  DamageManager,
  DungeonRuntime,
  EquipmentManager,
  PostMitigationDamageResolver,
} from "@game/gameplay";
import {
  resolveFactionCombatModifiers,
  type FactionCombatContext,
} from "../../data/factionCombatResolver.js";

export interface FactionCapeFoundationDependencies {
  readonly damageManager: DamageManager;
  readonly equipmentManager: EquipmentManager;
  readonly heroId: EntityId;
  readonly getActiveFactionCombatContext?: () => FactionCombatContext | undefined;
  readonly dungeonRuntime?: DungeonRuntime;
}

function resolveDungeonFallbackContext(
  dungeonRuntime: DungeonRuntime | undefined,
): FactionCombatContext | undefined {
  const run = dungeonRuntime?.activeRun;
  if (run?.status !== "active") return undefined;
  const dungeon = dungeonRuntime?.getDefinition(run.definitionId);
  if (dungeon === undefined) return undefined;
  return { factionId: dungeon.faction, tier: dungeon.tier, activity: "dungeon" };
}

/**
 * Single faction-combat damage resolver shared by all authored faction combat
 * activities. Activity routing owns which faction/tier context is active;
 * equipment catalogs remain authoritative for weapon and cape modifiers.
 *
 * The Dungeon fallback preserves compatibility while consumers migrate to the
 * activity-neutral context resolver.
 */
export function createFactionCapeFoundation(
  dependencies: FactionCapeFoundationDependencies,
) {
  const resolvePostMitigationDamage: PostMitigationDamageResolver = (
    request,
    mitigatedDamage,
  ) => {
    const context = dependencies.getActiveFactionCombatContext?.()
      ?? resolveDungeonFallbackContext(dependencies.dungeonRuntime);
    if (context === undefined) return mitigatedDamage;

    let resolvedDamage = mitigatedDamage;

    if (request.source === dependencies.heroId) {
      const equippedWeapon = dependencies.equipmentManager.getEquippedItem(
        dependencies.heroId,
        "weapon",
      );
      const modifiers = resolveFactionCombatModifiers(
        equippedWeapon === undefined ? {} : { weaponItemId: equippedWeapon.itemId },
        context,
      );
      resolvedDamage *= modifiers.factionResilienceDamageMultiplier;
      if (modifiers.outgoingDamageBonusPercent > 0) {
        resolvedDamage *= 1 + modifiers.outgoingDamageBonusPercent / 100;
      }
    }

    if (request.target === dependencies.heroId) {
      const equippedCape = dependencies.equipmentManager.getEquippedItem(
        dependencies.heroId,
        "cape",
      );
      const modifiers = resolveFactionCombatModifiers(
        equippedCape === undefined ? {} : { capeItemId: equippedCape.itemId },
        context,
      );
      if (modifiers.incomingDamageReductionPercent > 0) {
        resolvedDamage *= 1 - modifiers.incomingDamageReductionPercent / 100;
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
