import type { GameBridgeState } from "../../game/GameBridge";
import { MONSTER_DEFINITIONS, type MonsterCategory } from "../../data/monsterContentCatalog";
import { renderManifestRegistry } from "../../game/render/defaultRenderManifestRegistry";
import { selectDashboardZone, type DashboardZoneModel } from "../dashboard/dashboardModels";

export type WorldTabId = "zones" | "bestiary" | "achievements";
export type WorldBandId = "blue" | "yellow" | "orange" | "red" | "black";

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

export const WORLD_BANDS: readonly WorldBandModel[] = [
  { id: "blue", label: "Bleue", tierLabel: "T3 → T4", isAvailable: true },
  { id: "yellow", label: "Jaune", tierLabel: "À venir", isAvailable: false },
  { id: "orange", label: "Orange", tierLabel: "À venir", isAvailable: false },
  { id: "red", label: "Rouge", tierLabel: "À venir", isAvailable: false },
  { id: "black", label: "Noire", tierLabel: "À venir", isAvailable: false },
] as const;

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
