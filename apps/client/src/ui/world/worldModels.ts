import type { GameBridgeState } from "../../game/GameBridge";
import {
  getMonsterDefinition,
  resolveMonsterForEncounter,
  type MonsterCategory,
} from "../../data/monsterContentCatalog";
import { buildMonsterRuntimeAbilities } from "../../data/monsterAbilityContentCatalog";
import {
  getCombatLootExpectations,
  getDungeonKeyProgressionWeight,
  type CombatDropKind,
  type CombatLootContext,
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
import { getEnemyCombatProfile, type DamageType } from "@game/gameplay";

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
  readonly kind: CombatDropKind;
  readonly minimumExpectedQuantity: number;
  readonly maximumExpectedQuantity: number;
}

export interface BestiaryAbilityModel {
  readonly id: string;
  readonly name: string;
  readonly cooldown: number;
  readonly damageType: DamageType;
  readonly damageMultiplier: number;
  readonly interruptible: boolean;
}

export interface BestiaryEntryModel {
  readonly id: string;
  readonly name: string;
  readonly faction: string;
  readonly category: MonsterCategory;
  readonly tier: number;
  readonly damageType: DamageType;
  readonly abilities: readonly BestiaryAbilityModel[];
  readonly imageSrc: string | undefined;
  readonly bandIds: readonly WorldBandId[];
  readonly lootByBand: Readonly<Partial<Record<WorldBandId, readonly BestiaryLootRangeModel[]>>>;
}

interface BestiaryEncounterContext {
  readonly monsterId: string;
  readonly bandId: WorldBandId;
  readonly lootContext: CombatLootContext;
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

export function getBestiaryContextIds(
  bandId: WorldBandId | "all",
): readonly string[] | undefined {
  if (bandId === "all") return undefined;
  return ZONE_DEFINITIONS
    .filter((zone) => getWorldZonePlacement(zone.id).bandId === bandId)
    .map((zone) => String(zone.id));
}

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
            dungeonKeyDropWeight: getDungeonKeyProgressionWeight(
              placement.bandId,
              placement.zoneIndexWithinBand,
              segmentIndex,
            ),
          },
        });
      }
    }
  }

  return contexts;
}

function mergeLootRanges(
  drops: readonly BestiaryLootRangeModel[],
): readonly BestiaryLootRangeModel[] {
  const ranges = new Map<string, BestiaryLootRangeModel>();

  for (const drop of drops) {
    const key = `${drop.kind}:${drop.itemId}`;
    const previous = ranges.get(key);
    if (previous === undefined) {
      ranges.set(key, drop);
      continue;
    }
    ranges.set(key, {
      ...previous,
      minimumExpectedQuantity: Math.min(
        previous.minimumExpectedQuantity,
        drop.minimumExpectedQuantity,
      ),
      maximumExpectedQuantity: Math.max(
        previous.maximumExpectedQuantity,
        drop.maximumExpectedQuantity,
      ),
    });
  }

  return [...ranges.values()].sort((left, right) => left.kind.localeCompare(right.kind));
}

function aggregateLootRanges(
  contexts: readonly BestiaryEncounterContext[],
): readonly BestiaryLootRangeModel[] {
  return mergeLootRanges(
    contexts.flatMap((context) => getCombatLootExpectations(context.lootContext).map(
      (expectation): BestiaryLootRangeModel => ({
        itemId: expectation.itemId,
        kind: expectation.kind,
        minimumExpectedQuantity: expectation.expectedQuantity,
        maximumExpectedQuantity: expectation.expectedQuantity,
      }),
    )),
  );
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
  const abilities = buildMonsterRuntimeAbilities(monster.category, monster.abilityIds).map((ability) => ({
    id: ability.id,
    name: ability.name,
    cooldown: ability.cooldown,
    damageType: ability.damageType,
    damageMultiplier: ability.damageMultiplier,
    interruptible: ability.interruptible,
  }));

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
    abilities,
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
  return mergeLootRanges(
    entry.bandIds.flatMap((entryBandId) => entry.lootByBand[entryBandId] ?? []),
  );
}

export function selectWorldZones(state: GameBridgeState): DashboardZoneModel {
  return selectDashboardZone(state);
}
