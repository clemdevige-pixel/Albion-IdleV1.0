import {
  type RepairCostDefinitionLike,
  type RepairResult,
  repairFail,
  repairOk,
} from "./types.js";

/**
 * Deterministic Silver cost resolution (34_REPAIR_SYSTEM "RepairCostResolver"):
 * cost = ceil(baseRepairCost × costMultiplier × stationModifier × missing/max).
 * Ceil guarantees any damaged item costs at least 1 Silver, keeping repairs a
 * real Silver sink while missing = 0 always yields 0.
 */
export class RepairCostResolver {
  private readonly table = new Map<string, RepairCostDefinitionLike>();

  register(definition: RepairCostDefinitionLike): RepairResult<RepairCostDefinitionLike> {
    if (definition.equipmentCategory.length === 0) {
      return repairFail("invalid_definition");
    }
    if (!Number.isSafeInteger(definition.itemTier) || definition.itemTier < 1) {
      return repairFail("invalid_definition");
    }
    if (!Number.isSafeInteger(definition.baseRepairCost) || definition.baseRepairCost < 0) {
      return repairFail("invalid_definition");
    }
    if (!Number.isFinite(definition.costMultiplier) || definition.costMultiplier <= 0) {
      return repairFail("invalid_definition");
    }
    const key = costKey(definition.equipmentCategory, definition.itemTier);
    if (this.table.has(key)) {
      return repairFail("duplicate_cost_definition");
    }
    const frozen = Object.freeze({
      equipmentCategory: definition.equipmentCategory,
      itemTier: definition.itemTier,
      baseRepairCost: definition.baseRepairCost,
      costMultiplier: definition.costMultiplier,
      enabled: definition.enabled,
    });
    this.table.set(key, frozen);
    return repairOk(frozen);
  }

  getDefinition(
    equipmentCategory: string,
    itemTier: number,
  ): RepairCostDefinitionLike | undefined {
    return this.table.get(costKey(equipmentCategory, itemTier));
  }

  resolveCost(
    equipmentCategory: string,
    itemTier: number,
    currentDurability: number,
    maxDurability: number,
    stationModifier: number,
  ): RepairResult<number> {
    const definition = this.getDefinition(equipmentCategory, itemTier);
    if (definition === undefined) {
      return repairFail("cost_not_defined");
    }
    if (!definition.enabled) {
      return repairFail("cost_disabled");
    }
    if (
      !Number.isSafeInteger(currentDurability) ||
      !Number.isSafeInteger(maxDurability) ||
      maxDurability < 1 ||
      currentDurability < 0 ||
      currentDurability > maxDurability
    ) {
      return repairFail("invalid_durability");
    }
    const missing = maxDurability - currentDurability;
    if (missing === 0) {
      return repairOk(0);
    }
    const cost = Math.ceil(
      (definition.baseRepairCost * definition.costMultiplier * stationModifier * missing) /
        maxDurability,
    );
    if (!Number.isSafeInteger(cost) || cost < 0) {
      return repairFail("cost_overflow");
    }
    return repairOk(cost);
  }
}

function costKey(equipmentCategory: string, itemTier: number): string {
  return `${equipmentCategory}::${String(itemTier)}`;
}
