import type { GameBridgeState } from "../../game/GameBridge";
import { MONSTER_DEFINITIONS, type MonsterCategory } from "../../data/monsterContentCatalog";
import { renderManifestRegistry } from "../../game/render/defaultRenderManifestRegistry";
import { selectDashboardZone, type DashboardZoneModel } from "../dashboard/dashboardModels";
import { WORLD_BAND_DEFINITIONS, type WorldBandId } from "@game/data";

export type WorldTabId = "zones" | "bestiary" | "achievements";
export type { WorldBandId } from "@game/data";

export interface WorldBandModel {
  readonly id: WorldBandId;
  readonly label: string;
  readonly tierLabel: string;
  readonly isAvailable: boolean;
}

export interface BestiaryEntryModel {
  readonly id: string;
  readonly name: string;
  readonly faction: string;
  readonly category: MonsterCategory;
  readonly tier: number;
  readonly damageType: string;
  readonly abilityCount: number;
  readonly imageSrc: string | undefined;
}

export const WORLD_BANDS: readonly WorldBandModel[] = WORLD_BAND_DEFINITIONS.map(
  (band) => ({
    id: band.id,
    label: band.label,
    tierLabel: band.minimumTier === band.maximumTier
      ? `T${String(band.minimumTier)}`
      : `T${String(band.minimumTier)} → T${String(band.maximumTier)}`,
    isAvailable: band.contentStatus === "implemented",
  }),
);

export const WORLD_BESTIARY: readonly BestiaryEntryModel[] = Object.values(
  MONSTER_DEFINITIONS,
).map((monster) => ({
  id: monster.id,
  name: monster.name,
  faction: monster.faction,
  category: monster.category,
  tier: monster.tier,
  damageType: monster.combat.damageType,
  abilityCount: monster.abilityIds.length,
  imageSrc: renderManifestRegistry.getStaticActor(monster.visualManifestId)?.assetPath,
}));

export function selectWorldZones(state: GameBridgeState): DashboardZoneModel {
  return selectDashboardZone(state);
}
