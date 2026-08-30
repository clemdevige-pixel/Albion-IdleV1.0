import { FACTION_CAPE_FACTIONS } from "@game/data";
import { resolveFactionCapeDungeonDamageReductionPercent } from "./factionCapeContentCatalog.js";
import { resolveArtifactDungeonDamageBonusPercent } from "./weaponContentCatalog.js";

export interface FactionCombatContext {
  readonly factionId: string;
  readonly tier: number;
}

export interface FactionCombatEquipment {
  readonly weaponItemId?: string;
  readonly capeItemId?: string;
}

export interface FactionCombatModifiers {
  readonly outgoingDamageBonusPercent: number;
  readonly incomingDamageReductionPercent: number;
}

function resolveFactionDisplayName(factionId: string): string {
  const normalizedFactionId = factionId.toLowerCase();
  return FACTION_CAPE_FACTIONS.find((entry) => entry.factionId === normalizedFactionId)?.displayName
    ?? factionId;
}

/**
 * Shared faction-matchup authority for faction combat spaces.
 *
 * Dungeon and Endless Tower must consume this resolver instead of maintaining
 * separate matchup rules. The underlying item catalogs remain authoritative
 * for weapon affinity and cape mitigation values.
 */
export function resolveFactionCombatModifiers(
  equipment: FactionCombatEquipment,
  context: FactionCombatContext,
): FactionCombatModifiers {
  const outgoingDamageBonusPercent = equipment.weaponItemId === undefined
    ? 0
    : resolveArtifactDungeonDamageBonusPercent(
        equipment.weaponItemId,
        resolveFactionDisplayName(context.factionId),
      );
  const incomingDamageReductionPercent = equipment.capeItemId === undefined
    ? 0
    : resolveFactionCapeDungeonDamageReductionPercent(equipment.capeItemId, context);

  return {
    outgoingDamageBonusPercent,
    incomingDamageReductionPercent,
  };
}
