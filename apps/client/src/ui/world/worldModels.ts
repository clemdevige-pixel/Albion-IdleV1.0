import type { GameBridgeState } from "../../game/GameBridge";
import {
  getMonsterDefinition,
  resolveMonsterForEncounter,
  type MonsterCategory,
} from "../../data/monsterContentCatalog";
import {
  getCombatLootExpectations,
  type BlueZoneCombatDropKind,
  type BlueZoneLootContext,
} from "../../data/economyContentCatalog";
import {
  ZONE_DEFINITIONS,
  getWorldZonePlacement,
} from "../../data/worldContentCatalog";
import { renderManifestRegistry } from "../../game/render/defaultRenderManifestRegistry";
import { selectDashboardZone, type DashboardZoneModel } from "../dashboard/dashboardModels";
import {
  ENCOUNTERS_PER_SEGMENT,
  SEGMENTS_PER_ZONE,
  WORLD_BAND_DEFINITIONS,
  getWorldBandDefinition,
  type WorldBandId,
} from "@game/data";
import { getEnemyCombatProfile } from "@game/gameplay";

export type WorldTabId = "zones" | "gathering" | "bestiary" | "achievements";
export type { WorldBandId } from "@game/data";

export interface WorldBandModel {
  readonly id: WorldBandId;
  readonly label: string;
  readonly tierLabel: string;
  readonly isAvailable: boolean;
}

export interface BestiaryLootRangeModel {
  readonly itemId: string;
  readonly kind: BlueZoneCombatDropKind;
  readonly minimumExpectedQuantity: number;
  readonly maximumExpectedQuantity: number;
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
  readonly bandIds: readonly WorldBandId[];
  readonly lootByBand: Readonly<Partial<Record<WorldBandId, readonly BestiaryLootRangeModel[]>>>;
}

interface BestiaryEncounterContext {
  readonly monsterId: string;
  readonly bandId: WorldBandId;
  readonly lootContext: BlueZoneLootContext;
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

function buildEncounterContexts(): readonly BestiaryEncounterContext[] {
  const contexts: BestiaryEncounterContext[] = [];

  for (const zone of ZONE_DEFINITIONS) {
    const placement = getWorldZonePlacement(zone.id);
    const baselineProfile = getEnemyCombatProfile(0, 0, 0, placement.bandId);
    const enchantmentTier = getWorldBandDefinition(placement.bandId).maximumTier;

    for (let segmentIndex = 0; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
      for (let encounterIndex = 0; encounterIndex < ENCOUNTERS_PER_SEGMENT; encounterIndex += 1) {
        const monster = resolveMonsterForEncounter(zone.id, segmentIndex, encounterIndex);
        const enemyProfile = getEnemyCombatProfile(
          placement.zoneIndexWithinBand,
          segmentIndex,
          encounterIndex,
          placement.bandId,
        );
        const isFinalBoss = monster.tags.includes("biome_boss");
        const isBoss = isFinalBoss
          || monster.tags.includes("segment_boss")
          || monster.category === "boss";

        contexts.push({
          monsterId: monster.id,
          bandId: placement.bandId,
          lootContext: {
            segmentIndex,
            faction: monster.faction,
            isElite: monster.category === "elite",
            isBoss,
            isFinalBoss,
            enchantmentTier,
            enchantmentDropWeight: baselineProfile.hp <= 0
              ? 1
              : enemyProfile.hp / baselineProfile.hp,
          },
        });
      }
    }
  }

  return contexts;
}

function aggregateLootRanges(
  contexts: readonly BestiaryEncounterContext[],
): readonly BestiaryLootRangeModel[] {
  const ranges = new Map<string, BestiaryLootRangeModel>();

  for (const context of contexts) {
    for (const expectation of getCombatLootExpectations(context.lootContext)) {
      const key = `${expectation.kind}:${expectation.itemId}`;
      const previous = ranges.get(key);
      if (previous === undefined) {
        ranges.set(key, {
          itemId: expectation.itemId,
          kind: expectation.kind,
          minimumExpectedQuantity: expectation.expectedQuantity,
          maximumExpectedQuantity: expectation.expectedQuantity,
        });
        continue;
      }
      ranges.set(key, {
        ...previous,
        minimumExpectedQuantity: Math.min(
          previous.minimumExpectedQuantity,
          expectation.expectedQuantity,
        ),
        maximumExpectedQuantity: Math.max(
          previous.maximumExpectedQuantity,
          expectation.expectedQuantity,
        ),
      });
    }
  }

  return [...ranges.values()].sort((left, right) => left.kind.localeCompare(right.kind));
}

const BESTIARY_ENCOUNTER_CONTEXTS = buildEncounterContexts();
const ACTIVE_MONSTER_IDS = [...new Set(
  BESTIARY_ENCOUNTER_CONTEXTS.map(({ monsterId }) => monsterId),
)];

export const WORLD_BESTIARY: readonly BestiaryEntryModel[] = ACTIVE_MONSTER_IDS.map((monsterId) => {
  const monster = getMonsterDefinition(monsterId);
  const monsterContexts = BESTIARY_ENCOUNTER_CONTEXTS.filter(
    (context) => context.monsterId === monsterId,
  );
  const bandIds = [...new Set(monsterContexts.map(({ bandId }) => bandId))];
  const lootByBand: Partial<Record<WorldBandId, readonly BestiaryLootRangeModel[]>> = {};

  for (const bandId of bandIds) {
    lootByBand[bandId] = aggregateLootRanges(
      monsterContexts.filter((context) => context.bandId === bandId),
    );
  }

  return {
    id: monster.id,
    name: monster.name,
    faction: monster.faction,
    category: monster.category,
    tier: monster.tier,
    damageType: monster.combat.damageType,
    abilityCount: monster.abilityIds.length,
    imageSrc: renderManifestRegistry.getStaticActor(monster.visualManifestId)?.assetPath,
    bandIds,
    lootByBand,
  };
});

export const BESTIARY_FACTIONS: readonly string[] = [
  "Toutes",
  ...new Set(WORLD_BESTIARY.map((entry) => entry.faction)),
];

export function getBestiaryLoot(
  entry: BestiaryEntryModel,
  bandId: WorldBandId | "all",
): readonly BestiaryLootRangeModel[] {
  if (bandId !== "all") return entry.lootByBand[bandId] ?? [];
  return aggregateLootRanges(
    entry.bandIds.flatMap((entryBandId) => {
      const loot = entry.lootByBand[entryBandId] ?? [];
      return loot.map((drop) => ({
        monsterId: entry.id,
        bandId: entryBandId,
        lootContext: undefined,
        drop,
      }));
    }).map(({ drop }) => drop),
  );
}

export function selectWorldZones(state: GameBridgeState): DashboardZoneModel {
  return selectDashboardZone(state);
}
