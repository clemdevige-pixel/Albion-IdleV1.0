import {
  SEGMENTS_PER_ZONE,
  TOWER_FLOOR_WORLD_REWARD_PERCENT,
  WORLD_BAND_DEFINITIONS,
  getTowerBlockSilverReward,
  getWorldCombatProgression,
  type TowerTier,
  type WorldBandId,
} from "@game/data";
import {
  getEncounterRewards,
  getTowerFloorDefinition,
  type TowerProgressionService,
  type TowerProgressionSnapshot,
} from "@game/gameplay";
import type { CombatRewardRuntime, EnemyKilledRewardResult } from "./CombatRewardRuntime.js";

export interface TowerRewardBreakdown {
  readonly floor: number;
  readonly tier: TowerTier;
  readonly factionId: string;
  readonly baseSilver: number;
  readonly baseFame: number;
  readonly repeatableBlockChestSilver: number;
  readonly firstClearBlockBonusSilver: number;
  readonly majorBossFirstClearBonusSilver: number;
  readonly firstClear: boolean;
}

export interface TowerRewardResult extends TowerRewardBreakdown {
  readonly reward: EnemyKilledRewardResult;
}

function resolveWorldBandForTowerTier(tier: TowerTier): WorldBandId {
  const band = WORLD_BAND_DEFINITIONS.find((definition) => definition.maximumTier === tier);
  if (band === undefined) throw new Error(`Missing World reward band for Tower T${String(tier)}`);
  return band.id;
}

function scaleReward(value: number): number {
  return Math.max(0, Math.round(value * TOWER_FLOOR_WORLD_REWARD_PERCENT / 100));
}

export function resolveTowerRewardBreakdown(
  snapshot: TowerProgressionSnapshot,
): TowerRewardBreakdown {
  const floor = getTowerFloorDefinition(snapshot.currentFloor, snapshot.seed);
  const tier = floor.block.tier;
  const bandId = resolveWorldBandForTowerTier(tier);
  const progression = getWorldCombatProgression(bandId);
  const finalZoneIndex = progression.curve.length - 1;
  const worldReference = getEncounterRewards(
    finalZoneIndex,
    SEGMENTS_PER_ZONE - 1,
    0,
    bandId,
  );
  const baseSilver = scaleReward(worldReference.silver);
  const baseFame = scaleReward(worldReference.fame);
  const firstClear = snapshot.currentFloor > snapshot.highestClearedFloor;
  const blockReward = getTowerBlockSilverReward(tier);
  const blockCompleted = floor.indexInBlock === 4;

  return {
    floor: floor.floor,
    tier,
    factionId: floor.block.factionId,
    baseSilver,
    baseFame,
    repeatableBlockChestSilver: blockCompleted ? blockReward.repeatableChestSilver : 0,
    firstClearBlockBonusSilver: blockCompleted && firstClear
      ? blockReward.firstClearBonusSilver
      : 0,
    majorBossFirstClearBonusSilver: floor.majorBoss && firstClear
      ? blockReward.majorBossFirstClearBonusSilver
      : 0,
    firstClear,
  };
}

/**
 * Tower reward adapter over the shared combat reward authority.
 *
 * Silver/Fame reference the deepest normal World reward of the block tier and
 * remain deliberately below World efficiency. Block milestones add Silver only.
 * Item rolls are disabled so Tower cannot replace Dungeon faction loot or World
 * discovery drops. Fame, mastery, faction fame and Attunement still flow through
 * CombatRewardRuntime exactly like other combat activities.
 */
export class TowerRewardRuntime {
  public constructor(
    private readonly progression: TowerProgressionService,
    private readonly combatRewards: CombatRewardRuntime,
  ) {}

  public processCurrentFloorVictory(): TowerRewardResult {
    const breakdown = resolveTowerRewardBreakdown(this.progression.getSnapshot());
    const silverReward = breakdown.baseSilver
      + breakdown.repeatableBlockChestSilver
      + breakdown.firstClearBlockBonusSilver
      + breakdown.majorBossFirstClearBonusSilver;
    const floor = getTowerFloorDefinition(breakdown.floor, this.progression.getSnapshot().seed);

    const reward = this.combatRewards.processEnemyKilledReward(
      silverReward,
      breakdown.baseFame,
      {
        segmentIndex: floor.indexInBlock,
        faction: floor.block.factionId,
        isElite: floor.role === "elite" || floor.role === "reinforced",
        isBoss: floor.role === "block_boss",
        isFinalBoss: floor.majorBoss,
        enchantmentTier: breakdown.tier,
        enchantmentDropWeight: 0,
        dungeonKeyDropWeight: 0,
      },
      0,
      { itemDropsEnabled: false },
    );

    return { ...breakdown, reward };
  }
}
