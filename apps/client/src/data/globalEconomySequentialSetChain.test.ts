import { describe, expect, it } from "vitest";
import { EQUIPMENT_CRAFT_RECIPES } from "./refiningRecipes.js";

const TIERS = [4, 5, 6, 7, 8] as const;
type TargetTier = (typeof TIERS)[number];
type EquipmentTier = 3 | TargetTier;
type Enchantment = 0 | 3;

interface OwnedItem {
  readonly itemId: string;
  readonly enchantment: Enchantment;
}

function representativeItemIds(tier: EquipmentTier): readonly string[] {
  if (tier === 3) {
    return [
      "item_weapon_bow_t3_longbow",
      "item_iron_helmet",
      "item_leather_armor",
      "item_leather_boots",
    ];
  }
  return [
    `item_weapon_bow_t${String(tier)}_longbow`,
    `item_helmet_t${String(tier)}_reinforced`,
    `item_armor_t${String(tier)}_leather`,
    `item_boots_t${String(tier)}_leather`,
  ];
}

function refinedCraftCost(tier: TargetTier): string {
  const totals = new Map<string, number>();
  for (const itemId of representativeItemIds(tier)) {
    const recipe = EQUIPMENT_CRAFT_RECIPES.find((candidate) => candidate.outputItemId === itemId);
    if (recipe === undefined) throw new Error(`Missing craft recipe for ${itemId}`);
    for (const requirement of recipe.requirements) {
      if (!requirement.itemId.startsWith("item_refined_")) continue;
      totals.set(requirement.itemId, (totals.get(requirement.itemId) ?? 0) + requirement.quantity);
    }
  }
  return [...totals.entries()].map(([itemId, quantity]) => `${itemId}:${String(quantity)}`).join(" | ");
}

function consumeAndCraftTier(
  inventory: Map<string, OwnedItem>,
  sourceTier: EquipmentTier,
  targetTier: TargetTier,
) {
  const sourceItems = representativeItemIds(sourceTier);
  const targetItems = representativeItemIds(targetTier);
  const expectedSourceEnchantment: Enchantment = sourceTier === 3 ? 0 : 3;
  let predecessorRequirements = 0;

  for (let index = 0; index < targetItems.length; index += 1) {
    const targetItemId = targetItems[index];
    const expectedPreviousItemId = sourceItems[index];
    if (targetItemId === undefined || expectedPreviousItemId === undefined) {
      throw new Error(`Representative set shape mismatch T${String(sourceTier)} -> T${String(targetTier)}`);
    }

    const ownedPrevious = inventory.get(expectedPreviousItemId);
    if (ownedPrevious === undefined) {
      throw new Error(`Missing owned predecessor ${expectedPreviousItemId} for ${targetItemId}`);
    }
    if (ownedPrevious.enchantment !== expectedSourceEnchantment) {
      throw new Error(
        `Wrong predecessor state for ${expectedPreviousItemId}: expected .${String(expectedSourceEnchantment)}, got .${String(ownedPrevious.enchantment)}`,
      );
    }

    const recipe = EQUIPMENT_CRAFT_RECIPES.find((candidate) => candidate.outputItemId === targetItemId);
    if (recipe === undefined) throw new Error(`Missing craft recipe for ${targetItemId}`);
    const predecessorRequirement = recipe.requirements.find(
      (requirement) => requirement.itemId === expectedPreviousItemId,
    );
    if (predecessorRequirement === undefined || predecessorRequirement.quantity !== 1) {
      throw new Error(
        `${targetItemId} must consume exactly 1x ${expectedPreviousItemId}`,
      );
    }
    predecessorRequirements += 1;
  }

  for (const itemId of sourceItems) inventory.delete(itemId);
  for (const itemId of targetItems) inventory.set(itemId, { itemId, enchantment: 0 });

  return {
    sourceState: `T${String(sourceTier)}.${String(expectedSourceEnchantment)}`,
    targetStateAfterCraft: `T${String(targetTier)}.0`,
    predecessorRequirements,
    consumedItems: sourceItems.length,
    producedItems: targetItems.length,
    refinedCraftCost: refinedCraftCost(targetTier),
  };
}

describe("global economy sequential representative set chain", () => {
  it("consumes the previous-tier set before crafting the next tier", () => {
    const inventory = new Map<string, OwnedItem>(
      representativeItemIds(3).map((itemId) => [itemId, { itemId, enchantment: 0 as const }]),
    );

    const rows = TIERS.map((targetTier) => {
      const sourceTier = (targetTier - 1) as EquipmentTier;
      const result = consumeAndCraftTier(inventory, sourceTier, targetTier);

      // The global enchantment audit models .0 -> .3 immediately after this craft.
      // Material and shard costs are accounted there; here we only carry the real
      // inventory state that will be sacrificed by the following tier recipe.
      for (const itemId of representativeItemIds(targetTier)) {
        inventory.set(itemId, { itemId, enchantment: 3 });
      }

      return {
        transition: `T${String(sourceTier)}->T${String(targetTier)}`,
        ...result,
        carriedState: `T${String(targetTier)}.3`,
      };
    });

    console.log("[GLOBAL_ECONOMY_SET_CHAIN]");
    console.table(rows);
    console.log("[GLOBAL_ECONOMY_SET_CHAIN_JSON]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(TIERS.length);
    expect(rows.every((row) => row.predecessorRequirements === 4)).toBe(true);
    expect(rows.every((row) => row.consumedItems === 4 && row.producedItems === 4)).toBe(true);
    expect(inventory.size).toBe(4);
    expect([...inventory.values()].every((item) => item.enchantment === 3)).toBe(true);
  });
});
