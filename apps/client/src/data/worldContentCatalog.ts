import {
  asBiomeId,
  asMonsterDefinitionId,
  asSpawnGroupId,
  asZoneDefinitionId,
  type BiomeDefinition,
  type BiomeId,
  type ZoneDefinition,
  type ZoneDefinitionId,
  type ZoneUnlockDefinition,
} from "@game/gameplay";
import {
  BIOME_DEFINITIONS as AUTHORED_BIOME_DEFINITIONS,
  WORLD_BAND_DEFINITIONS,
  WORLD_ZONE_CONTENT as AUTHORED_WORLD_ZONE_CONTENT,
  type WorldBandId,
} from "@game/data";
import { getZoneEncounterPool } from "./monsterContentCatalog";

interface WorldZoneContentDefinition {
  readonly id: ZoneDefinitionId;
  readonly name: string;
  readonly bandId: WorldBandId;
  readonly tier: number;
  readonly biomeId: BiomeId;
  readonly spawnGroupPrefix: string;
  readonly respawnDelayTicks: number;
  readonly tags: readonly string[];
}

export const WORLD_ZONE_CONTENT = Object.fromEntries(
  Object.entries(AUTHORED_WORLD_ZONE_CONTENT).map(([key, definition]) => [
    key,
    {
      ...definition,
      id: asZoneDefinitionId(definition.id),
      biomeId: asBiomeId(definition.biomeId),
    },
  ]),
) as {
  readonly [K in keyof typeof AUTHORED_WORLD_ZONE_CONTENT]: WorldZoneContentDefinition & {
    readonly id: ZoneDefinitionId;
    readonly biomeId: BiomeId;
  };
};

export type WorldZoneKey = keyof typeof WORLD_ZONE_CONTENT;
export const WORLD_ZONE_IDS = Object.fromEntries(
  Object.entries(WORLD_ZONE_CONTENT).map(([key, definition]) => [key, definition.id]),
) as { readonly [K in WorldZoneKey]: (typeof WORLD_ZONE_CONTENT)[K]["id"] };
const ZONE_CONTENT_VALUES: readonly WorldZoneContentDefinition[] = Object.values(WORLD_ZONE_CONTENT);
export const WORLD_ZONE_IDS_BY_BAND = Object.fromEntries(
  WORLD_BAND_DEFINITIONS.map(({ id }) => [
    id,
    ZONE_CONTENT_VALUES.filter((definition) => definition.bandId === id).map((definition) => definition.id),
  ]),
) as unknown as Readonly<Record<WorldBandId, readonly ZoneDefinitionId[]>>;

export interface WorldZonePlacement {
  readonly bandId: WorldBandId;
  readonly zoneIndexWithinBand: number;
  readonly tier: number;
}

export function getWorldZonePlacement(zoneDefId: ZoneDefinitionId | string): WorldZonePlacement {
  const definition = ZONE_CONTENT_VALUES.find(({ id }) => id === zoneDefId);
  if (definition === undefined) throw new Error(`Zone is not assigned to a world band: ${String(zoneDefId)}`);
  const zoneIndexWithinBand = WORLD_ZONE_IDS_BY_BAND[definition.bandId].findIndex(
    (candidate) => candidate === definition.id,
  );
  if (zoneIndexWithinBand < 0) throw new Error(`Zone placement is inconsistent: ${String(zoneDefId)}`);
  return { bandId: definition.bandId, zoneIndexWithinBand, tier: definition.tier };
}

export const BIOME_DEFINITIONS: readonly BiomeDefinition[] = AUTHORED_BIOME_DEFINITIONS.map(
  (definition) => ({
    ...definition,
    id: asBiomeId(definition.id),
    enemyFamilies: [...definition.enemyFamilies],
    resourceFamilies: [...definition.resourceFamilies],
    tags: [...definition.tags],
  }),
);

function buildNormalMonsterSpawns(
  zoneDefId: ZoneDefinitionId,
  groupPrefix: string,
  respawnDelayTicks: number,
): ZoneDefinition["monsterSpawns"] {
  const pool = getZoneEncounterPool(zoneDefId);
  const monsterIds = [...new Set([...pool.dominant.normal, ...pool.secondary.normal])];
  return monsterIds.map((monsterId, index) => ({
    definitionId: asMonsterDefinitionId(monsterId),
    spawnGroupId: asSpawnGroupId(`${groupPrefix}_${String(index + 1)}`),
    count: 1,
    respawnDelayTicks,
  }));
}

export const ZONE_DEFINITIONS: readonly ZoneDefinition[] = ZONE_CONTENT_VALUES.map((definition) => ({
  id: definition.id,
  name: definition.name,
  tier: definition.tier,
  monsterSpawns: buildNormalMonsterSpawns(
    definition.id,
    definition.spawnGroupPrefix,
    definition.respawnDelayTicks,
  ),
  tags: [...definition.tags],
}));

export const BIOME_BY_ZONE = new Map<ZoneDefinitionId, BiomeId>(
  ZONE_CONTENT_VALUES.map((definition) => [definition.id, definition.biomeId]),
);
export const WORLD_ZONE_ORDER = WORLD_BAND_DEFINITIONS.flatMap(({ id }) => WORLD_ZONE_IDS_BY_BAND[id]);

export function buildZoneUnlockDefinitions(
  zoneOrder: readonly ZoneDefinitionId[],
): readonly ZoneUnlockDefinition[] {
  return zoneOrder.map((zoneDefId, index) => {
    const previousZoneDefId = zoneOrder[index - 1];
    return previousZoneDefId === undefined
      ? { zoneDefId, conditions: [], unlockedByDefault: true }
      : { zoneDefId, conditions: [{ type: "zone_completed" as const, targetZoneDefId: previousZoneDefId }] };
  });
}

export const ZONE_UNLOCK_DEFINITIONS: readonly ZoneUnlockDefinition[] = buildZoneUnlockDefinitions(WORLD_ZONE_ORDER);

export function validateWorldContentCatalog(): void {
  const zoneIds = ZONE_CONTENT_VALUES.map(({ id }) => id);
  if (new Set(zoneIds).size !== zoneIds.length) throw new Error("A world zone ID is authored more than once");
  const biomeIds = new Set(BIOME_DEFINITIONS.map(({ id }) => id));
  for (const definition of ZONE_CONTENT_VALUES) {
    if (!biomeIds.has(definition.biomeId)) {
      throw new Error(`Missing biome definition for zone: ${String(definition.id)}`);
    }
    getZoneEncounterPool(definition.id);
  }
  const derivedDefinitionIds = new Set(ZONE_DEFINITIONS.map(({ id }) => id));
  if (derivedDefinitionIds.size !== zoneIds.length) {
    throw new Error("Derived zone definitions do not match authored world content");
  }
}
