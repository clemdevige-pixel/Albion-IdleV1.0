import {
  FACTION_CAPE_FACTIONS,
  TOWER_FACTION_RESILIENCE_PERCENT,
  TOWER_MATCHED_WEAPON_RESILIENCE_IGNORE_PERCENT,
} from "@game/data";
import { resolveFactionCapeDungeonDamageReductionPercent } from "./factionCapeContentCatalog.js";
import { resolveArtifactDungeonDamageBonusPercent } from "./weaponContentCatalog.js";

export interface FactionCombatContext {
  readonly factionId: string;
  readonly tier: number;
  readonly activity?: "dungeon" | "tower";
}

export interface FactionCombatEquipment {
  readonly weaponItemId?: string;
  readonly capeItemId?: string;
}

export interface FactionCombatModifiers {
  readonly outgoingDamageBonusPercent: number;
  readonly incomingDamageReductionPercent: number;
  readonly factionResilienceDamageMultiplier: number;
}

function resolveFactionDisplayName(factionId: string): string {
  const normalizedFactionId = factionId.toLowerCase();
  return FACTION_CAPE_FACTIONS.find((entry) => entry.factionId === normalizedFactionId)?.displayName
    ?? factionId;
}

function resolveTowerFactionResilienceDamageMultiplier(
  context: FactionCombatContext,
  hasMatchedWeapon: boolean,
): number {
  if (context.activity !== "tower") return 1;
  const ignoredPercent = hasMatchedWeapon
    ? TOWER_MATCHED_WEAPON_RESILIENCE_IGNORE_PERCENT
    : 0;
  const effectiveResiliencePercent = TOWER_FACTION_RESILIENCE_PERCENT
    * (1 - ignoredPercent / 100);
  return 1 - effectiveResiliencePercent / 100;
}

/**
 * Shared faction-matchup authority for faction combat spaces.
 *
 * Dungeon and Endless Tower consume the same item affinities. Tower adds its
 * authored Faction Resilience layer without changing Dungeon behaviour.
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
    factionResilienceDamageMultiplier: resolveTowerFactionResilienceDamageMultiplier(
      context,
      outgoingDamageBonusPercent > 0,
    ),
  };
}
