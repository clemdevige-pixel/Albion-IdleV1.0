import { getEnemyCombatProfile, type ZoneDefinitionId } from "@game/gameplay";
import { getEnchantmentShardExpectedDrop } from "./economyContentCatalog.js";
import { getWorldZonePlacement } from "./worldContentCatalog.js";
import {
  runCombatRuntimeBenchmark,
  type CombatRuntimeBenchmarkInput,
  type CombatRuntimeBenchmarkResult,
} from "../runtime/CombatRuntimeBenchmarkHarness.js";

export type EnchantmentShardTtkBenchmarkInput = CombatRuntimeBenchmarkInput;

export interface EnchantmentShardTtkBenchmarkResult extends CombatRuntimeBenchmarkResult {
  readonly expectedShardsPerSegment: number;
  readonly expectedShardsPerKill: number;
  readonly killsPerHour: number;
  readonly expectedShardsPerHour: number;
}

export function getExpectedEnchantmentShardsPerSegment(
  zoneDefId: ZoneDefinitionId,
  segmentIndex: number,
): number {
  const placement = getWorldZonePlacement(zoneDefId);
  const baselineHp = getEnemyCombatProfile(0, 0, 0, placement.bandId).hp;
  let expected = 0;

  for (let encounterIndex = 0; encounterIndex < 5; encounterIndex += 1) {
    const enemy = getEnemyCombatProfile(
      placement.zoneIndexWithinBand,
      segmentIndex,
      encounterIndex,
      placement.bandId,
    );
    const isSpecial = encounterIndex === 4;
    expected += getEnchantmentShardExpectedDrop({
      segmentIndex,
      isElite: isSpecial && segmentIndex < 9,
      isBoss: isSpecial && segmentIndex === 9,
      enchantmentDropWeight: baselineHp <= 0 ? 1 : enemy.hp / baselineHp,
    });
  }

  return expected;
}

/**
 * Projects enchantment-shard income from the exact live CombatRuntime segment
 * clear time. This deliberately does not replace the loot model: it measures
 * the existing expected drop values against real TTK so economy tuning can be
 * validated without introducing a second combat simulation.
 */
export function runEnchantmentShardTtkBenchmark(
  input: EnchantmentShardTtkBenchmarkInput,
): EnchantmentShardTtkBenchmarkResult {
  const runtime = runCombatRuntimeBenchmark(input);
  const expectedShardsPerSegment = getExpectedEnchantmentShardsPerSegment(
    input.zoneDefId,
    input.segmentIndex,
  );
  const expectedShardsPerKill = expectedShardsPerSegment / 5;
  const hoursPerSegment = runtime.seconds / 3600;
  const canFarm = runtime.clear && runtime.seconds > 0;

  return {
    ...runtime,
    expectedShardsPerSegment,
    expectedShardsPerKill,
    killsPerHour: canFarm ? 5 / hoursPerSegment : 0,
    expectedShardsPerHour: canFarm ? expectedShardsPerSegment / hoursPerSegment : 0,
  };
}
