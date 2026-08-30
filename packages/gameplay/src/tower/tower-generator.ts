import {
  TOWER_BLOCK_SIZE,
  TOWER_ENDLESS_FACTION_BAG,
  TOWER_ENDLESS_TIER_BAG,
  TOWER_TRIAL_BLOCKS,
  isTowerMajorBossFloor,
  type TowerFactionId,
  type TowerTier,
} from "@game/data";
import { createDeterministicRandom, shuffleDeterministic } from "../random/deterministic-random.js";

export interface TowerBlockDefinition {
  readonly id: string;
  readonly blockIndex: number;
  readonly floorStart: number;
  readonly floorEnd: number;
  readonly tier: TowerTier;
  readonly factionId: TowerFactionId;
  readonly majorBoss: boolean;
  readonly source: "trial" | "endless";
}

interface GeneratorState {
  tierBag: TowerTier[];
  factionBag: TowerFactionId[];
  lastFaction: TowerFactionId | undefined;
}

function refillTierBag(random: () => number): TowerTier[] {
  return shuffleDeterministic(TOWER_ENDLESS_TIER_BAG, random);
}

function refillFactionBag(
  random: () => number,
  previousFaction: TowerFactionId | undefined,
): TowerFactionId[] {
  const bag = shuffleDeterministic(TOWER_ENDLESS_FACTION_BAG, random);
  if (previousFaction === undefined || bag[0] !== previousFaction || bag.length < 2) return bag;

  const replacementIndex = bag.findIndex((entry) => entry !== previousFaction);
  if (replacementIndex <= 0) return bag;
  const first = bag[0];
  bag[0] = bag[replacementIndex] as TowerFactionId;
  bag[replacementIndex] = first as TowerFactionId;
  return bag;
}

function drawEndlessBlock(
  blockIndex: number,
  random: () => number,
  state: GeneratorState,
): TowerBlockDefinition {
  if (state.tierBag.length === 0) state.tierBag = refillTierBag(random);
  if (state.factionBag.length === 0) state.factionBag = refillFactionBag(random, state.lastFaction);

  const tier = state.tierBag.shift();
  const factionId = state.factionBag.shift();
  if (tier === undefined || factionId === undefined) {
    throw new Error("Tower generator could not draw from authored bags");
  }
  state.lastFaction = factionId;

  const floorStart = blockIndex * TOWER_BLOCK_SIZE + 1;
  const floorEnd = floorStart + TOWER_BLOCK_SIZE - 1;
  return {
    id: `tower_endless_${String(blockIndex + 1).padStart(6, "0")}`,
    blockIndex,
    floorStart,
    floorEnd,
    tier,
    factionId,
    majorBoss: isTowerMajorBossFloor(floorEnd),
    source: "endless",
  };
}

/**
 * Resolves one Tower block deterministically.
 *
 * Floors 1-25 always return the authored trial sequence. Endless blocks are
 * reconstructed from the stable Tower seed, so reloads cannot reroll their
 * Tier/Faction identity when the same seed and block index are used.
 */
export function getTowerBlockDefinition(blockIndex: number, towerSeed: string): TowerBlockDefinition {
  if (!Number.isSafeInteger(blockIndex) || blockIndex < 0) {
    throw new Error("Tower block index must be a non-negative safe integer");
  }

  const trialBlock = TOWER_TRIAL_BLOCKS[blockIndex];
  if (trialBlock !== undefined) return { ...trialBlock, source: "trial" };

  const lastTrialFaction = TOWER_TRIAL_BLOCKS.at(-1)?.factionId;
  const random = createDeterministicRandom(`endless_tower|${towerSeed}`);
  const state: GeneratorState = { tierBag: [], factionBag: [], lastFaction: lastTrialFaction };
  let generated: TowerBlockDefinition | undefined;

  for (let currentIndex = TOWER_TRIAL_BLOCKS.length; currentIndex <= blockIndex; currentIndex += 1) {
    generated = drawEndlessBlock(currentIndex, random, state);
  }

  if (generated === undefined) throw new Error("Tower generator failed to resolve block");
  return generated;
}

export function getTowerBlocks(
  startBlockIndex: number,
  count: number,
  towerSeed: string,
): TowerBlockDefinition[] {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("Tower block count must be a non-negative safe integer");
  return Array.from({ length: count }, (_, offset) => (
    getTowerBlockDefinition(startBlockIndex + offset, towerSeed)
  ));
}
